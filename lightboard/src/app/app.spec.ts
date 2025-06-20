import { TestBed, ComponentFixture, fakeAsync, tick } from '@angular/core/testing';
import { App } from './app';
import { By } from '@angular/platform-browser';
// CommonModule is imported by App component itself (standalone)

// Define the interface for consistent typing in tests
interface PotentiometerState {
  channelNumber: number;
  channelDescription: string;
  value: number;
  color: string;
}

describe('App', () => {
  let fixture: ComponentFixture<App>;
  let app: App;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: []
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    app = fixture.componentInstance;
  });

  afterEach(() => {
    if (app.animationInterval) {
      clearInterval(app.animationInterval);
      app.animationInterval = null;
    }
  });

  it('should create the app', () => {
    expect(app).toBeTruthy();
  });

  it('should render the sliders-area container', () => {
    fixture.detectChanges();
    const compiled = fixture.debugElement;
    expect(compiled.query(By.css('.sliders-area'))).toBeTruthy();
  });

  it('should have initial states including colors', () => {
    fixture.detectChanges();
    expect(app.row1States.length).toBe(4);
    expect(app.row1States[0].channelDescription).toBe('Apple');
    expect(app.row1States[0].value).toBe(0);
    expect(app.row1States[0].color).toBe('#ff0000'); // Check initial color

    expect(app.row2States.length).toBe(4);
    expect(app.row2States[0].channelDescription).toBe('Apple');
    expect(app.row2States[0].value).toBe(100);
    expect(app.row2States[0].color).toBe('#00ffff'); // Check initial color

    expect(app.crossfaderValue).toBe(50);
  });

  it('should populate combinedOutputStates on ngOnInit with blended values and colors', () => {
    fixture.detectChanges();
    expect(app.combinedOutputStates.length).toBe(4);

    // row1[0]: value=0, color='#ff0000' (Red)
    // row2[0]: value=100, color='#00ffff' (Cyan)
    // crossfaderValue = 50 (ratio 0.5 for row1, 0.5 for row2 in current formula)
    // value: (0 * 0.5) + (100 * 0.5) = 50
    // color: Red(255,0,0), Cyan(0,255,255)
    // R: (255 * 0.5) + (0 * 0.5) = 127.5 -> 128
    // G: (0 * 0.5) + (255 * 0.5) = 127.5 -> 128
    // B: (0 * 0.5) + (255 * 0.5) = 127.5 -> 128
    // Expected color: #808080 (Gray)
    expect(app.combinedOutputStates[0].value).toBe(50);
    expect(app.combinedOutputStates[0].channelDescription).toBe('Apple');
    expect(app.combinedOutputStates[0].color).toBe('#808080');

    // row1[1]: value=25, color='#00ff00' (Green)
    // row2[1]: value=75, color='#ff00ff' (Magenta)
    // value: (25 * 0.5) + (75 * 0.5) = 12.5 + 37.5 = 50
    // color: Green(0,255,0), Magenta(255,0,255)
    // R: (0 * 0.5) + (255 * 0.5) = 127.5 -> 128
    // G: (255 * 0.5) + (0 * 0.5) = 127.5 -> 128
    // B: (0 * 0.5) + (255 * 0.5) = 127.5 -> 128
    // Expected color: #808080 (Gray)
    expect(app.combinedOutputStates[1].value).toBe(50);
    expect(app.combinedOutputStates[1].color).toBe('#808080');
  });

  describe('calculateCombinedOutputs with colors', () => {
    beforeEach(() => {
      app.row1States = [
        { channelNumber: 1, channelDescription: "Ch1", value: 10, color: '#ff0000' }, // Red
        { channelNumber: 2, channelDescription: "Ch2", value: 80, color: '#0000ff' }  // Blue
      ];
      app.row2States = [
        { channelNumber: 1, channelDescription: "Ch1", value: 90, color: '#00ff00' }, // Green
        { channelNumber: 2, channelDescription: "Ch2", value: 20, color: '#ffff00' }  // Yellow
      ];
    });

    it('should correctly blend values and colors with crossfader at 0 (full row2States)', () => {
      app.crossfaderValue = 0;
      app.calculateCombinedOutputs();
      expect(app.combinedOutputStates.length).toBe(2);
      expect(app.combinedOutputStates[0].value).toBe(90);
      expect(app.combinedOutputStates[0].color).toBe('#00ff00'); // Green (row2State[0].color)
      expect(app.combinedOutputStates[1].value).toBe(20);
      expect(app.combinedOutputStates[1].color).toBe('#ffff00'); // Yellow (row2State[1].color)
    });

    it('should correctly blend values and colors with crossfader at 100 (full row1States)', () => {
      app.crossfaderValue = 100;
      app.calculateCombinedOutputs();
      expect(app.combinedOutputStates[0].value).toBe(10);
      expect(app.combinedOutputStates[0].color).toBe('#ff0000'); // Red (row1State[0].color)
      expect(app.combinedOutputStates[1].value).toBe(80);
      expect(app.combinedOutputStates[1].color).toBe('#0000ff'); // Blue (row1State[1].color)
    });

    it('should correctly blend values and colors with crossfader at 50 (midpoint)', () => {
      app.crossfaderValue = 50;
      app.calculateCombinedOutputs();
      // Ch1: Red '#ff0000' (255,0,0) and Green '#00ff00' (0,255,0) -> Midpoint should be (128,128,0) -> #808000
      // Ch2: Blue '#0000ff' (0,0,255) and Yellow '#ffff00' (255,255,0) -> Midpoint should be (128,128,128) -> #808080
      expect(app.combinedOutputStates[0].value).toBe(50);
      expect(app.combinedOutputStates[0].color).toBe('#808000');
      expect(app.combinedOutputStates[1].value).toBe(50);
      expect(app.combinedOutputStates[1].color).toBe('#808080');
    });
  });

  it('onPotentiometerChange should call calculateCombinedOutputs', () => {
    spyOn(app, 'calculateCombinedOutputs');
    app.onPotentiometerChange();
    expect(app.calculateCombinedOutputs).toHaveBeenCalled();
  });

  describe('Go Button and Crossfader Animation', () => {
    // ... (existing animation tests remain unchanged as they focus on value, not color) ...
    it('onGoButtonClick should call animateCrossfader with 0 if crossfaderValue >= 50', () => {
      spyOn(app, 'animateCrossfader');
      app.crossfaderValue = 70;
      app.onGoButtonClick();
      expect(app.animateCrossfader).toHaveBeenCalledWith(0);
    });

    it('onGoButtonClick should call animateCrossfader with 100 if crossfaderValue < 50', () => {
      spyOn(app, 'animateCrossfader');
      app.crossfaderValue = 30;
      app.onGoButtonClick();
      expect(app.animateCrossfader).toHaveBeenCalledWith(100);
    });

    it('onGoButtonClick should not call animateCrossfader if isAnimating is true', () => {
      spyOn(app, 'animateCrossfader');
      app.isAnimating = true;
      app.onGoButtonClick();
      expect(app.animateCrossfader).not.toHaveBeenCalled();
    });

    it('animateCrossfader should animate crossfader value from 0 to 100', fakeAsync(() => {
      spyOn(app, 'onPotentiometerChange').and.callThrough();
      app.crossfaderValue = 0;
      const target = 100;
      const duration = 500;
      const steps = 25;
      const interval = duration / steps;

      app.animateCrossfader(target);
      expect(app.isAnimating).toBeTrue();

      for (let i = 0; i < steps; i++) {
        tick(interval);
      }

      expect(app.crossfaderValue).toBe(target);
      expect(app.isAnimating).toBeFalse();
      expect(app.animationInterval).toBeNull();
      expect(app.onPotentiometerChange).toHaveBeenCalledTimes(steps);
    }));

    it('animateCrossfader should animate crossfader value from 100 to 0', fakeAsync(() => {
      spyOn(app, 'onPotentiometerChange').and.callThrough();
      app.crossfaderValue = 100;
      const target = 0;
      const duration = 500;
      const steps = 25;
      const interval = duration / steps;

      app.animateCrossfader(target);
      expect(app.isAnimating).toBeTrue();

      tick(duration);

      expect(app.crossfaderValue).toBe(target);
      expect(app.isAnimating).toBeFalse();
      expect(app.animationInterval).toBeNull();
      expect(app.onPotentiometerChange).toHaveBeenCalledTimes(steps);
    }));

    it('Go button should call onGoButtonClick and be disabled when isAnimating is true', () => {
      fixture.detectChanges();
      spyOn(app, 'onGoButtonClick');

      const goButton = fixture.debugElement.query(By.css('.go-button')).nativeElement;
      expect(goButton.disabled).toBeFalse();

      goButton.click();
      expect(app.onGoButtonClick).toHaveBeenCalled();

      app.isAnimating = true;
      fixture.detectChanges();
      expect(goButton.disabled).toBeTrue();
    });
  });
});
