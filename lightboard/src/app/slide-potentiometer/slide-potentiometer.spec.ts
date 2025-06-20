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
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  // Input property tests
  it('should display default channel number (0) and description (\'\') initially', () => {
    fixture.detectChanges();
    const channelInfoDiv = fixture.debugElement.query(By.css('.channel-info'));
    expect(channelInfoDiv).toBeTruthy();
    const h3Element = channelInfoDiv.query(By.css('h3')).nativeElement;
    expect(h3Element.textContent).toContain('Channel: 0');
    const smallElement = channelInfoDiv.query(By.css('small')).nativeElement;
    expect(smallElement.textContent).toBe('');
  });

  it('should display provided channelNumber input', () => {
    component.channelNumber = 123;
    fixture.detectChanges();
    const h3Element = fixture.debugElement.query(By.css('.channel-info h3')).nativeElement;
    expect(h3Element.textContent).toContain('Channel: 123');
  });

  it('should display provided channelDescription input', () => {
    component.channelDescription = 'Test Description';
    fixture.detectChanges();
    const smallElement = fixture.debugElement.query(By.css('.channel-info small')).nativeElement;
    expect(smallElement.textContent).toBe('Test Description');
  });

  it('should apply sliderHeight input to the range input style', () => {
    component.sliderHeight = '200px';
    fixture.detectChanges();
    const rangeInput = fixture.debugElement.query(By.css('input[type="range"]')).nativeElement;
    expect(rangeInput.style.height).toBe('200px');
  });

  it('should use default sliderHeight if none is provided', () => {
    fixture.detectChanges(); // Default value is set in component definition
    const rangeInput = fixture.debugElement.query(By.css('input[type="range"]')).nativeElement;
    expect(rangeInput.style.height).toBe('150px'); // Default height
  });


  // Value and editing logic tests
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

  it('should enable editing mode when value display is clicked', () => {
    fixture.detectChanges();
    const valueDisplayDiv = fixture.debugElement.query(By.css('div:not(.channel-info)')).nativeElement;
    valueDisplayDiv.click();
    fixture.detectChanges();
    expect(component.isEditing).toBe(true);
    const numberInput = fixture.debugElement.query(By.css('input[type="number"]'));
    expect(numberInput).toBeTruthy();
  });

  it('should update value and emit valueChange when editing input loses focus (blur)', () => {
    fixture.detectChanges();
    component.startEditing();
    fixture.detectChanges();

    spyOn(component.valueChange, 'emit');

    const numberInput = fixture.debugElement.query(By.css('input[type="number"]')).nativeElement;
    numberInput.value = '75';
    numberInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(component.editValue).toBe(75);

    numberInput.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(component.value).toBe(75);
    expect(component.isEditing).toBe(false);
    expect(component.valueChange.emit).toHaveBeenCalledWith(75);
  });

  it('should update value and emit valueChange when Enter key is pressed in editing input', () => {
    fixture.detectChanges();
    component.startEditing();
    fixture.detectChanges();

    spyOn(component.valueChange, 'emit');

    const numberInput = fixture.debugElement.query(By.css('input[type="number"]')).nativeElement;
    numberInput.value = '80';
    numberInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(component.editValue).toBe(80);

    const event = new KeyboardEvent('keyup', { key: 'Enter' });
    numberInput.dispatchEvent(event);
    fixture.detectChanges();

    expect(component.value).toBe(80);
    expect(component.isEditing).toBe(false);
    expect(component.valueChange.emit).toHaveBeenCalledWith(80);
  });

  it('should clamp value to 0 and emit valueChange if editing input is set below 0', () => {
    fixture.detectChanges();
    component.startEditing();
    fixture.detectChanges();
    spyOn(component.valueChange, 'emit');

    const numberInput = fixture.debugElement.query(By.css('input[type="number"]')).nativeElement;
    numberInput.value = '-10';
    numberInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    numberInput.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(component.value).toBe(0);
    expect(component.isEditing).toBe(false);
    expect(component.valueChange.emit).toHaveBeenCalledWith(0);
  });

  it('should clamp value to 100 and emit valueChange if editing input is set above 100', () => {
    fixture.detectChanges();
    component.startEditing();
    fixture.detectChanges();
    spyOn(component.valueChange, 'emit');

    const numberInput = fixture.debugElement.query(By.css('input[type="number"]')).nativeElement;
    numberInput.value = '150';
    numberInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    numberInput.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(component.value).toBe(100);
    expect(component.isEditing).toBe(false);
    expect(component.valueChange.emit).toHaveBeenCalledWith(100);
  });
});
