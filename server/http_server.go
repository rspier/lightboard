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
	LastOnOffState   *string  // Use pointer to distinguish between "0" and not set
	lastIntensityStr string   // Store string representation for direct comparison
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

	var processingErrors []string // Slice for config/data validation errors (before goroutines)
	var publishErrors []string    // Slice for MQTT publish errors (collected from goroutines)
	var mu sync.Mutex             // Mutex to protect concurrent appends to publishErrors
	var wg sync.WaitGroup

	successfulProcessingAttempts := 0 // Count of DPs that started processing in a goroutine

	for _, dp := range dataPoints {
		wg.Add(1)
		go func(dataPoint IncomingDataPoint) {
			defer wg.Done()

			localPublishErrors := []string{} // Errors specific to this goroutine's publish attempts

			hs.channelMapLock.RLock()
			mapping, ok := hs.channelMap[dataPoint.ChannelNumber]
			hs.channelMapLock.RUnlock()

			if !ok {
				errMsg := fmt.Sprintf("No topic mapping found for channelNumber: %d", dataPoint.ChannelNumber)
				hs.stderrLog.Println(errMsg)
				// This error happens before MQTT publishing, so it's a processing error.
				// We need a way to collect these if they happen inside a goroutine,
				// or validate them before starting goroutines.
				// For now, let's assume this validation is quick and can remain outside,
				// or we collect them into a shared slice with a mutex.
				// Let's move pre-flight checks (channel mapping, value parsing) outside the goroutine.
				// For this iteration, let's keep it simple and collect all errors via mutex.
				mu.Lock()
				processingErrors = append(processingErrors, errMsg)
				mu.Unlock()
				return
			}

			valueFloat, err := dataPoint.Value.Float64()
			if err != nil {
				errMsg := fmt.Sprintf("Invalid value for channelNumber %d: %v", dataPoint.ChannelNumber, err)
				hs.stderrLog.Println(errMsg)
				mu.Lock()
				processingErrors = append(processingErrors, errMsg)
				mu.Unlock()
				return
			}

			// --- State-aware Publishing (inside goroutine) ---
			hs.channelStatesLock.Lock() // Lock before reading or modifying channel state for this specific channel

			state, stateExists := hs.channelStates[dataPoint.ChannelNumber]
			if !stateExists {
				state = &ChannelState{}
				hs.channelStates[dataPoint.ChannelNumber] = state
			}

			// 1. Process Intensity
			currentIntensityStr := fmt.Sprintf("%f", valueFloat)
			intensityChanged := state.LastIntensity == nil || *state.LastIntensity != valueFloat
			if intensityChanged {
				if pubErr := hs.mqttClient.Publish(mapping.IntensityTopic, currentIntensityStr); pubErr != nil {
					errMsg := fmt.Sprintf("Failed to publish intensity to MQTT topic '%s' for channelNumber %d: %v", mapping.IntensityTopic, dataPoint.ChannelNumber, pubErr)
					hs.stderrLog.Println(errMsg)
					localPublishErrors = append(localPublishErrors, errMsg)
				} else {
					oldIntensityVal := "nil"
					if state.LastIntensity != nil {
						oldIntensityVal = fmt.Sprintf("%f", *state.LastIntensity)
					}
					hs.stderrLog.Printf("CH%d: Intensity changed (%s -> %f), published to %s", dataPoint.ChannelNumber, oldIntensityVal, valueFloat, mapping.IntensityTopic)
					valCopy := valueFloat
					state.LastIntensity = &valCopy
					state.lastIntensityStr = currentIntensityStr
				}
			} else {
				hs.stderrLog.Printf("CH%d: Intensity unchanged (%f), not publishing.", dataPoint.ChannelNumber, valueFloat)
			}

			// 2. Process Color
			colorChanged := state.LastColor == nil || *state.LastColor != dataPoint.Color
			if colorChanged {
				if pubErr := hs.mqttClient.Publish(mapping.ColorTopic, dataPoint.Color); pubErr != nil {
					errMsg := fmt.Sprintf("Failed to publish color to MQTT topic '%s' for channelNumber %d: %v", mapping.ColorTopic, dataPoint.ChannelNumber, pubErr)
					hs.stderrLog.Println(errMsg)
					localPublishErrors = append(localPublishErrors, errMsg)
				} else {
					oldColorVal := "nil"
					if state.LastColor != nil {
						oldColorVal = *state.LastColor
					}
					hs.stderrLog.Printf("CH%d: Color changed (%s -> %s), published to %s", dataPoint.ChannelNumber, oldColorVal, dataPoint.Color, mapping.ColorTopic)
					colorCopy := dataPoint.Color
					state.LastColor = &colorCopy
				}
			} else {
				hs.stderrLog.Printf("CH%d: Color unchanged (%s), not publishing.", dataPoint.ChannelNumber, dataPoint.Color)
			}

			// 3. Process On/Off state
			newOnOffState := "0"
			if valueFloat > 0 {
				newOnOffState = "1"
			}
			onOffStateChanged := state.LastOnOffState == nil || *state.LastOnOffState != newOnOffState
			if onOffStateChanged {
				if pubErr := hs.mqttClient.Publish(mapping.OnOffTopic, newOnOffState); pubErr != nil {
					errMsg := fmt.Sprintf("Failed to publish on/off state to MQTT topic '%s' for channelNumber %d: %v", mapping.OnOffTopic, dataPoint.ChannelNumber, pubErr)
					hs.stderrLog.Println(errMsg)
					localPublishErrors = append(localPublishErrors, errMsg)
				} else {
					oldOnOffVal := "nil"
					if state.LastOnOffState != nil {
						oldOnOffVal = *state.LastOnOffState
					}
					hs.stderrLog.Printf("CH%d: On/Off state changed (%s -> %s), published to %s", dataPoint.ChannelNumber, oldOnOffVal, newOnOffState, mapping.OnOffTopic)
					onOffCopy := newOnOffState
					state.LastOnOffState = &onOffCopy
				}
			} else {
				hs.stderrLog.Printf("CH%d: On/Off state unchanged (%s), not publishing.", dataPoint.ChannelNumber, newOnOffState)
			}

			hs.channelStatesLock.Unlock()
			// -------------------------------------------------

			// Log current state to stdoutLog AFTER state lock is released
			// This ensures we log the state that was just potentially updated.
			// We need to read the state again, or pass the relevant parts out of the critical section.
			// For simplicity, let's re-acquire the lock for a brief read for stdout logging.
			// A more optimized way might be to copy the relevant state parts (valueFloat, dataPoint.Color, newOnOffState)
			// before unlocking and use those for stdout logging.
			// Let's try the optimized way: capture the final state values for logging.

			finalIntensityForLog := valueFloat
			finalColorForLog := dataPoint.Color
			finalOnOffStateForLog := newOnOffState // This was determined before lock for OnOff

			// Log to stdout
			// Example: "CH 101 | Intensity: 75.50 | Color: [■■] #FF0000 | State: On"
			// Using a simple block for color for now.
			displayColor := formatColorForTerminal(finalColorForLog)
			onOffDisplay := "Off"
			if finalOnOffStateForLog == "1" {
				onOffDisplay = "On"
			}
			hs.stdoutLog.Printf("CH %3d | Intensity: %6.2f | Color: %s %s | State: %s",
				dataPoint.ChannelNumber,
				finalIntensityForLog,
				displayColor, // The colored block
				finalColorForLog, // The hex string
				onOffDisplay,
			)


			if len(localPublishErrors) > 0 {
				mu.Lock()
				publishErrors = append(publishErrors, localPublishErrors...)
				mu.Unlock()
			} else {
				// Only count as "successful" if this goroutine had no publish errors for its DP
				mu.Lock()
				successfulProcessingAttempts++ // This counts DPs for which publishing was attempted and had no errors.
				mu.Unlock()
			}

		}(dp) // Pass dp by value to avoid loop variable capture issues
	}

	wg.Wait() // Wait for all goroutines to complete

	// Consolidate errors for the response
	// Note: successfulMessages is now successfulProcessingAttempts
	if len(processingErrors) > 0 || len(publishErrors) > 0 {
		allErrors := append(processingErrors, publishErrors...)
		hs.stderrLog.Printf("%d data points processed (attempted). Encountered errors: %v", len(dataPoints), allErrors)
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
	fmt.Fprintf(w, "Successfully processed %d data points.\n", successfulProcessingAttempts)
}
