import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

interface ChannelDataItem {
  channelNumber: number;
  channelDescription: string;
  value: number;
  color: string; // Added color property
}

@Component({
  selector: 'app-channel-values-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './channel-values-table.html',
  styleUrl: './channel-values-table.css'
})
export class ChannelValuesTableComponent {
  @Input() channelData: ChannelDataItem[] = []; // Updated type

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return ("#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).padStart(6, '0')).toLowerCase();
  }

  public getDynamicRowStyles(value: number, itemColor: string): { backgroundColor: string; color: string } {
    const clampedValue = Math.max(0, Math.min(100, value));
    const intensity = clampedValue / 100; // 0 (dark) to 1 (original color)

    const baseRgb = this.hexToRgb(itemColor) || { r: 255, g: 255, b: 255 }; // Default to white if parse fails

    const finalR = Math.round(baseRgb.r * intensity);
    const finalG = Math.round(baseRgb.g * intensity);
    const finalB = Math.round(baseRgb.b * intensity);

    const bgColor = this.rgbToHex(finalR, finalG, finalB);

    // Calculate Foreground (Text) Color for contrast against the bgColor
    // Using W3C luminance formula: (0.2126*R + 0.7152*G + 0.0722*B)
    // Values r,g,b should be in range 0-1 for this formula, so divide by 255
    const lumR = finalR / 255;
    const lumG = finalG / 255;
    const lumB = finalB / 255;
    const luminance = (0.2126 * lumR + 0.7152 * lumG + 0.0722 * lumB);

    // Threshold can be adjusted, 0.5 is common
    const textColor = luminance < 0.5 ? '#ffffff' : '#000000'; // Ensure lowercase

    return { backgroundColor: bgColor, color: textColor };
  }
}
