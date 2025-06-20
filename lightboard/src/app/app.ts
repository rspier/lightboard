import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { SlidePotentiometerComponent } from './slide-potentiometer/slide-potentiometer';
import { ChannelValuesTableComponent } from './channel-values-table/channel-values-table';
import { SettingsModalComponent } from './settings-modal/settings-modal.component';
import { ChannelSettingsService, AppSettings } from './channel-settings.service'; // Import AppSettings
import { HttpDataService, CombinedOutputData } from './http-data.service'; // Import HttpDataService

interface PotentiometerState {
  channelNumber: number;
  channelDescription: string;
  value: number;
  color: string;
}

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    RouterOutlet,
    SlidePotentiometerComponent,
    ChannelValuesTableComponent,
    SettingsModalComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  protected title = 'lightboard';

  row1States: PotentiometerState[] = []; // Initialize as empty, will be populated
  row2States: PotentiometerState[] = []; // Initialize as empty, will be populated

  crossfaderValue: number = 50;
  combinedOutputStates: PotentiometerState[] = []; // Type will be PotentiometerState as it includes color

  isAnimating: boolean = false;
  animationInterval: any = null;

  showSettingsModal: boolean = false;
  private settingsSubscription: Subscription | undefined; // Renamed from descriptionsSubscription

  // Local copies of settings
  private currentNumChannels: number;
  private currentBackendUrl: string;
  private currentCrossfadeDurationMs: number;

  // Default colors for initialization if not provided by a more complex system
  private defaultColorsScene1: string[] = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#800080', '#a52a2a', '#808000', '#008080', '#800000'];
  private defaultColorsScene2: string[] = ['#00ffff', '#ff00ff', '#ffff00', '#0000ff', '#00ff00', '#ff0000', '#800080', '#ffa500', '#808000', '#a52a2a', '#800000', '#008080'];


  constructor(
    private cdr: ChangeDetectorRef,
    private channelSettingsService: ChannelSettingsService,
    private httpDataService: HttpDataService // Inject HttpDataService
  ) {
    const initialSettings = this.channelSettingsService.getCurrentAppSettings();
    this.currentNumChannels = initialSettings.numChannels;
    this.currentBackendUrl = initialSettings.backendUrl;
    this.currentCrossfadeDurationMs = initialSettings.crossfadeDurationSeconds * 1000;
    this.initializeChannelStates(this.currentNumChannels);
  }

  initializeChannelStates(numChannels: number): void {
    const currentDescriptions = this.channelSettingsService.getCurrentChannelDescriptions(); // These should match numChannels due to service logic

    this.row1States = [];
    this.row2States = [];
    for (let i = 0; i < numChannels; i++) {
      this.row1States.push({
        channelNumber: i + 1,
        channelDescription: currentDescriptions[i] || `Channel ${i + 1}`,
        value: 0, // Default value
        color: this.defaultColorsScene1[i] || '#ffffff'
      });
      this.row2States.push({
        channelNumber: i + 1,
        channelDescription: currentDescriptions[i] || `Channel ${i + 1}`,
        value: 100, // Default value
        color: this.defaultColorsScene2[i] || '#ffffff'
      });
    }
    // Ensure combinedOutputStates is also resized/reinitialized if numChannels changes
    // calculateCombinedOutputs will handle its structure based on row1States.
    this.calculateCombinedOutputs();
    // this.cdr.detectChanges(); // Let Angular's scheduler handle this or call it specifically in test/event handler
  }

  ngOnInit(): void {
    this.settingsSubscription = this.channelSettingsService.getAppSettings().subscribe(settings => {
      let channelsChanged = false;
      if (this.currentNumChannels !== settings.numChannels) {
        this.currentNumChannels = settings.numChannels;
        // Descriptions are part of settings.channelDescriptions, no need to call service again
        this.initializeChannelStates(settings.numChannels); // This will also call calculateCombinedOutputs
        channelsChanged = true; // initializeChannelStates calls calculateCombinedOutputs
      }

      // Update descriptions for existing states if numChannels didn't change
      // initializeChannelStates already handles setting descriptions based on service's current state
      // So, if numChannels changed, descriptions are set. If not, they're still current.
      // However, if only descriptions changed in the service, not numChannels:
      if (!channelsChanged) {
         this.row1States = this.row1States.map((state, index) => ({
           ...state,
           channelDescription: settings.channelDescriptions[index] || `Channel ${index + 1}`
         }));
         this.row2States = this.row2States.map((state, index) => ({
           ...state,
           channelDescription: settings.channelDescriptions[index] || `Channel ${index + 1}`
         }));
      }

      this.currentBackendUrl = settings.backendUrl;
      this.currentCrossfadeDurationMs = settings.crossfadeDurationSeconds * 1000;

      if (!channelsChanged) { // Avoid double calculation if initializeChannelStates was called
        this.calculateCombinedOutputs();
      }
      this.cdr.detectChanges(); // Call after all updates from settings subscription
    });
    // Initial calculation is done by initializeChannelStates in constructor which calls calculateCombinedOutputs
  }

  ngOnDestroy(): void {
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
    }
    if (this.settingsSubscription) {
      this.settingsSubscription.unsubscribe();
    }
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return ("#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).padStart(6, '0')).toLowerCase();
  }

  calculateCombinedOutputs(): void {
    // Ensure row1States and row2States are defined and have the same length
    if (!this.row1States || !this.row2States || this.row1States.length !== this.row2States.length || this.row1States.length !== this.currentNumChannels) {
      // console.warn("Channel states not ready or mismatched for calculation.");
      this.combinedOutputStates = Array.from({length: this.currentNumChannels}, (_, i) => ({
        channelNumber: i + 1,
        channelDescription: this.channelSettingsService.getCurrentChannelDescriptions()[i] || `Channel ${i+1}`,
        value: 0,
        color: '#000000'
      }));
      return;
    }

    this.combinedOutputStates = this.row1States.map((row1State, index) => {
      const row2State = this.row2States[index];

      const crossfadeRatio = this.crossfaderValue / 100;
      const invCrossfadeRatio = 1 - crossfadeRatio;
      const combinedValue = (row1State.value * crossfadeRatio) + (row2State.value * invCrossfadeRatio);

      let blendedColorHex = '#ffffff';
      const rgb1 = this.hexToRgb(row1State.color);
      const rgb2 = this.hexToRgb(row2State.color);

      if (rgb1 && rgb2) {
        const blendedR = Math.round(rgb1.r * crossfadeRatio + rgb2.r * invCrossfadeRatio);
        const blendedG = Math.round(rgb1.g * crossfadeRatio + rgb2.g * invCrossfadeRatio);
        const blendedB = Math.round(rgb1.b * crossfadeRatio + rgb2.b * invCrossfadeRatio);
        blendedColorHex = this.rgbToHex(blendedR, blendedG, blendedB);
      } else {
        if(rgb1) blendedColorHex = row1State.color;
        else if(rgb2) blendedColorHex = row2State.color;
      }
      return {
        channelNumber: row1State.channelNumber,
        channelDescription: row1State.channelDescription,
        value: Math.round(combinedValue),
        color: blendedColorHex
      };
    });
  }

  onPotentiometerChange(): void {
    this.calculateCombinedOutputs();
    if (this.currentBackendUrl && this.combinedOutputStates && this.combinedOutputStates.length > 0) {
      this.httpDataService.postCombinedOutput(this.currentBackendUrl, this.combinedOutputStates as CombinedOutputData[])
        .subscribe({
          next: () => { /* console.log('Data posted successfully'); */ },
          error: (err) => { console.error('Error posting data:', err); }
        });
    }
  }

  onGoButtonClick(): void {
    if (this.isAnimating) return;
    const targetValue = this.crossfaderValue >= 50 ? 0 : 100;
    this.animateCrossfader(targetValue);
  }

  animateCrossfader(targetValue: number): void {
    this.isAnimating = true;
    if (this.animationInterval) clearInterval(this.animationInterval);

    const totalDuration = this.currentCrossfadeDurationMs; // Use dynamic duration
    const steps = 25;
    const intervalDuration = totalDuration / steps;
    const initialValue = this.crossfaderValue;
    const stepSize = (targetValue - initialValue) / steps;
    let currentStep = 0;
    this.animationInterval = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        this.crossfaderValue = targetValue;
        clearInterval(this.animationInterval);
        this.animationInterval = null;
        this.isAnimating = false;
      } else {
        this.crossfaderValue = initialValue + (stepSize * currentStep);
      }
      this.crossfaderValue = Math.max(0, Math.min(100, this.crossfaderValue));
      this.onPotentiometerChange();
      this.cdr.detectChanges();
    }, intervalDuration);
  }

  toggleSettingsModal(): void {
    this.showSettingsModal = !this.showSettingsModal;
  }
}
