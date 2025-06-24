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
  private readonly baseTickWidthPx = 1.5; // Base unit for tick length scaling.

  private calculateWidthFromPercentage(percentageValue: number): number {
    // Tick length = ((percentage value / 10) + 1) * baseUnit
    // Example: 0% -> (0/10 + 1) * 1.5 = 1.5px
    // Example: 100% -> (100/10 + 1) * 1.5 = (10 + 1) * 1.5 = 16.5px
    return ((percentageValue / 10) + 1) * this.baseTickWidthPx;
  }

  public getEffectiveTickWidth(physicalTickPosition: number): number {
    // physicalTickPosition is 0 for bottom-most tick, 100 for top-most tick.
    // For standard sliders (invertTickMarkLogic=false), physicalTickPosition is the value.
    // For inverted sliders (Scene 2, invertTickMarkLogic=true), the value is (100 - physicalTickPosition).
    const valueRepresented = this.invertTickMarkLogic ? (100 - physicalTickPosition) : physicalTickPosition;
    return this.calculateWidthFromPercentage(valueRepresented);
  }

  public isEffectiveMidPoint(physicalTickPosition: number): boolean {
    const valueRepresented = this.invertTickMarkLogic ? (100 - physicalTickPosition) : physicalTickPosition;
    return valueRepresented === 50;
  }

  public isEffectiveEndPoint(physicalTickPosition: number): boolean {
    const valueRepresented = this.invertTickMarkLogic ? (100 - physicalTickPosition) : physicalTickPosition;
    return valueRepresented === 100;
  }
}
