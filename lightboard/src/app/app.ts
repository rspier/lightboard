import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SlidePotentiometerComponent } from './slide-potentiometer/slide-potentiometer'; // Adjusted import path

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SlidePotentiometerComponent], // Add SlidePotentiometerComponent here
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected title = 'lightboard';
}
