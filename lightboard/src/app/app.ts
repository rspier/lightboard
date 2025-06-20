import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs'; // Import Subscription
import { SlidePotentiometerComponent } from './slide-potentiometer/slide-potentiometer';
import { ChannelValuesTableComponent } from './channel-values-table/channel-values-table';
import { SettingsModalComponent } from './settings-modal/settings-modal.component'; // Import SettingsModalComponent
import { ChannelSettingsService } from './channel-settings.service'; // Import ChannelSettingsService

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
    SettingsModalComponent // Add SettingsModalComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  protected title = 'lightboard';

  // Initialize with descriptions from service
  row1States: PotentiometerState[];
  row2States: PotentiometerState[];

  crossfaderValue: number = 50;
  combinedOutputStates: PotentiometerState[] = [];

  isAnimating: boolean = false;
  animationInterval: any = null;

  showSettingsModal: boolean = false;
  private descriptionsSubscription: Subscription | undefined;

  constructor(
    private cdr: ChangeDetectorRef,
    private channelSettingsService: ChannelSettingsService // Inject ChannelSettingsService
  ) {
    // Initialize states with current descriptions from service
    const currentDescriptions = this.channelSettingsService.getCurrentDescriptions();
    this.row1States = [
      { channelNumber: 1, channelDescription: currentDescriptions[0], value: 0, color: '#ff0000' },
      { channelNumber: 2, channelDescription: currentDescriptions[1], value: 25, color: '#00ff00' },
      { channelNumber: 3, channelDescription: currentDescriptions[2], value: 50, color: '#0000ff' },
      { channelNumber: 4, channelDescription: currentDescriptions[3], value: 75, color: '#ffff00' }
    ];
    this.row2States = [
      { channelNumber: 1, channelDescription: currentDescriptions[0], value: 100, color: '#00ffff' },
      { channelNumber: 2, channelDescription: currentDescriptions[1], value: 75, color: '#ff00ff' },
      { channelNumber: 3, channelDescription: currentDescriptions[2], value: 50, color: '#ffa500' },
      { channelNumber: 4, channelDescription: currentDescriptions[3], value: 25, color: '#800080' }
    ];
  }

  ngOnInit(): void {
    this.descriptionsSubscription = this.channelSettingsService.getDescriptions().subscribe(descriptions => {
      this.row1States = this.row1States.map((state, index) => ({
        ...state,
        channelDescription: descriptions[index] || `Channel ${index + 1}`
      }));
      this.row2States = this.row2States.map((state, index) => ({
        ...state,
        channelDescription: descriptions[index] || `Channel ${index + 1}`
      }));
      this.calculateCombinedOutputs(); // Recalculate when descriptions change
      this.cdr.detectChanges(); // Trigger change detection if needed
    });
    this.calculateCombinedOutputs(); // Initial calculation
  }

  ngOnDestroy(): void {
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
    }
    if (this.descriptionsSubscription) {
      this.descriptionsSubscription.unsubscribe();
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
    if (this.row1States.length !== this.row2States.length) {
      console.error("Row states arrays must have the same length to combine.");
      this.combinedOutputStates = [];
      return;
    }
    this.combinedOutputStates = this.row1States.map((row1State, index) => {
      const row2State = this.row2States[index];
      // No need to warn for description mismatch here as they are now synced from the same source

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
        console.warn(`Invalid color format for blending at index ${index}. Defaulting color.`);
        if(rgb1) blendedColorHex = row1State.color;
        else if(rgb2) blendedColorHex = row2State.color;
      }
      return {
        channelNumber: row1State.channelNumber, // This should be fine, or use a dedicated output channel number
        channelDescription: row1State.channelDescription,
        value: Math.round(combinedValue),
        color: blendedColorHex
      };
    });
  }

  onPotentiometerChange(): void {
    this.calculateCombinedOutputs();
  }

  onGoButtonClick(): void {
    if (this.isAnimating) return;
    const targetValue = this.crossfaderValue >= 50 ? 0 : 100;
    this.animateCrossfader(targetValue);
  }

  animateCrossfader(targetValue: number): void {
    this.isAnimating = true;
    if (this.animationInterval) clearInterval(this.animationInterval);
    const totalDuration = 500, steps = 25, intervalDuration = totalDuration / steps;
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
