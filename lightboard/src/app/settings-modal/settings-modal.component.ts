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

  // Validation error messages
  backendUrlError: string | null = null;
  durationError: string | null = null;
  numChannelsError: string | null = null;

  @Output() close = new EventEmitter<void>();

  constructor(private channelSettingsService: ChannelSettingsService) {}

  ngOnInit(): void {
    const currentSettings = this.channelSettingsService.getCurrentAppSettings();
    this.numChannels = currentSettings.numChannels;
    // Initialize descriptions array based on numChannels from service
    this.descriptions = Array.from({ length: this.numChannels }, (_, i) =>
      currentSettings.channelDescriptions[i] || `Channel ${i + 1}` // Fallback if undefined
    );
    this.backendUrl = currentSettings.backendUrl;
    this.crossfadeDurationSeconds = currentSettings.crossfadeDurationSeconds;
  }

  onNumChannelsChange(newCountStr: string | number): void { // Can be string or number from input
    // Convert to number if it's a string from (ngModelChange) which can pass $event directly
    const newCount = typeof newCountStr === 'string' ? parseInt(newCountStr, 10) : newCountStr;

    if (isNaN(newCount) || newCount < 1 || newCount > 12) {
        this.numChannelsError = 'Number of channels must be an integer between 1 and 12.';
        // Don't adjust descriptions if input is invalid, let validation handle on save
        return;
    }
    this.numChannelsError = null; // Clear error if input becomes valid
    this.numChannels = newCount; // Update the bound model value for the input field

    const currentDescriptions = [...this.descriptions];
    const newDescriptionsArray: string[] = [];
    for (let i = 0; i < newCount; i++) {
        newDescriptionsArray.push(currentDescriptions[i] || `Channel ${i + 1}`);
    }
    this.descriptions = newDescriptionsArray;
  }


  saveSettings(): void {
    // Reset previous errors
    this.backendUrlError = null;
    this.durationError = null;
    this.numChannelsError = null;
    let hasError = false;

    // Validate Number of Channels
    const numCh = Number(this.numChannels);
    if (isNaN(numCh) || numCh < 1 || numCh > 12) {
      this.numChannelsError = 'Number of channels must be an integer between 1 and 12.';
      hasError = true;
    }

    // Validate Backend URL
    if (this.backendUrl && !/^https?:\/\/.+/.test(this.backendUrl) && !/^wss?:\/\//.test(this.backendUrl)) {
      this.backendUrlError = 'Invalid URL. Must start with http(s):// or ws(s):// and not be empty if provided.';
      hasError = true;
    }

    // Validate Crossfade Duration
    const duration = Number(this.crossfadeDurationSeconds);
    if (isNaN(duration) || duration <= 0 || duration > 300) {
      this.durationError = 'Duration must be a positive number (e.g. 0.1) up to 300 seconds.';
      hasError = true;
    }

    if (hasError) {
      return; // Stop save if there are validation errors
    }

    // If numChannels changed, update it first. Service will adjust descriptions.
    const currentServiceNumChannels = this.channelSettingsService.getCurrentNumChannels();
    if (numCh !== currentServiceNumChannels) {
        this.channelSettingsService.updateNumChannels(numCh);
        // After numChannels is updated, the service will have new default/truncated/extended descriptions.
        // We need to save the current form's descriptions for the *new* number of channels.
        const descriptionsForNewCount = Array.from(
          { length: numCh },
          (_, i) => this.descriptions[i] || `Channel ${i + 1}`
        );
        this.channelSettingsService.updateChannelDescriptions(descriptionsForNewCount);
    } else {
      // If numChannels didn't change, just update the descriptions from the form
      this.channelSettingsService.updateChannelDescriptions(this.descriptions.slice(0, numCh));
    }

    this.channelSettingsService.updateBackendUrl(this.backendUrl);
    this.channelSettingsService.updateCrossfadeDurationSeconds(duration);

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
      // Ensure descriptions array is correctly sized for the form
      this.descriptions = Array.from({ length: this.numChannels }, (_, i) =>
        defaults.channelDescriptions[i] || `Channel ${i + 1}`
      );
      this.backendUrl = defaults.backendUrl;
      this.crossfadeDurationSeconds = defaults.crossfadeDurationSeconds;

      // Clear any validation errors
      this.backendUrlError = null;
      this.durationError = null;
      this.numChannelsError = null;
    }
  }

  public trackByIndex(index: number, item: any): number {
    return index;
  }
}
