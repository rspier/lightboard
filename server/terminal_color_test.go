package main

import (
	"fmt"
	"testing"
)

func TestHexToRGB(t *testing.T) {
	tests := []struct {
		name    string
		hex     string
		wantR   int
		wantG   int
		wantB   int
		wantErr bool
	}{
		{"valid full hex", "#FF00AA", 255, 0, 170, false},
		{"valid short hex", "00FF00", 0, 255, 0, false},
		{"valid mixed case", "#1a2B3c", 26, 43, 60, false},
		{"invalid length short", "#12345", 0, 0, 0, true},
		{"invalid length long", "#1234567", 0, 0, 0, true},
		{"invalid characters", "#GGHHII", 0, 0, 0, true},
		{"empty string", "", 0, 0, 0, true},
		{"just hash", "#", 0, 0, 0, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r, g, b, err := hexToRGB(tt.hex)
			if (err != nil) != tt.wantErr {
				t.Errorf("hexToRGB() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr {
				if r != tt.wantR || g != tt.wantG || b != tt.wantB {
					t.Errorf("hexToRGB() = (%v, %v, %v), want (%v, %v, %v)", r, g, b, tt.wantR, tt.wantG, tt.wantB)
				}
			}
		})
	}
}

func TestFormatColorForTerminal(t *testing.T) {
	tests := []struct {
		name    string
		hex     string
		want    string // Expected ANSI sequence (or original hex if invalid)
	}{
		{"valid red", "#FF0000", fmt.Sprintf("\033[48;2;255;0;0m  \033[0m")},
		{"valid green", "00FF00", fmt.Sprintf("\033[48;2;0;255;0m  \033[0m")},
		{"valid blue", "#0000FF", fmt.Sprintf("\033[48;2;0;0;255m  \033[0m")},
		{"invalid hex", "#XYZ", "#XYZ"}, // Should return original on error
		{"empty hex", "", ""},             // Should return original on error
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := formatColorForTerminal(tt.hex)
			if got != tt.want {
				t.Errorf("formatColorForTerminal() = %q, want %q", got, tt.want)
			}
		})
	}
}
