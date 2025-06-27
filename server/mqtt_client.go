package main

import (
	"fmt"
	"log"
	"time"

	mqtt "github.com/eclipse/paho.mqtt.golang"
)

// MQTTClient wraps the Paho MQTT client
type MQTTClient struct {
	client mqtt.Client
	config *Config
}

// NewMQTTClient creates and connects an MQTT client
func NewMQTTClient(cfg *Config) (*MQTTClient, error) {
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
		log.Printf("MQTT connection lost: %v. Attempting to reconnect...", err)
	})

	// On Connect Handler
	opts.SetOnConnectHandler(func(client mqtt.Client) {
		log.Println("Successfully connected to MQTT broker")
		// You could subscribe to topics here if needed, but this service primarily publishes
	})

	// Reconnect Handler (called when a reconnect attempt is successful)
	opts.SetReconnectingHandler(func(client mqtt.Client, options *mqtt.ClientOptions) {
		log.Println("Attempting to reconnect to MQTT broker...")
	})

	client := mqtt.NewClient(opts)
	if token := client.Connect(); token.Wait() && token.Error() != nil {
		return nil, fmt.Errorf("failed to connect to MQTT broker %s: %w", cfg.MQTTBroker, token.Error())
	}

	log.Printf("MQTT client connected to %s with ClientID: %s", cfg.MQTTBroker, cfg.MQTTClientID)
	return &MQTTClient{client: client, config: cfg}, nil
}

// Publish publishes a message to the given topic
func (m *MQTTClient) Publish(topic string, payload interface{}) error {
	token := m.client.Publish(topic, 0, false, payload) // Using QoS 0, non-retained for now
	// token.Wait() // Can wait for confirmation, but for high throughput, might not be necessary
	// For fire-and-forget, we might not wait. If delivery confirmation is critical, WaitTimeout.
	go func() { // Asynchronous handling of the token
		if token.WaitTimeout(5*time.Second) && token.Error() != nil {
			log.Printf("Failed to publish message to topic %s: %v", topic, token.Error())
		}
	}()
	return nil // Return immediately for async publishing
}

// Disconnect disconnects the MQTT client
func (m *MQTTClient) Disconnect() {
	if m.client.IsConnected() {
		log.Println("Disconnecting MQTT client...")
		m.client.Disconnect(250) // 250ms timeout for disconnection
	}
	log.Println("MQTT client disconnected.")
}
