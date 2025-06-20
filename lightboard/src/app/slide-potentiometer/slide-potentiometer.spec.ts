import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
// import { provideZonelessChangeDetection } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SlidePotentiometerComponent } from './slide-potentiometer';
import { By } from '@angular/platform-browser';

describe('SlidePotentiometerComponent', () => {
  let component: SlidePotentiometerComponent;
  let fixture: ComponentFixture<SlidePotentiometerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        SlidePotentiometerComponent
      ],
      providers: [] // Ensure providers is empty
    })
    .compileComponents();

    fixture = TestBed.createComponent(SlidePotentiometerComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  // Input property tests
  describe('Input Properties', () => {
    it('should display default channel number (0) and description (\'\') initially when showChannelInfo is true', () => {
      component.showChannelInfo = true;
      fixture.detectChanges();
      const channelInfoDiv = fixture.debugElement.query(By.css('.channel-info'));
      expect(channelInfoDiv).toBeTruthy();
      const h3Element = channelInfoDiv.query(By.css('h3')).nativeElement;
      expect(h3Element.textContent.trim()).toBe('0'); // Adjusted assertion
      const smallElement = channelInfoDiv.query(By.css('small')).nativeElement;
      expect(smallElement.textContent).toBe('');
    });

    it('should display provided channelNumber input when showChannelInfo is true', () => {
      component.showChannelInfo = true;
      component.channelNumber = 123;
      fixture.detectChanges();
      const h3Element = fixture.debugElement.query(By.css('.channel-info h3')).nativeElement;
      expect(h3Element.textContent.trim()).toBe('123'); // Adjusted assertion
    });

    it('should display provided channelDescription input when showChannelInfo is true', () => {
      component.showChannelInfo = true;
      component.channelDescription = 'Test Description';
      fixture.detectChanges();
      const smallElement = fixture.debugElement.query(By.css('.channel-info small')).nativeElement;
      expect(smallElement.textContent).toBe('Test Description');
    });

    it('should not display .channel-info div if showChannelInfo is false', () => {
      component.showChannelInfo = false;
      fixture.detectChanges();
      const channelInfoDiv = fixture.debugElement.query(By.css('.channel-info'));
      expect(channelInfoDiv).toBeNull();
    });

    it('should display .channel-info div by default (showChannelInfo is true by default)', () => {
      fixture.detectChanges();
      const channelInfoDiv = fixture.debugElement.query(By.css('.channel-info'));
      expect(channelInfoDiv).toBeTruthy(); // Default is true
    });

    it('should apply sliderHeight input to the range input style', () => {
      component.sliderHeight = '200px';
      fixture.detectChanges();
      const rangeInput = fixture.debugElement.query(By.css('input[type="range"]')).nativeElement;
      expect(rangeInput.style.height).toBe('200px');
    });

    it('should use default sliderHeight if none is provided', () => {
      fixture.detectChanges();
      const rangeInput = fixture.debugElement.query(By.css('input[type="range"]')).nativeElement;
      expect(rangeInput.style.height).toBe('150px');
    });
  });


  // Value and editing logic tests
  describe('Value and Editing Logic', () => {
    it('should have an initial default value of 0 for the slider', () => {
      fixture.detectChanges();
      expect(component.value).toBe(0);
    });

    it('should update value and emit valueChange when slider is moved', () => {
      fixture.detectChanges();
      spyOn(component.valueChange, 'emit');

      const rangeInput = fixture.debugElement.query(By.css('input[type="range"]')).nativeElement;
      rangeInput.value = '60';
      rangeInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(component.value).toBe(60);
      expect(component.valueChange.emit).toHaveBeenCalledWith(60);
    });

    it('should switch to editing mode on click, show input, and hide span', fakeAsync(() => { // Reverted to fakeAsync
      fixture.detectChanges();
      let valueTextSpan = fixture.debugElement.query(By.css('.value-text'));
      expect(valueTextSpan).toBeTruthy('Span should be visible initially');
      let valueEditInput = fixture.debugElement.query(By.css('.value-edit-input'));
      expect(valueEditInput).toBeNull('Input should be hidden initially');

      valueTextSpan.nativeElement.click(); // This calls startEditing()
      fixture.detectChanges();
      tick(); // Process setTimeout in startEditing

      expect(component.isEditing).toBe(true);
      expect(component.editValue).toBe(component.value);

      valueTextSpan = fixture.debugElement.query(By.css('.value-text'));
      expect(valueTextSpan).toBeNull('Span should be hidden during editing');
      valueEditInput = fixture.debugElement.query(By.css('.value-edit-input'));
      expect(valueEditInput).toBeTruthy('Input should be visible during editing');

      expect(component.valueInputRef).toBeTruthy();
      if (component.valueInputRef) {
           expect(component.valueInputRef.nativeElement).toEqual(valueEditInput.nativeElement);
      }
    }));

    it('should switch out of editing mode and update value on input blur', () => {
      // Initial state for editing
      component.isEditing = true;
      component.value = 50; // Example initial value
      component.editValue = 75;
      fixture.detectChanges(); // Render input with editValue

      spyOn(component.valueChange, 'emit');
      const valueEditInput = fixture.debugElement.query(By.css('.value-edit-input'));
      expect(valueEditInput).toBeTruthy('Input should be visible');

      // Simulate input event then blur
      // valueEditInput.nativeElement.value = '75'; // ngModel handles component.editValue
      // valueEditInput.nativeElement.dispatchEvent(new Event('input'));
      // fixture.detectChanges(); // Allow ngModel to update component.editValue if needed

      valueEditInput.nativeElement.dispatchEvent(new Event('blur')); // This calls stopEditing()
      fixture.detectChanges();

      expect(component.isEditing).toBe(false);
      expect(component.value).toBe(75);
      expect(component.valueChange.emit).toHaveBeenCalledWith(75);
      const valueTextSpan = fixture.debugElement.query(By.css('.value-text'));
      expect(valueTextSpan).toBeTruthy('Span should be visible after editing');
      const stillVisibleEditInput = fixture.debugElement.query(By.css('.value-edit-input'));
      expect(stillVisibleEditInput).toBeNull('Input should be hidden after editing');
    });

    // Other tests for stopEditing (Enter, clamping) would follow similar pattern
    // ... (keeping existing tests for brevity, assuming they are adapted like the blur test) ...
    it('should update value and emit valueChange when Enter key is pressed in editing input', () => {
      component.isEditing = true;
      component.value = 50;
      component.editValue = 80;
      fixture.detectChanges();
      spyOn(component.valueChange, 'emit');
      const numberInput = fixture.debugElement.query(By.css('.value-edit-input')).nativeElement;

      const event = new KeyboardEvent('keyup', { key: 'Enter' });
      numberInput.dispatchEvent(event);
      fixture.detectChanges();

      expect(component.value).toBe(80);
      expect(component.isEditing).toBe(false);
      expect(component.valueChange.emit).toHaveBeenCalledWith(80);
    });

    it('should clamp value to 0 and emit valueChange if editing input is set below 0', () => {
      component.isEditing = true;
      component.value = 50;
      component.editValue = -10;
      fixture.detectChanges();
      spyOn(component.valueChange, 'emit');
      const numberInput = fixture.debugElement.query(By.css('.value-edit-input')).nativeElement;

      numberInput.dispatchEvent(new Event('blur'));
      fixture.detectChanges();

      expect(component.value).toBe(0);
      expect(component.isEditing).toBe(false);
      expect(component.valueChange.emit).toHaveBeenCalledWith(0);
    });

    it('should clamp value to 100 and emit valueChange if editing input is set above 100', () => {
      component.isEditing = true;
      component.value = 50;
      component.editValue = 150;
      fixture.detectChanges();
      spyOn(component.valueChange, 'emit');
      const numberInput = fixture.debugElement.query(By.css('.value-edit-input')).nativeElement;

      numberInput.dispatchEvent(new Event('blur'));
      fixture.detectChanges();

      expect(component.value).toBe(100);
      expect(component.isEditing).toBe(false);
      expect(component.valueChange.emit).toHaveBeenCalledWith(100);
    });
  });
});
