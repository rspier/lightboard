package main

import (
	"context" // Added context
	"encoding/json"
	"encoding/hex"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"
)

const (
	ansiReset        = "\033[0m"
	ansiTrueColorFG  = "\033[38;2;%d;%d;%dm"
	ansiTrueColorBG  = "\033[48;2;%d;%d;%dm"
	ansiInverseVideo = "\033[7m" // To make the color block visible
)

// hexToRGB converts a hex color string (e.g., "#RRGGBB") to R, G, B integers.
func hexToRGB(hexColor string) (r, g, b int, err error) {
	hexColor = strings.TrimPrefix(hexColor, "#")
	if len(hexColor) != 6 {
		return 0, 0, 0, fmt.Errorf("invalid hex color string length: %s", hexColor)
	}

	rgb, err := hex.DecodeString(hexColor)
	if err != nil {
		return 0, 0, 0, fmt.Errorf("failed to decode hex string '%s': %w", hexColor, err)
	}
	return int(rgb[0]), int(rgb[1]), int(rgb[2]), nil
}

// formatColorForTerminal formats a hex color string with ANSI TrueColor escape codes.
// It displays a small block of the color.
func formatColorForTerminal(hexColor string) string {
	r, g, b, err := hexToRGB(hexColor)
	if err != nil {
		return hexColor // Return original if conversion fails
	}
	// Display as a colored block (e.g., using background color with a space or inverse video)
	return fmt.Sprintf(ansiTrueColorBG, r, g, b) + "  " + ansiReset // Two spaces for a small block
}

// MQTTClientInterface defines the methods our HTTP server needs from an MQTT client.
type MQTTClientInterface interface {
	Publish(topic string, payload interface{}) error
	Disconnect()
}

// HTTPServer wraps the HTTP server logic
type HTTPServer struct {
	config         *Config
	mqttClient     MQTTClientInterface    // Using the interface
	channelMap     map[int]ChannelMapping // Changed: map channel number to full ChannelMapping
	channelMapLock sync.RWMutex
	serverInstance *http.Server
	stdoutLog      *log.Logger
	stderrLog      *log.Logger

	// State management for channels
	channelStates     map[int]*ChannelState
	channelStatesLock sync.RWMutex
}

// ChannelState stores the last sent values for a channel
type ChannelState struct {
	LastIntensity    *float64 // Use pointer to distinguish between 0 and not set
	LastColor        *string  // Use pointer to distinguish between empty string and not set
	LastOnOffState   *string  // Use pointer to distinguish between "0" and not set (will always be "1" after first set)
	LastUpdateTimestamp time.Time // Timestamp of the last successful update for this channel
}

// IncomingDataPoint represents a single data point from the HTTP JSON array
type IncomingDataPoint struct {
	ChannelNumber int         `json:"channelNumber"` // Changed from ChannelDescription
	Value         json.Number `json:"value"`
	Color         string      `json:"color"`
}

// MQTTMessagePayload struct is removed as it's no longer used.

// NewHTTPServer creates a new HTTP server instance
func NewHTTPServer(cfg *Config, mqttClient MQTTClientInterface, stdoutLogger, stderrLogger *log.Logger) *HTTPServer { // Using the interface
	hs := &HTTPServer{
		config:        cfg,
		mqttClient:    mqttClient,
		channelMap:    make(map[int]ChannelMapping), // Initialize new channelMap
		stdoutLog:     stdoutLogger,
		stderrLog:     stderrLogger,
		channelStates: make(map[int]*ChannelState), // Initialize channel states map
	}

	// Populate the channel map for quick lookups
	hs.channelMapLock.Lock()
	for _, mapping := range cfg.ChannelMappings {
		hs.channelMap[mapping.ChannelNumber] = mapping // Use ChannelNumber as key
	}
	hs.channelMapLock.Unlock()

	return hs
}

// corsMiddleware adds necessary CORS headers and handles OPTIONS preflight requests
func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization") // Common headers

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent) // 204
			return
		}

		next(w, r)
	}
}

