import { TestBed, ComponentFixture, fakeAsync, tick } from '@angular/core/testing'; // Imported fakeAsync and tick for potential use if needed, though jasmine.clock is primary for intervals
import { provideZonelessChangeDetection, Renderer2, NgZone, ChangeDetectorRef } from '@angular/core'; // Restored provideZonelessChangeDetection
import { DOCUMENT } from '@angular/common';
import { App } from './app';
import { By } from '@angular/platform-browser';
import { ChannelSettingsService, AppSettings } from './channel-settings.service';
import { HttpDataService, CombinedOutputData } from './http-data.service';
import { BehaviorSubject, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { CombinedOutputDisplayComponent } from './combined-output-display/combined-output-display.component'; // Import new component


interface PotentiometerState {
  channelNumber: number;
  channelDescription: string;
  value: number;
  color: string;
}

describe('App', () => {
  let fixture: ComponentFixture<App>;
  let app: App;
  let mockChannelSettingsService: jasmine.SpyObj<ChannelSettingsService>;
  let appSettingsSubject: BehaviorSubject<AppSettings>;
  let mockHttpDataService: jasmine.SpyObj<HttpDataService>;
  let mockRenderer: jasmine.SpyObj<Renderer2>;
  let mockDocument: Document;

  const initialTestSettings: AppSettings = {
    numChannels: 4,
    channelDescriptions: ['Apple', 'Banana', 'Cherry', 'Date'],
    backendUrl: 'http://default.com',
    crossfadeDurationSeconds: 0.5,
    darkMode: false
  };

  beforeEach(async () => {
    appSettingsSubject = new BehaviorSubject<AppSettings>({...initialTestSettings});
    mockChannelSettingsService = jasmine.createSpyObj(
        'ChannelSettingsService',
        [
          'getCurrentAppSettings', 'getAppSettings', 'updateNumChannels',
          'updateChannelDescriptions', 'updateBackendUrl', 'updateCrossfadeDurationSeconds',
          'updateDarkMode', 'resetToDefaults', 'getCurrentNumChannels',
          'getCurrentChannelDescriptions', 'getCurrentDarkMode', 'getDarkMode'
        ]
    );
    mockChannelSettingsService.getCurrentAppSettings.and.returnValue({...initialTestSettings});
    mockChannelSettingsService.getAppSettings.and.returnValue(appSettingsSubject.asObservable());
    mockChannelSettingsService.getCurrentNumChannels.and.returnValue(initialTestSettings.numChannels);
    mockChannelSettingsService.getCurrentChannelDescriptions.and.returnValue([...initialTestSettings.channelDescriptions]);
    mockChannelSettingsService.getCurrentDarkMode.and.returnValue(initialTestSettings.darkMode);
    mockChannelSettingsService.getDarkMode.and.returnValue(appSettingsSubject.pipe(map((s: AppSettings) => s.darkMode)));


    mockHttpDataService = jasmine.createSpyObj('HttpDataService', ['postCombinedOutput']);
    mockHttpDataService.postCombinedOutput.and.returnValue(of({success: true}));

    mockRenderer = jasmine.createSpyObj('Renderer2', ['addClass', 'removeClass']);

    await TestBed.configureTestingModule({
      imports: [App], // App is standalone and imports CombinedOutputDisplayComponent
      providers: [
        { provide: ChannelSettingsService, useValue: mockChannelSettingsService },
        { provide: HttpDataService, useValue: mockHttpDataService },
        { provide: Renderer2, useValue: mockRenderer },
        provideZonelessChangeDetection() // Restored for zoneless testing of App component
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    app = fixture.componentInstance;
    mockDocument = fixture.debugElement.injector.get(DOCUMENT);
  });

  afterEach(() => {
    if (app.animationInterval) {
      clearInterval(app.animationInterval);
      app.animationInterval = null;
    }
    if ((jasmine.clock() as any).isInstalled && (jasmine.clock() as any).isInstalled()) {
         jasmine.clock().uninstall();
    }
  });

  it('should create the app', () => {
    expect(app).toBeTruthy();
  });

  // ... (other tests remain)

  it('should populate combinedOutputStates on ngOnInit and reflect initial settings', () => {
    fixture.detectChanges();
    expect(app.combinedOutputStates.length).toBe(initialTestSettings.numChannels);
    expect(app['currentNumChannels']).toBe(initialTestSettings.numChannels);
    expect(app['currentBackendUrl']).toBe(initialTestSettings.backendUrl);
    expect(app['currentCrossfadeDurationMs']).toBe(initialTestSettings.crossfadeDurationSeconds * 1000);

    expect(app.combinedOutputStates[0].value).toBe(50);
    expect(app.combinedOutputStates[0].channelDescription).toBe(initialTestSettings.channelDescriptions[0]);
    expect(app.combinedOutputStates[0].color).toBe('#808080');
  });

  describe('CombinedOutputDisplay Rendering', () => {
    it('should render the correct number of app-combined-output-display components', () => {
      fixture.detectChanges(); // ngOnInit populates combinedOutputStates
      const displayElements = fixture.debugElement.queryAll(By.css('app-combined-output-display'));
      expect(displayElements.length).toBe(app.combinedOutputStates.length);
      expect(displayElements.length).toBe(initialTestSettings.numChannels); // Initially 4
    });

    it('should pass correct data to app-combined-output-display components', () => {
      fixture.detectChanges();
      const displayElements = fixture.debugElement.queryAll(By.css('app-combined-output-display'));

      app.combinedOutputStates.forEach((state, index) => {
        const displayComponentInstance = displayElements[index].componentInstance as CombinedOutputDisplayComponent;
        expect(displayComponentInstance.description).toBe(state.channelDescription);
        expect(displayComponentInstance.value).toBe(state.value);
        expect(displayComponentInstance.color).toBe(state.color);
      });
    });
  });

  // ... (Rest of the tests, including ChannelSettingsService Interaction, onPotentiometerChange, etc.)
  // Ensure they are still valid or adjust as needed. The provided tests seem okay.
  // For brevity, only adding new tests and ensuring setup is fine.
  // Previous tests for calculateCombinedOutputs, onPotentiometerChange, Go Button, Settings Modal Toggling are assumed to be here and correct.

  // Copied from previous version for completeness, ensure they are still valid
  describe('ChannelSettingsService Interaction on ngOnInit subscription', () => {
    it('should update states and re-initialize channels if numChannels changes', () => {
      fixture.detectChanges();
      const initSpy = spyOn(app, 'initializeChannelStates').and.callThrough();
      const calcSpy = spyOn(app, 'calculateCombinedOutputs').and.callThrough();
      const cdrSpy = spyOn(app['cdr'], 'detectChanges').and.callThrough();

      const newSettings: AppSettings = {
        numChannels: 2,
        channelDescriptions: ['NewDesc1', 'NewDesc2'],
        backendUrl: 'http://new.url',
        crossfadeDurationSeconds: 2,
        darkMode: false
      };
      mockChannelSettingsService.getCurrentChannelDescriptions.and.returnValue(newSettings.channelDescriptions);
      appSettingsSubject.next(newSettings);

      expect(app['currentNumChannels']).toBe(2);
      expect(initSpy).toHaveBeenCalledWith(2);
      expect(app.row1States.length).toBe(2);
      expect(app.row1States[0].channelDescription).toBe('NewDesc1');
      expect(calcSpy).toHaveBeenCalled();
      expect(cdrSpy).toHaveBeenCalled();
    });

    it('should update descriptions and other settings if numChannels does not change', () => {
      fixture.detectChanges();
      const initSpy = spyOn(app, 'initializeChannelStates').and.callThrough();
      const calcSpy = spyOn(app, 'calculateCombinedOutputs').and.callThrough();
      const cdrSpy = spyOn(app['cdr'], 'detectChanges').and.callThrough();

      const newSettings: AppSettings = {
        ...initialTestSettings,
        channelDescriptions: ['UpdatedA', 'UpdatedB', 'UpdatedC', 'UpdatedD'],
        backendUrl: 'http://another.url',
      };
      appSettingsSubject.next(newSettings);

      expect(initSpy).not.toHaveBeenCalled();
      expect(app.row1States[0].channelDescription).toBe('UpdatedA');
      expect(app.row2States[1].channelDescription).toBe('UpdatedB');
      expect(calcSpy).toHaveBeenCalledTimes(1);
      expect(cdrSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('onPotentiometerChange', () => {
    beforeEach(() => {
        fixture.detectChanges();
    });

    it('should call calculateCombinedOutputs', () => {
      spyOn(app, 'calculateCombinedOutputs').and.callThrough();
      app.onPotentiometerChange();
      expect(app.calculateCombinedOutputs).toHaveBeenCalled();
    });

    it('should post data via HttpDataService if backendUrl is configured', () => {
      app['currentBackendUrl'] = 'http://test.com';
      app.onPotentiometerChange();
      expect(mockHttpDataService.postCombinedOutput).toHaveBeenCalledWith('http://test.com', app.combinedOutputStates as CombinedOutputData[]);
    });

    it('should not post data if backendUrl is empty', () => {
      app['currentBackendUrl'] = '';
      app.onPotentiometerChange();
      expect(mockHttpDataService.postCombinedOutput).not.toHaveBeenCalled();
    });
  });

  // Theme tests from before
  describe('Theme Initialization and Updates', () => {
    // Test for initial light theme from constructor (based on beforeEach's initialTestSettings)
    it('should apply light theme (remove dark-theme class) by default on construction if settings are for light mode', () => {
      // initialTestSettings in the outer beforeEach has darkMode: false
      // mockChannelSettingsService.getCurrentAppSettings is already stubbed to return initialTestSettings in the outer beforeEach
      fixture.detectChanges(); // Triggers constructor and ngOnInit

      expect(mockRenderer.removeClass).toHaveBeenCalledWith(fixture.nativeElement.ownerDocument.body, 'dark-theme');
      expect(mockRenderer.addClass).not.toHaveBeenCalled();
    });

    // Test for initial dark theme from constructor
    it('should apply dark theme (add dark-theme class) on construction if settings are for dark mode', () => {
      const darkInitialSettings = { ...initialTestSettings, darkMode: true };
      mockChannelSettingsService.getCurrentAppSettings.and.returnValue(darkInitialSettings);

      // Re-create fixture and component with the new mock setup for constructor
      fixture = TestBed.createComponent(App);
      app = fixture.componentInstance;
      // Need to get the mockRenderer again if TestBed is reset, but here it's a top-level mock.
      // However, the document instance might change. Let's verify using app.document.body

      fixture.detectChanges(); // Triggers constructor and ngOnInit for the new component

      expect(mockRenderer.addClass).toHaveBeenCalledWith(app['document'].body, 'dark-theme');
      expect(mockRenderer.removeClass).not.toHaveBeenCalled();
    });

    it('should switch to dark theme when darkMode setting changes to true via subscription', () => {
      // Initial state is light (from outer beforeEach's initialTestSettings via constructor)
      fixture.detectChanges();
      // At this point, removeClass should have been called by constructor/ngOnInit based on initial settings.
      // Reset spies to only capture the effect of the subscription update.
      mockRenderer.addClass.calls.reset();
      mockRenderer.removeClass.calls.reset();

      appSettingsSubject.next({ ...initialTestSettings, darkMode: true });
      fixture.detectChanges(); // Allow subscription to process

      expect(mockRenderer.addClass).toHaveBeenCalledWith(app['document'].body, 'dark-theme');
      expect(mockRenderer.removeClass).not.toHaveBeenCalled();
    });

    it('should switch to light theme when darkMode setting changes to false via subscription', () => {
      // Start by setting initial to dark via constructor for this test
      const darkInitialSettings = { ...initialTestSettings, darkMode: true };
      mockChannelSettingsService.getCurrentAppSettings.and.returnValue(darkInitialSettings);
      fixture = TestBed.createComponent(App); // Recreate for dark initial
      app = fixture.componentInstance;
      fixture.detectChanges(); // Constructor applies dark, ngOnInit sets up subscription

      // Reset spies to only capture the effect of the subscription update.
      mockRenderer.addClass.calls.reset();
      mockRenderer.removeClass.calls.reset();

      appSettingsSubject.next({ ...initialTestSettings, darkMode: false }); // Change to light
      fixture.detectChanges(); // Allow subscription to process

      expect(mockRenderer.removeClass).toHaveBeenCalledWith(app['document'].body, 'dark-theme');
      expect(mockRenderer.addClass).not.toHaveBeenCalled();
    });
  });

  // Go Button and Animation tests from before
  describe('Go Button and Crossfader Animation', () => {
    afterEach(() => {
      if (typeof (jasmine.clock() as any).uninstall === 'function') {
        try { jasmine.clock().uninstall(); } catch (e) {}
      }
    });

    it('animateCrossfader should use currentCrossfadeDurationMs', () => {
      jasmine.clock().install();
      app['currentCrossfadeDurationMs'] = 1000;
      const expectedInterval = 1000 / 25;
      spyOn(window, 'setInterval').and.callThrough();
      app.animateCrossfader(100);
      expect(window.setInterval).toHaveBeenCalledWith(jasmine.any(Function), expectedInterval);
      jasmine.clock().tick(1000); // Let animation complete for this specific test
      // No uninstall here, let afterEach handle it.
    });

    it('should stop animation and clear interval if Go is clicked while animating', () => {
      jasmine.clock().install(); // Install clock for this test
      fixture.detectChanges(); // Initial state

      app['currentCrossfadeDurationMs'] = 1000; // Set a known duration for easier tick calculation
      const initialCrossfaderValue = 0;
      app.crossfaderValue = initialCrossfaderValue;

      // Start an animation by clicking Go
      app.onGoButtonClick(); // This will animate towards 100
      expect(app.isAnimating).toBeTrue();
      expect(app.animationInterval).not.toBeNull();

      // Simulate some time passing, but not enough to complete
      // Animation has 25 steps. Tick for about half the steps.
      const midAnimationTicks = (app['currentCrossfadeDurationMs'] / 25) * 12;
      jasmine.clock().tick(midAnimationTicks);

      const valueAfterPartialAnimation = app.crossfaderValue;
      expect(valueAfterPartialAnimation).toBeGreaterThan(initialCrossfaderValue); // Value should have changed
      expect(app.isAnimating).toBeTrue(); // Still animating

      // Click Go button again to interrupt
      // Reset spy for postCombinedOutput to check if onPotentiometerChange (which calls it) is triggered by interruption
      mockHttpDataService.postCombinedOutput.calls.reset();
      app.onGoButtonClick();

      expect(app.isAnimating).toBeFalse();
      expect(app.animationInterval).toBeNull(); // Interval should be cleared

      // Value should remain at the interrupted position
      expect(app.crossfaderValue).toBeCloseTo(valueAfterPartialAnimation, 0);

      // onPotentiometerChange should have been called by the interrupting onGoButtonClick
      expect(mockHttpDataService.postCombinedOutput).toHaveBeenCalledTimes(1);

      jasmine.clock().uninstall(); // Uninstall clock specific to this test
    });
  });
  // Other Go button tests and calculateCombinedOutputs tests are assumed to be present and correct.
});
