import { provideZonelessChangeDetection, NgZone } from '@angular/core';
import { TestBed, ComponentFixture, fakeAsync, tick } from '@angular/core/testing';
import { App } from './app';
import { By } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';

// App component is standalone and imports SlidePotentiometerComponent and ChannelValuesTableComponent.
// CommonModule is also imported by App.

describe('App', () => {
  let fixture: ComponentFixture<App>;
  let app: App;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App], // App is standalone
      providers: [
        // provideZonelessChangeDetection() // This was in spec but not in app.config, tests failed with it.
                                         // App component is not configured for zoneless in app.config.ts by default.
                                         // The warning NG0914 implies Zone.js is loaded.
                                         // For tests to pass without further changes, default Zone.js based CD is assumed.
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    app = fixture.componentInstance;
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
    fixture.detectChanges(); // ngOnInit would have run
    expect(app.row1States.length).toBe(4);
    expect(app.row1States[0].channelDescription).toBe('Apple');
    expect(app.row1States[1].value).toBe(25);

    expect(app.row2States.length).toBe(4);
    expect(app.row2States[0].channelDescription).toBe('Apple');
    expect(app.row2States[1].value).toBe(75);

    expect(app.crossfaderValue).toBe(50);
  });

  it('should populate combinedOutputStates on ngOnInit', () => {
    fixture.detectChanges(); // ngOnInit calls calculateCombinedOutputs
    expect(app.combinedOutputStates.length).toBe(4);
    // Check one value based on initial states and crossfaderValue = 50
    // row1[0].value = 0, row2[0].value = 100. crossfader = 50 (0.5 ratio)
    // combined = (0 * 0.5) + (100 * (1-0.5)) = 50
    // The formula was: (row1State.value * crossfadeRatio) + (row2State.value * (1 - crossfadeRatio));
    // So for crossfaderValue = 50 (ratio 0.5): (0 * 0.5) + (100 * 0.5) = 50.
    expect(app.combinedOutputStates[0].value).toBe(50);
    expect(app.combinedOutputStates[0].channelDescription).toBe('Apple');

    // row1[1].value = 25, row2[1].value = 75. crossfader = 50
    // combined = (25 * 0.5) + (75 * 0.5) = 12.5 + 37.5 = 50
    expect(app.combinedOutputStates[1].value).toBe(50);
  });

  describe('calculateCombinedOutputs', () => {
    beforeEach(() => {
      // Reset states for predictable tests
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
      app.crossfaderValue = 0; // ratio = 0
      app.calculateCombinedOutputs();
      // Formula: (row1 * ratio) + (row2 * (1-ratio))
      // (10 * 0) + (90 * 1) = 90
      // (80 * 0) + (20 * 1) = 20
      expect(app.combinedOutputStates.length).toBe(2);
      expect(app.combinedOutputStates[0].value).toBe(90);
      expect(app.combinedOutputStates[1].value).toBe(20);
    });

    it('should correctly blend values with crossfader at 100 (full row1States based on formula)', () => {
      app.crossfaderValue = 100; // ratio = 1
      app.calculateCombinedOutputs();
      // Formula: (row1 * ratio) + (row2 * (1-ratio))
      // (10 * 1) + (90 * 0) = 10
      // (80 * 1) + (20 * 0) = 80
      expect(app.combinedOutputStates[0].value).toBe(10);
      expect(app.combinedOutputStates[1].value).toBe(80);
    });

    it('should correctly blend values with crossfader at 50 (midpoint)', () => {
      app.crossfaderValue = 50; // ratio = 0.5
      app.calculateCombinedOutputs();
      // Formula: (row1 * ratio) + (row2 * (1-ratio))
      // (10 * 0.5) + (90 * 0.5) = 5 + 45 = 50
      // (80 * 0.5) + (20 * 0.5) = 40 + 10 = 50
      expect(app.combinedOutputStates[0].value).toBe(50);
      expect(app.combinedOutputStates[1].value).toBe(50);
    });

    it('should correctly blend values with crossfader at 25', () => {
      app.crossfaderValue = 25; // ratio = 0.25
      app.calculateCombinedOutputs();
      // Formula: (row1 * ratio) + (row2 * (1-ratio))
      // (10 * 0.25) + (90 * 0.75) = 2.5 + 67.5 = 70
      // (80 * 0.25) + (20 * 0.75) = 20 + 15 = 35
      expect(app.combinedOutputStates[0].value).toBe(70); // Math.round(70)
      expect(app.combinedOutputStates[1].value).toBe(35); // Math.round(35)
    });
  });

  it('onPotentiometerChange should call calculateCombinedOutputs', () => {
    spyOn(app, 'calculateCombinedOutputs');
    app.onPotentiometerChange();
    expect(app.calculateCombinedOutputs).toHaveBeenCalled();
  });
});
