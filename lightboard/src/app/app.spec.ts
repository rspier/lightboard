import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection, Renderer2, ChangeDetectorRef } from '@angular/core'; // Removed NgZone, added ChangeDetectorRef
import { DOCUMENT } from '@angular/common';
import { App } from './app';
import { By } from '@angular/platform-browser';
import { ChannelSettingsService, AppSettings } from './channel-settings.service';
import { HttpDataService, CombinedOutputData } from './http-data.service';
import { BehaviorSubject, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { CombinedOutputDisplayComponent } from './combined-output-display/combined-output-display.component';


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
  let mockDocument: Document; // Keep this, will be injected from fixture

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
      imports: [App],
      providers: [
        { provide: ChannelSettingsService, useValue: mockChannelSettingsService },
        { provide: HttpDataService, useValue: mockHttpDataService },
        { provide: Renderer2, useValue: mockRenderer },
        provideZonelessChangeDetection()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    app = fixture.componentInstance;
    mockDocument = fixture.debugElement.injector.get(DOCUMENT); // Get the actual document instance from the fixture
  });

  afterEach(() => {
    if (app.animationInterval) {
      clearInterval(app.animationInterval);
      app.animationInterval = null;
    }
    // No longer need to check for jasmine clock here, it will be handled by specific describe blocks
  });

  it('should create the app', () => {
    expect(app).toBeTruthy();
  });

  it('should render the sliders-area container', () => {
    fixture.detectChanges();
    const compiled = fixture.debugElement;
    expect(compiled.query(By.css('.sliders-area'))).toBeTruthy();
  });

  it('should initialize states based on ChannelSettingsService in constructor', () => {
    // Constructor logic is tested when component is created in beforeEach.
    // We verify the outcome here.
    // getCurrentAppSettings is called in constructor, and its return value's channelDescriptions
    // are passed to initializeChannelStates.
    expect(mockChannelSettingsService.getCurrentAppSettings).toHaveBeenCalled();
    // initializeChannelStates is called by constructor.
    // After refactor, initializeChannelStates receives descriptions as a parameter,
    // so it no longer calls mockChannelSettingsService.getCurrentChannelDescriptions itself.
    // The spyOn(app, 'initializeChannelStates') in relevant tests will check parameters.

    expect(app.row1States.length).toBe(initialTestSettings.numChannels);
    expect(app.row1States[0].channelDescription).toBe(initialTestSettings.channelDescriptions[0]);
    expect(app.row1States[0].value).toBe(0);
    expect(app.row1States[0].color).toBe(app['defaultColorsScene1'][0]);

    expect(app['currentNumChannels']).toBe(initialTestSettings.numChannels);
    expect(app['currentBackendUrl']).toBe(initialTestSettings.backendUrl);
    expect(app['currentCrossfadeDurationMs']).toBe(initialTestSettings.crossfadeDurationSeconds * 1000);
    expect(app['currentDarkMode']).toBe(initialTestSettings.darkMode);
  });


  it('should populate combinedOutputStates on ngOnInit and reflect initial settings', () => {
    fixture.detectChanges(); // ngOnInit runs
    expect(app.combinedOutputStates.length).toBe(initialTestSettings.numChannels);
    expect(app.combinedOutputStates[0].value).toBe(50);
    expect(app.combinedOutputStates[0].channelDescription).toBe(initialTestSettings.channelDescriptions[0]);
    expect(app.combinedOutputStates[0].color).toBe('#808080');
  });

  // ... (CombinedOutputDisplay Rendering tests are fine) ...
  describe('CombinedOutputDisplay Rendering', () => {
    it('should render the correct number of app-combined-output-display components', () => {
      fixture.detectChanges();
      const displayElements = fixture.debugElement.queryAll(By.css('app-combined-output-display'));
      expect(displayElements.length).toBe(app.combinedOutputStates.length);
      expect(displayElements.length).toBe(initialTestSettings.numChannels);
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

  // ... (ChannelSettingsService Interaction tests are fine) ...
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
      // No longer need to mock getCurrentChannelDescriptions here as initializeChannelStates takes descriptions directly
      appSettingsSubject.next(newSettings);

      expect(app['currentNumChannels']).toBe(2);
      // Verify initializeChannelStates is called with new numChannels AND new descriptions
      expect(initSpy).toHaveBeenCalledWith(newSettings.numChannels, newSettings.channelDescriptions);
      expect(app.row1States.length).toBe(2);
      expect(app.row1States[0].channelDescription).toBe('NewDesc1'); // This verifies the outcome of initializeChannelStates
      expect(calcSpy).toHaveBeenCalled();
      expect(cdrSpy).toHaveBeenCalled();
    });

    it('should update descriptions and other settings if numChannels does not change', () => {
      fixture.detectChanges();
      const initSpy = spyOn(app, 'initializeChannelStates').and.callThrough(); // Should not be called
      const calcSpy = spyOn(app, 'calculateCombinedOutputs').and.callThrough();
      const cdrSpy = spyOn(app['cdr'], 'detectChanges').and.callThrough();

      const newSettings: AppSettings = {
        ...initialTestSettings, // numChannels remains the same
        channelDescriptions: ['UpdatedA', 'UpdatedB', 'UpdatedC', 'UpdatedD'],
        backendUrl: 'http://another.url',
      };
      appSettingsSubject.next(newSettings);

      expect(initSpy).not.toHaveBeenCalled(); // Because numChannels didn't change
      // Descriptions should be updated directly in the ngOnInit subscription
      expect(app.row1States[0].channelDescription).toBe('UpdatedA');
      expect(app.row2States[1].channelDescription).toBe('UpdatedB'); // Assuming row2States also updated
      expect(calcSpy).toHaveBeenCalledTimes(1); // Once for initial, once for description update that triggers it.
      expect(cdrSpy).toHaveBeenCalledTimes(1); // Or more, depending on how many times detectChanges is called by subscription
    });
  });

  // ... (onPotentiometerChange tests are fine) ...
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

  describe('Theme Initialization and Updates', () => {
    // Helper to set up initial settings and create/initialize the component for theme tests
    // initialTestSettings is the global one, currentTestSettings is for this specific describe block
    let currentTestSettings: AppSettings;

    function setupInitialSettingsAndCreateComponent(isDark: boolean) {
      currentTestSettings = { ...initialTestSettings, darkMode: isDark };

      // Update the mocks that AppComponent will use in its constructor and ngOnInit
      mockChannelSettingsService.getCurrentAppSettings.and.returnValue(currentTestSettings);
      // Re-initialize the subject for getAppSettings() to ensure it emits this specific setting first if needed
      // and to isolate from other tests that might have modified the global appSettingsSubject
      appSettingsSubject = new BehaviorSubject<AppSettings>(currentTestSettings);
      mockChannelSettingsService.getAppSettings.and.returnValue(appSettingsSubject.asObservable());
      mockChannelSettingsService.getCurrentDarkMode.and.returnValue(isDark); // For constructor
      mockChannelSettingsService.getDarkMode.and.returnValue(appSettingsSubject.pipe(map(s => s.darkMode)));


      // Reset spies right before component creation and ngOnInit (via fixture.detectChanges())
      // This is because applyTheme is called in the constructor and then again in ngOnInit.
      // We want to test the combined effect of these initial calls.
      mockRenderer.addClass.calls.reset();
      mockRenderer.removeClass.calls.reset();

      // Create a new fixture and component instance for this test
      fixture = TestBed.createComponent(App);
      app = fixture.componentInstance;
      // mockDocument is already available from the outer beforeEach,
      // but re-assigning ensures it's from the *current* fixture if that were an issue.
      // fixture.nativeElement.ownerDocument.body should be equivalent to mockDocument.body
      // as mockDocument is injected from the fixture's services.
      mockDocument = fixture.debugElement.injector.get(DOCUMENT);
    }

    it('should apply light theme on init if initial setting is false (constructor + ngOnInit)', () => {
      setupInitialSettingsAndCreateComponent(false);
      fixture.detectChanges(); // Triggers ngOnInit which calls applyTheme

      // Constructor called applyTheme(false) -> removeClass
      // ngOnInit sub might call applyTheme(false) again -> removeClass
      // We expect removeClass to have been called at least once.
      expect(mockRenderer.removeClass).toHaveBeenCalledWith(mockDocument.body, 'dark-theme');
      // addClass should not have been called with 'dark-theme' at all.
      expect(mockRenderer.addClass).not.toHaveBeenCalledWith(mockDocument.body, 'dark-theme');
    });

    it('should apply dark theme on init if initial setting is true (constructor + ngOnInit)', () => {
      setupInitialSettingsAndCreateComponent(true);
      fixture.detectChanges(); // Triggers ngOnInit which calls applyTheme

      expect(mockRenderer.addClass).toHaveBeenCalledWith(mockDocument.body, 'dark-theme');
      // removeClass should not have been called with 'dark-theme'
      expect(mockRenderer.removeClass).not.toHaveBeenCalledWith(mockDocument.body, 'dark-theme');
    });

    it('should switch to dark theme if setting changes to true via service', () => {
      setupInitialSettingsAndCreateComponent(false); // Start with light theme
      fixture.detectChanges(); // Initial applyTheme (removes class)

      // Reset spies after initial setup and detectChanges, before the action we're testing
      mockRenderer.addClass.calls.reset();
      mockRenderer.removeClass.calls.reset();

      // Emit new settings to trigger the subscription in ngOnInit
      const newSettings = { ...currentTestSettings, darkMode: true };
      appSettingsSubject.next(newSettings);
      fixture.detectChanges(); // Process subscription and call applyTheme again

      expect(mockRenderer.addClass).toHaveBeenCalledWith(mockDocument.body, 'dark-theme');
      expect(mockRenderer.removeClass).not.toHaveBeenCalledWith(mockDocument.body, 'dark-theme');
    });

    it('should switch to light theme if setting changes to false via service', () => {
      setupInitialSettingsAndCreateComponent(true); // Start with dark theme
      fixture.detectChanges(); // Initial applyTheme (adds class)

      // Reset spies after initial setup and detectChanges
      mockRenderer.addClass.calls.reset();
      mockRenderer.removeClass.calls.reset();

      const newSettings = { ...currentTestSettings, darkMode: false };
      appSettingsSubject.next(newSettings);
      fixture.detectChanges();

      expect(mockRenderer.removeClass).toHaveBeenCalledWith(mockDocument.body, 'dark-theme');
      expect(mockRenderer.addClass).not.toHaveBeenCalledWith(mockDocument.body, 'dark-theme');
    });
  });

  describe('Go Button and Crossfader Animation', () => {
    // Tests that don't need jasmine.clock()
    it('onGoButtonClick should call animateCrossfader if not already animating (target 0)', () => {
      spyOn(app, 'animateCrossfader');
      app.isAnimating = false;
      app.crossfaderValue = 70; // Should target 0
      app.onGoButtonClick();
      expect(app.animateCrossfader).toHaveBeenCalledWith(0);
    });

    it('onGoButtonClick should call animateCrossfader if not already animating (target 100)', () => {
      spyOn(app, 'animateCrossfader');
      app.isAnimating = false;
      app.crossfaderValue = 30; // Should target 100
      app.onGoButtonClick();
      expect(app.animateCrossfader).toHaveBeenCalledWith(100);
    });

    it('onGoButtonClick should stop animation if already animating', () => {
      app.isAnimating = true;
      app.animationInterval = 12345; // Mock an interval ID
      spyOn(window, 'clearInterval');
      const cdrSpy = spyOn(app['cdr'], 'detectChanges');

      app.onGoButtonClick();

      expect(clearInterval).toHaveBeenCalledWith(12345);
      expect(app.animationInterval).toBeNull();
      expect(app.isAnimating).toBeFalse();
      expect(cdrSpy).toHaveBeenCalled();
    });

    it('Go button should call onGoButtonClick and be disabled when isAnimating is true', () => {
      fixture.detectChanges();
      spyOn(app, 'onGoButtonClick').and.callThrough();
      spyOn(app, 'animateCrossfader').and.callFake(() => {
        app.isAnimating = true;
      });

      const goButton = fixture.debugElement.query(By.css('.go-button')).nativeElement;
      goButton.click();
      expect(app.onGoButtonClick).toHaveBeenCalled();

      fixture.detectChanges();
      expect(goButton.disabled).toBeTrue();

      app.isAnimating = false;
      fixture.detectChanges();
      expect(goButton.disabled).toBeFalse();
    });

    // Nested describe for tests that specifically need Jasmine Clock
    describe('animateCrossfader method tests needing Jasmine Clock', () => {
      beforeEach(() => {
        jasmine.clock().install();
      });

      afterEach(() => {
        jasmine.clock().uninstall();
      });

      it('animateCrossfader should use currentCrossfadeDurationMs', () => {
        app['currentCrossfadeDurationMs'] = 1000;
        const expectedInterval = 1000 / 25;
        spyOn(window, 'setInterval').and.callThrough();
        app.animateCrossfader(100);
        expect(window.setInterval).toHaveBeenCalledWith(jasmine.any(Function), expectedInterval);
        jasmine.clock().tick(1000);
      });

      it('animateCrossfader should animate crossfader value from 0 to 100', () => {
        spyOn(app, 'onPotentiometerChange').and.callThrough();
        app.crossfaderValue = 0;
        app['currentCrossfadeDurationMs'] = 500;
        const target = 100;
        const duration = app['currentCrossfadeDurationMs'];
        const steps = 25;
        const intervalDuration = duration / steps;

        app.animateCrossfader(target);
        expect(app.isAnimating).toBeTrue();

        for (let i = 0; i < steps; i++) {
          jasmine.clock().tick(intervalDuration);
        }

        expect(app.crossfaderValue).toBe(target);
        expect(app.isAnimating).toBeFalse();
        expect(app.animationInterval).toBeNull();
        expect(app.onPotentiometerChange).toHaveBeenCalledTimes(steps);
      });

      it('animateCrossfader should animate crossfader value from 100 to 0', () => {
        spyOn(app, 'onPotentiometerChange').and.callThrough();
        app.crossfaderValue = 100;
        app['currentCrossfadeDurationMs'] = 500;
        const target = 0;
        const duration = app['currentCrossfadeDurationMs'];
        const steps = 25;
        // const intervalDuration = duration / steps; // Not strictly needed for this test variant with single tick

        app.animateCrossfader(target);
        expect(app.isAnimating).toBeTrue();

        jasmine.clock().tick(duration);

        expect(app.crossfaderValue).toBe(target);
        expect(app.isAnimating).toBeFalse();
        expect(app.animationInterval).toBeNull();
        expect(app.onPotentiometerChange).toHaveBeenCalledTimes(steps);
      });
    });
  });
  // Settings Modal Toggling tests remain the same
  describe('Settings Modal Toggling', () => {
    it('should toggle showSettingsModal flag', () => {
      expect(app.showSettingsModal).toBeFalse();
      app.toggleSettingsModal();
      expect(app.showSettingsModal).toBeTrue();
      app.toggleSettingsModal();
      expect(app.showSettingsModal).toBeFalse();
    });

    it('should show settings modal when settings icon is clicked', () => {
      fixture.detectChanges();
      const settingsIcon = fixture.debugElement.query(By.css('.settings-icon')).nativeElement;
      settingsIcon.click();
      fixture.detectChanges();
      expect(app.showSettingsModal).toBeTrue();
      const modalElement = fixture.debugElement.query(By.css('app-settings-modal'));
      expect(modalElement).toBeTruthy();
    });

    it('should hide settings modal on (close) event', () => {
      app.showSettingsModal = true;
      fixture.detectChanges();

      const modalComponentDebugElement = fixture.debugElement.query(By.css('app-settings-modal'));
      expect(modalComponentDebugElement).toBeTruthy();

      modalComponentDebugElement.componentInstance.close.emit();
      fixture.detectChanges();
      expect(app.showSettingsModal).toBeFalse();
    });
  });
  // calculateCombinedOutputs tests remain the same
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
      app['currentNumChannels'] = 2;
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
});
