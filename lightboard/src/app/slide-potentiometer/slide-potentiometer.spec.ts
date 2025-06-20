import { ComponentFixture, TestBed } from '@angular/core/testing';
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
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SlidePotentiometerComponent);
    component = fixture.componentInstance;
    // Note: fixture.detectChanges() is called in individual tests or after input changes
  });

  it('should create', () => {
    fixture.detectChanges(); // Initial detection
    expect(component).toBeTruthy();
  });

  // Tests for channelNumber and channelDescription inputs
  it('should display default channel number (0) and description (\'\') initially', () => {
    fixture.detectChanges(); // Trigger initial data binding
    const channelInfoDiv = fixture.debugElement.query(By.css('.channel-info'));
    expect(channelInfoDiv).toBeTruthy();

    const h3Element = channelInfoDiv.query(By.css('h3')).nativeElement;
    expect(h3Element.textContent).toContain('Channel: 0');

    const smallElement = channelInfoDiv.query(By.css('small')).nativeElement;
    expect(smallElement.textContent).toBe(''); // Default description is empty string
  });

  it('should display provided channelNumber input', () => {
    component.channelNumber = 123;
    fixture.detectChanges(); // Trigger change detection for input

    const h3Element = fixture.debugElement.query(By.css('.channel-info h3')).nativeElement;
    expect(h3Element.textContent).toContain('Channel: 123');
  });

  it('should display provided channelDescription input', () => {
    component.channelDescription = 'Test Description';
    fixture.detectChanges(); // Trigger change detection for input

    const smallElement = fixture.debugElement.query(By.css('.channel-info small')).nativeElement;
    expect(smallElement.textContent).toBe('Test Description');
  });

  // Existing tests for value, isEditing, editValue
  it('should have an initial default value of 0 for the slider', () => {
    fixture.detectChanges();
    expect(component.value).toBe(0);
  });

  it('should update value when slider is moved', () => {
    fixture.detectChanges();
    const rangeInput = fixture.debugElement.query(By.css('input[type="range"]')).nativeElement;
    rangeInput.value = 50;
    rangeInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    // Note: ngModel updates component property directly for range input with FormsModule
    expect(component.value).toBe(50); // This will be a string due to input element value property
    expect(Number(component.value)).toBe(50); // Convert to number for strict check if needed
  });

  it('should enable editing mode when value display is clicked', () => {
    fixture.detectChanges();
    const valueDisplayDiv = fixture.debugElement.query(By.css('div:not(.channel-info)')).nativeElement;
    valueDisplayDiv.click();
    fixture.detectChanges();
    expect(component.isEditing).toBe(true);
    const numberInput = fixture.debugElement.query(By.css('input[type="number"]'));
    expect(numberInput).toBeTruthy();
  });

  it('should update value when editing input loses focus (blur)', () => {
    fixture.detectChanges();
    component.startEditing(); // Enable editing mode
    fixture.detectChanges();

    const numberInput = fixture.debugElement.query(By.css('input[type="number"]')).nativeElement;
    numberInput.value = '75'; // Input values are strings
    numberInput.dispatchEvent(new Event('input')); // ngModel needs this
    fixture.detectChanges(); // Let ngModel update editValue
    numberInput.dispatchEvent(new Event('blur')); // Trigger stopEditing
    fixture.detectChanges();

    expect(component.value).toBe(75);
    expect(component.isEditing).toBe(false);
  });

  it('should update value when Enter key is pressed in editing input', () => {
    fixture.detectChanges();
    component.startEditing(); // Enable editing mode
    fixture.detectChanges();

    const numberInput = fixture.debugElement.query(By.css('input[type="number"]')).nativeElement;
    numberInput.value = '80'; // Input values are strings
    numberInput.dispatchEvent(new Event('input')); // ngModel needs this
    fixture.detectChanges(); // Let ngModel update editValue
    const event = new KeyboardEvent('keyup', { key: 'Enter' });
    numberInput.dispatchEvent(event); // Trigger stopEditing
    fixture.detectChanges();

    expect(component.value).toBe(80);
    expect(component.isEditing).toBe(false);
  });

  it('should clamp value to 0 if editing input is set below 0', () => {
    fixture.detectChanges();
    component.startEditing();
    fixture.detectChanges();

    const numberInput = fixture.debugElement.query(By.css('input[type="number"]')).nativeElement;
    numberInput.value = '-10'; // Input values are strings
    numberInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    numberInput.dispatchEvent(new Event('blur')); // Trigger stopEditing
    fixture.detectChanges();

    expect(component.value).toBe(0);
    expect(component.isEditing).toBe(false);
  });

  it('should clamp value to 100 if editing input is set above 100', () => {
    fixture.detectChanges();
    component.startEditing();
    fixture.detectChanges();

    const numberInput = fixture.debugElement.query(By.css('input[type="number"]')).nativeElement;
    numberInput.value = '150'; // Input values are strings
    numberInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    numberInput.dispatchEvent(new Event('blur')); // Trigger stopEditing
    fixture.detectChanges();

    expect(component.value).toBe(100);
    expect(component.isEditing).toBe(false);
  });
});
