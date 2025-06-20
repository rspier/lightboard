import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core'; // Import ChangeDetectorRef
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SlidePotentiometerComponent } from './slide-potentiometer/slide-potentiometer';
import { ChannelValuesTableComponent } from './channel-values-table/channel-values-table';

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
    ChannelValuesTableComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  protected title = 'lightboard';

  row1States: PotentiometerState[] = [
    { channelNumber: 1, channelDescription: "Apple", value: 0, color: '#ff0000' }, // Red
    { channelNumber: 2, channelDescription: "Banana", value: 25, color: '#00ff00' }, // Green
    { channelNumber: 3, channelDescription: "Cherry", value: 50, color: '#0000ff' }, // Blue
    { channelNumber: 4, channelDescription: "Date", value: 75, color: '#ffff00' }  // Yellow
  ];

  row2States: PotentiometerState[] = [
    { channelNumber: 1, channelDescription: "Apple", value: 100, color: '#00ffff' }, // Cyan
    { channelNumber: 2, channelDescription: "Banana", value: 75, color: '#ff00ff' }, // Magenta
    { channelNumber: 3, channelDescription: "Cherry", value: 50, color: '#ffa500' }, // Orange
    { channelNumber: 4, channelDescription: "Date", value: 25, color: '#800080' }  // Purple
  ];

  crossfaderValue: number = 50;
  combinedOutputStates: PotentiometerState[] = [];

  isAnimating: boolean = false;
  animationInterval: any = null;

  constructor(private cdr: ChangeDetectorRef) {} // Inject ChangeDetectorRef

  ngOnInit(): void {
    this.calculateCombinedOutputs();
  }

  ngOnDestroy(): void {
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
    }
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).padStart(6, '0');
  }

  calculateCombinedOutputs(): void {
    if (this.row1States.length !== this.row2States.length) {
      console.error("Row states arrays must have the same length to combine.");
      this.combinedOutputStates = [];
      return;
    }

    this.combinedOutputStates = this.row1States.map((row1State, index) => {
      const row2State = this.row2States[index];
      if (row1State.channelNumber !== row2State.channelNumber || row1State.channelDescription !== row2State.channelDescription) {
        console.warn(`Mismatch in channel data at index ${index}. Using data from row1States for description.`);
      }

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
        channelNumber: row1State.channelNumber,
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
    if (this.isAnimating) {
      return;
    }
    const targetValue = this.crossfaderValue >= 50 ? 0 : 100;
    this.animateCrossfader(targetValue);
  }

  animateCrossfader(targetValue: number): void {
    this.isAnimating = true;
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
    }

    const totalDuration = 500;
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
      this.cdr.detectChanges(); // Manually trigger change detection
    }, intervalDuration);
  }
}
