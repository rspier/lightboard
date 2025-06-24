import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule, NgStyle } from '@angular/common'; // NgStyle is needed for [ngStyle]
import { CombinedOutputDisplayComponent } from './combined-output-display.component';
// import { By } from '@angular/platform-browser'; // Unused

describe('CombinedOutputDisplayComponent', () => {
  let component: CombinedOutputDisplayComponent;
  let fixture: ComponentFixture<CombinedOutputDisplayComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, CombinedOutputDisplayComponent, NgStyle] // Import standalone component and NgStyle
      // No providers needed unless it has dependencies
    }).compileComponents();

    fixture = TestBed.createComponent(CombinedOutputDisplayComponent);
    component = fixture.componentInstance;
    element = fixture.nativeElement;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display description and value', () => {
    component.description = 'Test Channel';
    component.value = 75;
    fixture.detectChanges();
    const descriptionEl = element.querySelector('.description-text');
    const valueEl = element.querySelector('.value-text');
    expect(descriptionEl?.textContent).toContain('Test Channel');
    expect(valueEl?.textContent).toContain('75');
  });

  it('should calculate displayStyle correctly for value 0 (black background, white text)', () => {
    component.value = 0;
    component.color = '#ff0000'; // Base color red
    fixture.detectChanges(); // Trigger getter
    const styles = component.displayStyle;
    expect(styles.backgroundColor).toBe('#000000');
    expect(styles.color).toBe('#ffffff');
  });

  it('should calculate displayStyle correctly for value 100 (full base color, contrast text)', () => {
    component.value = 100;
    component.color = '#ff0000'; // Base color red (luminance < 0.5 -> white text)
    fixture.detectChanges();
    const stylesRed = component.displayStyle;
    expect(stylesRed.backgroundColor).toBe('#ff0000');
    expect(stylesRed.color).toBe('#ffffff');

    component.color = '#ffff00'; // Base color yellow (luminance > 0.5 -> black text)
    fixture.detectChanges();
    const stylesYellow = component.displayStyle;
    expect(stylesYellow.backgroundColor).toBe('#ffff00');
    expect(stylesYellow.color).toBe('#000000');
  });

  it('should calculate displayStyle for value 50 (50% intensity of base color)', () => {
    component.value = 50;
    component.color = '#ff0000'; // Base color red
    fixture.detectChanges();
    const styles = component.displayStyle;
    expect(styles.backgroundColor).toBe('#800000'); // 50% of ff is 80
    expect(styles.color).toBe('#ffffff'); // #800000 is dark
  });

  it('should default to black base for invalid input color in displayStyle calculation', () => {
    component.value = 100; // Full intensity
    component.color = 'invalid-color-string';
    fixture.detectChanges();
    const styles = component.displayStyle;
    // hexToRgb defaults to {r:0,g:0,b:0} for invalid, so full intensity is black
    expect(styles.backgroundColor).toBe('#000000');
    expect(styles.color).toBe('#ffffff');
  });

  it('should apply displayStyle to the .display-box div', () => {
    component.value = 50;
    component.color = '#00ff00'; // Green
    fixture.detectChanges();
    const displayBox = element.querySelector('.display-box') as HTMLElement;
    // Check for applied style. bgColor from component will be #008000 (50% green)
    // Text color for #008000 (luminance ~0.35) should be white (#ffffff)
    expect(displayBox.style.backgroundColor).toBe('rgb(0, 128, 0)');
    expect(displayBox.style.color).toBe('rgb(255, 255, 255)');
  });
});
