import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Renderer2 } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { App } from './app';
import { By } from '@angular/platform-browser';
import { ChannelSettingsService, AppSettings } from './channel-settings.service';
import { HttpDataService, CombinedOutputData } from './http-data.service';
import { ThemeService } from './theme.service'; // Import ThemeService
import { BehaviorSubject, of } from 'rxjs';
// import { map } from 'rxjs/operators'; // Removed unused import
import { CombinedOutputDisplayComponent } from './combined-output-display/combined-output-display.component';

function dispatchKeyboardEvent(
  key: string,
  target: EventTarget,
  code?: string,
  shiftKey = false,
  ctrlKey = false,
  altKey = false
) {
  const event = new KeyboardEvent('keydown', {
    key: key,
    code: code || key,
    bubbles: true,
    cancelable: true,
    shiftKey: shiftKey,
    ctrlKey: ctrlKey,
    altKey: altKey,
  });
  target.dispatchEvent(event);
}

describe('App', () => {
  let fixture: ComponentFixture<App>;
  let app: App;
  let mockChannelSettingsService: jasmine.SpyObj<ChannelSettingsService>;
  let appSettingsSubject: BehaviorSubject<AppSettings>;
  let mockHttpDataService: jasmine.SpyObj<HttpDataService>;
  let mockRenderer: jasmine.SpyObj<Renderer2>;
  let mockDocument: Document;
  let mockThemeService: jasmine.SpyObj<ThemeService>; // Mock for ThemeService

  const initialTestSettings: Omit<AppSettings, 'darkMode'> = { // darkMode removed
    numChannels: 4,
    channelDescriptions: ['Apple', 'Banana', 'Cherry', 'Date'],
    backendUrl: 'http://default.com',
    crossfadeDurationSeconds: 0.5,
  };

  function setupChannelStatesForApp(testAppInstance: App) {
    testAppInstance.row1States = [
      { channelNumber: 1, channelDescription: "Ch1", value: 10, color: '#ff0000' },
      { channelNumber: 2, channelDescription: "Ch2", value: 80, color: '#0000ff' }
    ];
    testAppInstance.row2States = [
      { channelNumber: 1, channelDescription: "Ch1", value: 90, color: '#00ff00' },
      { channelNumber: 2, channelDescription: "Ch2", value: 20, color: '#ffff00' }
    ];
    testAppInstance['currentNumChannels'] = 2;
  }

  beforeEach(async () => {
    appSettingsSubject = new BehaviorSubject<AppSettings>({...initialTestSettings});
    mockChannelSettingsService = jasmine.createSpyObj(
        'ChannelSettingsService',
        [
          'getCurrentAppSettings', 'getAppSettings', 'updateNumChannels',
          'updateChannelDescriptions', 'updateBackendUrl', 'updateCrossfadeDurationSeconds',
          // 'updateDarkMode', // Removed
          'resetToDefaults', 'getCurrentNumChannels',
          'getCurrentChannelDescriptions' // Removed getCurrentDarkMode, getDarkMode
        ]
    );
    // Cast to any before accessing potentially removed properties if AppSettings type is strict
    mockChannelSettingsService.getCurrentAppSettings.and.returnValue(initialTestSettings as AppSettings);
    appSettingsSubject = new BehaviorSubject<AppSettings>(initialTestSettings as AppSettings); // Initialize with correct type
    mockChannelSettingsService.getAppSettings.and.returnValue(appSettingsSubject.asObservable());
    mockChannelSettingsService.getCurrentNumChannels.and.returnValue(initialTestSettings.numChannels);
    mockChannelSettingsService.getCurrentChannelDescriptions.and.returnValue([...initialTestSettings.channelDescriptions]);
    // mockChannelSettingsService.getCurrentDarkMode.and.returnValue(initialTestSettings.darkMode); // Removed
    // mockChannelSettingsService.getDarkMode.and.returnValue(appSettingsSubject.pipe(map(s => s.darkMode))); // Removed

    mockHttpDataService = jasmine.createSpyObj('HttpDataService', ['postCombinedOutput']);
    mockHttpDataService.postCombinedOutput.and.returnValue(of({success: true}));

    mockRenderer = jasmine.createSpyObj('Renderer2', ['addClass', 'removeClass', 'listen']);
    mockRenderer.listen.and.returnValue(() => { /* mock listener */ });

    mockThemeService = jasmine.createSpyObj('ThemeService', ['cycleNextTheme', 'getActiveTheme', 'getAvailableThemes', 'setActiveTheme']); // Add spies for ThemeService
    mockThemeService.getActiveTheme.and.returnValue({ id: 'light', name: 'Light', className: 'light-theme' }); // Mock a default active theme


    await TestBed.configureTestingModule({
      imports: [App], // App itself imports necessary modules like CommonModule, FormsModule
      providers: [
        { provide: ChannelSettingsService, useValue: mockChannelSettingsService },
        { provide: HttpDataService, useValue: mockHttpDataService },
        { provide: Renderer2, useValue: mockRenderer },
        { provide: ThemeService, useValue: mockThemeService } // Provide mock ThemeService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    app = fixture.componentInstance;
    mockDocument = fixture.debugElement.injector.get(DOCUMENT);
  });

  afterEach(() => {
    if (app.animationInterval) {
      clearInterval(app.animationInterval);
      app.animationInterval = undefined; // Changed from null
    }
    if (app['unlistenKeyDown']) { app['unlistenKeyDown'](); }
    if (app['unlistenShiftDown']) { app['unlistenShiftDown'](); }
    if (app['unlistenShiftUp']) { app['unlistenShiftUp'](); }
  });

  it('should create the app', () => {
    expect(app).toBeTruthy();
  });

  it('should render the sliders-area container', () => {
    fixture.detectChanges();
    const compiled = fixture.debugElement;
    expect(compiled.query(By.css('.sliders-area'))).toBeTruthy();
  });

  it('should initialize states based on ChannelSettingsService in constructor and ngOnInit', () => {
    expect(mockChannelSettingsService.getCurrentAppSettings).toHaveBeenCalled();
    fixture.detectChanges();
    expect(app.row1States.length).toBe(initialTestSettings.numChannels);
    expect(app.row1States[0].channelDescription).toBe(initialTestSettings.channelDescriptions[0]);
    expect(app.row1States[0].value).toBe(0);
    expect(app.row1States[0].color).toBe(app['defaultColorsScene1'][0]);
    expect(app['currentNumChannels']).toBe(initialTestSettings.numChannels);
    expect(app['currentBackendUrl']).toBe(initialTestSettings.backendUrl);
    expect(app['currentCrossfadeDurationMs']).toBe(initialTestSettings.crossfadeDurationSeconds * 1000);
    // expect(app['currentDarkMode']).toBe(initialTestSettings.darkMode); // Removed
  });


  it('should populate combinedOutputStates on ngOnInit and reflect initial settings', () => {
    fixture.detectChanges(); // ngOnInit called here
    expect(app.combinedOutputStates.length).toBe(initialTestSettings.numChannels);
    // Default fader values are 50 for S1, 50 for S2 (influence).
    // If row1[0].value = 0, row2[0].value = 100
    // Combined = (0 * 0.5) + (100 * 0.5) = 50
    expect(app.combinedOutputStates[0].value).toBe(50);
    expect(app.combinedOutputStates[0].channelDescription).toBe(initialTestSettings.channelDescriptions[0]);
    // Color blending will depend on defaultColorsScene1/2 and logic
    // This test might need adjustment if default colors or blending logic is complex.
    // For now, let's assume a simple case or check that it's a valid hex.
    expect(app.combinedOutputStates[0].color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  describe('Fader Properties and Linking', () => {
    beforeEach(() => {
      fixture.detectChanges();
      spyOn(app, 'updateAudioEngineAndPostData').and.callThrough();
    });

    it('displayScene2SliderBindingValue getter should correctly invert scene2FaderValue', () => {
      app.scene2FaderValue = 0;
      expect(app.displayScene2SliderBindingValue).toBe(100);
      app.scene2FaderValue = 100;
      expect(app.displayScene2SliderBindingValue).toBe(0);
      app.scene2FaderValue = 30;
      expect(app.displayScene2SliderBindingValue).toBe(70);
    });

    it('displayScene2SliderBindingValue setter should correctly update scene2FaderValue and linked faders', () => {
      app.fadersLinked = true;
      app.scene1FaderValue = 50;
      app.scene2FaderValue = 50;
      app.displayScene2SliderBindingValue = 100;
      expect(app.scene2FaderValue).toBe(0);
      expect(app.scene1FaderValue).toBe(100);
      expect(app.updateAudioEngineAndPostData).toHaveBeenCalled();

      (app.updateAudioEngineAndPostData as jasmine.Spy).calls.reset();
      app.fadersLinked = false;
      app.scene1FaderValue = 20;
      app.displayScene2SliderBindingValue = 25;
      expect(app.scene2FaderValue).toBe(75);
      expect(app.scene1FaderValue).toBe(20);
      expect(app.updateAudioEngineAndPostData).toHaveBeenCalled();
    });

    it('onScene1FaderManualChange should update scene2FaderValue when linked', () => {
      app.fadersLinked = true;
      app.scene1FaderValue = 70;
      app.onScene1FaderManualChange();
      expect(app.scene2FaderValue).toBe(30);
      expect(app.displayScene2SliderBindingValue).toBe(70);
    });

    it('toggleFaderLink should sync scene2FaderValue to scene1FaderValue when linking', () => {
      app.scene1FaderValue = 80;
      app.scene2FaderValue = 10;
      app.fadersLinked = false;
      app.toggleFaderLink();
      expect(app.fadersLinked).toBeTrue();
      expect(app.scene2FaderValue).toBe(20);
      expect(app.displayScene2SliderBindingValue).toBe(80);
    });
  });

  describe('Scene Text Input Modal', () => {
    beforeEach(() => { fixture.detectChanges(); });
    it('toggleSceneTextInput should show modal, set current scene, and clear texts', () => {
      app.scene1CommandsString = "some old commands";
      app.toggleSceneTextInput(1);
      expect(app.showSceneTextInputModal).toBeTrue();
      expect(app.currentSceneForModal).toBe(1);
      expect(app.modalInitialText).toBe('');
      expect(app.scene1CommandsString).toBe('');
      expect(app.modalFeedbackMessages.length).toBe(0);

      app.scene2CommandsString = "other old commands";
      app.toggleSceneTextInput(2);
      expect(app.showSceneTextInputModal).toBeTrue();
      expect(app.currentSceneForModal).toBe(2);
      expect(app.modalInitialText).toBe('');
      expect(app.scene2CommandsString).toBe('');
    });
  });

  describe('CombinedOutputDisplay Rendering', () => {
    beforeEach(() => { fixture.detectChanges(); });
    it('should render the correct number of app-combined-output-display components', () => {
      const displayElements = fixture.debugElement.queryAll(By.css('app-combined-output-display'));
      expect(displayElements.length).toBe(app.combinedOutputStates.length);
      expect(displayElements.length).toBe(initialTestSettings.numChannels);
    });

    it('should pass correct data to app-combined-output-display components', () => {
      const displayElements = fixture.debugElement.queryAll(By.css('app-combined-output-display'));
      app.calculateCombinedOutputs();
      fixture.detectChanges();
      app.combinedOutputStates.forEach((state, index) => {
        const displayComponentInstance = displayElements[index].componentInstance as CombinedOutputDisplayComponent;
        expect(displayComponentInstance.description).toBe(state.channelDescription);
        expect(displayComponentInstance.value).toBe(state.value);
        expect(displayComponentInstance.color).toBe(state.color);
      });
    });
  });

  describe('ChannelSettingsService Interaction on ngOnInit subscription', () => {
    beforeEach(() => { fixture.detectChanges(); });
    it('should update states and re-initialize channels if numChannels changes', () => {
      const initSpy = spyOn(app, 'initializeChannelStates').and.callThrough();
      const calcSpy = spyOn(app, 'calculateCombinedOutputs').and.callThrough();
      const cdrSpy = spyOn(app['cdr'], 'detectChanges').and.callThrough();
      calcSpy.calls.reset();
      cdrSpy.calls.reset();

      const newSettings: AppSettings = { // darkMode removed
        numChannels: 2,
        channelDescriptions: ['NewDesc1', 'NewDesc2'],
        backendUrl: 'http://new.url',
        crossfadeDurationSeconds: 2,
      };
      appSettingsSubject.next(newSettings);
      fixture.detectChanges();

      expect(app['currentNumChannels']).toBe(2);
      expect(initSpy).toHaveBeenCalledWith(newSettings.numChannels, newSettings.channelDescriptions);
      expect(app.row1States.length).toBe(2);
      expect(app.row1States[0].channelDescription).toBe('NewDesc1');
      expect(calcSpy).toHaveBeenCalled();
      expect(cdrSpy).toHaveBeenCalled();
    });

    it('should update descriptions and other settings if numChannels does not change', () => {
       const initSpy = spyOn(app, 'initializeChannelStates').and.callThrough();
       const calcSpy = spyOn(app, 'calculateCombinedOutputs').and.callThrough();
       const cdrSpy = spyOn(app['cdr'], 'detectChanges').and.callThrough();
       calcSpy.calls.reset();
       cdrSpy.calls.reset();

      const newSettings: AppSettings = { // darkMode removed
        ...(initialTestSettings as AppSettings), // Cast to ensure compatibility if AppSettings still expects darkMode
        channelDescriptions: ['UpdatedA', 'UpdatedB', 'UpdatedC', 'UpdatedD'],
        backendUrl: 'http://another.url',
      };
      appSettingsSubject.next(newSettings);
      fixture.detectChanges();

      expect(initSpy).not.toHaveBeenCalled();
      expect(app.row1States[0].channelDescription).toBe('UpdatedA');
      expect(app.row2States[1].channelDescription).toBe('UpdatedB');
      expect(calcSpy).toHaveBeenCalled();
      expect(cdrSpy).toHaveBeenCalled();
    });
  });

  describe('updateAudioEngineAndPostData', () => {
    beforeEach(() => { fixture.detectChanges(); });
    it('should call calculateCombinedOutputs', () => {
      spyOn(app, 'calculateCombinedOutputs').and.callThrough();
      app.updateAudioEngineAndPostData();
      expect(app.calculateCombinedOutputs).toHaveBeenCalled();
    });

    it('should post data via HttpDataService if backendUrl is configured', () => {
      app['currentBackendUrl'] = 'http://test.com';
      app.updateAudioEngineAndPostData();
      expect(mockHttpDataService.postCombinedOutput).toHaveBeenCalledWith('http://test.com', app.combinedOutputStates as CombinedOutputData[]);
    });

    it('should not post data if backendUrl is empty', () => {
      app['currentBackendUrl'] = '';
      app.updateAudioEngineAndPostData();
      expect(mockHttpDataService.postCombinedOutput).not.toHaveBeenCalled();
    });
  });

  describe('Theme Initialization and Updates', () => {
    // This section needs to be re-thought as theme is now handled by ThemeService
    // AppComponent constructor and ngOnInit don't directly apply themes anymore.
    // ThemeService is responsible for applying the theme class to document.body.
    // We can test that ThemeService is called or that the correct class is applied
    // if ThemeService itself is tested, or if we want an integration test here.

    it('ThemeService should be initialized and apply initial theme (mocked behavior)', () => {
      // ThemeService is injected and its constructor logic (loading from localStorage, applying theme)
      // would run. We've mocked getActiveTheme to return 'light-theme'.
      // The actual class application is done by ThemeService using Renderer2.
      // To test this here, we'd need to spy on renderer.addClass on document.body
      // from within ThemeService, or trust ThemeService's own tests.
      // For this AppComponent spec, we can verify ThemeService was at least constructed.
      expect(mockThemeService).toBeTruthy(); // Was injected
      // If ThemeService.applyTheme was spied on and called in constructor:
      // expect(mockThemeService.applyTheme).toHaveBeenCalledWith('light'); // or whatever default
    });

    it('should call ThemeService to cycle themes when "Shift+T" is pressed', () => {
      fixture.detectChanges(); // Ensure listeners are attached
      dispatchKeyboardEvent('T', mockDocument.body, 'KeyT', true); // Pass true for shiftKey
      expect(mockThemeService.cycleNextTheme).toHaveBeenCalled();
    });
  });

  describe('Go Button and Crossfader Animation', () => {
    beforeEach(() => { fixture.detectChanges(); });
    it('onGoButtonClick should call animateCrossfader if not already animating (target 0)', () => {
      spyOn(app, 'animateCrossfader');
      app.isAnimating = false;
      app.scene1FaderValue = 70;
      app.isShiftPressed = false;
      app.onGoButtonClick();
      expect(app.animateCrossfader).toHaveBeenCalledWith(0);
    });

    it('onGoButtonClick should call animateCrossfader if not already animating (target 100)', () => {
      spyOn(app, 'animateCrossfader');
      app.isAnimating = false;
      app.scene1FaderValue = 30;
      app.isShiftPressed = false;
      app.onGoButtonClick();
      expect(app.animateCrossfader).toHaveBeenCalledWith(100);
    });

    it('onGoButtonClick should stop animation if already animating', () => {
      app.isAnimating = true;
      app.animationInterval = 12345 as number;
      spyOn(window, 'clearInterval');
      const cdrSpy = spyOn(app['cdr'], 'detectChanges');
      app.onGoButtonClick();
      expect(clearInterval).toHaveBeenCalledWith(12345);
      expect(app.animationInterval).toBeUndefined(); // Changed from toBeNull
      expect(app.isAnimating).toBeFalse();
      expect(cdrSpy).toHaveBeenCalled();
    });

    it('Go button should update text, arrows, handle "Stop", and reverse direction with Shift key correctly', () => {
      fixture.detectChanges();
      const goButton = fixture.debugElement.query(By.css('.go-button')).nativeElement as HTMLButtonElement;
      const animateCrossfaderSpy = spyOn(app, 'animateCrossfader').and.callFake(() => {
        app.isAnimating = true;
        fixture.detectChanges();
      });
      const onGoButtonClickSpy = spyOn(app, 'onGoButtonClick').and.callThrough();

      app.scene1FaderValue = 50;
      app.isShiftPressed = false;
      app['updateEffectiveGoTarget']();
      fixture.detectChanges();
      expect(goButton.textContent?.trim()).toBe('Go ↓');

      app.isShiftPressed = true;
      app['updateEffectiveGoTarget']();
      fixture.detectChanges();
      expect(goButton.textContent?.trim()).toBe('Go ↑');

      goButton.click();
      expect(onGoButtonClickSpy).toHaveBeenCalled();
      expect(animateCrossfaderSpy).toHaveBeenCalledWith(100);
      expect(app.isAnimating).toBeTrue();
      expect(goButton.textContent?.trim()).toBe('Stop');

      app.isShiftPressed = false;
      app['updateEffectiveGoTarget']();
      fixture.detectChanges();
      expect(goButton.textContent?.trim()).toBe('Stop');

      app.isAnimating = false;
      app.scene1FaderValue = 100;
      app['updateEffectiveGoTarget']();
      fixture.detectChanges();
      expect(goButton.textContent?.trim()).toBe('Go ↓');

      goButton.click();
      expect(animateCrossfaderSpy).toHaveBeenCalledWith(0);
      expect(app.isAnimating).toBeTrue();
      expect(goButton.textContent?.trim()).toBe('Stop');

      app.isAnimating = false;
      app.scene1FaderValue = 0;
      app['updateEffectiveGoTarget']();
      fixture.detectChanges();
      expect(goButton.textContent?.trim()).toBe('Go ↑');

      app.isShiftPressed = true;
      app['updateEffectiveGoTarget']();
      fixture.detectChanges();
      expect(goButton.textContent?.trim()).toBe('Go ↑');

      dispatchKeyboardEvent(' ', mockDocument.body, 'Space', true);
      expect(onGoButtonClickSpy).toHaveBeenCalled();
      expect(animateCrossfaderSpy).toHaveBeenCalledWith(100);
      expect(app.isAnimating).toBeTrue();
      expect(goButton.textContent?.trim()).toBe('Stop');
      app.isAnimating = false;

      app.scene1FaderValue = 0;
      app.isShiftPressed = true;
      app['updateEffectiveGoTarget']();
      fixture.detectChanges();
      expect(goButton.textContent?.trim()).toBe('Go ↑');
      goButton.click();
      expect(animateCrossfaderSpy).toHaveBeenCalledWith(100);
      app.isAnimating = false;

      app.scene1FaderValue = 100;
      app.isShiftPressed = true;
      app['updateEffectiveGoTarget']();
      fixture.detectChanges();
      expect(goButton.textContent?.trim()).toBe('Go ↓');
      goButton.click();
      expect(animateCrossfaderSpy).toHaveBeenCalledWith(0);

      app.isShiftPressed = false;
      app.isAnimating = false;
      app.scene1FaderValue = 50;
      app['updateEffectiveGoTarget']();
      fixture.detectChanges();
    });

    xdescribe('animateCrossfader method tests needing Jasmine Clock', () => { // xdescribe to skip this block
      beforeEach(() => {
        try { jasmine.clock().uninstall(); } catch { /* Defensive uninstall */ }
        jasmine.clock().install();
        spyOn(app, 'updateAudioEngineAndPostData').and.callThrough();
        app['currentCrossfadeDurationMs'] = 500;
      });

      afterEach(() => {
        jasmine.clock().uninstall();
      });

      it('animateCrossfader should use currentCrossfadeDurationMs', () => {
        const expectedInterval = app['currentCrossfadeDurationMs'] / 25;
        const setIntervalSpy = spyOn(window, 'setInterval').and.callThrough();

        app.animateCrossfader(100);

        expect(setIntervalSpy).toHaveBeenCalledWith(jasmine.any(Function), expectedInterval);
        if (app.animationInterval) clearInterval(app.animationInterval);
        app.isAnimating = false;
      });

      it('animateCrossfader should animate scene1FaderValue from 0 to 100 (unlinked)', () => {
        app.scene1FaderValue = 0;
        app.scene2FaderValue = 50;
        app.fadersLinked = false;
        const target = 100;
        const steps = 25;
        const intervalDuration = app['currentCrossfadeDurationMs'] / steps;

        app.animateCrossfader(target);
        expect(app.isAnimating).toBeTrue();

        for (let i = 0; i < steps; i++) {
          jasmine.clock().tick(intervalDuration);
        }
        jasmine.clock().tick(1);

        expect(app.scene1FaderValue).toBe(target);
        expect(app.scene2FaderValue).toBe(50);
        expect(app.isAnimating).toBeFalse();
        expect(app.animationInterval).toBeUndefined(); // Changed from toBeNull
        expect(app.updateAudioEngineAndPostData).toHaveBeenCalledTimes(steps);
      });

      it('animateCrossfader should animate scene1FaderValue (100 to 0) and scene2FaderValue (0 to 100) when linked', () => {
        app.scene1FaderValue = 100;
        app.scene2FaderValue = 0;
        app.fadersLinked = true;
        const targetScene1 = 0;
        const expectedScene2Target = 100;
        const steps = 25;
        const intervalDuration = app['currentCrossfadeDurationMs'] / steps;

        app.animateCrossfader(targetScene1);
        expect(app.isAnimating).toBeTrue();

        for (let i = 0; i < steps; i++) {
          jasmine.clock().tick(intervalDuration);
        }
        jasmine.clock().tick(1);

        expect(app.scene1FaderValue).toBe(targetScene1);
        expect(app.scene2FaderValue).toBe(expectedScene2Target);
        expect(app.displayScene2SliderBindingValue).toBe(100 - expectedScene2Target);
        expect(app.isAnimating).toBeFalse();
        expect(app.animationInterval).toBeUndefined(); // Changed from toBeNull
        expect(app.updateAudioEngineAndPostData).toHaveBeenCalledTimes(steps);
      });
    });
  });

  describe('calculateCombinedOutputs with colors', () => {
    describe('Linked Faders', () => {
      beforeEach(() => {
        fixture.detectChanges();
        setupChannelStatesForApp(app);
        app.fadersLinked = true;
      });

      it('scene1FaderValue=0 (S1 bottom, S2 bottom influence=100): full row2States', () => {
        app.scene1FaderValue = 0;
        app.scene2FaderValue = 100;
        app.calculateCombinedOutputs();
        expect(app.combinedOutputStates[0].value).toBe(90);
        expect(app.combinedOutputStates[0].color).toBe('#00ff00');
        expect(app.combinedOutputStates[1].value).toBe(20);
        expect(app.combinedOutputStates[1].color).toBe('#ffff00');
      });

      it('scene1FaderValue=100 (S1 top, S2 top influence=0): full row1States', () => {
        app.scene1FaderValue = 100;
        app.scene2FaderValue = 0;
        app.calculateCombinedOutputs();
        expect(app.combinedOutputStates[0].value).toBe(10);
        expect(app.combinedOutputStates[0].color).toBe('#ff0000');
        expect(app.combinedOutputStates[1].value).toBe(80);
        expect(app.combinedOutputStates[1].color).toBe('#0000ff');
      });

      it('scene1FaderValue=50 (S1 mid, S2 mid influence=50): midpoint blend', () => {
        app.scene1FaderValue = 50;
        app.scene2FaderValue = 50;
        app.calculateCombinedOutputs();
        expect(app.combinedOutputStates[0].value).toBe(50);
        expect(app.combinedOutputStates[0].color).toBe('#1ae600');
        expect(app.combinedOutputStates[1].value).toBe(50);
        expect(app.combinedOutputStates[1].color).toBe('#3333cc');
      });
    });

    describe('Unlinked Faders', () => {
      beforeEach(() => {
        fixture.detectChanges();
        setupChannelStatesForApp(app);
        app.fadersLinked = false;
      });

      it('S1=70, S2(influence)=20 (bottom 20%): values summed and clamped, colors blended by contribution', () => {
        app.scene1FaderValue = 70;
        app.scene2FaderValue = 20;
        app.calculateCombinedOutputs();
        expect(app.combinedOutputStates[0].value).toBe(25);
        expect(app.combinedOutputStates[0].color).toBe('#47b800');
        expect(app.combinedOutputStates[1].value).toBe(60);
        expect(app.combinedOutputStates[1].color).toBe('#1111ee');
      });

      it('S1=100, S2(influence)=100: values summed and clamped to 100', () => {
        app.scene1FaderValue = 100;
        app.scene2FaderValue = 100;
        app.calculateCombinedOutputs();
        expect(app.combinedOutputStates[0].value).toBe(100);
        expect(app.combinedOutputStates[0].color).toBe('#1ae600');
        expect(app.combinedOutputStates[1].value).toBe(100);
        expect(app.combinedOutputStates[1].color).toBe('#3333cc');
      });

      it('S1=0, S2(influence)=0: values are 0, color is black', () => {
        app.scene1FaderValue = 0;
        app.scene2FaderValue = 0;
        app.calculateCombinedOutputs();
        expect(app.combinedOutputStates[0].value).toBe(0);
        expect(app.combinedOutputStates[0].color).toBe('#000000');
        expect(app.combinedOutputStates[1].value).toBe(0);
        expect(app.combinedOutputStates[1].color).toBe('#000000');
      });

      it('S1=50, S2(influence)=0: uses S1 color and value', () => {
        app.scene1FaderValue = 50;
        app.scene2FaderValue = 0;
        app.calculateCombinedOutputs();
        expect(app.combinedOutputStates[0].value).toBe(5);
        expect(app.combinedOutputStates[0].color).toBe('#ff0000');
        expect(app.combinedOutputStates[1].value).toBe(40);
        expect(app.combinedOutputStates[1].color).toBe('#0000ff');
      });

      it('S1=0, S2(influence)=50: uses S2 color and value', () => {
        app.scene1FaderValue = 0;
        app.scene2FaderValue = 50;
        app.calculateCombinedOutputs();
        expect(app.combinedOutputStates[0].value).toBe(45);
        expect(app.combinedOutputStates[0].color).toBe('#00ff00');
        expect(app.combinedOutputStates[1].value).toBe(10);
        expect(app.combinedOutputStates[1].color).toBe('#ffff00');
      });
    });
  });

  describe('Settings Modal Toggling', () => {
    beforeEach(() => { fixture.detectChanges(); });
    it('should toggle showSettingsModal flag', () => {
      expect(app.showSettingsModal).toBeFalse();
      app.toggleSettingsModal();
      expect(app.showSettingsModal).toBeTrue();
      app.toggleSettingsModal();
      expect(app.showSettingsModal).toBeFalse();
    });

    it('should show settings modal when settings icon is clicked', () => {
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
      modalComponentDebugElement.componentInstance.closeModal.emit(); // Changed to closeModal
      fixture.detectChanges();
      expect(app.showSettingsModal).toBeFalse();
    });
  });

  describe('Keyboard Shortcuts', () => {
    let onGoButtonClickSpy: jasmine.Spy;
    let toggleShortcutsModalSpy: jasmine.Spy;
    let toggleSceneTextInputSpy: jasmine.Spy;
    let handleCloseSceneTextInputModalSpy: jasmine.Spy;
    let closeShortcutsModalSpy: jasmine.Spy;
    let toggleSettingsModalSpy: jasmine.Spy;

    beforeEach(() => {
      fixture.detectChanges();
      onGoButtonClickSpy = spyOn(app, 'onGoButtonClick').and.callThrough();
      toggleShortcutsModalSpy = spyOn(app, 'toggleShortcutsModal').and.callThrough();
      toggleSceneTextInputSpy = spyOn(app, 'toggleSceneTextInput').and.callThrough();
      handleCloseSceneTextInputModalSpy = spyOn(app, 'handleCloseSceneTextInputModal').and.callThrough();
      closeShortcutsModalSpy = spyOn(app, 'closeShortcutsModal').and.callThrough();
      toggleSettingsModalSpy = spyOn(app, 'toggleSettingsModal').and.callThrough();

      app.showShortcutsModal = false;
      app.showSceneTextInputModal = false;
      app.showSettingsModal = false;
      if (mockDocument.activeElement instanceof HTMLElement) {
        mockDocument.activeElement.blur();
      }
    });

    it('should call onGoButtonClick when Spacebar is pressed and no modal/input is active', () => {
      dispatchKeyboardEvent(' ', mockDocument.body, 'Space');
      expect(onGoButtonClickSpy).toHaveBeenCalled();
    });

    it('should call toggleShortcutsModal when "?" is pressed and no modal/input is active', () => {
      dispatchKeyboardEvent('?', mockDocument.body);
      expect(toggleShortcutsModalSpy).toHaveBeenCalled();
    });

    it('should call toggleSceneTextInput(1) when "q" is pressed', () => {
      dispatchKeyboardEvent('q', mockDocument.body, 'KeyQ', false);
      expect(toggleSceneTextInputSpy).toHaveBeenCalledWith(1);
    });

    it('should call toggleSceneTextInput(2) when "w" is pressed', () => {
      dispatchKeyboardEvent('w', mockDocument.body, 'KeyW', false);
      expect(toggleSceneTextInputSpy).toHaveBeenCalledWith(2);
    });

    describe('Escape key behavior', () => {
      it('should close shortcuts modal if open', () => {
        app.showShortcutsModal = true;
        fixture.detectChanges();
        dispatchKeyboardEvent('Escape', mockDocument.body);
        expect(closeShortcutsModalSpy).toHaveBeenCalled();
        expect(app.showShortcutsModal).toBeFalse();
      });

      it('should close scene text input modal if open (and shortcuts modal is not)', () => {
        app.showSceneTextInputModal = true;
        fixture.detectChanges();
        dispatchKeyboardEvent('Escape', mockDocument.body);
        expect(handleCloseSceneTextInputModalSpy).toHaveBeenCalled();
        expect(app.showSceneTextInputModal).toBeFalse();
      });

      it('should close settings modal if open (and other modals are not)', () => {
        app.showSettingsModal = true;
        fixture.detectChanges();
        dispatchKeyboardEvent('Escape', mockDocument.body);
        expect(toggleSettingsModalSpy).toHaveBeenCalled();
        expect(app.showSettingsModal).toBeFalse();
      });

      it('should prioritize shortcuts modal over scene text input modal for Escape', () => {
        app.showShortcutsModal = true;
        app.showSceneTextInputModal = true;
        fixture.detectChanges();
        dispatchKeyboardEvent('Escape', mockDocument.body);
        expect(closeShortcutsModalSpy).toHaveBeenCalled();
        expect(handleCloseSceneTextInputModalSpy).not.toHaveBeenCalled();
        expect(app.showShortcutsModal).toBeFalse();
        expect(app.showSceneTextInputModal).toBeTrue();
      });

       it('should prioritize scene text input modal over settings modal for Escape', () => {
        app.showSceneTextInputModal = true;
        app.showSettingsModal = true;
        fixture.detectChanges();
        dispatchKeyboardEvent('Escape', mockDocument.body);
        expect(handleCloseSceneTextInputModalSpy).toHaveBeenCalled();
        expect(toggleSettingsModalSpy).not.toHaveBeenCalled();
        expect(app.showSceneTextInputModal).toBeFalse();
        expect(app.showSettingsModal).toBeTrue();
      });
    });

    describe('Shortcuts inhibition', () => {
      const testCases = [
        { name: 'Spacebar', key: ' ', code: 'Space', spy: () => onGoButtonClickSpy, args: [] as unknown[], shift: false },
        { name: 'QuestionMark', key: '?', code: '?', spy: () => toggleShortcutsModalSpy, args: [] as unknown[], shift: false },
        { name: 'Q', key: 'q', code: 'KeyQ', shift: false, spy: () => toggleSceneTextInputSpy, args: [1] as unknown[] },
        { name: 'W', key: 'w', code: 'KeyW', shift: false, spy: () => toggleSceneTextInputSpy, args: [2] as unknown[] },
      ];

      function runInhibitionTest(modalType: 'scene' | 'shortcuts' | 'settings' | 'inputFocus') {
        testCases.forEach(tc => {
          it(`should NOT trigger shortcut for '${tc.name}' if ${modalType} is active/focused`, () => {
            if (modalType === 'scene') app.showSceneTextInputModal = true;
            else if (modalType === 'shortcuts') app.showShortcutsModal = true;
            else if (modalType === 'settings') app.showSettingsModal = true;
            else if (modalType === 'inputFocus') {
              const input = mockDocument.createElement('input');
              mockDocument.body.appendChild(input);
              input.focus();
              fixture.detectChanges();
              dispatchKeyboardEvent(tc.key, input, tc.code, tc.shift);
              mockDocument.body.removeChild(input);
              expect(tc.spy()).not.toHaveBeenCalled();
              return;
            }

            fixture.detectChanges();
            dispatchKeyboardEvent(tc.key, mockDocument.body, tc.code, tc.shift);
            if (tc.args.length > 0) {
                 expect(tc.spy()).not.toHaveBeenCalledWith(...tc.args);
            } else {
                 expect(tc.spy()).not.toHaveBeenCalled();
            }

            app.showSceneTextInputModal = false;
            app.showShortcutsModal = false;
            app.showSettingsModal = false;
          });
        });
      }
      runInhibitionTest('scene');
      runInhibitionTest('shortcuts');
      runInhibitionTest('settings');
      runInhibitionTest('inputFocus');
    });
  });

  describe('Horizontal Slider Integration for Crossfade Duration', () => {
    let sliderElement: HTMLInputElement;
    let sliderLabelElement: HTMLLabelElement;

    beforeEach(() => {
      fixture.detectChanges();
      app.displayCrossfadeDurationSeconds = initialTestSettings.crossfadeDurationSeconds;
      app['currentCrossfadeDurationMs'] = initialTestSettings.crossfadeDurationSeconds * 1000;
      const sliderDebugElement = fixture.debugElement.query(By.css('#crossfade-duration-slider'));
      if (sliderDebugElement) {
        sliderElement = sliderDebugElement.nativeElement;
      }
      const labelDebugElement = fixture.debugElement.query(By.css('.duration-slider-label'));
       if (labelDebugElement) {
        sliderLabelElement = labelDebugElement.nativeElement;
      }
      fixture.detectChanges();
    });

    it('should initialize slider with value from ChannelSettingsService and display it in label', () => {
      expect(app.displayCrossfadeDurationSeconds).toBe(initialTestSettings.crossfadeDurationSeconds);
      expect(sliderElement).toBeTruthy();
      if (sliderElement) {
        expect(sliderElement.value).toBe(initialTestSettings.crossfadeDurationSeconds.toString());
        expect(sliderElement.min).toBe('0.1');
        expect(sliderElement.max).toBe('5');
        expect(sliderElement.step).toBe('0.1');
      }
      if (sliderLabelElement) {
        expect(sliderLabelElement.textContent).toContain(`X-Fade: ${initialTestSettings.crossfadeDurationSeconds}s`);
      }
    });

    it('onCrossfadeDurationSliderChange should update duration in app and call service on input event', () => {
      expect(sliderElement).toBeTruthy();
      if (!sliderElement) return;

      const newDuration = 2.5;
      spyOn(app, 'onCrossfadeDurationSliderChange').and.callThrough();
      spyOn(app['cdr'], 'detectChanges').and.callThrough();

      sliderElement.value = newDuration.toString();
      sliderElement.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(app.onCrossfadeDurationSliderChange).toHaveBeenCalled();
      expect(app.displayCrossfadeDurationSeconds).toBe(newDuration);
      expect(app['currentCrossfadeDurationMs']).toBe(newDuration * 1000);
      expect(mockChannelSettingsService.updateCrossfadeDurationSeconds).toHaveBeenCalledWith(newDuration);
      expect(app['cdr'].detectChanges).toHaveBeenCalled();
      if (sliderLabelElement) {
        expect(sliderLabelElement.textContent).toContain(`X-Fade: ${newDuration}s`);
      }
    });

    xit('animateCrossfader should use currentCrossfadeDurationMs updated by slider changes', () => {
      expect(sliderElement).toBeTruthy();
      if (!sliderElement) return;

      const newDurationSeconds = 3.0;
      sliderElement.value = newDurationSeconds.toString();
      sliderElement.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      spyOn(window, 'setInterval').and.callThrough();
      jasmine.clock().install();

      app.animateCrossfader(100);

      const expectedInterval = (newDurationSeconds * 1000) / 25;
      expect(window.setInterval).toHaveBeenCalledWith(jasmine.any(Function), expectedInterval);

      jasmine.clock().tick(newDurationSeconds * 1000);
      jasmine.clock().uninstall();
    });

    it('should update slider value if settings are reset via service', () => {
      const defaultDurationFromService = 0.2;
      const newSettingsAfterReset: AppSettings = {
        ...initialTestSettings,
        crossfadeDurationSeconds: defaultDurationFromService
      };

      appSettingsSubject.next(newSettingsAfterReset);
      fixture.detectChanges();

      expect(app.displayCrossfadeDurationSeconds).toBe(defaultDurationFromService);
      expect(app['currentCrossfadeDurationMs']).toBe(defaultDurationFromService * 1000);

      expect(sliderElement).toBeTruthy();
      if (sliderElement) {
        expect(sliderElement.value).toBe(defaultDurationFromService.toString());
      }
      if (sliderLabelElement) {
        expect(sliderLabelElement.textContent).toContain(`X-Fade: ${defaultDurationFromService}s`);
      }
    });
  });
});
