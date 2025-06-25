import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators'; // Explicit import for map

// Interface for all settings
export interface AppSettings {
  numChannels: number;
  channelDescriptions: string[];
  backendUrl: string;
  crossfadeDurationSeconds: number;
  darkMode: boolean; // New property
}

// Interface for channel-specific data (used internally by components)
// Not directly used by the service's storage but defines a structure for consumers
export interface ChannelConfig {
  description: string;
  color: string;
}


@Injectable({
  providedIn: 'root'
})
export class ChannelSettingsService {
  // localStorage Keys
  private settingsKey = 'appSettings_v1';

  // Default values
  private readonly defaultNumChannels = 4;
  private readonly defaultBackendUrl = '';
  private readonly defaultCrossfadeDurationSeconds = 0.5;
  private readonly defaultDarkMode = false; // New default

  private getDefaultDescriptions(count: number): string[] {
    return Array.from({ length: count }, (_, i) => `Channel ${i + 1}`);
  }

  private appSettingsSubject: BehaviorSubject<AppSettings>;

  constructor() {
    const loadedSettings = this.loadSettings();
    this.appSettingsSubject = new BehaviorSubject<AppSettings>(loadedSettings);
  }

  private loadSettings(): AppSettings {
    try {
      const storedSettingsJson = localStorage.getItem(this.settingsKey);
      if (storedSettingsJson) {
        const storedSettings = JSON.parse(storedSettingsJson) as Partial<AppSettings>;

        let numChannels = storedSettings.numChannels ?? this.defaultNumChannels;
        if (typeof numChannels !== 'number' || numChannels < 1 || numChannels > 12) {
          numChannels = this.defaultNumChannels;
        }

        let descriptions = storedSettings.channelDescriptions ?? this.getDefaultDescriptions(numChannels);
        if (!Array.isArray(descriptions) || !descriptions.every(d => typeof d === 'string')) {
            descriptions = this.getDefaultDescriptions(numChannels);
        }

        if (descriptions.length !== numChannels) {
            const newDescriptions = this.getDefaultDescriptions(numChannels);
            descriptions.forEach((desc, i) => {
                if (i < numChannels && i < newDescriptions.length) newDescriptions[i] = desc;
            });
            descriptions = newDescriptions;
        }

        let backendUrl = storedSettings.backendUrl ?? this.defaultBackendUrl;
        if (typeof backendUrl !== 'string' ) {
            backendUrl = this.defaultBackendUrl;
        } else if (backendUrl && !/^https?:\/\//.test(backendUrl) && !/^wss?:\/\//.test(backendUrl)) {
            backendUrl = this.defaultBackendUrl;
        }

        let crossfadeDurationSeconds = storedSettings.crossfadeDurationSeconds ?? this.defaultCrossfadeDurationSeconds;
        if (typeof crossfadeDurationSeconds !== 'number' || crossfadeDurationSeconds <= 0 || crossfadeDurationSeconds > 300) {
            crossfadeDurationSeconds = this.defaultCrossfadeDurationSeconds;
        }

        let darkMode = storedSettings.darkMode ?? this.defaultDarkMode;
        if (typeof darkMode !== 'boolean') {
          darkMode = this.defaultDarkMode;
        }

        return {
          numChannels,
          channelDescriptions: descriptions,
          backendUrl,
          crossfadeDurationSeconds,
          darkMode // Include darkMode
        };
      }
    } catch {
      // console.error('ChannelSettingsService: Error loading settings from localStorage', error);
    }

    const defaultSettings: AppSettings = {
      numChannels: this.defaultNumChannels,
      channelDescriptions: this.getDefaultDescriptions(this.defaultNumChannels),
      backendUrl: this.defaultBackendUrl,
      crossfadeDurationSeconds: this.defaultCrossfadeDurationSeconds,
      darkMode: this.defaultDarkMode // Include darkMode in defaults
    };
    this.saveSettings(defaultSettings);
    return defaultSettings;
  }

  private saveSettings(settings: AppSettings): void {
    try {
      localStorage.setItem(this.settingsKey, JSON.stringify(settings));
    } catch {
      // console.error('ChannelSettingsService: Error saving settings to localStorage', error);
    }
  }

  public getAppSettings(): Observable<AppSettings> {
    return this.appSettingsSubject.asObservable();
  }

  public getCurrentAppSettings(): AppSettings {
    return this.appSettingsSubject.getValue();
  }

  public getNumChannels(): Observable<number> {
    return this.appSettingsSubject.pipe(map(settings => settings.numChannels));
  }
  public getCurrentNumChannels(): number {
    return this.appSettingsSubject.getValue().numChannels;
  }

