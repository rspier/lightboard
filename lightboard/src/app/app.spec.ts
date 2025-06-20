import { TestBed, ComponentFixture } from '@angular/core/testing'; // Removed fakeAsync, tick
import { App } from './app';
import { By } from '@angular/platform-browser';
import { ChannelSettingsService } from './channel-settings.service'; // Import service
import { SettingsModalComponent } from './settings-modal/settings-modal.component'; // Import modal
import { BehaviorSubject, Subscription } from 'rxjs';

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
  let mockChannelSettingsService: jasmine.SpyObj<ChannelSettingsService>;
  let descriptionsSubject: BehaviorSubject<string[]>;
  const initialMockDescriptions = ['Apple', 'Banana', 'Cherry', 'Date'];


  beforeEach(async () => {
    descriptionsSubject = new BehaviorSubject<string[]>([...initialMockDescriptions]);
    mockChannelSettingsService = jasmine.createSpyObj(
        'ChannelSettingsService',
        ['getCurrentDescriptions', 'updateDescription', 'updateAllDescriptions', 'resetToDefaults', 'getDescriptions'] // Added getDescriptions to methods
    );
    mockChannelSettingsService.getCurrentDescriptions.and.returnValue([...initialMockDescriptions]);
    mockChannelSettingsService.getDescriptions.and.returnValue(descriptionsSubject.asObservable()); // Mock its return value

    await TestBed.configureTestingModule({
      imports: [App], // App is standalone and imports SettingsModalComponent itself
      providers: [
        { provide: ChannelSettingsService, useValue: mockChannelSettingsService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    app = fixture.componentInstance;
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

  it('should render the sliders-area container', () => {
    fixture.detectChanges();
    const compiled = fixture.debugElement;
    expect(compiled.query(By.css('.sliders-area'))).toBeTruthy();
  });

  it('should have initial states including colors based on service', () => {
    // Constructor now uses service, ngOnInit subscribes and then calls calculateCombinedOutputs.
    // So, detectChanges will trigger ngOnInit.
    fixture.detectChanges();
    expect(mockChannelSettingsService.getCurrentDescriptions).toHaveBeenCalled();
    expect(app.row1States.length).toBe(4);
    expect(app.row1States[0].channelDescription).toBe(initialMockDescriptions[0]);
    expect(app.row1States[0].value).toBe(0); // Default value from component
    expect(app.row1States[0].color).toBe('#ff0000');

    expect(app.row2States.length).toBe(4);
    expect(app.row2States[0].channelDescription).toBe(initialMockDescriptions[0]);
    expect(app.row2States[0].value).toBe(100);
    expect(app.row2States[0].color).toBe('#00ffff');

    expect(app.crossfaderValue).toBe(50);
  });

  it('should populate combinedOutputStates on ngOnInit with blended values and colors', () => {
    fixture.detectChanges();
    expect(app.combinedOutputStates.length).toBe(4);

    expect(app.combinedOutputStates[0].value).toBe(50);
    expect(app.combinedOutputStates[0].channelDescription).toBe(initialMockDescriptions[0]);
    expect(app.combinedOutputStates[0].color).toBe('#808080');

    expect(app.combinedOutputStates[1].value).toBe(50);
    expect(app.combinedOutputStates[1].channelDescription).toBe(initialMockDescriptions[1]);
    expect(app.combinedOutputStates[1].color).toBe('#808080');
  });

  describe('ChannelSettingsService Interaction', () => {
    it('should subscribe to description changes and update states', () => {
      fixture.detectChanges(); // ngOnInit called, subscription made
      spyOn(app, 'calculateCombinedOutputs').and.callThrough();
      spyOn(app['cdr'], 'detectChanges').and.callThrough();


      const newDescriptions = ['NewApple', 'NewBanana', 'NewCherry', 'NewDate'];
      descriptionsSubject.next(newDescriptions);
      fixture.detectChanges(); // Process the emission and subsequent updates

      expect(app.row1States[0].channelDescription).toBe('NewApple');
      expect(app.row2States[0].channelDescription).toBe('NewApple');
      expect(app.calculateCombinedOutputs).toHaveBeenCalled();
      expect(app['cdr'].detectChanges).toHaveBeenCalled(); // Check if cdr.detectChanges was called
    });
  });

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

      // Emit the 'close' event from the modal component instance
      modalComponentDebugElement.componentInstance.close.emit();
      fixture.detectChanges();
      expect(app.showSettingsModal).toBeFalse();
    });
  });

  // calculateCombinedOutputs tests remain the same as they test pure logic
  describe('calculateCombinedOutputs with colors', () => {
    beforeEach(() => {
      // Reset states for predictable tests, using the PotentiometerState interface
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
      if (typeof (jasmine.clock() as any).uninstall === 'function') {
        try { jasmine.clock().uninstall(); } catch (e) {}
      }
    });
    // ... (existing onGoButtonClick tests) ...
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

    // Animation tests using Jasmine Clock (previously commented out)
    it('animateCrossfader should animate crossfader value from 0 to 100', () => {
      jasmine.clock().install();
      spyOn(app, 'onPotentiometerChange').and.callThrough();
      app.crossfaderValue = 0;
      const target = 100;
      const duration = 500;
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
      jasmine.clock().uninstall();
    });

    it('animateCrossfader should animate crossfader value from 100 to 0', () => {
      jasmine.clock().install();
      spyOn(app, 'onPotentiometerChange').and.callThrough();
      app.crossfaderValue = 100;
      const target = 0;
      const duration = 500;
      const steps = 25;
      const intervalDuration = duration / steps;

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
      spyOn(app, 'onGoButtonClick').and.callThrough();
      spyOn(app, 'animateCrossfader');

      const goButton = fixture.debugElement.query(By.css('.go-button')).nativeElement;
      expect(goButton.disabled).toBeFalse();

      goButton.click();
      expect(app.onGoButtonClick).toHaveBeenCalled();

      app.isAnimating = true;
      fixture.detectChanges();
      expect(goButton.disabled).toBeTrue();

      app.isAnimating = false;
      fixture.detectChanges();
      expect(goButton.disabled).toBeFalse();
    });
  });
});
