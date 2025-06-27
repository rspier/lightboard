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

func main() {
	// 1. Parse command-line arguments
	configPath := flag.String("config", "config.yaml", "Path to the configuration file")
	flag.Parse()

	if *configPath == "" {
		log.Fatal("Configuration file path must be provided via -config flag.")
	}

	// 2. Load the configuration
	cfg, err := LoadConfig(*configPath)
	if err != nil {
		log.Fatalf("Failed to load configuration from '%s': %v", *configPath, err)
	}
	log.Printf("Configuration loaded successfully from %s", *configPath)

	// 3. Initialize the MQTT client
	mqttClient, err := NewMQTTClient(cfg)
	if err != nil {
		log.Fatalf("Failed to initialize MQTT client: %v", err)
	}
	defer mqttClient.Disconnect() // Ensure MQTT client is disconnected on exit

	// 4. Initialize and Start the HTTP server
	httpServer := NewHTTPServer(cfg, mqttClient)

	// Channel to listen for OS signals for graceful shutdown
	stopChan := make(chan os.Signal, 1)
	signal.Notify(stopChan, syscall.SIGINT, syscall.SIGTERM)

	// Channel for errors from the HTTP server
	errChan := make(chan error, 1)

	go func() {
		log.Printf("Starting HTTP server on %s...", cfg.HTTPListenAddr)
		if err := httpServer.Start(); err != nil {
			errChan <- err
		}
	}()

	// 5. Wait for shutdown signal or server error
	select {
	case err := <-errChan:
		log.Fatalf("HTTP server error: %v", err)
	case sig := <-stopChan:
		log.Printf("Received signal %v. Starting graceful shutdown...", sig)

		// Create a context with a timeout for the shutdown
		shutdownCtx, cancelShutdown := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancelShutdown()

		if err := httpServer.Shutdown(shutdownCtx); err != nil {
			log.Printf("HTTP server shutdown error: %v", err)
		} else {
			log.Println("HTTP server gracefully stopped.")
		}

		// MQTT client is disconnected via defer
		log.Println("Application shut down gracefully.")
	}
}
