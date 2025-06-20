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
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have an initial default value of 0', () => {
    expect(component.value).toBe(0);
  });

  it('should update value when slider is moved', () => {
    const rangeInput = fixture.debugElement.query(By.css('input[type="range"]')).nativeElement;
    rangeInput.value = 50;
    rangeInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(component.value).toBe(50);
  });

  it('should enable editing mode when value display is clicked', () => {
    const valueDisplayDiv = fixture.debugElement.query(By.css('div')).nativeElement;
    valueDisplayDiv.click();
    fixture.detectChanges();
    expect(component.isEditing).toBe(true);
    const numberInput = fixture.debugElement.query(By.css('input[type="number"]'));
    expect(numberInput).toBeTruthy();
  });

  it('should update value when editing input loses focus (blur)', () => {
    component.startEditing();
    fixture.detectChanges();

    const numberInput = fixture.debugElement.query(By.css('input[type="number"]')).nativeElement;
    numberInput.value = 75;
    numberInput.dispatchEvent(new Event('input'));
    numberInput.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(component.value).toBe(75);
    expect(component.isEditing).toBe(false);
  });

  it('should update value when Enter key is pressed in editing input', () => {
    component.startEditing();
    fixture.detectChanges();

    const numberInput = fixture.debugElement.query(By.css('input[type="number"]')).nativeElement;
    numberInput.value = 80;
    numberInput.dispatchEvent(new Event('input'));
    const event = new KeyboardEvent('keyup', { key: 'Enter' });
    numberInput.dispatchEvent(event);
    fixture.detectChanges();

    expect(component.value).toBe(80);
    expect(component.isEditing).toBe(false);
  });

  it('should clamp value to 0 if editing input is set below 0', () => {
    component.startEditing();
    fixture.detectChanges();

    const numberInput = fixture.debugElement.query(By.css('input[type="number"]')).nativeElement;
    numberInput.value = -10;
    numberInput.dispatchEvent(new Event('input'));
    numberInput.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(component.value).toBe(0);
    expect(component.isEditing).toBe(false);
  });

  it('should clamp value to 100 if editing input is set above 100', () => {
    component.startEditing();
    fixture.detectChanges();

    const numberInput = fixture.debugElement.query(By.css('input[type="number"]')).nativeElement;
    numberInput.value = 150;
    numberInput.dispatchEvent(new Event('input'));
    numberInput.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(component.value).toBe(100);
    expect(component.isEditing).toBe(false);
  });
});
