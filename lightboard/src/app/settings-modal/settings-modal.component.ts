import { Component, EventEmitter, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // For ngModel
import { ChannelSettingsService } from '../channel-settings.service';
import { ThemeService, Theme } from '../theme.service'; // Import ThemeService and Theme interface

@Component({
  selector: 'app-settings-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings-modal.component.html',
  styleUrls: ['./settings-modal.component.css']
})
export class SettingsModalComponent implements OnInit {
  private channelSettingsService = inject(ChannelSettingsService);
  private themeService = inject(ThemeService); // Inject ThemeService

  // Properties for form binding
  numChannels = 4;
  descriptions: string[] = [];
  backendUrl = '';
  // darkMode = false; // Removed, will be handled by ThemeService

  // Theme related properties
  availableThemes: Theme[] = [];
  selectedThemeId = '';

  // Validation error messages
  backendUrlError: string | null = null;
  numChannelsError: string | null = null;

  @Output() closeModal = new EventEmitter<void>();

  ngOnInit(): void {
    const currentSettings = this.channelSettingsService.getCurrentAppSettings();
    this.numChannels = currentSettings.numChannels;
    this.descriptions = Array.from({ length: this.numChannels }, (_, i) =>
      currentSettings.channelDescriptions[i] || `Channel ${i + 1}`
    );
    this.backendUrl = currentSettings.backendUrl;
    // this.darkMode = currentSettings.darkMode; // Removed

    // Initialize theme settings
    this.availableThemes = this.themeService.getAvailableThemes();
    const activeTheme = this.themeService.getActiveTheme();
    if (activeTheme) {
      this.selectedThemeId = activeTheme.id;
    } else if (this.availableThemes.length > 0) {
      this.selectedThemeId = this.availableThemes[0].id; // Default to first theme if none active (should not happen with constructor logic)
    }
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

  onThemeChange(themeId: string): void {
    this.themeService.setActiveTheme(themeId);
    // No need to call saveSettings() immediately, theme is applied reactively.
    // Settings save will persist the last chosen theme ID from ThemeService.
  }

  saveSettings(): void {
    this.backendUrlError = null;
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
    // The theme is already applied by ThemeService and its ID stored in localStorage by ThemeService.
    // We might want to save the theme ID specifically within ChannelSettingsService if it's considered part of "app settings"
    // that might be exported/imported or managed differently than just localStorage.
    // For now, ThemeService handles its own persistence.
    // If ChannelSettingsService needs to know about the theme, update it here:
    const activeTheme = this.themeService.getActiveTheme();
    if (activeTheme) {
      // Assuming ChannelSettingsService has a method like updateActiveThemeId(id: string)
      // this.channelSettingsService.updateActiveThemeId(activeTheme.id);
      // For now, we'll rely on ThemeService's localStorage.
      // The `darkMode` property in ChannelSettingsService is now effectively obsolete for theme selection.
      // We can remove it or decide how it interacts if we want a "prefers-dark" independent of full themes.
      // Let's assume we remove the old `darkMode` from ChannelSettingsService's direct responsibility.
      // The settings service will no longer save `darkMode` directly.
    }


    this.closeModal.emit();
  }

  cancel(): void {
    // If the theme was changed but not "saved" through other settings,
    // it's already applied. If we want to revert, we'd need to store original theme on init.
    // For now, changes are instant.
    this.closeModal.emit();
  }

  resetToDefaults(): void {
    if (confirm('Are you sure you want to reset all settings to their defaults? This includes the theme.')) {
      this.channelSettingsService.resetToDefaults(); // This resets channel/backend settings
      this.themeService.setActiveTheme('light'); // Reset theme to light via ThemeService

      const defaults = this.channelSettingsService.getCurrentAppSettings();
      this.numChannels = defaults.numChannels;
      this.descriptions = Array.from({ length: this.numChannels }, (_, i) =>
        defaults.channelDescriptions[i] || `Channel ${i + 1}`
      );
      this.backendUrl = defaults.backendUrl;
      // this.darkMode = defaults.darkMode; // Removed

      const activeTheme = this.themeService.getActiveTheme();
      this.selectedThemeId = activeTheme ? activeTheme.id : 'light';


      this.backendUrlError = null;
      this.numChannelsError = null;
    }
  }

  public trackByIndex(index: number): number {
    return index;
  }
}
