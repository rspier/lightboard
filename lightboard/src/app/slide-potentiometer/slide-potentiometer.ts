import { Component, Input, Output, EventEmitter } from '@angular/core'; // Added Output, EventEmitter
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-slide-potentiometer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './slide-potentiometer.html',
  styleUrl: './slide-potentiometer.css'
})
export class SlidePotentiometerComponent {
  @Input() channelNumber: number = 0;
  @Input() channelDescription: string = '';

  @Input() value: number = 0; // Added @Input() for two-way binding
  @Output() valueChange = new EventEmitter<number>();

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
      // Ensure editValue is treated as a number, though ngModel should handle it
      this.value = Number(this.editValue);
    }
    this.isEditing = false;
    this.valueChange.emit(this.value); // Emit the change
  }

  onSliderValueChange(): void {
    // The 'value' property is already updated by [(ngModel)]
    // Ensure it's clamped, though min/max on input attributes should also enforce this.
    // However, direct manipulation or programmatic changes might bypass input attributes.
    this.value = Math.max(0, Math.min(100, Number(this.value)));
    this.valueChange.emit(this.value); // Emit the change
  }
}
