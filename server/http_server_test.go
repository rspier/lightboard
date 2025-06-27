package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
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
	httpServer := NewHTTPServer(cfg, mockMQTT)

	// Setup test server using the correct endpoint from httpServer's Start method logic
	// We are directly calling handleDataRequest, so server.URL will be dynamic.
	// The endpoint used in NewRequest should match what's configured in httpServer.Start() -> "/post"
	testServer := httptest.NewServer(http.HandlerFunc(httpServer.handleDataRequest))
	defer testServer.Close()

	// Expected messages structure for verification
	type ExpectedMessage struct {
		Topic   string
		Payload string
	}

	tests := []struct {
		name                 string
		payload              []IncomingDataPoint // Used if rawPayload is empty
		rawPayload           string              // Used if non-empty, overrides payload
		expectedStatusCode   int
		expectedMessages     []ExpectedMessage // Slice of all expected messages across topics
		expectErrorInBody    bool
		expectedTotalPublishes int // Total number of publish calls expected
	}{
		{
			name: "Valid single data point (value > 0)",
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
		},
		{
			name: "Valid single data point (value == 0)",
			payload: []IncomingDataPoint{
				{ChannelNumber: 1, Value: json.Number("0"), Color: "#00FF00"},
			},
			expectedStatusCode: http.StatusOK,
			expectedMessages: []ExpectedMessage{
				{Topic: "ch1/intensity", Payload: "0.000000"},
				{Topic: "ch1/color", Payload: "#00FF00"},
				{Topic: "ch1/onoff", Payload: "0"},
			},
			expectedTotalPublishes: 3,
		},
		{
			name: "Valid multiple data points",
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
				{Topic: "ch2/onoff", Payload: "0"},
			},
			expectedTotalPublishes: 6,
		},
		{
			name:                   "Invalid JSON payload (empty array)",
			payload:                []IncomingDataPoint{},
			expectedStatusCode:     http.StatusBadRequest,
			expectedTotalPublishes: 0,
			expectErrorInBody:      true,
		},
		{
			name: "Unknown channel number",
			payload: []IncomingDataPoint{
				{ChannelNumber: 99, Value: json.Number("40"), Color: "#FFFF00"}, // Channel 99 not in testMappings
			},
			expectedStatusCode:     http.StatusMultiStatus,
			expectedTotalPublishes: 0,
			expectErrorInBody:      true,
		},
		{
			name: "Partial success - one known, one unknown channel number",
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
		},
		{
			name:                   "Invalid value type for a channel (raw JSON)",
			rawPayload:             `[{"channelNumber":1,"value":"not-a-number","color":"#123456"}]`,
			expectedStatusCode:     http.StatusBadRequest, // Fails full JSON decode due to invalid number
			expectedTotalPublishes: 0,
			expectErrorInBody:      true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockMQTT.PublishedMessages = make(map[string][]string) // Reset mock
			var payloadBytes []byte
			var err error

			if tt.rawPayload != "" {
				payloadBytes = []byte(tt.rawPayload)
			} else {
				payloadBytes, err = json.Marshal(tt.payload)
				if err != nil {
					t.Fatalf("Failed to marshal test payload: %v", err)
				}
			}
			// The testServer.URL already includes the host and port. We need to append the specific path.
			// The NewServeMux in Start() is not used when directly calling handleDataRequest via httptest.NewServer.
			// The httptest.NewServer itself uses the provided handler for all requests to server.URL.
			// So, the path in NewRequest doesn't strictly matter here as long as it hits the server.
			// However, for clarity, let's use a path, though it's not routed by the mux here.
			req, _ := http.NewRequest(http.MethodPost, testServer.URL+"/post", bytes.NewBuffer(payloadBytes))
			req.Header.Set("Content-Type", "application/json")

			resp, err := http.DefaultClient.Do(req)
			if err != nil {
				t.Fatalf("Failed to send request: %v", err)
			}
			defer resp.Body.Close()

			if resp.StatusCode != tt.expectedStatusCode {
				t.Errorf("Expected status code %d, got %d", tt.expectedStatusCode, resp.StatusCode)
			}

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
				if !ok {
					t.Errorf("Expected message on topic '%s', but no messages found on this topic. Expected payload: '%s'",
						expectedMsg.Topic, expectedMsg.Payload)
					continue
				}
				if !containsMessage(msgsOnTopic, expectedMsg.Payload) {
					t.Errorf("Topic '%s': Expected to find payload '%s', but got messages: %v",
						expectedMsg.Topic, expectedMsg.Payload, msgsOnTopic)
				}
			}
		})
	}
}
