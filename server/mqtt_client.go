package main

import (
	"fmt"
	"log"
	"time"

	mqtt "github.com/eclipse/paho.mqtt.golang"
)

// MQTTClient wraps the Paho MQTT client
type MQTTClient struct {
	client    mqtt.Client
	config    *Config
	stderrLog *log.Logger
}

// NewMQTTClient creates and connects an MQTT client
func NewMQTTClient(cfg *Config, logger *log.Logger) (*MQTTClient, error) {
	opts := mqtt.NewClientOptions()
	opts.AddBroker(cfg.MQTTBroker)
	opts.SetClientID(cfg.MQTTClientID)
	if cfg.MQTTUsername != "" {
		opts.SetUsername(cfg.MQTTUsername)
	}
	if cfg.MQTTPassword != "" {
		opts.SetPassword(cfg.MQTTPassword)
	}

	opts.SetKeepAlive(60 * time.Second)
	opts.SetPingTimeout(5 * time.Second) // Increased from 2 to 5 for more leniency
	opts.SetConnectTimeout(10 * time.Second) // Increased from 5 to 10
	opts.SetAutoReconnect(true)
	opts.SetMaxReconnectInterval(1 * time.Minute)
	opts.SetCleanSession(true) // Important for bridge scenarios to not miss messages if broker expects it

	// Connection Lost Handler
	opts.SetConnectionLostHandler(func(client mqtt.Client, err error) {
		logger.Printf("MQTT connection lost: %v. Attempting to reconnect...", err)
	})

	// On Connect Handler
	opts.SetOnConnectHandler(func(client mqtt.Client) {
		logger.Println("Successfully connected to MQTT broker")
		// You could subscribe to topics here if needed, but this service primarily publishes
	})

	// Reconnect Handler (called when a reconnect attempt is successful)
	opts.SetReconnectingHandler(func(client mqtt.Client, options *mqtt.ClientOptions) {
		logger.Println("Attempting to reconnect to MQTT broker...")
	})

	client := mqtt.NewClient(opts)
	if token := client.Connect(); token.Wait() && token.Error() != nil {
		return nil, fmt.Errorf("failed to connect to MQTT broker %s: %w", cfg.MQTTBroker, token.Error())
	}

	logger.Printf("MQTT client connected to %s with ClientID: %s", cfg.MQTTBroker, cfg.MQTTClientID)
	return &MQTTClient{client: client, config: cfg, stderrLog: logger}, nil
}

// Publish publishes a message to the given topic
func (m *MQTTClient) Publish(topic string, payload interface{}) error {
	token := m.client.Publish(topic, 0, false, payload) // Using QoS 0, non-retained for now
	// token.Wait() // Can wait for confirmation, but for high throughput, might not be necessary
	// For fire-and-forget, we might not wait. If delivery confirmation is critical, WaitTimeout.
	// token.Wait() // Synchronous wait, blocks until ack (for QoS > 0) or message sent (QoS 0).
	// For better error reporting back to the caller, we use WaitTimeout.
	if token.WaitTimeout(5 * time.Second) { // Wait up to 5 seconds for the operation to complete.
		if token.Error() != nil {
			// Log the error here as well, as it's an MQTT client-level issue.
			m.stderrLog.Printf("MQTT Publish Error to topic %s: %v", topic, token.Error())
			return token.Error() // Return the error to the caller.
		}
		// Publish successful (or at least, no error reported by the client library within the timeout for QoS 0)
		return nil
	}
	// Timeout occurred
	m.stderrLog.Printf("MQTT Publish Timeout to topic %s after 5s", topic)
	return fmt.Errorf("mqtt publish to topic %s timed out after 5 seconds", topic)
}

// Disconnect disconnects the MQTT client
func (m *MQTTClient) Disconnect() {
	if m.client.IsConnected() {
		m.stderrLog.Println("Disconnecting MQTT client...")
		m.client.Disconnect(250) // 250ms timeout for disconnection
	}
	m.stderrLog.Println("MQTT client disconnected.")
}
