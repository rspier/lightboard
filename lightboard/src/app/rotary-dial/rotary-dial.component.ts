import { Component, Input, Output, EventEmitter, ElementRef, ViewChild, OnChanges, SimpleChanges, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-rotary-dial',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rotary-dial.component.html',
  styleUrls: ['./rotary-dial.component.css']
})
export class RotaryDialComponent implements OnInit, OnChanges {
  @Input() value: number = 0;
  @Input() min: number = 0;
  @Input() max: number = 100;
  @Input() step: number = 1;
  @Input() label: string = 'Value'; // e.g., "Duration"
  @Input() unit: string = ''; // e.g., "s" for seconds

  @Output() valueChange = new EventEmitter<number>();

  @ViewChild('dialContainer') dialContainerRef!: ElementRef<HTMLDivElement>;

  public currentAngle: number = 0;
  public displayValue: string = '';
  private dragging: boolean = false;
  private readonly fullAngleRange: number = 270; // e.g., -135 to +135 degrees

  constructor(private elRef: ElementRef) {}

  ngOnInit(): void {
    this.updateAngleFromValue();
    this.updateDisplayValue();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] && !this.dragging) { // Update angle if value changes externally and not dragging
      this.updateAngleFromValue();
    }
    if (changes['value'] || changes['unit']) {
        this.updateDisplayValue();
    }
     if (changes['min'] || changes['max'] || changes['step']) {
        this.value = this.clampAndStepValue(this.value); // Re-validate value if constraints change
        this.updateAngleFromValue();
        this.updateDisplayValue();
    }
  }

  private updateAngleFromValue(): void {
    const valueRatio = (this.value - this.min) / (this.max - this.min);
    this.currentAngle = (valueRatio * this.fullAngleRange) - (this.fullAngleRange / 2);
  }

  private updateValueFromAngle(angle: number): void {
    const normalizedAngle = angle + (this.fullAngleRange / 2);
    let valueRatio = normalizedAngle / this.fullAngleRange;
    valueRatio = Math.max(0, Math.min(1, valueRatio)); // Clamp ratio

    let newValue = this.min + (valueRatio * (this.max - this.min));
    this.updateValue(newValue);
  }

  private updateValue(newValue: number): void {
    const clampedValue = this.clampAndStepValue(newValue);
    if (this.value !== clampedValue) {
      this.value = clampedValue;
      this.updateDisplayValue();
      this.valueChange.emit(this.value);
    }
  }

  private clampAndStepValue(val: number): number {
    let clamped = Math.max(this.min, Math.min(this.max, val));
    if (this.step > 0) {
      clamped = Math.round(clamped / this.step) * this.step;
      // Fix potential floating point inaccuracies with toFixed
      const decimalPlaces = (this.step.toString().split('.')[1] || '').length;
      clamped = parseFloat(clamped.toFixed(decimalPlaces));
    }
    return Math.max(this.min, Math.min(this.max, clamped)); // Re-clamp after stepping
  }


  private updateDisplayValue(): void {
    const decimalPlaces = (this.step.toString().split('.')[1] || '').length;
    this.displayValue = this.value.toFixed(decimalPlaces) + this.unit;
  }

  onMouseDown(event: MouseEvent): void {
    event.preventDefault();
    this.dragging = true;
    this.updateDialBasedOnEvent(event.clientX, event.clientY);
  }

  onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1) {
      event.preventDefault();
      this.dragging = true;
      this.updateDialBasedOnEvent(event.touches[0].clientX, event.touches[0].clientY);
    }
  }

  @HostListener('document:mousemove', ['$event'])
  onDocumentMouseMove(event: MouseEvent): void {
    if (this.dragging) {
      event.preventDefault();
      this.updateDialBasedOnEvent(event.clientX, event.clientY);
    }
  }

  @HostListener('document:touchmove', ['$event'])
  onDocumentTouchMove(event: TouchEvent): void {
    if (this.dragging && event.touches.length === 1) {
      event.preventDefault();
      this.updateDialBasedOnEvent(event.touches[0].clientX, event.touches[0].clientY);
    }
  }

  @HostListener('document:mouseup', ['$event'])
  @HostListener('document:touchend', ['$event'])
  onDragEnd(event: Event): void {
    if (this.dragging) {
      this.dragging = false;
      // Optional: emit a final event or handle snapping if necessary
    }
  }

  private updateDialBasedOnEvent(clientX: number, clientY: number): void {
    if (!this.dialContainerRef) return;

    const rect = this.dialContainerRef.nativeElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;

    // Calculate angle in degrees from -180 to 180
    let angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
    angle += 90; // Adjust so 0 degrees is at the top

    // Normalize angle to be within -fullAngleRange/2 to +fullAngleRange/2
    // This simple dial rotates 360, but we constrain its effect.
    // A more sophisticated dial might limit visual rotation too.
    // For now, we map this angle to our effective range.

    // Let's refine angle mapping to the visual representation.
    // If indicator starts at top (0 deg = value min), and rotates clockwise.
    // A common rotary dial might have a limited sweep, e.g., 270 degrees.
    // -135 deg = min, 0 deg = mid, 135 deg = max.

    // Convert angle to a system where -135 is left, 0 is top-mid, 135 is right
    if (angle < -this.fullAngleRange / 2) angle = -this.fullAngleRange / 2;
    if (angle > this.fullAngleRange / 2) angle = this.fullAngleRange / 2;

    this.currentAngle = angle; // Update visual angle directly
    this.updateValueFromAngle(this.currentAngle);
  }
}
