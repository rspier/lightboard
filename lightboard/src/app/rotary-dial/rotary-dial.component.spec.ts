import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RotaryDialComponent } from './rotary-dial.component';
import { CommonModule } from '@angular/common';

describe('RotaryDialComponent', () => {
  let component: RotaryDialComponent;
  let fixture: ComponentFixture<RotaryDialComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        RotaryDialComponent // Standalone component
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RotaryDialComponent);
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing'; // Added fakeAsync, tick
import { RotaryDialComponent } from './rotary-dial.component';
import { CommonModule } from '@angular/common';
import { SimpleChange } from '@angular/core'; // Added SimpleChange

describe('RotaryDialComponent', () => {
  let component: RotaryDialComponent;
  let fixture: ComponentFixture<RotaryDialComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        RotaryDialComponent // Standalone component
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RotaryDialComponent);
    component = fixture.componentInstance;
    // Match app.html inputs for general tests for consistency
    component.min = 0.1;
    component.max = 5;
    component.step = 0.1;
    component.value = 0.5; // Initial value from app.ts default/service
    component.label = 'Duration';
    component.unit = 's';
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with provided inputs and update display', () => {
    // value = 0.5, min = 0.1, max = 5
    // valueRatio = (0.5 - 0.1) / (5 - 0.1) = 0.4 / 4.9 = approx 0.08163
    // currentAngle = (0.08163 * 270) - 135 = 22.04 - 135 = approx -112.96
    expect(component.currentAngle).toBeCloseTo(-112.96, 2);
    expect(component.displayValue).toBe('0.5s');
  });

  it('should update angle and displayValue when value input changes', () => {
    component.value = 75;
    component.ngOnChanges({
      value: { currentValue: 75, previousValue: 50, firstChange: false, isFirstChange: () => false }
    });
    fixture.detectChanges();
    // (75-0)/(100-0) * 270 - 135 = 0.75 * 270 - 135 = 202.5 - 135 = 67.5
    expect(component.currentAngle).toBe(67.5);
    expect(component.displayValue).toBe('75%');
  });

  it('should emit valueChange when value is updated internally via updateValue', () => {
    spyOn(component.valueChange, 'emit');
    // Simulate internal value update, e.g. after a drag operation (tested more thoroughly later)
    (component as any).updateValue(60); // Access private method for test
    expect(component.value).toBe(60);
    expect(component.valueChange.emit).toHaveBeenCalledWith(60);
    expect(component.displayValue).toBe('60%');
  });

  it('should clamp value to min and max', () => {
    (component as any).updateValue(-10);
    expect(component.value).toBe(0); // Clamped to min

    (component as any).updateValue(110);
    expect(component.value).toBe(100); // Clamped to max
  });

  it('should apply step to value', () => {
    component.step = 0.5;
    component.min = 0;
    component.max = 10;
    fixture.detectChanges(); // Re-run ngOnChanges for new step

    (component as any).updateValue(3.3);
    expect(component.value).toBe(3.5); // Rounded to nearest step 0.5

    (component as any).updateValue(3.1);
    expect(component.value).toBe(3.0);

    component.step = 10;
    (component as any).updateValue(5);
    expect(component.value).toBe(0); // Rounded to 0, then clamped by min if step makes it < min

    (component as any).updateValue(15);
    expect(component.value).toBe(20); // Rounded to 20
  });

  it('should correctly format displayValue with units and decimal places based on step', () => {
    component.value = 25.5;
    component.step = 0.1;
    component.unit = 's';
    component.ngOnChanges({ // Simulate all relevant inputs changing
        value: { currentValue: 25.5, previousValue: 0, firstChange: false, isFirstChange: () => false },
        step: { currentValue: 0.1, previousValue: 1, firstChange: false, isFirstChange: () => false },
        unit: { currentValue: 's', previousValue: '%', firstChange: false, isFirstChange: () => false }
    });
    fixture.detectChanges();
    expect(component.displayValue).toBe('25.5s');

    component.value = 30;
    component.step = 1;
    component.unit = 'kg';
     component.ngOnChanges({
        value: { currentValue: 30, previousValue: 25.5, firstChange: false, isFirstChange: () => false },
        step: { currentValue: 1, previousValue: 0.1, firstChange: false, isFirstChange: () => false },
        unit: { currentValue: 'kg', previousValue: 's', firstChange: false, isFirstChange: () => false }
    });
    fixture.detectChanges();
    expect(component.displayValue).toBe('30kg');
  });

  describe('Mouse Interaction', () => {
    let dialContainerElement: HTMLDivElement;

    beforeEach(() => {
      dialContainerElement = component.dialContainerRef.nativeElement;
      // Mock getBoundingClientRect for consistent results in tests
      spyOn(dialContainerElement, 'getBoundingClientRect').and.returnValue({
        left: 0, top: 0, width: 80, height: 80, right: 80, bottom: 80, x: 0, y: 0, toJSON: () => {}
      });
    });

    it('should start dragging on mousedown and update value', () => {
      spyOn(component, 'onMouseDown').and.callThrough();
      spyOn(component as any, 'updateDialBasedOnEvent').and.callThrough();
      spyOn(component.valueChange, 'emit');

      const mouseDownEvent = new MouseEvent('mousedown', { clientX: 40, clientY: 0 }); // Top-center, should be min value
      dialContainerElement.dispatchEvent(mouseDownEvent);
      fixture.detectChanges();

      expect(component.onMouseDown).toHaveBeenCalled();
      expect((component as any).dragging).toBeTrue();
      expect((component as any).updateDialBasedOnEvent).toHaveBeenCalled();

      // Angle for top-center (clientX: 40, clientY: 0) -> deltaX=0, deltaY=-40 -> atan2(-40,0) = -PI/2 rad = -90deg. Add 90 = 0 deg.
      // This is then clamped. If fullAngleRange is 270, -135 to +135. 0 is fine.
      // updateValueFromAngle(0) -> normalizedAngle = 0 + 135 = 135. valueRatio = 135/270 = 0.5
      // newValue = 0 + (0.5 * (100-0)) = 50.
      // This means currentAngle = 0 corresponds to the middle value.
      // For min value, currentAngle should be -135. For max, +135.
      // If clientY is 0 (top of the dial), angle from center is -90 deg.
      // If we map this to the indicator pointing straight up:
      // Top (0, -40 relative to center) => Math.atan2(-40, 0) * (180 / Math.PI) = -90.  -90 + 90 = 0 degrees (visual top)
      // This 0 degree visual top should correspond to a specific point in the value range.
      // The component's updateValueFromAngle maps this.currentAngle (-135 to 135) to value.
      // If this.currentAngle = 0 (visual top), then normalizedAngle = 0 + 135 = 135. valueRatio = 135/270 = 0.5. Value = 50 (mid).

      // To get min value (0), currentAngle needs to be -135.
      // This means the mouse event should produce an angle that results in -135.
      // E.g., far left-bottom: clientX: 0, clientY: 80 (relative to center: -40, 40)
      // Math.atan2(40, -40) * (180/Math.PI) = 135 deg. Add 90 = 225. This is outside -135 to 135.
      // The updateDialBasedOnEvent clamps angle to -135 to 135.
      // So, let's test a point that results in -135 (visual bottom-left sweep for indicator pointing up)
      // Mouse event to produce angle of -135: clientX approx 0, clientY approx 40 (for indicator at top)
      // this.currentAngle is the visual rotation of the dial indicator from its default upward position.
      // A positive angle means clockwise rotation.
      // The default value 50 has currentAngle 0.
      // To get value 0 (min), we need valueRatio 0. (valueRatio * 270) - 135 = currentAngle => -135 deg.
      // To get value 100 (max), we need valueRatio 1. (1 * 270) - 135 = currentAngle => 135 deg.

      // Let's re-evaluate: clientX: 40, clientY: 0 results in angle (from center) of -90 degrees.
      // updateDialBasedOnEvent: angle = -90 + 90 = 0. This is clamped to -135 to 135 (it's 0).
      // currentAngle becomes 0. updateValueFromAngle(0) -> results in value 50.
      expect(component.value).toBe(50);
      expect(component.valueChange.emit).not.toHaveBeenCalledWith(0); // Value hasn't changed from initial 50

      // Simulate drag to minimum (far left of dial if indicator starts top)
      // For currentAngle = -135 (min value)
      // Mouse at (0, 40) -> deltaX=-40, deltaY=0. atan2(0,-40) = PI = 180 deg. angle = 180+90=270. Clamped to 135.
      // This angle calculation in updateDialBasedOnEvent needs to be robust.
      // Let's assume updateDialBasedOnEvent works and test its effect.
      // We can directly call updateValueFromAngle which calls updateValue.
      (component as any).updateValueFromAngle(-135); // Should set value to min (0)
      expect(component.value).toBe(0);
      expect(component.valueChange.emit).toHaveBeenCalledWith(0);
      expect(component.currentAngle).toBe(-135); // Visual angle updated

      (component.valueChange.emit as jasmine.Spy).calls.reset();
      (component as any).updateValueFromAngle(135); // Should set value to max (100)
      expect(component.value).toBe(100);
      expect(component.valueChange.emit).toHaveBeenCalledWith(100);
      expect(component.currentAngle).toBe(135);
    });

    it('should update value during mousemove if dragging', () => {
      component.value = 0; // Start at min
      component.currentAngle = -135;
      fixture.detectChanges();

      // Start dragging (e.g. from a point that resulted in value 0)
      dialContainerElement.dispatchEvent(new MouseEvent('mousedown', { clientX: 0, clientY: 40 })); // Approx.
      expect((component as any).dragging).toBeTrue();

      spyOn(component as any, 'updateDialBasedOnEvent').and.callThrough();
      spyOn(component.valueChange, 'emit');

      // Simulate mouse move to a new position (e.g. results in mid-value)
      const mouseMoveEvent = new MouseEvent('mousemove', { clientX: 40, clientY: 0 }); // Top-center
      document.dispatchEvent(mouseMoveEvent);
      fixture.detectChanges();

      expect((component as any).updateDialBasedOnEvent).toHaveBeenCalled();
      expect(component.value).toBe(50); // Should be around mid value
      expect(component.valueChange.emit).toHaveBeenCalledWith(50);
      expect(component.currentAngle).toBe(0);
    });

    it('should stop dragging on mouseup', () => {
      // Start dragging
      dialContainerElement.dispatchEvent(new MouseEvent('mousedown', { clientX: 0, clientY: 40 }));
      expect((component as any).dragging).toBeTrue();

      document.dispatchEvent(new MouseEvent('mouseup'));
      fixture.detectChanges();
      expect((component as any).dragging).toBeFalse();
    });
  });
  // For now, this covers basic setup and value handling.

  it('should allow setting values near minimum like 0.1, 0.2 when step is 0.1', () => {
    // Inputs are already set in beforeEach to min=0.1, max=5, step=0.1, value=0.5
    // ngOnInit and initial ngOnChanges have run.
    // Component's current value is 0.5s.

    // Simulate user dragging to a position that should result in 0.1
    (component as any).updateValueFromAngle(-135); // Corresponds to min value
    fixture.detectChanges();
    expect(component.value).toBe(0.1);
    expect(component.displayValue).toBe('0.1s');

    // Simulate user dragging to a position that should result in 0.2
    // Angle for 0.2: valueRatio = (0.2-0.1)/(5-0.1) = 0.1/4.9 = approx 0.020408
    // normalizedAngle = 0.020408 * 270 = approx 5.510
    // currentAngle = 5.510 - 135 = approx -129.490
    (component as any).updateValueFromAngle(-129.490); // Approx angle for 0.2
    fixture.detectChanges();
    expect(component.value).toBe(0.2); // Value should be exactly 0.2 due to stepping
    expect(component.displayValue).toBe('0.2s');

    // Test another low value, e.g. 0.3
    // Angle for 0.3: valueRatio = (0.3-0.1)/(5-0.1) = 0.2/4.9 = approx 0.040816
    // normalizedAngle = 0.040816 * 270 = approx 11.010
    // currentAngle = 11.010 - 135 = approx -123.989
    // Note: previous test used -123.979, slight difference is fine for test intent.
    (component as any).updateValueFromAngle(-123.989); // Approx angle for 0.3
    fixture.detectChanges();
    expect(component.value).toBe(0.3);
    expect(component.displayValue).toBe('0.3s');

    // Test setting value to 0.9
    // Angle for 0.9: valueRatio = (0.9-0.1)/(5-0.1) = 0.8/4.9 = approx 0.163265
    // normalizedAngle = 0.163265 * 270 = approx 44.081
    // currentAngle = 44.081 - 135 = approx -90.919
    (component as any).updateValueFromAngle(-90.919); // Approx angle for 0.9
    fixture.detectChanges();
    expect(component.value).toBe(0.9);
    expect(component.displayValue).toBe('0.9s');

    // Test setting value to 1.0
    // Angle for 1.0: valueRatio = (1.0-0.1)/(5-0.1) = 0.9/4.9 = approx 0.183673
    // normalizedAngle = 0.183673 * 270 = approx 49.591
    // currentAngle = 49.591 - 135 = approx -85.409
    (component as any).updateValueFromAngle(-85.409); // Approx angle for 1.0
    fixture.detectChanges();
    expect(component.value).toBe(1.0);
    expect(component.displayValue).toBe('1.0s');
  });
});
