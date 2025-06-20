import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection, Renderer2, NgZone, ChangeDetectorRef } from '@angular/core';
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
        provideZonelessChangeDetection()
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
    it('should apply initial theme based on settings after ngOnInit', () => {
      mockChannelSettingsService.getCurrentAppSettings.and.returnValue({...initialTestSettings, darkMode: false });
      fixture.detectChanges();
      expect(mockRenderer.removeClass).toHaveBeenCalledWith(fixture.nativeElement.ownerDocument.body, 'dark-theme');
      expect(mockRenderer.addClass).not.toHaveBeenCalled();
    });

    it('should apply dark theme if initial setting is dark', () => {
      const darkInitialSettings = {...initialTestSettings, darkMode: true };
      mockChannelSettingsService.getCurrentAppSettings.and.returnValue(darkInitialSettings);
      appSettingsSubject.next(darkInitialSettings);

      // Recreate component to ensure constructor uses the new darkInitialSettings via getCurrentAppSettings
      fixture = TestBed.createComponent(App);
      app = fixture.componentInstance;
      // Renderer mock is still the same, document reference will be from new fixture

      fixture.detectChanges();
      expect(mockRenderer.addClass).toHaveBeenCalledWith(fixture.nativeElement.ownerDocument.body, 'dark-theme');
      expect(mockRenderer.removeClass).not.toHaveBeenCalled();
    });


    it('should switch to dark theme when darkMode setting changes to true', () => {
      // Initial state is light (initialTestSettings.darkMode = false)
      fixture.detectChanges();
      mockRenderer.addClass.calls.reset();
      mockRenderer.removeClass.calls.reset();

      appSettingsSubject.next({...initialTestSettings, darkMode: true });
      // Subscription in ngOnInit calls applyTheme -> renderer methods
      // cdr.detectChanges() in subscription ensures view is updated if needed, but renderer call is direct
      expect(mockRenderer.addClass).toHaveBeenCalledWith(fixture.nativeElement.ownerDocument.body, 'dark-theme');
      expect(mockRenderer.removeClass).not.toHaveBeenCalled();
    });

    it('should switch to light theme when darkMode setting changes to false', () => {
      // Start with dark theme
      appSettingsSubject.next({...initialTestSettings, darkMode: true });
      fixture.detectChanges(); // Apply dark theme
      mockRenderer.addClass.calls.reset();
      mockRenderer.removeClass.calls.reset();

      appSettingsSubject.next({...initialTestSettings, darkMode: false });
      // Subscription in ngOnInit calls applyTheme -> renderer methods
      expect(mockRenderer.removeClass).toHaveBeenCalledWith(fixture.nativeElement.ownerDocument.body, 'dark-theme');
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
      jasmine.clock().tick(1000);
      jasmine.clock().uninstall();
    });
  });
  // Other Go button tests and calculateCombinedOutputs tests are assumed to be present and correct.
});
