package main

import (
	"fmt"
	"os"

	"gopkg.in/yaml.v3"
)

// Config holds the application configuration
type Config struct {
	MQTTBroker     string           `yaml:"mqttBroker"`
	HTTPListenAddr string           `yaml:"httpListenAddr"`
	ChannelMappings []ChannelMapping `yaml:"channelMappings"`
	MQTTClientID   string           `yaml:"mqttClientId,omitempty"`
	MQTTUsername   string           `yaml:"mqttUsername,omitempty"`
	MQTTPassword   string           `yaml:"mqttPassword,omitempty"`
	// Add other MQTT settings from sample if needed, e.g., QoS
	// DefaultQoS byte `yaml:"qos,omitempty"`
}

// ChannelMapping defines the mapping from an HTTP channel number to its respective MQTT topics
type ChannelMapping struct {
	ChannelNumber  int    `yaml:"channelNumber"`
	IntensityTopic string `yaml:"intensityTopic"`
	ColorTopic     string `yaml:"colorTopic"`
	OnOffTopic     string `yaml:"onOffTopic"`
}

// LoadConfig reads the configuration file from the given path
func LoadConfig(configPath string) (*Config, error) {
	if configPath == "" {
		return nil, fmt.Errorf("configuration file path cannot be empty")
	}

	configFile, err := os.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file '%s': %w", configPath, err)
	}

	var config Config
	err = yaml.Unmarshal(configFile, &config)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal config file '%s': %w", configPath, err)
	}

	// Basic validation
	if config.MQTTBroker == "" {
		return nil, fmt.Errorf("mqttBroker must be set in the configuration")
	}
	if config.HTTPListenAddr == "" {
		// Default if not set
		config.HTTPListenAddr = ":8080"
		fmt.Printf("httpListenAddr not set, defaulting to %s\n", config.HTTPListenAddr)
	}
	if len(config.ChannelMappings) == 0 {
		return nil, fmt.Errorf("at least one channelMapping must be configured")
	}
	for i, cm := range config.ChannelMappings {
		// ChannelNumber is int, so no check for empty string. 0 could be a valid channel number.
		// We need to ensure that topics are set if the user intends to use them.
		// For this version, let's assume all three topics are mandatory if a mapping is provided.
		if cm.IntensityTopic == "" || cm.ColorTopic == "" || cm.OnOffTopic == "" {
			return nil, fmt.Errorf("channelMapping for channelNumber %d (at index %d) must have intensityTopic, colorTopic, and onOffTopic set", cm.ChannelNumber, i)
		}
	}
	if config.MQTTClientID == "" {
		config.MQTTClientID = "lightboard-http-bridge" // Default client ID
		fmt.Printf("mqttClientId not set, defaulting to %s\n", config.MQTTClientID)
	}

	return &config, nil
}
