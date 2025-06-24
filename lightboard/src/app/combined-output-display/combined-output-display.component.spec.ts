import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule, NgStyle } from '@angular/common'; // NgStyle is needed for [ngStyle]
import { CombinedOutputDisplayComponent } from './combined-output-display.component';
import { By } from '@angular/platform-browser';

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

  it('should calculate displayStyle correctly for value 0 (black background, white text) when colors are same', () => {
    component.value = 0;
    component.colorScene1 = '#ff0000';
    component.colorScene2 = '#ff0000';
    fixture.detectChanges();
    const styles = component.displayStyle;
    expect(styles['backgroundColor']).toBe('#000000');
    expect(styles['color']).toBe('#ffffff');
  });

  it('should calculate displayStyle correctly for value 100 (full base color, contrast text) when colors are same', () => {
    component.value = 100;
    component.colorScene1 = '#ff0000'; // Red
    component.colorScene2 = '#ff0000'; // Red
    fixture.detectChanges();
    const stylesRed = component.displayStyle;
    expect(stylesRed['backgroundColor']).toBe('#ff0000');
    expect(stylesRed['color']).toBe('#ffffff');

    component.colorScene1 = '#ffff00'; // Yellow
    component.colorScene2 = '#ffff00'; // Yellow
    fixture.detectChanges();
    const stylesYellow = component.displayStyle;
    expect(stylesYellow['backgroundColor']).toBe('#ffff00');
    expect(stylesYellow['color']).toBe('#000000');
  });

  it('should calculate displayStyle for value 50 (50% intensity) when colors are same', () => {
    component.value = 50;
    component.colorScene1 = '#ff0000'; // Red
    component.colorScene2 = '#ff0000'; // Red
    fixture.detectChanges();
    const styles = component.displayStyle;
    expect(styles['backgroundColor']).toBe('#800000'); // 50% of ff is 80
    expect(styles['color']).toBe('#ffffff'); // #800000 is dark
  });

  it('should default to black for invalid input color (scene1) when colors are same', () => {
    component.value = 100; // Full intensity
    component.colorScene1 = 'invalid-color-string';
    component.colorScene2 = 'invalid-color-string'; // Keep same for this test logic
    fixture.detectChanges();
    const styles = component.displayStyle;
    expect(styles['backgroundColor']).toBe('#000000');
    expect(styles['color']).toBe('#ffffff');
  });

  it('should apply displayStyle to the .display-box div when colors are same', () => {
    component.value = 50;
    component.colorScene1 = '#00ff00'; // Green
    component.colorScene2 = '#00ff00'; // Green
    fixture.detectChanges();
    const displayBox = element.querySelector('.display-box') as HTMLElement;
    expect(displayBox.style.backgroundColor).toBe('rgb(0, 128, 0)'); // 50% green
    expect(displayBox.style.color).toBe('rgb(255, 255, 255)');
  });

  it('should generate checkerboard background when colors are different and value > 0', () => {
    component.value = 100;
    component.colorScene1 = '#ff0000'; // Red
    component.colorScene2 = '#0000ff'; // Blue
    fixture.detectChanges();
    const styles = component.displayStyle;
    expect(styles['background-image']).toContain('repeating-conic-gradient(#ff0000 0% 25%, #0000ff 25% 50%)');
    expect(styles['background-size']).toBe('20px 20px'); // Updated expectation
    // Text color will depend on average luminance of #ff0000 and #0000ff
    // (0.2126 * 255 + 0.0722 * 255) / 2 / 255 = (0.2126 + 0.0722) / 2 = 0.2848 / 2 = 0.1424. Luminance < 0.5 -> white text
    expect(styles['color']).toBe('#ffffff');
  });

  it('should generate checkerboard with intensity when colors are different and value is 50', () => {
    component.value = 50;
    component.colorScene1 = '#ff0000'; // Red -> 50% is #800000
    component.colorScene2 = '#0000ff'; // Blue -> 50% is #000080
    fixture.detectChanges();
    const styles = component.displayStyle;
    expect(styles['background-image']).toContain('repeating-conic-gradient(#800000 0% 25%, #000080 25% 50%)');
    expect(styles['background-size']).toBe('20px 20px');  // Updated expectation
    // Avg luminance of #800000 and #000080 will also be low, text white.
    expect(styles['color']).toBe('#ffffff');
  });

  it('should show solid black background if value is 0, even if colors are different', () => {
    component.value = 0;
    component.colorScene1 = '#ff0000';
    component.colorScene2 = '#0000ff';
    fixture.detectChanges();
    const styles = component.displayStyle;
    // When value is 0, intensity is 0. color1Str and color2Str in displayStyle will be #000000.
    // So checkerboard of #000000 and #000000 is effectively a black background.
    // This is fine, but a specific 'backgroundColor' might be cleaner if value is 0.
    // Current logic:
    expect(styles['background-image']).toContain('repeating-conic-gradient(#000000 0% 25%, #000000 25% 50%)');
    expect(styles['color']).toBe('#ffffff'); // Text color for black bg
  });

  it('should update title attribute correctly when colors are same', () => {
    component.description = 'Test';
    component.value = 50;
    component.colorScene1 = '#112233';
    component.colorScene2 = '#112233';
    fixture.detectChanges();
    expect(component.titleText).toBe('Test - Value: 50, Colors: Scene 1: #112233');
    const displayBox = fixture.debugElement.query(By.css('.display-box'));
    expect(displayBox.attributes['title']).toBe('Test - Value: 50, Colors: Scene 1: #112233');
  });

  it('should update title attribute correctly when colors are different', () => {
    component.description = 'Test Diff';
    component.value = 70;
    component.colorScene1 = '#aa0000';
    component.colorScene2 = '#00bb00';
    fixture.detectChanges();
    expect(component.titleText).toBe('Test Diff - Value: 70, Colors: Scene 1: #aa0000, Scene 2: #00bb00');
    const displayBox = fixture.debugElement.query(By.css('.display-box'));
    expect(displayBox.attributes['title']).toBe('Test Diff - Value: 70, Colors: Scene 1: #aa0000, Scene 2: #00bb00');
  });
});
