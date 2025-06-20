import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common'; // For *ngFor, *ngIf

@Component({
  selector: 'app-channel-values-table',
  standalone: true, // Ensure this is present
  imports: [CommonModule], // Add CommonModule for *ngFor, *ngIf
  templateUrl: './channel-values-table.html',
  styleUrl: './channel-values-table.css'
})
export class ChannelValuesTableComponent { // Renamed class
  @Input() channelData: { channelNumber: number; channelDescription: string; value: number }[] = [];
}
