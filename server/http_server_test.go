package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/httptest"
	"os"
	"sync"
	"testing"
	"time"
)

// MockMQTTClient is a mock implementation of the MQTTClient for testing
type MockMQTTClient struct {
	PublishFunc       func(topic string, payload interface{}) error
	DisconnectFunc    func()
	PublishedMessages map[string][]string // Store published messages by topic; value is now []string
	publishLock       sync.Mutex
}

// Publish stores the payload as a string in a slice for the given topic
func (m *MockMQTTClient) Publish(topic string, payload interface{}) error {
	m.publishLock.Lock()
	defer m.publishLock.Unlock()

	if m.PublishedMessages == nil {
		m.PublishedMessages = make(map[string][]string)
	}

	payloadStr, ok := payload.(string)
	if !ok {
		// Attempt to convert if not string, e.g. json.Number or other types if necessary
		// For this test, we primarily expect strings as per new logic
		payloadStr = fmt.Sprintf("%v", payload)
	}

	m.PublishedMessages[topic] = append(m.PublishedMessages[topic], payloadStr)

	if m.PublishFunc != nil {
		return m.PublishFunc(topic, payload) // original payload for custom mock func
	}
	return nil
}

func (m *MockMQTTClient) Disconnect() {
	if m.DisconnectFunc != nil {
		m.DisconnectFunc()
	}
}

// Helper to check if a slice contains a specific string message
func containsMessage(messages []string, expectedMsg string) bool {
	for _, msg := range messages {
		if msg == expectedMsg {
			return true
		}
	}
	return false
}

