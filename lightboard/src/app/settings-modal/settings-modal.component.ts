import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // For ngModel
import { ChannelSettingsService } from '../channel-settings.service';

@Component({
  selector: 'app-settings-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings-modal.component.html',
  styleUrls: ['./settings-modal.component.css']
})
export class SettingsModalComponent implements OnInit {
  descriptions: string[] = [];

  @Output() close = new EventEmitter<void>();

  constructor(private channelSettingsService: ChannelSettingsService) {}

  ngOnInit(): void {
    this.descriptions = [...this.channelSettingsService.getCurrentDescriptions()];
  }

  saveSettings(): void {
    this.channelSettingsService.updateAllDescriptions(this.descriptions);
    this.close.emit();
  }

  cancel(): void {
    this.close.emit();
  }

  resetToDefaults(): void {
    if (confirm('Are you sure you want to reset all channel names to their defaults?')) {
      this.channelSettingsService.resetToDefaults();
      this.descriptions = [...this.channelSettingsService.getCurrentDescriptions()];
    }
  }

  // Added for *ngFor trackBy
  public trackByIndex(index: number, item: any): number {
    return index;
  }
}
