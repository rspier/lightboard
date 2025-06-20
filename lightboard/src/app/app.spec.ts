import { TestBed, ComponentFixture } from '@angular/core/testing'; // Removed fakeAsync, tick
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
    // Ensure Jasmine clock is uninstalled if a test installed it
    // Check if jasmine.clock is installed before trying to uninstall
    // This check might be specific to Jasmine versions or how it's exposed.
    // A simple uninstall is usually fine.
    if ((jasmine.clock() as any).isInstalled && (jasmine.clock() as any).isInstalled()) {
         jasmine.clock().uninstall();
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
    expect(app.row1States[0].color).toBe('#ff0000');

    expect(app.row2States.length).toBe(4);
    expect(app.row2States[0].channelDescription).toBe('Apple');
    expect(app.row2States[0].value).toBe(100);
    expect(app.row2States[0].color).toBe('#00ffff');

    expect(app.crossfaderValue).toBe(50);
  });

  it('should populate combinedOutputStates on ngOnInit with blended values and colors', () => {
    fixture.detectChanges();
    expect(app.combinedOutputStates.length).toBe(4);

    expect(app.combinedOutputStates[0].value).toBe(50);
    expect(app.combinedOutputStates[0].channelDescription).toBe('Apple');
    expect(app.combinedOutputStates[0].color).toBe('#808080');

    expect(app.combinedOutputStates[1].value).toBe(50);
    expect(app.combinedOutputStates[1].color).toBe('#808080');
  });

  describe('calculateCombinedOutputs with colors', () => {
    beforeEach(() => {
      app.row1States = [
        { channelNumber: 1, channelDescription: "Ch1", value: 10, color: '#ff0000' },
        { channelNumber: 2, channelDescription: "Ch2", value: 80, color: '#0000ff' }
      ];
      app.row2States = [
        { channelNumber: 1, channelDescription: "Ch1", value: 90, color: '#00ff00' },
        { channelNumber: 2, channelDescription: "Ch2", value: 20, color: '#ffff00' }
      ];
    });

    it('should correctly blend values and colors with crossfader at 0 (full row2States)', () => {
      app.crossfaderValue = 0;
      app.calculateCombinedOutputs();
      expect(app.combinedOutputStates.length).toBe(2);
      expect(app.combinedOutputStates[0].value).toBe(90);
      expect(app.combinedOutputStates[0].color).toBe('#00ff00');
      expect(app.combinedOutputStates[1].value).toBe(20);
      expect(app.combinedOutputStates[1].color).toBe('#ffff00');
    });

    it('should correctly blend values and colors with crossfader at 100 (full row1States)', () => {
      app.crossfaderValue = 100;
      app.calculateCombinedOutputs();
      expect(app.combinedOutputStates[0].value).toBe(10);
      expect(app.combinedOutputStates[0].color).toBe('#ff0000');
      expect(app.combinedOutputStates[1].value).toBe(80);
      expect(app.combinedOutputStates[1].color).toBe('#0000ff');
    });

    it('should correctly blend values and colors with crossfader at 50 (midpoint)', () => {
      app.crossfaderValue = 50;
      app.calculateCombinedOutputs();
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
    afterEach(() => {
      // Ensure Jasmine clock is uninstalled after each test in this describe block
      // Check if installed, as installing an already installed clock throws an error.
      // Similarly, uninstalling a not installed clock can also throw an error.
      // A more robust check might be needed depending on Jasmine version nuances.
      // For now, assume it's safe or that a double uninstall is benign.
      if (typeof (jasmine.clock() as any).uninstall === 'function') {
        try {
          jasmine.clock().uninstall(); // Attempt to uninstall
        } catch (e) {
          // Catch potential errors if clock wasn't installed or already uninstalled
        }
      }
    });

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

    it('animateCrossfader should animate crossfader value from 0 to 100', () => {
      jasmine.clock().install();
      spyOn(app, 'onPotentiometerChange').and.callThrough();
      app.crossfaderValue = 0;
      const target = 100;
      const duration = 500; // ms
      const steps = 25; // Number of steps for the animation
      const intervalDuration = duration / steps; // 20ms

      app.animateCrossfader(target);
      expect(app.isAnimating).toBeTrue();

      for (let i = 0; i < steps; i++) {
        jasmine.clock().tick(intervalDuration);
      }

      expect(app.crossfaderValue).toBe(target);
      expect(app.isAnimating).toBeFalse();
      expect(app.animationInterval).toBeNull();
      expect(app.onPotentiometerChange).toHaveBeenCalledTimes(steps);
      jasmine.clock().uninstall();
    });

    it('animateCrossfader should animate crossfader value from 100 to 0', () => {
      jasmine.clock().install();
      spyOn(app, 'onPotentiometerChange').and.callThrough();
      app.crossfaderValue = 100;
      const target = 0;
      const duration = 500; // ms
      const steps = 25; // Number of steps for the animation
      const intervalDuration = duration / steps; // 20ms

      app.animateCrossfader(target);
      expect(app.isAnimating).toBeTrue();

      jasmine.clock().tick(duration);

      expect(app.crossfaderValue).toBe(target);
      expect(app.isAnimating).toBeFalse();
      expect(app.animationInterval).toBeNull();
      expect(app.onPotentiometerChange).toHaveBeenCalledTimes(steps);
      jasmine.clock().uninstall();
    });

    it('Go button should call onGoButtonClick and be disabled when isAnimating is true', () => {
      fixture.detectChanges();
      spyOn(app, 'onGoButtonClick').and.callThrough(); // Allow call through to test disabled state
      spyOn(app, 'animateCrossfader'); // But spy on animateCrossfader to prevent actual animation

      const goButton = fixture.debugElement.query(By.css('.go-button')).nativeElement;
      expect(goButton.disabled).toBeFalse();

      goButton.click();
      expect(app.onGoButtonClick).toHaveBeenCalled();

      // Manually set isAnimating to true after onGoButtonClick (which calls animateCrossfader)
      // because animateCrossfader itself sets isAnimating to true.
      // If we only spy on animateCrossfader, isAnimating won't be set by the spy.
      // So, we either let animateCrossfader run (and use jasmine clock) or set manually for this specific check.
      // For simplicity here, let's assume onGoButtonClick leads to isAnimating being true.
      app.isAnimating = true; // Simulate start of animation
      fixture.detectChanges();
      expect(goButton.disabled).toBeTrue();

      app.isAnimating = false; // Reset for other tests
      fixture.detectChanges();
      expect(goButton.disabled).toBeFalse();
    });
  });
});
