import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // Import CommonModule
import { RouterOutlet } from '@angular/router';
import { SlidePotentiometerComponent } from './slide-potentiometer/slide-potentiometer';
import { ChannelValuesTableComponent } from './channel-values-table/channel-values-table';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule, // Add CommonModule here
    RouterOutlet,
    SlidePotentiometerComponent,
    ChannelValuesTableComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected title = 'lightboard';

  potentiometerStates: { channelNumber: number; channelDescription: string; value: number }[] = [
    { channelNumber: 1, channelDescription: "Apple", value: 0 },
    { channelNumber: 2, channelDescription: "Banana", value: 25 },
    { channelNumber: 3, channelDescription: "Cherry", value: 50 },
    { channelNumber: 4, channelDescription: "Date", value: 75 }
  ];
}
