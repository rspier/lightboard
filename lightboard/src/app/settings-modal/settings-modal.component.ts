import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // For ngModel
import { ChannelSettingsService, AppSettings } from '../channel-settings.service'; // Import AppSettings

@Component({
  selector: 'app-settings-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings-modal.component.html',
  styleUrls: ['./settings-modal.component.css']
})
export class SettingsModalComponent implements OnInit {
  // Properties for form binding
  numChannels: number = 4;
  descriptions: string[] = [];
  backendUrl: string = '';
  crossfadeDurationSeconds: number = 0.5;
  darkMode: boolean = false; // New property

  // Validation error messages
  backendUrlError: string | null = null;
  durationError: string | null = null;
  numChannelsError: string | null = null;

  @Output() close = new EventEmitter<void>();

  constructor(private channelSettingsService: ChannelSettingsService) {}

  ngOnInit(): void {
    const currentSettings = this.channelSettingsService.getCurrentAppSettings();
    this.numChannels = currentSettings.numChannels;
    this.descriptions = Array.from({ length: this.numChannels }, (_, i) =>
      currentSettings.channelDescriptions[i] || `Channel ${i + 1}`
    );
    this.backendUrl = currentSettings.backendUrl;
    this.crossfadeDurationSeconds = currentSettings.crossfadeDurationSeconds;
    this.darkMode = currentSettings.darkMode; // Load darkMode
  }

  onNumChannelsChange(newCountStr: string | number): void {
    const newCount = typeof newCountStr === 'string' ? parseInt(newCountStr, 10) : newCountStr;

    if (isNaN(newCount) || newCount < 1 || newCount > 12) {
        this.numChannelsError = 'Number of channels must be an integer between 1 and 12.';
        return;
    }
    this.numChannelsError = null;
    this.numChannels = newCount;

    const currentDescriptions = [...this.descriptions];
    const newDescriptionsArray: string[] = [];
    for (let i = 0; i < newCount; i++) {
        newDescriptionsArray.push(currentDescriptions[i] || `Channel ${i + 1}`);
    }
    this.descriptions = newDescriptionsArray;
  }


  saveSettings(): void {
    this.backendUrlError = null;
    this.durationError = null;
    this.numChannelsError = null;
    let hasError = false;

    const numCh = Number(this.numChannels);
    if (isNaN(numCh) || numCh < 1 || numCh > 12) {
      this.numChannelsError = 'Number of channels must be an integer between 1 and 12.';
      hasError = true;
    }

    if (this.backendUrl && !/^https?:\/\/.+/.test(this.backendUrl) && !/^wss?:\/\//.test(this.backendUrl)) {
      this.backendUrlError = 'Invalid URL. Must start with http(s):// or ws(s):// and not be empty if provided.';
      hasError = true;
    }

    const duration = Number(this.crossfadeDurationSeconds);
    if (isNaN(duration) || duration <= 0 || duration > 300) {
      this.durationError = 'Duration must be a positive number (e.g. 0.1) up to 300 seconds.';
      hasError = true;
    }

    if (hasError) {
      return;
    }

    const currentServiceNumChannels = this.channelSettingsService.getCurrentNumChannels();
    if (numCh !== currentServiceNumChannels) {
        this.channelSettingsService.updateNumChannels(numCh);
        const descriptionsForNewCount = Array.from(
          { length: numCh },
          (_, i) => this.descriptions[i] || `Channel ${i + 1}`
        );
        this.channelSettingsService.updateChannelDescriptions(descriptionsForNewCount);
    } else {
      this.channelSettingsService.updateChannelDescriptions(this.descriptions.slice(0, numCh));
    }

    this.channelSettingsService.updateBackendUrl(this.backendUrl);
    this.channelSettingsService.updateCrossfadeDurationSeconds(duration);
    this.channelSettingsService.updateDarkMode(this.darkMode); // Save darkMode setting

    this.close.emit();
  }

  cancel(): void {
    this.close.emit();
  }

  resetToDefaults(): void {
    if (confirm('Are you sure you want to reset all settings to their defaults?')) {
      this.channelSettingsService.resetToDefaults();
      const defaults = this.channelSettingsService.getCurrentAppSettings();
      this.numChannels = defaults.numChannels;
      this.descriptions = Array.from({ length: this.numChannels }, (_, i) =>
        defaults.channelDescriptions[i] || `Channel ${i + 1}`
      );
      this.backendUrl = defaults.backendUrl;
      this.crossfadeDurationSeconds = defaults.crossfadeDurationSeconds;
      this.darkMode = defaults.darkMode; // Reset darkMode

      this.backendUrlError = null;
      this.durationError = null;
      this.numChannelsError = null;
    }
  }

  public trackByIndex(index: number, item: any): number {
    return index;
  }
}