func TestHandleDataRequest(t *testing.T) {
	// Define Channel Mappings for the test config
	testMappings := []ChannelMapping{
		{
			ChannelNumber:  1,
			IntensityTopic: "ch1/intensity",
			ColorTopic:     "ch1/color",
			OnOffTopic:     "ch1/onoff",
		},
		{
			ChannelNumber:  2,
			IntensityTopic: "ch2/intensity",
			ColorTopic:     "ch2/color",
			OnOffTopic:     "ch2/onoff",
		},
	}
	cfg := &Config{
		HTTPListenAddr:  ":8080",
		ChannelMappings: testMappings,
	}
	mockMQTT := &MockMQTTClient{}

	// Create discard loggers for tests that don't check log output
	discardLogger := log.New(io.Discard, "", 0)
	// httpServer is now created inside each sub-test to ensure fresh state

	// Expected messages structure for verification
	type ExpectedMessage struct {
		Topic   string
		Payload string
	}

	tests := []struct {
		name                   string
		method                 string              // Add HTTP method for testing OPTIONS
		payload                []IncomingDataPoint // Used if rawPayload is empty
		rawPayload             string              // Used if non-empty, overrides payload
		expectedStatusCode     int
		expectedMessages       []ExpectedMessage // Slice of all expected messages across topics
		expectErrorInBody      bool
		expectedTotalPublishes int                 // Total number of publish calls expected
		expectedResponseHeaders map[string]string   // For checking CORS headers
	}{
		{
			name:   "OPTIONS preflight request",
			method: http.MethodOptions,
			expectedStatusCode: http.StatusNoContent,
			expectedResponseHeaders: map[string]string{
				"Access-Control-Allow-Origin":  "*",
				"Access-Control-Allow-Methods": "POST, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type, Authorization",
			},
			expectedTotalPublishes: 0,
		},
		{
			name:   "Valid single data point (value > 0)",
			method: http.MethodPost,
			payload: []IncomingDataPoint{
				{ChannelNumber: 1, Value: json.Number("10.5"), Color: "#FF0000"},
			},
			expectedStatusCode: http.StatusOK,
			expectedMessages: []ExpectedMessage{
				{Topic: "ch1/intensity", Payload: "10.500000"},
				{Topic: "ch1/color", Payload: "#FF0000"},
				{Topic: "ch1/onoff", Payload: "1"},
			},
			expectedTotalPublishes: 3,
			expectedResponseHeaders: map[string]string{"Access-Control-Allow-Origin": "*"}, // Basic check for POST
		},
		{
			name:   "Valid single data point (value == 0)",
			method: http.MethodPost,
			payload: []IncomingDataPoint{
				{ChannelNumber: 1, Value: json.Number("0"), Color: "#00FF00"},
			},
			expectedStatusCode: http.StatusOK,
			expectedMessages: []ExpectedMessage{
				{Topic: "ch1/intensity", Payload: "0.000000"},
				{Topic: "ch1/color", Payload: "#00FF00"},
				{Topic: "ch1/onoff", Payload: "1"}, // Changed from "0" to "1"
			},
			expectedTotalPublishes: 3,
			expectedResponseHeaders: map[string]string{"Access-Control-Allow-Origin": "*"},
		},
		{
			name:   "Valid multiple data points",
			method: http.MethodPost,
			payload: []IncomingDataPoint{
				{ChannelNumber: 1, Value: json.Number("20"), Color: "#00FF00"},
				{ChannelNumber: 2, Value: json.Number("0"), Color: "#0000FF"},
			},
			expectedStatusCode: http.StatusOK,
			expectedMessages: []ExpectedMessage{
				{Topic: "ch1/intensity", Payload: "20.000000"},
				{Topic: "ch1/color", Payload: "#00FF00"},
				{Topic: "ch1/onoff", Payload: "1"},
				{Topic: "ch2/intensity", Payload: "0.000000"},
				{Topic: "ch2/color", Payload: "#0000FF"},
				{Topic: "ch2/onoff", Payload: "1"}, // Changed from "0" to "1"
			},
			expectedTotalPublishes: 6,
			expectedResponseHeaders: map[string]string{"Access-Control-Allow-Origin": "*"},
		},
		{
			name:                   "Invalid JSON payload (empty array)",
			method:                 http.MethodPost,
			payload:                []IncomingDataPoint{},
			expectedStatusCode:     http.StatusBadRequest,
			expectedTotalPublishes: 0,
			expectErrorInBody:      true,
			expectedResponseHeaders: map[string]string{"Access-Control-Allow-Origin": "*"},
		},
		{
			name:   "Unknown channel number",
			method: http.MethodPost,
			payload: []IncomingDataPoint{
				{ChannelNumber: 99, Value: json.Number("40"), Color: "#FFFF00"}, // Channel 99 not in testMappings
			},
			expectedStatusCode:     http.StatusMultiStatus,
			expectedTotalPublishes: 0,
			expectErrorInBody:      true,
			expectedResponseHeaders: map[string]string{"Access-Control-Allow-Origin": "*"},
		},
		{
			name:   "Partial success - one known, one unknown channel number",
			method: http.MethodPost,
			payload: []IncomingDataPoint{
				{ChannelNumber: 1, Value: json.Number("50"), Color: "#FF00FF"},
				{ChannelNumber: 99, Value: json.Number("60"), Color: "#00FFFF"},
			},
			expectedStatusCode: http.StatusMultiStatus,
			expectedMessages: []ExpectedMessage{ // Only for channel 1
				{Topic: "ch1/intensity", Payload: "50.000000"},
				{Topic: "ch1/color", Payload: "#FF00FF"},
				{Topic: "ch1/onoff", Payload: "1"},
			},
			expectedTotalPublishes: 3,
			expectErrorInBody:      true,
			expectedResponseHeaders: map[string]string{"Access-Control-Allow-Origin": "*"},
		},
		{
			name:                   "Invalid value type for a channel (raw JSON)",
			method:                 http.MethodPost,
			rawPayload:             `[{"channelNumber":1,"value":"not-a-number","color":"#123456"}]`,
			expectedStatusCode:     http.StatusBadRequest, // Fails full JSON decode due to invalid number
			expectedTotalPublishes: 0,
			expectErrorInBody:      true,
			expectedResponseHeaders: map[string]string{"Access-Control-Allow-Origin": "*"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create httpServer and testServer for each sub-test to ensure fresh state
			httpServer := NewHTTPServer(cfg, mockMQTT, discardLogger, discardLogger)
			mux := http.NewServeMux()
			mux.HandleFunc("/post", corsMiddleware(httpServer.handleDataRequest))
			testServer := httptest.NewServer(mux)
			defer testServer.Close()

			mockMQTT.PublishedMessages = make(map[string][]string) // Reset mock
			var payloadBytes []byte
			var err error
			currentMethod := tt.method
			if currentMethod == "" { // Default to POST if not specified
				currentMethod = http.MethodPost
			}

			if currentMethod == http.MethodPost {
				if tt.rawPayload != "" {
					payloadBytes = []byte(tt.rawPayload)
				} else {
					payloadBytes, err = json.Marshal(tt.payload)
					if err != nil {
						t.Fatalf("Failed to marshal test payload: %v", err)
					}
				}
			}

			req, _ := http.NewRequest(currentMethod, testServer.URL+"/post", bytes.NewBuffer(payloadBytes))
			if currentMethod == http.MethodPost {
				req.Header.Set("Content-Type", "application/json")
			}

			resp, err := http.DefaultClient.Do(req)
			if err != nil {
				t.Fatalf("Failed to send request: %v", err)
			}
			defer resp.Body.Close()

			if resp.StatusCode != tt.expectedStatusCode {
				t.Errorf("Expected status code %d, got %d", tt.expectedStatusCode, resp.StatusCode)
			}

			// Check response headers
			for key, expectedValue := range tt.expectedResponseHeaders {
				actualValue := resp.Header.Get(key)
				if actualValue != expectedValue {
					t.Errorf("Expected header %s: %s, got: %s", key, expectedValue, actualValue)
				}
			}

			if tt.method != http.MethodOptions { // No MQTT messages for OPTIONS
				var totalPublishedActual int
				for _, msgs := range mockMQTT.PublishedMessages {
					totalPublishedActual += len(msgs)
				}
				if totalPublishedActual != tt.expectedTotalPublishes {
					t.Errorf("Expected %d total MQTT messages to be published, got %d. Messages: %v",
						tt.expectedTotalPublishes, totalPublishedActual, mockMQTT.PublishedMessages)
				}

				for _, expectedMsg := range tt.expectedMessages {
					msgsOnTopic, ok := mockMQTT.PublishedMessages[expectedMsg.Topic]
					if !ok && len(tt.expectedMessages) > 0 && tt.expectedTotalPublishes > 0 {
						// Only error if we actually expected messages for this test case and specifically this topic
						isTopicExpected := false
						for _, em := range tt.expectedMessages {
							if em.Topic == expectedMsg.Topic {
								isTopicExpected = true
								break
							}
						}
						if isTopicExpected {
							t.Errorf("Expected message on topic '%s', but no messages found on this topic. Expected payload: '%s'",
								expectedMsg.Topic, expectedMsg.Payload)
						}
						continue
					}
					if ok && !containsMessage(msgsOnTopic, expectedMsg.Payload) {
						t.Errorf("Topic '%s': Expected to find payload '%s', but got messages: %v",
							expectedMsg.Topic, expectedMsg.Payload, msgsOnTopic)
					}
				}
			}
		})
	}
}

