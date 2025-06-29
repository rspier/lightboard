package main

import (
	"context"
	"flag"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"
)

var (
	stdoutLog *log.Logger
	stderrLog *log.Logger
)

func main() {
	// Initialize loggers
	// stdoutLog for general, non-error output (e.g., current values display)
	stdoutLog = log.New(os.Stdout, "", log.LstdFlags)
	// stderrLog for errors and diagnostic information
	stderrLog = log.New(os.Stderr, "ERROR: ", log.LstdFlags|log.Lshortfile)

	// Redirect standard log output to stderrLog by default, so any library using `log.Print` goes to stderr.
	// Individual log statements in our code will use either stdoutLog or stderrLog explicitly.
	// Note: If we want to capture *all* log package output (from dependencies) to our stderrLog format,
	// we might need to do log.SetOutput(stderrLog.Writer()). However, this changes the global logger.
	// For now, we'll explicitly use our loggers.
	// For Fatalf, etc., we'll use stderrLog.Fatalf

	// 1. Parse command-line arguments
	configPath := flag.String("config", "config.yaml", "Path to the configuration file")
	flag.Parse()

	if *configPath == "" {
		stderrLog.Fatal("Configuration file path must be provided via -config flag.")
	}

	// 2. Load the configuration
	cfg, err := LoadConfig(*configPath) // LoadConfig will also use stderrLog for its errors
	if err != nil {
		stderrLog.Fatalf("Failed to load configuration from '%s': %v", *configPath, err)
	}
	stderrLog.Printf("Configuration loaded successfully from %s", *configPath)

	// 3. Initialize the MQTT client
	// NewMQTTClient will need to be updated to use stderrLog
	mqttClient, err := NewMQTTClient(cfg, stderrLog)
	if err != nil {
		stderrLog.Fatalf("Failed to initialize MQTT client: %v", err)
	}
	defer mqttClient.Disconnect() // Ensure MQTT client is disconnected on exit

	// 4. Initialize and Start the HTTP server
	// NewHTTPServer will need to be updated to use both loggers
	httpServer := NewHTTPServer(cfg, mqttClient, stdoutLog, stderrLog)

	// Channel to listen for OS signals for graceful shutdown
	stopChan := make(chan os.Signal, 1)
	signal.Notify(stopChan, syscall.SIGINT, syscall.SIGTERM)

	// Channel for errors from the HTTP server
	errChan := make(chan error, 1)

	go func() {
		stderrLog.Printf("Starting HTTP server on %s...", cfg.HTTPListenAddr)
		if err := httpServer.Start(); err != nil { // Start will use its own logger
			errChan <- err
		}
	}()

	// 5. Wait for shutdown signal or server error
	select {
	case err := <-errChan:
		stderrLog.Fatalf("HTTP server error: %v", err)
	case sig := <-stopChan:
		stderrLog.Printf("Received signal %v. Starting graceful shutdown...", sig)

		// Create a context with a timeout for the shutdown
		shutdownCtx, cancelShutdown := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancelShutdown()

		if err := httpServer.Shutdown(shutdownCtx); err != nil {
			stderrLog.Printf("HTTP server shutdown error: %v", err)
		} else {
			stderrLog.Println("HTTP server gracefully stopped.")
		}

		// MQTT client is disconnected via defer (Disconnect method will use its logger)
		stderrLog.Println("Application shut down gracefully.")
	}
}