// Start begins listening for HTTP requests
func (hs *HTTPServer) Start() error {
	mux := http.NewServeMux()
	mux.HandleFunc("/post", corsMiddleware(hs.handleDataRequest)) // Wrap handler with CORS middleware
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		// Health check typically doesn't need CORS for GET requests from browsers,
		// but if it were accessed via JS from another origin, it might.
		// For simplicity, not wrapping health check with CORS unless specified.
		w.WriteHeader(http.StatusOK)
		fmt.Fprintln(w, "OK")
	})

	hs.serverInstance = &http.Server{
		Addr:    hs.config.HTTPListenAddr,
		Handler: mux,
	}

	hs.stderrLog.Printf("HTTP server listening on %s", hs.config.HTTPListenAddr)
	if err := hs.serverInstance.ListenAndServe(); err != http.ErrServerClosed {
		return fmt.Errorf("http server ListenAndServe error: %w", err)
	}
	return nil
}

// Shutdown gracefully shuts down the HTTP server
func (hs *HTTPServer) Shutdown(ctx_ context.Context) error {
	if hs.serverInstance != nil {
		hs.stderrLog.Println("Shutting down HTTP server...")
		return hs.serverInstance.Shutdown(ctx_)
	}
	return nil
}

func (hs *HTTPServer) handleDataRequest(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Only POST method is accepted", http.StatusMethodNotAllowed)
		return
	}

	var dataPoints []IncomingDataPoint
	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&dataPoints); err != nil {
		hs.stderrLog.Printf("Error decoding JSON request: %v", err)
		http.Error(w, fmt.Sprintf("Invalid JSON payload: %v", err), http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	if len(dataPoints) == 0 {
		hs.stderrLog.Println("Received empty data array")
		http.Error(w, "Received empty data array", http.StatusBadRequest)
		return
	}

	requestTimestamp := time.Now()
	var processingErrors []string // For setup errors (missing mapping, bad value)
	var publishErrors []string    // For MQTT publish errors
	processedDataPoints := 0      // Count of data points that were not discarded and attempted processing

	oneString := "1" // Constant for OnOffState "1"

	for _, dp := range dataPoints {
		hs.channelMapLock.RLock()
		mapping, ok := hs.channelMap[dp.ChannelNumber]
		hs.channelMapLock.RUnlock()

		if !ok {
			errMsg := fmt.Sprintf("No topic mapping found for channelNumber: %d", dp.ChannelNumber)
			hs.stderrLog.Println(errMsg)
			processingErrors = append(processingErrors, errMsg)
			continue // Skip this data point
		}

		valueFloat, err := dp.Value.Float64()
		if err != nil {
			errMsg := fmt.Sprintf("Invalid value for channelNumber %d: %v", dp.ChannelNumber, err)
			hs.stderrLog.Println(errMsg)
			processingErrors = append(processingErrors, errMsg)
			continue // Skip this data point
		}

		// --- All processing for a data point is now under a single lock acquisition ---
		hs.channelStatesLock.Lock()

		state, stateExists := hs.channelStates[dp.ChannelNumber]
		if !stateExists {
			state = &ChannelState{}
			hs.channelStates[dp.ChannelNumber] = state
		}

		// Timestamp Check for out-of-order requests
		if !state.LastUpdateTimestamp.IsZero() && requestTimestamp.Before(state.LastUpdateTimestamp) {
			hs.stderrLog.Printf("CH%d: Discarding out-of-order data point. Request ts %v, last update ts %v",
				dp.ChannelNumber, requestTimestamp, state.LastUpdateTimestamp)
			hs.channelStatesLock.Unlock()
			continue // Silently discard and move to the next data point
		}

		processedDataPoints++

		// 1. Process On/Off state (Always "1")
		// Publish "1" only if it wasn't "1" before or is new.
		if state.LastOnOffState == nil || *state.LastOnOffState != oneString {
			if pubErr := hs.mqttClient.Publish(mapping.OnOffTopic, oneString); pubErr != nil {
				errMsg := fmt.Sprintf("Failed to publish OnOff state to MQTT topic '%s' for CH%d: %v", mapping.OnOffTopic, dp.ChannelNumber, pubErr)
				hs.stderrLog.Println(errMsg)
				publishErrors = append(publishErrors, errMsg)
			} else {
				oldState := "nil"
				if state.LastOnOffState != nil {
					oldState = *state.LastOnOffState
				}
				hs.stderrLog.Printf("CH%d: OnOff state set to '1' (was %s), published to %s", dp.ChannelNumber, oldState, mapping.OnOffTopic)
				state.LastOnOffState = &oneString
				// stateModifiedInThisRequest was here
			}
		} else {
			// Even if not published, ensure internal state is "1" if this is a valid, newer request
			if state.LastOnOffState == nil { // Should not happen if already "1", but defensive
				state.LastOnOffState = &oneString
				// stateModifiedInThisRequest = true; // Not strictly a modification if it was already implicitly 1
			}
			hs.stderrLog.Printf("CH%d: OnOff state already '1', not publishing.", dp.ChannelNumber)
		}


		// 2. Process Intensity
		currentIntensityStr := fmt.Sprintf("%f", valueFloat)
		intensityChanged := state.LastIntensity == nil || *state.LastIntensity != valueFloat
		if intensityChanged {
			if pubErr := hs.mqttClient.Publish(mapping.IntensityTopic, currentIntensityStr); pubErr != nil {
				errMsg := fmt.Sprintf("Failed to publish intensity to MQTT topic '%s' for CH%d: %v", mapping.IntensityTopic, dp.ChannelNumber, pubErr)
				hs.stderrLog.Println(errMsg)
				publishErrors = append(publishErrors, errMsg)
			} else {
				oldVal := "nil"
				if state.LastIntensity != nil {
					oldVal = fmt.Sprintf("%f", *state.LastIntensity)
				}
				hs.stderrLog.Printf("CH%d: Intensity changed (%s -> %f), published to %s", dp.ChannelNumber, oldVal, valueFloat, mapping.IntensityTopic)
				valCopy := valueFloat
				state.LastIntensity = &valCopy
				// stateModifiedInThisRequest was here
			}
		} else {
			hs.stderrLog.Printf("CH%d: Intensity unchanged (%f), not publishing.", dp.ChannelNumber, valueFloat)
		}

		// 3. Process Color
		colorChanged := state.LastColor == nil || *state.LastColor != dp.Color
		if colorChanged {
			if pubErr := hs.mqttClient.Publish(mapping.ColorTopic, dp.Color); pubErr != nil {
				errMsg := fmt.Sprintf("Failed to publish color to MQTT topic '%s' for CH%d: %v", mapping.ColorTopic, dp.ChannelNumber, pubErr)
				hs.stderrLog.Println(errMsg)
				publishErrors = append(publishErrors, errMsg)
			} else {
				oldVal := "nil"
				if state.LastColor != nil {
					oldVal = *state.LastColor
				}
				hs.stderrLog.Printf("CH%d: Color changed (%s -> %s), published to %s", dp.ChannelNumber, oldVal, dp.Color, mapping.ColorTopic)
				colorCopy := dp.Color
				state.LastColor = &colorCopy
				// stateModifiedInThisRequest was here
			}
		} else {
			hs.stderrLog.Printf("CH%d: Color unchanged (%s), not publishing.", dp.ChannelNumber, dp.Color)
		}

		// Update timestamp if the channel's data was processed (not discarded as out-of-order)
		// and potentially modified state (or was a valid new value that matched existing).
		// The fact that we passed the timestamp check means this request is valid for this channel's timeline.
		state.LastUpdateTimestamp = requestTimestamp
		// We can also use stateModifiedInThisRequest if we only want to update timestamp on actual change.
		// But plan says: "If any part of the state ... was updated ... or would have been published ... update LastUpdateTimestamp"
		// This means any valid, non-discarded request for a channel updates its timestamp.

		hs.channelStatesLock.Unlock()

		// Log current state to stdoutLog
		// Values used for logging are the incoming dp values as they represent the new "current" state.
		displayColor := formatColorForTerminal(dp.Color)
		// OnOff is always "On" for display now if processed
		hs.stdoutLog.Printf("CH %3d | Intensity: %6.2f | Color: %s %s | State: On | LastUpdate: %s",
			dp.ChannelNumber,
			valueFloat,
			displayColor,
			dp.Color,
			requestTimestamp.Format(time.RFC3339Nano),
		)
	} // End of loop over dataPoints

	// Consolidate errors for the response
	if len(processingErrors) > 0 || len(publishErrors) > 0 {
		allErrors := append(processingErrors, publishErrors...)
		hs.stderrLog.Printf("%d data points processed. Encountered errors: %v", processedDataPoints, allErrors)
		http.Error(w, fmt.Sprintf("Completed with errors: %v", allErrors), http.StatusMultiStatus) // 207 Multi-Status
		return
	}

	// This block is redundant due to the check above. Removed.
	// if len(processingErrors) > 0 {
	// 	hs.stderrLog.Printf("%d messages processed successfully, %d errors.", successfulMessages, len(processingErrors))
	// 	http.Error(w, fmt.Sprintf("Completed with errors: %v", processingErrors), http.StatusMultiStatus)
	// 	return
	// }

	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, "Successfully processed %d data points.\n", processedDataPoints)
}