func TestHandleDataRequest_StatefulBehavior(t *testing.T) {
	testMappings := []ChannelMapping{
		{ChannelNumber: 1, IntensityTopic: "ch1/intensity", ColorTopic: "ch1/color", OnOffTopic: "ch1/onoff"},
	}
	cfg := &Config{ChannelMappings: testMappings}
	mockMQTT := &MockMQTTClient{}

	// For testing, we need loggers, but their output won't be checked in these stateful tests.
	// Using discard to avoid polluting test output, unless debugging.
	// testStdout := log.New(io.Discard, "", 0)
	// testStderr := log.New(io.Discard, "", 0)
	// For actual debugging if needed:
	testStdout := log.New(os.Stdout, "TEST_STDOUT: ", log.LstdFlags|log.Lshortfile)
	testStderr := log.New(os.Stderr, "TEST_STDERR: ", log.LstdFlags|log.Lshortfile)


	httpServer := NewHTTPServer(cfg, mockMQTT, testStdout, testStderr)

	mux := http.NewServeMux()
	mux.HandleFunc("/post", corsMiddleware(httpServer.handleDataRequest))
	testServer := httptest.NewServer(mux)
	defer testServer.Close()

	// Helper to make a request
	makeRequest := func(payload []IncomingDataPoint) *http.Response {
		payloadBytes, _ := json.Marshal(payload)
		req, _ := http.NewRequest(http.MethodPost, testServer.URL+"/post", bytes.NewBuffer(payloadBytes))
		req.Header.Set("Content-Type", "application/json")
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatalf("Failed to send request: %v", err)
		}
		return resp
	}

	// Helper to check published messages
	// Clears messages after checking for the specific call's expectation.
	checkMessages := func(expectedCount int, expectedMsgs map[string]string) {
		t.Helper()
		mockMQTT.publishLock.Lock()
		defer mockMQTT.publishLock.Unlock()

		actualCount := 0
		for _, payloads := range mockMQTT.PublishedMessages {
			actualCount += len(payloads)
		}

		if actualCount != expectedCount {
			t.Errorf("Expected %d messages, got %d. Messages: %v", expectedCount, actualCount, mockMQTT.PublishedMessages)
		}

		for topic, expectedPayload := range expectedMsgs {
			payloads, found := mockMQTT.PublishedMessages[topic]
			if !found {
				t.Errorf("Expected message on topic %s, but none found.", topic)
				continue
			}
			if len(payloads) != 1 || payloads[0] != expectedPayload { // Assuming one message per topic for these specific state changes
				t.Errorf("Topic %s: expected payload '%s', got %v", topic, expectedPayload, payloads)
			}
		}
		mockMQTT.PublishedMessages = make(map[string][]string) // Reset for next call in sequence
	}

	// --- Test Sequence ---

	// 1. Initial: Send data for channel 1
	t.Run("Initial data", func(t *testing.T) {
		resp := makeRequest([]IncomingDataPoint{{ChannelNumber: 1, Value: json.Number("100"), Color: "#FF0000"}})
		if resp.StatusCode != http.StatusOK {
			t.Errorf("Expected status OK, got %d", resp.StatusCode)
		}
		checkMessages(3, map[string]string{
			"ch1/intensity": "100.000000",
			"ch1/color":     "#FF0000",
			"ch1/onoff":     "1",
		})
	})

	// 2. Send identical data: Expect no new messages
	t.Run("Identical data", func(t *testing.T) {
		resp := makeRequest([]IncomingDataPoint{{ChannelNumber: 1, Value: json.Number("100"), Color: "#FF0000"}})
		if resp.StatusCode != http.StatusOK {
			t.Errorf("Expected status OK, got %d", resp.StatusCode)
		}
		checkMessages(0, map[string]string{})
	})

	// 3. Change only color: Expect 1 message (color)
	t.Run("Change color only", func(t *testing.T) {
		resp := makeRequest([]IncomingDataPoint{{ChannelNumber: 1, Value: json.Number("100"), Color: "#00FF00"}})
		if resp.StatusCode != http.StatusOK {
			t.Errorf("Expected status OK, got %d", resp.StatusCode)
		}
		checkMessages(1, map[string]string{
			"ch1/color": "#00FF00",
		})
	})

	// 4. Change only intensity (on->on): Expect 1 message (intensity)
	t.Run("Change intensity on->on", func(t *testing.T) {
		// State after last step: Intensity 100, Color #00FF00, OnOff 1
		resp := makeRequest([]IncomingDataPoint{{ChannelNumber: 1, Value: json.Number("50"), Color: "#00FF00"}})
		if resp.StatusCode != http.StatusOK {
			t.Errorf("Expected status OK, got %d", resp.StatusCode)
		}
		checkMessages(1, map[string]string{
			"ch1/intensity": "50.000000",
		})
	})

	// 5. Change intensity (on->off): Expect 1 message (intensity only, OnOff stays "1" and is not re-sent)
	t.Run("Change intensity on->off", func(t *testing.T) {
		// State after last step: Intensity 50, Color #00FF00, OnOff 1
		resp := makeRequest([]IncomingDataPoint{{ChannelNumber: 1, Value: json.Number("0"), Color: "#00FF00"}})
		if resp.StatusCode != http.StatusOK {
			t.Errorf("Expected status OK, got %d", resp.StatusCode)
		}
		checkMessages(1, map[string]string{ // Total 1 message
			"ch1/intensity": "0.000000",
			// ch1/onoff is not sent as it's already "1" internally and target is "1"
		})
	})

	// 6. Change intensity (from 0 to 25 -> effective on-state) and color: Expect 2 messages (intensity, color). OnOff stays "1".
	t.Run("Change intensity (0 -> 25) and color", func(t *testing.T) {
		// State after last step: Intensity 0, Color #00FF00, OnOff 1 (internally)
		resp := makeRequest([]IncomingDataPoint{{ChannelNumber: 1, Value: json.Number("25"), Color: "#0000FF"}})
		if resp.StatusCode != http.StatusOK {
			t.Errorf("Expected status OK, got %d", resp.StatusCode)
		}
		checkMessages(2, map[string]string{ // Total 2 messages
			"ch1/intensity": "25.000000",
			"ch1/color":     "#0000FF",
			// ch1/onoff is not sent as it's already "1" internally
		})
	})
}

