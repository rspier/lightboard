import { Component, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
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
  @Input() sliderHeight: string = '150px';
  @Input() showChannelInfo: boolean = true;
  @Input() showValueDisplay: boolean = true; // New input
  @Input() showColorInput: boolean = true; // New input

  @Input() value: number = 0;
  @Output() valueChange = new EventEmitter<number>();

  @Input() color: string = '#ffffff'; // Default color
  @Output() colorChange = new EventEmitter<string>();

  @ViewChild('valueInput') valueInputRef!: ElementRef<HTMLInputElement>;

  isEditing: boolean = false;
  editValue: number = 0;

  startEditing(): void {
    this.isEditing = true;
    this.editValue = this.value;
    setTimeout(() => {
      if (this.valueInputRef?.nativeElement) {
        this.valueInputRef.nativeElement.focus();
        this.valueInputRef.nativeElement.select();
      }
    }, 0);
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

  onColorInputChange(event: Event): void {
    const newColor = (event.target as HTMLInputElement).value;
    this.color = newColor; // Update the internal state
    this.colorChange.emit(this.color);
  }
}
