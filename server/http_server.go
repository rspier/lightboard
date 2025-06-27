package main

import (
	"context" // Added context
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
)

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
}

// IncomingDataPoint represents a single data point from the HTTP JSON array
type IncomingDataPoint struct {
	ChannelNumber int         `json:"channelNumber"` // Changed from ChannelDescription
	Value         json.Number `json:"value"`
	Color         string      `json:"color"`
}

// MQTTMessagePayload struct is removed as it's no longer used.

// NewHTTPServer creates a new HTTP server instance
func NewHTTPServer(cfg *Config, mqttClient MQTTClientInterface) *HTTPServer { // Using the interface
	hs := &HTTPServer{
		config:     cfg,
		mqttClient: mqttClient,
		channelMap: make(map[int]ChannelMapping), // Initialize new channelMap
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

	log.Printf("HTTP server listening on %s", hs.config.HTTPListenAddr)
	if err := hs.serverInstance.ListenAndServe(); err != http.ErrServerClosed {
		return fmt.Errorf("http server ListenAndServe error: %w", err)
	}
	return nil
}

// Shutdown gracefully shuts down the HTTP server
func (hs *HTTPServer) Shutdown(ctx_ context.Context) error {
	if hs.serverInstance != nil {
		log.Println("Shutting down HTTP server...")
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
		log.Printf("Error decoding JSON request: %v", err)
		http.Error(w, fmt.Sprintf("Invalid JSON payload: %v", err), http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	if len(dataPoints) == 0 {
		log.Println("Received empty data array")
		http.Error(w, "Received empty data array", http.StatusBadRequest)
		return
	}

	var processingErrors []string
	var successfulMessages int
	var publishErrors []string // Keep track of errors during individual MQTT publishes

	for _, dp := range dataPoints {
		hs.channelMapLock.RLock()
		mapping, ok := hs.channelMap[dp.ChannelNumber]
		hs.channelMapLock.RUnlock()

		if !ok {
			errMsg := fmt.Sprintf("No topic mapping found for channelNumber: %d", dp.ChannelNumber)
			log.Println(errMsg)
			processingErrors = append(processingErrors, errMsg) // This is a config/request data error
			continue
		}

		valueFloat, err := dp.Value.Float64()
		if err != nil {
			errMsg := fmt.Sprintf("Invalid value for channelNumber %d: %v", dp.ChannelNumber, err)
			log.Println(errMsg)
			processingErrors = append(processingErrors, errMsg) // This is a data error
			continue
		}

		// 1. Publish Intensity (Value)
		// Convert float to string for MQTT payload, or send as number if broker/client handles it.
		// For simplicity, sending as string.
		intensityPayload := fmt.Sprintf("%f", valueFloat)
		if err := hs.mqttClient.Publish(mapping.IntensityTopic, intensityPayload); err != nil {
			errMsg := fmt.Sprintf("Failed to publish intensity to MQTT topic '%s' for channelNumber %d: %v", mapping.IntensityTopic, dp.ChannelNumber, err)
			log.Println(errMsg)
			publishErrors = append(publishErrors, errMsg)
		} else {
			log.Printf("Published intensity to %s: %s", mapping.IntensityTopic, intensityPayload)
		}

		// 2. Publish Color
		if err := hs.mqttClient.Publish(mapping.ColorTopic, dp.Color); err != nil {
			errMsg := fmt.Sprintf("Failed to publish color to MQTT topic '%s' for channelNumber %d: %v", mapping.ColorTopic, dp.ChannelNumber, err)
			log.Println(errMsg)
			publishErrors = append(publishErrors, errMsg)
		} else {
			log.Printf("Published color to %s: %s", mapping.ColorTopic, dp.Color)
		}

		// 3. Publish On/Off state
		onOffState := "0" // Default to Off
		if valueFloat > 0 { // Assuming value > 0 means "On"
			onOffState = "1"
		}
		if err := hs.mqttClient.Publish(mapping.OnOffTopic, onOffState); err != nil {
			errMsg := fmt.Sprintf("Failed to publish on/off state to MQTT topic '%s' for channelNumber %d: %v", mapping.OnOffTopic, dp.ChannelNumber, err)
			log.Println(errMsg)
			publishErrors = append(publishErrors, errMsg)
		} else {
			log.Printf("Published on/off state to %s: %s", mapping.OnOffTopic, onOffState)
		}

		// Consider a data point successfully processed if its initial validation passed,
		// even if some of its MQTT publishes failed. The publishErrors are for more granular feedback.
		// Or, only count if all three publishes for this dp succeed.
		// For now, let's count it if we attempted to publish for it.
		// A more robust approach might be to check if all publishErrors related to this dp are nil.
		// Let's refine: only increment successfulMessages if all publishes for this dp were without error.
		// However, the current publishErrors array is global to the request, not per dp.
		// So, for now, let's assume a simpler success metric: if we got this far for the dp.
		// This means `successfulMessages` counts DPs that passed initial validation.
		// The final response will indicate if there were any `processingErrors` (bad data) or `publishErrors` (MQTT issues).

		successfulMessages++ // Count that we processed this data point structure
	}

	// Consolidate errors for the response
	if len(processingErrors) > 0 || len(publishErrors) > 0 {
		allErrors := append(processingErrors, publishErrors...)
		log.Printf("%d data points processed. Encountered errors: %v", successfulMessages, allErrors)
		http.Error(w, fmt.Sprintf("Completed with errors: %v", allErrors), http.StatusMultiStatus) // 207 Multi-Status
		return
	}

	if len(processingErrors) > 0 { // This block is now effectively part of the combined check above.
		log.Printf("%d messages processed successfully, %d errors.", successfulMessages, len(processingErrors))
		http.Error(w, fmt.Sprintf("Completed with errors: %v", processingErrors), http.StatusMultiStatus)
		return
	}

	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, "Successfully processed %d data points.\n", successfulMessages)
}
