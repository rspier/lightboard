import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common'; // For *ngFor, *ngIf

@Component({
  selector: 'app-channel-values-table',
  standalone: true, // Ensure this is present
  imports: [CommonModule], // Add CommonModule for *ngFor, *ngIf
  templateUrl: './channel-values-table.html',
  styleUrl: './channel-values-table.css'
})
export class ChannelValuesTableComponent {
  @Input() channelData: { channelNumber: number; channelDescription: string; value: number }[] = [];

  public getDynamicRowStyles(value: number): { backgroundColor: string; color: string } {
    // Ensure value is within 0-100 range for calculations
    const clampedValue = Math.max(0, Math.min(100, value));

    // Calculate Background Color (grayscale)
    // As value increases, background becomes lighter (0 -> black, 100 -> white)
    const gray = Math.round((clampedValue / 100) * 255);
    const hexPart = gray.toString(16).padStart(2, '0');
    const bgColor = `#${hexPart}${hexPart}${hexPart}`;

    // Calculate Foreground (Text) Color for contrast
    // Using a simple luminance threshold (128 for grayscale 0-255)
    const textColor = gray < 128 ? '#FFFFFF' : '#000000';

    return { backgroundColor: bgColor, color: textColor };
  }
}
