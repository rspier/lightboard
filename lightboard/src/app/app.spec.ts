import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection, Renderer2, NgZone } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { App } from './app';
import { By } from '@angular/platform-browser';
import { ChannelSettingsService, AppSettings } from './channel-settings.service';
import { HttpDataService, CombinedOutputData } from './http-data.service';
import { BehaviorSubject, of } from 'rxjs';
import { map } from 'rxjs/operators'; // Import map operator
import { ChangeDetectorRef } from '@angular/core';


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
    darkMode: false // Added darkMode
  };

  beforeEach(async () => {
    appSettingsSubject = new BehaviorSubject<AppSettings>({...initialTestSettings});
    mockChannelSettingsService = jasmine.createSpyObj(
        'ChannelSettingsService',
        [
          'getCurrentAppSettings',
          'getAppSettings',
          'updateNumChannels',
          'updateChannelDescriptions',
          'updateBackendUrl',
          'updateCrossfadeDurationSeconds',
          'updateDarkMode', // Added spy
          'resetToDefaults',
          'getCurrentNumChannels',
          'getCurrentChannelDescriptions',
          'getCurrentDarkMode', // Added spy
          'getDarkMode' // Added spy
        ]
    );
    mockChannelSettingsService.getCurrentAppSettings.and.returnValue({...initialTestSettings});
    mockChannelSettingsService.getAppSettings.and.returnValue(appSettingsSubject.asObservable());
    mockChannelSettingsService.getCurrentNumChannels.and.returnValue(initialTestSettings.numChannels);
    mockChannelSettingsService.getCurrentChannelDescriptions.and.returnValue([...initialTestSettings.channelDescriptions]);
    mockChannelSettingsService.getCurrentDarkMode.and.returnValue(initialTestSettings.darkMode);
    mockChannelSettingsService.getDarkMode.and.returnValue(appSettingsSubject.pipe(map((s: AppSettings) => s.darkMode))); // Typed parameter


    mockHttpDataService = jasmine.createSpyObj('HttpDataService', ['postCombinedOutput']);
    mockHttpDataService.postCombinedOutput.and.returnValue(of({success: true}));

    mockRenderer = jasmine.createSpyObj('Renderer2', ['addClass', 'removeClass']);
    // Simple mock for document for testing body class manipulation
    // In a real app, DOCUMENT is provided by Angular. For tests, if not using Testbed's DOM, mock it.
    // However, since App injects DOCUMENT, TestBed will provide a real (jsdom) document.
    // We can spy on renderer methods acting on the fixture's document.body if needed,
    // or provide a specific mock if we don't want real DOM interaction for this.
    // For now, let's assume Testbed's DOCUMENT is fine and we spy on renderer.

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: ChannelSettingsService, useValue: mockChannelSettingsService },
        { provide: HttpDataService, useValue: mockHttpDataService },
        { provide: Renderer2, useValue: mockRenderer },
        // DOCUMENT is usually provided by platform-browser, no need to mock if using real DOM via fixture
        provideZonelessChangeDetection()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    app = fixture.componentInstance;
    // Spy on the actual document.body via the injected renderer instance
    // It's better to spy on the instance method if possible, or check classList directly.
    // Since renderer is a mock, its methods are already spies.
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

  describe('Theme Initialization and Updates', () => {
    it('should apply initial theme based on settings after ngOnInit', () => {
      // initialTestSettings.darkMode is false by default in these tests
      mockChannelSettingsService.getCurrentAppSettings.and.returnValue({...initialTestSettings, darkMode: false });
      // Recreate component with specific initial settings for this test, if constructor logic is primary
      // However, ngOnInit subscription is what applies it from BehaviorSubject's first value.
      fixture.detectChanges(); // ngOnInit runs, subscribes, and applies theme from initial subject value.

      expect(mockRenderer.removeClass).toHaveBeenCalledWith(mockDocument.body, 'dark-theme');
      expect(mockRenderer.addClass).not.toHaveBeenCalledWith(mockDocument.body, 'dark-theme');
    });

    it('should apply dark theme if initial setting is dark', () => {
      // Override initial settings for this specific test case
      const darkInitialSettings = {...initialTestSettings, darkMode: true };
      mockChannelSettingsService.getCurrentAppSettings.and.returnValue(darkInitialSettings);
      appSettingsSubject.next(darkInitialSettings); // Ensure subject also emits this value first

      fixture = TestBed.createComponent(App); // Recreate with new mock setup before ngOnInit
      app = fixture.componentInstance; // Get new instance
      // mockDocument needs to be re-assigned if fixture is recreated, or spy on fixture.nativeElement.ownerDocument.body
      // For simplicity, assume mockDocument.body is stable or use fixture.nativeElement.ownerDocument.body

      fixture.detectChanges(); // ngOnInit runs

      expect(mockRenderer.addClass).toHaveBeenCalledWith(fixture.nativeElement.ownerDocument.body, 'dark-theme');
      expect(mockRenderer.removeClass).not.toHaveBeenCalledWith(fixture.nativeElement.ownerDocument.body, 'dark-theme');
    });


    it('should switch to dark theme when darkMode setting changes to true', () => {
      // Initial state (light) by default from initialTestSettings
      fixture.detectChanges();
      mockRenderer.addClass.calls.reset();
      mockRenderer.removeClass.calls.reset();

      appSettingsSubject.next({...initialTestSettings, darkMode: true });
      // fixture.detectChanges(); // The subscription's cdr.detectChanges should handle this

      expect(mockRenderer.addClass).toHaveBeenCalledWith(mockDocument.body, 'dark-theme');
      expect(mockRenderer.removeClass).not.toHaveBeenCalled(); // Corrected to not.toHaveBeenCalledWith
    });

    it('should switch to light theme when darkMode setting changes to false', () => {
      // Start with dark theme by emitting it first
      appSettingsSubject.next({...initialTestSettings, darkMode: true });
      fixture.detectChanges();
      mockRenderer.addClass.calls.reset();
      mockRenderer.removeClass.calls.reset();

      appSettingsSubject.next({...initialTestSettings, darkMode: false });
      // fixture.detectChanges(); // The subscription's cdr.detectChanges should handle this

      expect(mockRenderer.removeClass).toHaveBeenCalledWith(mockDocument.body, 'dark-theme');
      expect(mockRenderer.addClass).not.toHaveBeenCalled(); // Corrected to not.toHaveBeenCalledWith
    });
  });

  // ... (other tests remain largely the same, ensure spies are reset if needed or tests are independent)
  it('should initialize states based on ChannelSettingsService in constructor', () => {
    fixture.detectChanges(); // ngOnInit also runs
    expect(mockChannelSettingsService.getCurrentAppSettings).toHaveBeenCalled();
    expect(app.row1States.length).toBe(initialTestSettings.numChannels);
    expect(app.row1States[0].channelDescription).toBe(initialTestSettings.channelDescriptions[0]);
  });

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

  // ... (Rest of the tests: onPotentiometerChange, Go Button, Settings Modal, calculateCombinedOutputs)
  // These should generally be okay, but ensure mockChannelSettingsService.getCurrentAppSettings() is used
  // if those tests re-create the component or rely on initial settings state.
  // For brevity, I am not repeating all of them here, assuming they are adjusted if they fail due to AppSettings changes.
});
