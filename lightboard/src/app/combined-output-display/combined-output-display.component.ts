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
  @Input() description: string = '';
  @Input() value: number = 0;
  @Input() colorScene1: string = '#ffffff'; // Default to white
  @Input() colorScene2: string = '#ffffff'; // Default to white

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

  get displayStyle(): { [key: string]: string } {
    const clampedValue = Math.max(0, Math.min(100, this.value));
    const intensity = clampedValue / 100;

    // Determine text color based on the average of the two background colors or a single one if they are the same
    let avgR = 0, avgG = 0, avgB = 0;

    const rgb1 = this.hexToRgb(this.colorScene1) || { r: 0, g: 0, b: 0 };
    const finalR1 = Math.round(rgb1.r * intensity);
    const finalG1 = Math.round(rgb1.g * intensity);
    const finalB1 = Math.round(rgb1.b * intensity);

    if (this.colorScene1 === this.colorScene2) {
      avgR = finalR1;
      avgG = finalG1;
      avgB = finalB1;
      const bgColor = this.rgbToHex(finalR1, finalG1, finalB1);
      const textColor = this.calculateTextColor(finalR1, finalG1, finalB1);
      return { backgroundColor: bgColor, color: textColor };
    } else {
      const rgb2 = this.hexToRgb(this.colorScene2) || { r: 0, g: 0, b: 0 };
      const finalR2 = Math.round(rgb2.r * intensity);
      const finalG2 = Math.round(rgb2.g * intensity);
      const finalB2 = Math.round(rgb2.b * intensity);

      // For checkerboard, text color decision might be more complex.
      // Using average luminance of the two colors as a heuristic.
      avgR = (finalR1 + finalR2) / 2;
      avgG = (finalG1 + finalG2) / 2;
      avgB = (finalB1 + finalB2) / 2;
      const textColor = this.calculateTextColor(avgR, avgG, avgB);

      const color1Str = this.rgbToHex(finalR1, finalG1, finalB1);
      const color2Str = this.rgbToHex(finalR2, finalG2, finalB2);

      // Simpler checkerboard pattern
      const size = '10px'; // Size of each square in the checkerboard
      return {
        'background-image': `repeating-conic-gradient(${color1Str} 0% 25%, ${color2Str} 25% 50%)`,
        'background-size': `${size} ${size}`,
        'color': textColor
      };
    }
  }

  private calculateTextColor(r: number, g: number, b: number): string {
    // Calculate Foreground (Text) Color for contrast
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; // Assuming R,G,B are 0-255
    return luminance < 0.5 ? '#ffffff' : '#000000'; // White text on dark, Black text on light
  }

  get titleText(): string {
    let colorInfo = `Scene 1: ${this.colorScene1}`;
    if (this.colorScene1 !== this.colorScene2) {
      colorInfo += `, Scene 2: ${this.colorScene2}`;
    }
    return `${this.description} - Value: ${this.value}, Colors: ${colorInfo}`;
  }
}
