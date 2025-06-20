import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // For *ngIf
import { FormsModule } from '@angular/forms'; // For ngModel

@Component({
  selector: 'app-slide-potentiometer',
  standalone: true, // Ensure standalone is true
  imports: [CommonModule, FormsModule], // Add CommonModule and FormsModule
  templateUrl: './slide-potentiometer.html',
  styleUrl: './slide-potentiometer.css'
})
export class SlidePotentiometerComponent { // Corrected class name
  value: number = 0;
  isEditing: boolean = false;
  editValue: number = 0;

  startEditing(): void {
    this.isEditing = true;
    this.editValue = this.value;
  }

  stopEditing(): void {
    if (this.editValue < 0) {
      this.value = 0;
    } else if (this.editValue > 100) {
      this.value = 100;
    } else {
      this.value = this.editValue;
    }
    this.isEditing = false;
  }
}