  public getChannelDescriptions(): Observable<string[]> {
    return this.appSettingsSubject.pipe(map(settings => settings.channelDescriptions));
  }
  public getCurrentChannelDescriptions(): string[] {
    return this.appSettingsSubject.getValue().channelDescriptions;
  }

  public getBackendUrl(): Observable<string> {
    return this.appSettingsSubject.pipe(map(settings => settings.backendUrl));
  }
  public getCurrentBackendUrl(): string {
    return this.appSettingsSubject.getValue().backendUrl;
  }

  public getCrossfadeDurationSeconds(): Observable<number> {
    return this.appSettingsSubject.pipe(map(settings => settings.crossfadeDurationSeconds));
  }
  public getCurrentCrossfadeDurationSeconds(): number {
    return this.appSettingsSubject.getValue().crossfadeDurationSeconds;
  }

  public getDarkMode(): Observable<boolean> {
    return this.appSettingsSubject.pipe(map(settings => settings.darkMode));
  }
  public getCurrentDarkMode(): boolean {
    return this.appSettingsSubject.getValue().darkMode;
  }

  public updateNumChannels(newCount: number): void {
    if (typeof newCount !== 'number' || newCount < 1 || newCount > 12) {
      return;
    }
    const currentSettings = this.appSettingsSubject.getValue();
    const oldDescriptions = currentSettings.channelDescriptions;
    const newDescriptions = this.getDefaultDescriptions(newCount);

    for (let i = 0; i < Math.min(oldDescriptions.length, newCount); i++) {
      newDescriptions[i] = oldDescriptions[i];
    }

    const newSettings = { ...currentSettings, numChannels: newCount, channelDescriptions: newDescriptions };
    this.saveSettings(newSettings);
    this.appSettingsSubject.next(newSettings);
  }

  public updateChannelDescriptions(newDescriptions: string[]): void {
    const currentSettings = this.appSettingsSubject.getValue();
    if (!Array.isArray(newDescriptions) || newDescriptions.length !== currentSettings.numChannels || !newDescriptions.every(d => typeof d === 'string')) {
        return;
    }
    const newSettings = { ...currentSettings, channelDescriptions: [...newDescriptions] };
    this.saveSettings(newSettings);
    this.appSettingsSubject.next(newSettings);
  }

  public updateSingleChannelDescription(index: number, description: string): void {
    const currentSettings = this.appSettingsSubject.getValue();
    if (index >= 0 && index < currentSettings.numChannels && typeof description === 'string') {
      const newDescriptions = [...currentSettings.channelDescriptions];
      newDescriptions[index] = description;
      this.updateChannelDescriptions(newDescriptions);
    }
  }

  public updateBackendUrl(newUrl: string): void {
    if (typeof newUrl !== 'string') return;
    if (newUrl && !/^https?:\/\//.test(newUrl) && !/^wss?:\/\//.test(newUrl)) {
      return;
    }
    const currentSettings = this.appSettingsSubject.getValue();
    const newSettings = { ...currentSettings, backendUrl: newUrl };
    this.saveSettings(newSettings);
    this.appSettingsSubject.next(newSettings);
  }

  public updateCrossfadeDurationSeconds(newDuration: number): void {
    if (typeof newDuration !== 'number' || newDuration <= 0 || newDuration > 300) {
      return;
    }
    const currentSettings = this.appSettingsSubject.getValue();
    const newSettings = { ...currentSettings, crossfadeDurationSeconds: newDuration };
    this.saveSettings(newSettings);
    this.appSettingsSubject.next(newSettings);
  }

  public updateDarkMode(isDarkMode: boolean): void {
    if (typeof isDarkMode !== 'boolean') return;
    const currentSettings = this.appSettingsSubject.getValue();
    const newSettings = { ...currentSettings, darkMode: isDarkMode };
    this.saveSettings(newSettings);
    this.appSettingsSubject.next(newSettings);
  }

  public resetToDefaults(): void {
    const defaultSettings: AppSettings = {
      numChannels: this.defaultNumChannels,
      channelDescriptions: this.getDefaultDescriptions(this.defaultNumChannels),
      backendUrl: this.defaultBackendUrl,
      crossfadeDurationSeconds: this.defaultCrossfadeDurationSeconds,
      darkMode: this.defaultDarkMode // Include darkMode in reset
    };
    this.saveSettings(defaultSettings);
    this.appSettingsSubject.next(defaultSettings);
  }
}
