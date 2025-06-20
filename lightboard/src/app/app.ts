import { Component, OnInit, OnDestroy } from '@angular/core'; // Import OnInit, OnDestroy
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SlidePotentiometerComponent } from './slide-potentiometer/slide-potentiometer';
import { ChannelValuesTableComponent } from './channel-values-table/channel-values-table';

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
export class App implements OnInit, OnDestroy { // Implement OnInit, OnDestroy
  protected title = 'lightboard';

  row1States: { channelNumber: number; channelDescription: string; value: number }[] = [
    { channelNumber: 1, channelDescription: "Apple", value: 0 },
    { channelNumber: 2, channelDescription: "Banana", value: 25 },
    { channelNumber: 3, channelDescription: "Cherry", value: 50 },
    { channelNumber: 4, channelDescription: "Date", value: 75 }
  ];

  row2States: { channelNumber: number; channelDescription: string; value: number }[] = [
    { channelNumber: 1, channelDescription: "Apple", value: 100 },
    { channelNumber: 2, channelDescription: "Banana", value: 75 },
    { channelNumber: 3, channelDescription: "Cherry", value: 50 },
    { channelNumber: 4, channelDescription: "Date", value: 25 }
  ];

  crossfaderValue: number = 50;
  combinedOutputStates: { channelNumber: number; channelDescription: string; value: number }[] = [];

  isAnimating: boolean = false;
  animationInterval: any = null; // Using 'any' for NodeJS.Timeout or number for browser

  ngOnInit(): void {
    this.calculateCombinedOutputs();
  }

  ngOnDestroy(): void {
    if (this.animationInterval) {
      clearInterval(this.animationInterval); // Clean up interval on component destroy
    }
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
      // Current formula: 100% crossfader = 100% row1, 0% crossfader = 100% row2
      const combinedValue = (row1State.value * crossfadeRatio) + (row2State.value * (1 - crossfadeRatio));

      return {
        channelNumber: row1State.channelNumber,
        channelDescription: row1State.channelDescription,
        value: Math.round(combinedValue)
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
    // If current value is >= 50, target is 0 (full Row 2). Otherwise, target is 100 (full Row 1).
    const targetValue = this.crossfaderValue >= 50 ? 0 : 100;
    this.animateCrossfader(targetValue);
  }

  animateCrossfader(targetValue: number): void {
    this.isAnimating = true;
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
    }

    const totalDuration = 500; // ms
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
      this.onPotentiometerChange(); // Recalculate combined output for table
    }, intervalDuration);
  }
}
