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

  @Input() invertTickMarkLogic = false; // New input for reversing tick length logic (type inferred)

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
  // private readonly maxTickWidthMultiplier = 10; // Not directly used, implied by (100/10)

  private calculateWidthFromPercentage(percentage: number): number {
    if (percentage === 0) {
      return 0;
    }
    // For percentage (10, 20, ..., 100)
    // The width is (percentage / 10) * baseTickWidthPx
    return (percentage / 10) * this.baseTickWidthPx;
  }

  public getEffectiveTickWidth(physicalTickPosition: number): number {
    const valueForLength = this.invertTickMarkLogic ? (100 - physicalTickPosition) : physicalTickPosition;
    return this.calculateWidthFromPercentage(valueForLength);
  }

  public isEffectiveMidPoint(physicalTickPosition: number): boolean {
    const valueForLength = this.invertTickMarkLogic ? (100 - physicalTickPosition) : physicalTickPosition;
    return valueForLength === 50;
  }
}
