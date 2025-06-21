import { Component, OnInit, OnDestroy, ChangeDetectorRef, Renderer2, Inject } from '@angular/core';
import { DOCUMENT, CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { SlidePotentiometerComponent } from './slide-potentiometer/slide-potentiometer';
// Removed: import { ChannelValuesTableComponent } from './channel-values-table/channel-values-table';
import { CombinedOutputDisplayComponent } from './combined-output-display/combined-output-display.component'; // Import new component
import { SettingsModalComponent } from './settings-modal/settings-modal.component';
import { ChannelSettingsService, AppSettings } from './channel-settings.service';
import { HttpDataService, CombinedOutputData } from './http-data.service';

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
    // ChannelValuesTableComponent, // Removed
    CombinedOutputDisplayComponent, // Added
    SettingsModalComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  protected title = 'lightboard';

  row1States: PotentiometerState[] = [];
  row2States: PotentiometerState[] = [];

  crossfaderValue: number = 50;
  combinedOutputStates: PotentiometerState[] = [];

  isAnimating: boolean = false;
  animationInterval: any = null;

  showSettingsModal: boolean = false;
  private settingsSubscription: Subscription | undefined;

  private currentNumChannels: number;
  private currentBackendUrl: string;
  private currentCrossfadeDurationMs: number;
  private currentDarkMode: boolean;

  private defaultColorsScene1: string[] = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#800080', '#a52a2a', '#808000', '#008080', '#800000'];
  private defaultColorsScene2: string[] = ['#00ffff', '#ff00ff', '#ffff00', '#0000ff', '#00ff00', '#ff0000', '#800080', '#ffa500', '#808000', '#a52a2a', '#800000', '#008080'];

  constructor(
    private cdr: ChangeDetectorRef,
    private channelSettingsService: ChannelSettingsService,
    private httpDataService: HttpDataService,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {
    const initialSettings = this.channelSettingsService.getCurrentAppSettings();
    this.currentNumChannels = initialSettings.numChannels;
    this.currentBackendUrl = initialSettings.backendUrl;
    this.currentCrossfadeDurationMs = initialSettings.crossfadeDurationSeconds * 1000;
    this.currentDarkMode = initialSettings.darkMode;
    this.initializeChannelStates(this.currentNumChannels);
    this.applyTheme(this.currentDarkMode);
  }

  initializeChannelStates(numChannels: number): void {
    const currentDescriptions = this.channelSettingsService.getCurrentChannelDescriptions();

    this.row1States = [];
    this.row2States = [];
    for (let i = 0; i < numChannels; i++) {
      this.row1States.push({
        channelNumber: i + 1,
        channelDescription: currentDescriptions[i] || `Channel ${i + 1}`,
        value: 0,
        color: this.defaultColorsScene1[i] || '#ffffff'
      });
      this.row2States.push({
        channelNumber: i + 1,
        channelDescription: currentDescriptions[i] || `Channel ${i + 1}`,
        value: 100,
        color: this.defaultColorsScene2[i] || '#ffffff'
      });
    }
    this.calculateCombinedOutputs();
  }

  ngOnInit(): void {
    this.settingsSubscription = this.channelSettingsService.getAppSettings().subscribe(settings => {
      let channelsOrDescriptionsChanged = false;
      if (this.currentNumChannels !== settings.numChannels) {
        this.currentNumChannels = settings.numChannels;
        this.initializeChannelStates(settings.numChannels);
        channelsOrDescriptionsChanged = true;
      } else {
        const newDescriptions = settings.channelDescriptions;
        let descriptionsActuallyChanged = false;
        this.row1States = this.row1States.map((state, index) => {
          if(state.channelDescription !== (newDescriptions[index] || `Channel ${index + 1}`)) {
            descriptionsActuallyChanged = true;
          }
          return {
            ...state,
            channelDescription: newDescriptions[index] || `Channel ${index + 1}`
          };
        });
        this.row2States = this.row2States.map((state, index) => {
          // Assuming row2States descriptions are kept in sync or derived similarly
          if(state.channelDescription !== (newDescriptions[index] || `Channel ${index + 1}`)) {
            descriptionsActuallyChanged = true;
          }
          return {
            ...state,
            channelDescription: newDescriptions[index] || `Channel ${index + 1}`
          };
        });
        if(descriptionsActuallyChanged) channelsOrDescriptionsChanged = true;
      }

      this.currentBackendUrl = settings.backendUrl;
      this.currentCrossfadeDurationMs = settings.crossfadeDurationSeconds * 1000;

      if (this.currentDarkMode !== settings.darkMode) {
        this.currentDarkMode = settings.darkMode;
        this.applyTheme(this.currentDarkMode);
      }

      if (channelsOrDescriptionsChanged) {
        this.calculateCombinedOutputs();
      }
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
    }
    if (this.settingsSubscription) {
      this.settingsSubscription.unsubscribe();
    }
  }

  private applyTheme(isDarkMode: boolean): void {
    if (isDarkMode) {
      this.renderer.addClass(this.document.body, 'dark-theme');
    } else {
      this.renderer.removeClass(this.document.body, 'dark-theme');
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
    if (!this.row1States || !this.row2States || this.row1States.length !== this.row2States.length || this.row1States.length === 0 || this.row1States.length !== this.currentNumChannels ) {
      // If currentNumChannels is 0 (or states are not aligned), create empty combined states or based on numChannels
      this.combinedOutputStates = Array.from({length: this.currentNumChannels || 0}, (_, i) => {
        const desc = this.channelSettingsService.getCurrentChannelDescriptions();
        return {
          channelNumber: i + 1,
          channelDescription: (desc && desc[i]) || `Channel ${i+1}`,
          value: 0,
          color: '#000000'
        };
      });
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
    if (this.isAnimating) {
      if (this.animationInterval) {
        clearInterval(this.animationInterval);
        this.animationInterval = null;
      }
      this.isAnimating = false;
      this.cdr.detectChanges(); // Update UI for button state
    } else {
      const targetValue = this.crossfaderValue >= 50 ? 0 : 100;
      this.animateCrossfader(targetValue);
    }
  }

  animateCrossfader(targetValue: number): void {
    this.isAnimating = true;
    if (this.animationInterval) clearInterval(this.animationInterval);
    const totalDuration = this.currentCrossfadeDurationMs;
    const steps = 25;
    const intervalDuration = Math.max(1, totalDuration / steps);
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

  // Added for *ngFor trackBy in app.html for combinedOutputStates
  public trackByCombinedState(index: number, item: PotentiometerState): number {
    return item.channelNumber;
  }

  public trackByState(index: number, item: PotentiometerState): number {
    return item.channelNumber; // Or a more unique ID if channelNumber can repeat across rows (though not in this design)
  }
}
