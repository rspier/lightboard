import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, NgStyle } from '@angular/common'; // NgStyle is needed for [ngStyle]

@Component({
  selector: 'app-combined-output-display',
  standalone: true,
  imports: [CommonModule, NgStyle], // NgStyle for [ngStyle]
  templateUrl: './combined-output-display.component.html',
  styleUrls: ['./combined-output-display.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush // Good for display-only components
})
export class CombinedOutputDisplayComponent {
  @Input() description = '';
  @Input() value = 0;
  @Input() color = '#ffffff'; // Default to white for the base color input

  // Helper to parse hex color string to RGB object
  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  // Helper to convert RGB object back to hex color string (ensure lowercase)
  private rgbToHex(r: number, g: number, b: number): string {
    return ("#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).padStart(6, '0')).toLowerCase();
  }

  get displayStyle(): { backgroundColor: string; color: string } {
    const clampedValue = Math.max(0, Math.min(100, this.value));
    const intensity = clampedValue / 100;

    const baseRgb = this.hexToRgb(this.color) || { r: 0, g: 0, b: 0 }; // Default to black if base color is invalid

    // Interpolate each RGB component towards black based on intensity
    // Intensity 0 = black, Intensity 1 = full baseRgb color
    const finalR = Math.round(baseRgb.r * intensity);
    const finalG = Math.round(baseRgb.g * intensity);
    const finalB = Math.round(baseRgb.b * intensity);

    const bgColor = this.rgbToHex(finalR, finalG, finalB);

    // Calculate Foreground (Text) Color for contrast
    const luminance = (0.2126 * finalR + 0.7152 * finalG + 0.0722 * finalB) / 255; // Assuming R,G,B are 0-255
    const textColor = luminance < 0.5 ? '#ffffff' : '#000000'; // White text on dark, Black text on light

    return { backgroundColor: bgColor, color: textColor };
  }
}
