import { Component, OnInit } from '@angular/core'; // Import OnInit
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
export class App implements OnInit { // Implement OnInit
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

  ngOnInit(): void {
    this.calculateCombinedOutputs();
  }

  calculateCombinedOutputs(): void {
    if (this.row1States.length !== this.row2States.length) {
      console.error("Row states arrays must have the same length to combine.");
      this.combinedOutputStates = []; // Clear or handle error appropriately
      return;
    }

    this.combinedOutputStates = this.row1States.map((row1State, index) => {
      const row2State = this.row2States[index];
      // Ensure channel numbers and descriptions match, or handle discrepancies
      if (row1State.channelNumber !== row2State.channelNumber || row1State.channelDescription !== row2State.channelDescription) {
        console.warn(`Mismatch in channel data at index ${index}. Using data from row1States.`);
      }

      const crossfadeRatio = this.crossfaderValue / 100;
      // Standard crossfade: row1 * (1 - ratio) + row2 * ratio
      // Or, if crossfaderValue = 0 means full row1, crossfaderValue = 100 means full row2
      // The provided formula: (row1State.value * crossfadeRatio) + (row2State.value * (1 - crossfadeRatio))
      // This means if crossfaderValue = 100 (ratio=1), we get full row1.
      // If crossfaderValue = 0 (ratio=0), we get full row2.
      // Let's adjust to: row1 * (1-ratio) + row2 * ratio for more intuitive crossfading
      // where 0 = full row1, 100 = full row2.
      // So if crossfaderValue represents amount of row2:
      // const combinedValue = (row1State.value * (1 - crossfadeRatio)) + (row2State.value * crossfadeRatio);
      // The original formula was: (row1State.value * crossfadeRatio) + (row2State.value * (1 - crossfadeRatio))
      // This means:
      // If crossfaderValue = 50 (ratio = 0.5), combined = (row1 * 0.5) + (row2 * 0.5) -> Middle
      // If crossfaderValue = 0 (ratio = 0), combined = (row1 * 0) + (row2 * 1) -> Full Row2
      // If crossfaderValue = 100 (ratio = 1), combined = (row1 * 1) + (row2 * 0) -> Full Row1
      // This seems like crossfaderValue = 0 means row2, 100 means row1.
      // Let's stick to the provided formula first.
      const combinedValue = (row1State.value * crossfadeRatio) + (row2State.value * (1 - crossfadeRatio));

      return {
        channelNumber: row1State.channelNumber, // Or some other logic for combined channel number
        channelDescription: row1State.channelDescription, // Or combined description
        value: Math.round(combinedValue)
      };
    });
  }

  onPotentiometerChange(): void {
    this.calculateCombinedOutputs();
  }
}