func TestHandleDataRequest_TimestampOrder(t *testing.T) {
	testMappings := []ChannelMapping{
		{ChannelNumber: 1, IntensityTopic: "ch1/intensity", ColorTopic: "ch1/color", OnOffTopic: "ch1/onoff"},
	}
	cfg := &Config{ChannelMappings: testMappings}
	mockMQTT := &MockMQTTClient{}
	testStdout := log.New(io.Discard, "", 0) // Keep output clean for this test
	testStderr := log.New(io.Discard, "", 0)
	httpServer := NewHTTPServer(cfg, mockMQTT, testStdout, testStderr)

	mux := http.NewServeMux()
	mux.HandleFunc("/post", corsMiddleware(httpServer.handleDataRequest))
	testServer := httptest.NewServer(mux)
	defer testServer.Close()

	makeRequest := func(payload []IncomingDataPoint) *http.Response {
		payloadBytes, _ := json.Marshal(payload)
		req, _ := http.NewRequest(http.MethodPost, testServer.URL+"/post", bytes.NewBuffer(payloadBytes))
		req.Header.Set("Content-Type", "application/json")
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatalf("Failed to send request: %v", err)
		}
		return resp
	}

	checkMessagesAndClear := func(expectedCount int, description string) {
		t.Helper()
		mockMQTT.publishLock.Lock()
		defer mockMQTT.publishLock.Unlock()
		actualCount := 0
		for _, payloads := range mockMQTT.PublishedMessages {
			actualCount += len(payloads)
		}
		if actualCount != expectedCount {
			t.Errorf("%s: Expected %d messages, got %d. Messages: %v", description, expectedCount, actualCount, mockMQTT.PublishedMessages)
		}
		mockMQTT.PublishedMessages = make(map[string][]string) // Reset
	}

	// --- Test Timestamp Logic ---
	channelNum := 1
	initialData := []IncomingDataPoint{{ChannelNumber: channelNum, Value: json.Number("10"), Color: "#111111"}}

	// 1. Initial request - should process, establishes initial timestamp
	t.Run("Initial request establishes timestamp", func(t *testing.T) {
		resp := makeRequest(initialData)
		if resp.StatusCode != http.StatusOK {
			t.Errorf("Expected status OK, got %d", resp.StatusCode)
		}
		checkMessagesAndClear(3, "Initial request") // Intensity, Color, OnOff ("1")

		httpServer.channelStatesLock.RLock()
		if httpServer.channelStates[channelNum].LastUpdateTimestamp.IsZero() {
			t.Errorf("LastUpdateTimestamp was not set after initial request")
		}
		httpServer.channelStatesLock.RUnlock()
	})

	// Store this first timestamp
	httpServer.channelStatesLock.RLock()
	firstTimestamp := httpServer.channelStates[channelNum].LastUpdateTimestamp
	httpServer.channelStatesLock.RUnlock()


	// 2. Out-of-order request - should be discarded
	t.Run("Out-of-order request is discarded", func(t *testing.T) {
		// Manually set the stored LastUpdateTimestamp to be *after* the firstTimestamp.
		// Any new request's server-generated timestamp will naturally be after firstTimestamp,
		// so to simulate an *older* incoming request, we make the stored one even newer.
		httpServer.channelStatesLock.Lock()
		futureTime := time.Now().Add(1 * time.Hour) // Clearly in the future relative to next request
		httpServer.channelStates[channelNum].LastUpdateTimestamp = futureTime
		httpServer.channelStatesLock.Unlock()

		// This request's server-generated timestamp will be ~Now, which is < futureTime.
		resp := makeRequest([]IncomingDataPoint{{ChannelNumber: channelNum, Value: json.Number("20"), Color: "#222222"}})
		if resp.StatusCode != http.StatusOK { // Expect OK as discard is silent
			t.Errorf("Expected status OK, got %d", resp.StatusCode)
		}
		checkMessagesAndClear(0, "Out-of-order request")

		// Verify LastUpdateTimestamp did NOT change from futureTime
		httpServer.channelStatesLock.RLock()
		if !httpServer.channelStates[channelNum].LastUpdateTimestamp.Equal(futureTime) {
			t.Errorf("LastUpdateTimestamp changed after a discarded request, expected %v, got %v", futureTime, httpServer.channelStates[channelNum].LastUpdateTimestamp)
		}
		httpServer.channelStatesLock.RUnlock()
	})

	// 3. In-order request (newer than stored) - should process
	t.Run("In-order request is processed", func(t *testing.T) {
		// Reset LastUpdateTimestamp to the first successful timestamp to ensure next request is newer.
		httpServer.channelStatesLock.Lock()
		httpServer.channelStates[channelNum].LastUpdateTimestamp = firstTimestamp
		httpServer.channelStatesLock.Unlock()

		// Brief pause to ensure time.Now() for the request is measurably after firstTimestamp
		// This is a bit fragile but often works for local tests.
		// A more robust way would be to inject a time source into the server.
		time.Sleep(5 * time.Millisecond)


		// This request's server-generated timestamp should be after firstTimestamp.
		// It changes intensity and color. OnOff is already "1".
		resp := makeRequest([]IncomingDataPoint{{ChannelNumber: channelNum, Value: json.Number("30"), Color: "#333333"}})
		if resp.StatusCode != http.StatusOK {
			t.Errorf("Expected status OK, got %d", resp.StatusCode)
		}
		checkMessagesAndClear(2, "In-order request") // Intensity, Color

		// Verify LastUpdateTimestamp DID change and is newer than firstTimestamp
		httpServer.channelStatesLock.RLock()
		newTimestamp := httpServer.channelStates[channelNum].LastUpdateTimestamp
		if newTimestamp.IsZero() || !newTimestamp.After(firstTimestamp) {
			t.Errorf("LastUpdateTimestamp expected to be after %v, got %v", firstTimestamp, newTimestamp)
		}
		httpServer.channelStatesLock.RUnlock()
	})
}
