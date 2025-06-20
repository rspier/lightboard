import { TestBed, ComponentFixture, fakeAsync, tick } from '@angular/core/testing';
import { App } from './app';
import { By } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';

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
    // Clean up any running intervals if a test started one and didn't complete it
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

  it('should have initial row1States, row2States, and crossfaderValue', () => {
    fixture.detectChanges();
    expect(app.row1States.length).toBe(4);
    expect(app.row1States[0].channelDescription).toBe('Apple');
    expect(app.row1States[1].value).toBe(25);

    expect(app.row2States.length).toBe(4);
    expect(app.row2States[0].channelDescription).toBe('Apple');
    expect(app.row2States[1].value).toBe(75);

    expect(app.crossfaderValue).toBe(50);
  });

  it('should populate combinedOutputStates on ngOnInit', () => {
    fixture.detectChanges();
    expect(app.combinedOutputStates.length).toBe(4);
    expect(app.combinedOutputStates[0].value).toBe(50);
    expect(app.combinedOutputStates[0].channelDescription).toBe('Apple');
    expect(app.combinedOutputStates[1].value).toBe(50);
  });

  describe('calculateCombinedOutputs', () => {
    beforeEach(() => {
      app.row1States = [
        { channelNumber: 1, channelDescription: "Ch1", value: 10 },
        { channelNumber: 2, channelDescription: "Ch2", value: 80 }
      ];
      app.row2States = [
        { channelNumber: 1, channelDescription: "Ch1", value: 90 },
        { channelNumber: 2, channelDescription: "Ch2", value: 20 }
      ];
    });

    it('should correctly blend values with crossfader at 0 (full row2States based on formula)', () => {
      app.crossfaderValue = 0;
      app.calculateCombinedOutputs();
      expect(app.combinedOutputStates.length).toBe(2);
      expect(app.combinedOutputStates[0].value).toBe(90);
      expect(app.combinedOutputStates[1].value).toBe(20);
    });

    it('should correctly blend values with crossfader at 100 (full row1States based on formula)', () => {
      app.crossfaderValue = 100;
      app.calculateCombinedOutputs();
      expect(app.combinedOutputStates[0].value).toBe(10);
      expect(app.combinedOutputStates[1].value).toBe(80);
    });

    it('should correctly blend values with crossfader at 50 (midpoint)', () => {
      app.crossfaderValue = 50;
      app.calculateCombinedOutputs();
      expect(app.combinedOutputStates[0].value).toBe(50);
      expect(app.combinedOutputStates[1].value).toBe(50);
    });

    it('should correctly blend values with crossfader at 25', () => {
      app.crossfaderValue = 25;
      app.calculateCombinedOutputs();
      expect(app.combinedOutputStates[0].value).toBe(70);
      expect(app.combinedOutputStates[1].value).toBe(35);
    });
  });

  it('onPotentiometerChange should call calculateCombinedOutputs', () => {
    spyOn(app, 'calculateCombinedOutputs');
    app.onPotentiometerChange();
    expect(app.calculateCombinedOutputs).toHaveBeenCalled();
  });

  describe('Go Button and Crossfader Animation', () => {
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
      spyOn(app, 'onPotentiometerChange').and.callThrough(); // Ensure it's called but don't interfere with spy
      app.crossfaderValue = 0;
      const target = 100;
      const duration = 500;
      const steps = 25;
      const interval = duration / steps;

      app.animateCrossfader(target);
      expect(app.isAnimating).toBeTrue();

      for (let i = 0; i < steps; i++) {
        tick(interval);
        // Value might not be exact due to float arithmetic, but it should be close
        // and onPotentiometerChange should be called.
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
      const steps = 25; // As defined in component
      const interval = duration / steps;

      app.animateCrossfader(target);
      expect(app.isAnimating).toBeTrue();

      tick(duration); // Elapse total duration

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
