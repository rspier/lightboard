import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ChannelSettingsService {
  private localStorageKey = 'channelDescriptions';
  private defaultDescriptions: string[] = ['Apple', 'Banana', 'Cherry', 'Date'];

  // Initialize with default or loaded values.
  // Private BehaviorSubject to hold and emit the current descriptions.
  private channelDescriptionsSubject: BehaviorSubject<string[]>;

  constructor() {
    const loadedDescriptions = this.loadDescriptions();
    this.channelDescriptionsSubject = new BehaviorSubject<string[]>(loadedDescriptions);
  }

  // Public observable for components to subscribe to description changes.
  public getDescriptions(): Observable<string[]> {
    return this.channelDescriptionsSubject.asObservable();
  }

  // Get the current value synchronously.
  public getCurrentDescriptions(): string[] {
    return this.channelDescriptionsSubject.getValue();
  }

  // Update a specific description.
  public updateDescription(index: number, newDescription: string): void {
    const currentDescriptions = [...this.channelDescriptionsSubject.getValue()]; // Create a new array
    if (index >= 0 && index < currentDescriptions.length) {
      currentDescriptions[index] = newDescription;
      this.saveDescriptions(currentDescriptions);
      this.channelDescriptionsSubject.next(currentDescriptions);
    } else {
      console.error(`ChannelSettingsService: Index ${index} out of bounds.`);
    }
  }

  // Update all descriptions at once (e.g., from a settings panel save).
  public updateAllDescriptions(newDescriptions: string[]): void {
    if (newDescriptions && newDescriptions.length === this.defaultDescriptions.length) {
      const descriptionsToSave = [...newDescriptions]; // Create a new array
      this.saveDescriptions(descriptionsToSave);
      this.channelDescriptionsSubject.next(descriptionsToSave);
    } else {
      console.error('ChannelSettingsService: Invalid descriptions array provided for updateAll.');
    }
  }

  // Helper to load descriptions from localStorage.
  private loadDescriptions(): string[] {
    try {
      const storedDescriptions = localStorage.getItem(this.localStorageKey);
      if (storedDescriptions) {
        const parsed = JSON.parse(storedDescriptions);
        // Basic validation: ensure it's an array of 4 strings
        if (Array.isArray(parsed) && parsed.length === this.defaultDescriptions.length && parsed.every(item => typeof item === 'string')) {
          return parsed;
        } else {
          // console.warn('ChannelSettingsService: Stored descriptions format is invalid. Using defaults.');
          // Fallback to default if format is wrong
        }
      }
    } catch (error) {
      // console.error('ChannelSettingsService: Error loading descriptions from localStorage', error);
      // Fallback to default on error
    }
    // If nothing stored, or error, or invalid format, use defaults and save them.
    // Ensure defaultDescriptions itself is not modified if saveDescriptions mutates its input.
    const defaultsCopy = [...this.defaultDescriptions];
    this.saveDescriptions(defaultsCopy);
    return defaultsCopy;
  }

  // Helper to save descriptions to localStorage.
  private saveDescriptions(descriptions: string[]): void {
    try {
      localStorage.setItem(this.localStorageKey, JSON.stringify(descriptions));
    } catch (error) {
      console.error('ChannelSettingsService: Error saving descriptions to localStorage', error);
    }
  }

  // Method to reset to default descriptions
  public resetToDefaults(): void {
    // Ensure defaultDescriptions itself is not modified if saveDescriptions mutates its input.
    const defaultsCopy = [...this.defaultDescriptions];
    this.saveDescriptions(defaultsCopy);
    this.channelDescriptionsSubject.next(defaultsCopy);
  }
}
