import { Component, Input, Output, EventEmitter } from '@angular/core';
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
  @Input() sliderHeight: string = '150px'; // Default height

  @Input() value: number = 0;
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
      this.value = Number(this.editValue);
    }
    this.isEditing = false;
    this.valueChange.emit(this.value);
  }

  onSliderValueChange(): void {
    this.value = Math.max(0, Math.min(100, Number(this.value)));
    this.valueChange.emit(this.value);
  }
}
