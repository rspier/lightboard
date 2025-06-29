package main

import (
	"os"
	"path/filepath"
	"reflect"
	"testing"
)

func TestLoadConfig(t *testing.T) {
	// Create a temporary config file for testing
	validConfigContent := `
mqttBroker: "tcp://localhost:1883"
httpListenAddr: ":8081"
channelMappings:
  - channelNumber: 1
    intensityTopic: "topic/ch1/intensity"
    colorTopic: "topic/ch1/color"
    onOffTopic: "topic/ch1/onoff"
  - channelNumber: 2
    intensityTopic: "topic/ch2/intensity"
    colorTopic: "topic/ch2/color"
    onOffTopic: "topic/ch2/onoff"
mqttClientId: "test-client"
`
	emptyMappingsConfigContent := `
mqttBroker: "tcp://localhost:1883"
httpListenAddr: ":8081"
channelMappings: []
`

	missingBrokerConfigContent := `
httpListenAddr: ":8081"
channelMappings:
  - channelNumber: 1
    intensityTopic: "topic/ch1/intensity"
    colorTopic: "topic/ch1/color"
    onOffTopic: "topic/ch1/onoff"
`
	invalidMappingConfigContent := `
mqttBroker: "tcp://localhost:1883"
channelMappings:
  - channelNumber: 1 # Valid channel number
    intensityTopic: "" # Invalid: empty topic
    colorTopic: "topic/ch1/color"
    onOffTopic: "topic/ch1/onoff"
`

	tempDir := t.TempDir()

	createTempFile := func(name, content string) string {
		filePath := filepath.Join(tempDir, name)
		if err := os.WriteFile(filePath, []byte(content), 0644); err != nil {
			t.Fatalf("Failed to create temp config file %s: %v", name, err)
		}
		return filePath
	}

	validConfigPath := createTempFile("valid_config.yaml", validConfigContent)
	emptyMappingsPath := createTempFile("empty_mappings.yaml", emptyMappingsConfigContent)
	missingBrokerPath := createTempFile("missing_broker.yaml", missingBrokerConfigContent)
	invalidMappingPath := createTempFile("invalid_mapping.yaml", invalidMappingConfigContent)

	tests := []struct {
		name        string
		configPath  string
		expectError bool
		expectedCfg *Config // Only check if no error expected
	}{
		{
			name:        "Valid configuration",
			configPath:  validConfigPath,
			expectError: false,
			expectedCfg: &Config{
				MQTTBroker:     "tcp://localhost:1883",
				HTTPListenAddr: ":8081",
				ChannelMappings: []ChannelMapping{
					{ChannelNumber: 1, IntensityTopic: "topic/ch1/intensity", ColorTopic: "topic/ch1/color", OnOffTopic: "topic/ch1/onoff"},
					{ChannelNumber: 2, IntensityTopic: "topic/ch2/intensity", ColorTopic: "topic/ch2/color", OnOffTopic: "topic/ch2/onoff"},
				},
				MQTTClientID: "test-client",
			},
		},
		{
			name:        "Empty configuration path",
			configPath:  "",
			expectError: true,
		},
		{
			name:        "Non-existent configuration file",
			configPath:  "non_existent_config.yaml",
			expectError: true,
		},
		{
			name:        "Config with empty mappings",
			configPath:  emptyMappingsPath,
			expectError: true, // "at least one channelMapping must be configured"
		},
		{
			name:        "Config missing MQTT broker",
			configPath:  missingBrokerPath,
			expectError: true, // "mqttBroker must be set"
		},
		{
			name:        "Config with invalid mapping (empty channelId)",
			configPath:  invalidMappingPath,
			expectError: true, // "channelMapping at index 0 must have both channelId and topic set"
		},
		{
			name: "Config with default HTTP listen address",
			configPath: createTempFile("default_http.yaml", `
mqttBroker: "tcp://localhost:1883"
channelMappings: [{channelNumber: 1, intensityTopic: "i", colorTopic: "c", onOffTopic: "o"}]`),
			expectError: false,
			expectedCfg: &Config{
				MQTTBroker:     "tcp://localhost:1883",
				HTTPListenAddr: ":8080", // Default
				ChannelMappings: []ChannelMapping{
					{ChannelNumber: 1, IntensityTopic: "i", ColorTopic: "c", OnOffTopic: "o"},
				},
				MQTTClientID: "lightboard-http-bridge", // Default
			},
		},
		{
			name: "Config with default MQTT Client ID",
			configPath: createTempFile("default_clientid.yaml", `
mqttBroker: "tcp://localhost:1883"
httpListenAddr: ":9090"
channelMappings: [{channelNumber: 1, intensityTopic: "i", colorTopic: "c", onOffTopic: "o"}]`),
			expectError: false,
			expectedCfg: &Config{
				MQTTBroker:     "tcp://localhost:1883",
				HTTPListenAddr: ":9090",
				ChannelMappings: []ChannelMapping{
					{ChannelNumber: 1, IntensityTopic: "i", ColorTopic: "c", OnOffTopic: "o"},
				},
				MQTTClientID: "lightboard-http-bridge", // Default
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cfg, err := LoadConfig(tt.configPath)

			if tt.expectError {
				if err == nil {
					t.Errorf("LoadConfig() expected an error, but got nil")
				}
			} else {
				if err != nil {
					t.Errorf("LoadConfig() unexpected error: %v", err)
				}
				if !reflect.DeepEqual(cfg, tt.expectedCfg) {
					t.Errorf("LoadConfig() got = %v, want %v", cfg, tt.expectedCfg)
				}
			}
		})
	}
}
