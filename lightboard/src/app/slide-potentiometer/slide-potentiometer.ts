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
  @Input() channelNumber = 0;
  // @Input() channelDescription: string = ''; // Removed
  @Input() sliderHeight = '150px';
  @Input() showChannelInfo = true;
  @Input() showValueDisplay = true; // New input
  @Input() showColorInput = true; // New input

  @Input() value = 0;
  @Output() valueChange = new EventEmitter<number>();

  @Input() color = '#ffffff'; // Default color
  @Output() colorChange = new EventEmitter<string>();

  @ViewChild('valueInput') valueInputRef!: ElementRef<HTMLInputElement>;

  isEditing = false;
  editValue = 0;

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

  // Calculate tick mark width in pixels
  // 100% tick should be 10x the 10% tick.
  // Let 10% tick be 1.5px wide. Then 100% tick is 15px wide.
  // 0% tick can be 0px or minimal.
  private readonly baseTickWidthPx = 1.5; // Width of the 10% tick mark
  private readonly maxTickWidthMultiplier = 10; // 100% tick is 10 * baseTickWidthPx

  getTickMarkWidthPx(tickValue: number): number {
    if (tickValue === 0) {
      return 0; // Or a minimal visible dot like 1px, but 0 means it won't show
    }
    // For tickValue (10, 20, ..., 100)
    // The width is (tickValue / 10) * baseTickWidthPx
    // e.g., for tickValue = 10, width = 1 * 1.5 = 1.5px
    // e.g., for tickValue = 50, width = 5 * 1.5 = 7.5px
    // e.g., for tickValue = 100, width = 10 * 1.5 = 15px
    return (tickValue / 10) * this.baseTickWidthPx;
  }
}
