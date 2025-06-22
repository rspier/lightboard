import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing'; // Import fakeAsync, tick
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SettingsModalComponent } from './settings-modal.component';
import { ChannelSettingsService, AppSettings } from '../channel-settings.service';
import { By } from '@angular/platform-browser';

describe('SettingsModalComponent', () => {
  let component: SettingsModalComponent;
  let fixture: ComponentFixture<SettingsModalComponent>;
  let mockChannelSettingsService: jasmine.SpyObj<ChannelSettingsService>;

  const initialTestSettings: AppSettings = {
    numChannels: 4,
    channelDescriptions: ['Apple', 'Banana', 'Cherry', 'Date'],
    backendUrl: 'http://default.com',
    crossfadeDurationSeconds: 1.0,
    darkMode: false // Added darkMode
  };

  beforeEach(async () => {
    mockChannelSettingsService = jasmine.createSpyObj('ChannelSettingsService',
      [
        'getCurrentAppSettings',
        'updateNumChannels',
        'updateChannelDescriptions',
        'updateBackendUrl',
        'updateCrossfadeDurationSeconds',
        'updateDarkMode', // Added spy for updateDarkMode
        'resetToDefaults',
        'getCurrentNumChannels',
        'getCurrentChannelDescriptions'
      ]
    );

    mockChannelSettingsService.getCurrentAppSettings.and.returnValue({...initialTestSettings});
    mockChannelSettingsService.getCurrentNumChannels.and.returnValue(initialTestSettings.numChannels);
    mockChannelSettingsService.getCurrentChannelDescriptions.and.returnValue([...initialTestSettings.channelDescriptions]);


    await TestBed.configureTestingModule({
      imports: [FormsModule, CommonModule, SettingsModalComponent],
      providers: [
        { provide: ChannelSettingsService, useValue: mockChannelSettingsService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load current settings on init, including dark mode', () => {
    expect(mockChannelSettingsService.getCurrentAppSettings).toHaveBeenCalled();
    expect(component.numChannels).toBe(initialTestSettings.numChannels);
    expect(component.descriptions).toEqual(initialTestSettings.channelDescriptions);
    expect(component.backendUrl).toBe(initialTestSettings.backendUrl);
    // expect(component.crossfadeDurationSeconds).toBe(initialTestSettings.crossfadeDurationSeconds); // Removed
    expect(component.darkMode).toBe(initialTestSettings.darkMode); // Test darkMode init
  });

  // ... (onNumChannelsChange tests remain the same)
  describe('onNumChannelsChange', () => {
    it('should update descriptions array length and content', () => {
      component.descriptions = ['One', 'Two', 'Three', 'Four'];
      component.onNumChannelsChange('2'); // Change to 2 channels
      expect(component.numChannels).toBe(2);
      expect(component.descriptions.length).toBe(2);
      expect(component.descriptions).toEqual(['One', 'Two']);
      expect(component.numChannelsError).toBeNull();
    });

    it('should pad descriptions with defaults if new count is larger', () => {
      component.descriptions = ['One', 'Two'];
      component.numChannels = 2;
      component.onNumChannelsChange('4');
      expect(component.numChannels).toBe(4);
      expect(component.descriptions.length).toBe(4);
      expect(component.descriptions).toEqual(['One', 'Two', 'Channel 3', 'Channel 4']);
      expect(component.numChannelsError).toBeNull();
    });

    it('should set numChannelsError for invalid count and not change descriptions length from valid previous', () => {
      const initialDescriptions = [...component.descriptions];
      component.onNumChannelsChange('0');
      expect(component.numChannelsError).toBeTruthy();
      expect(component.descriptions).toEqual(initialDescriptions);

      component.onNumChannelsChange('13');
      expect(component.numChannelsError).toBeTruthy();
      expect(component.descriptions).toEqual(initialDescriptions);

      component.onNumChannelsChange('abc');
      expect(component.numChannelsError).toBeTruthy();
      expect(component.descriptions).toEqual(initialDescriptions);
    });
  });


  describe('saveSettings', () => {
    it('should call service update methods for valid settings (including darkMode) and emit close', () => {
      spyOn(component.close, 'emit');
      component.numChannels = 3;
      component.descriptions = ['New1', 'New2', 'New3'];
      component.backendUrl = 'http://valid.url';
      // component.crossfadeDurationSeconds = 2; // Removed
      component.darkMode = true; // Set darkMode for test

      mockChannelSettingsService.getCurrentNumChannels.and.returnValue(initialTestSettings.numChannels); // Original num channels for comparison
      // For when descriptions are updated for the new number of channels:
      mockChannelSettingsService.getCurrentChannelDescriptions.and.returnValue(['New1', 'New2', 'New3']);


      component.saveSettings();

      expect(mockChannelSettingsService.updateNumChannels).toHaveBeenCalledWith(3);
      expect(mockChannelSettingsService.updateChannelDescriptions).toHaveBeenCalledWith(['New1', 'New2', 'New3']);
      expect(mockChannelSettingsService.updateBackendUrl).toHaveBeenCalledWith('http://valid.url');
      // expect(mockChannelSettingsService.updateCrossfadeDurationSeconds).toHaveBeenCalledWith(2); // Removed
      expect(mockChannelSettingsService.updateDarkMode).toHaveBeenCalledWith(true); // Verify darkMode update
      expect(component.close.emit).toHaveBeenCalled();
      expect(component.numChannelsError).toBeNull();
      expect(component.backendUrlError).toBeNull();
      // expect(component.durationError).toBeNull(); // Removed
    });
    // ... (other saveSettings validation tests remain the same)
    it('should show error and not save if numChannels is invalid', () => {
      spyOn(component.close, 'emit');
      component.numChannels = 0;
      component.saveSettings();
      expect(component.numChannelsError).toBeTruthy();
      expect(mockChannelSettingsService.updateNumChannels).not.toHaveBeenCalled();
      expect(component.close.emit).not.toHaveBeenCalled();
    });

    it('should show error and not save if backendUrl is invalid', () => {
      spyOn(component.close, 'emit');
      component.backendUrl = 'invalidurl';
      component.saveSettings();
      expect(component.backendUrlError).toBeTruthy();
      expect(mockChannelSettingsService.updateBackendUrl).not.toHaveBeenCalled();
      expect(component.close.emit).not.toHaveBeenCalled();
    });

    // it('should show error and not save if crossfadeDuration is invalid', () => { // Removed Test
    //   spyOn(component.close, 'emit');
    //   component.crossfadeDurationSeconds = 0;
    //   component.saveSettings();
    //   expect(component.durationError).toBeTruthy();
    //   expect(mockChannelSettingsService.updateCrossfadeDurationSeconds).not.toHaveBeenCalled();
    //   expect(component.close.emit).not.toHaveBeenCalled();
    // });

  it('should bind darkMode to the checkbox and update component property', fakeAsync(() => { // Use fakeAsync
    component.darkMode = false;
    fixture.detectChanges();
    tick(); // Ensure model is stable before interaction

    const checkboxDebugElement = fixture.debugElement.query(By.css('#dark-mode-toggle'));
    const checkboxNativeElement = checkboxDebugElement.nativeElement as HTMLInputElement;

    expect(checkboxNativeElement.checked).toBeFalse();

    checkboxNativeElement.checked = true;
    checkboxNativeElement.dispatchEvent(new Event('change'));

    fixture.detectChanges();
    tick(); // Allow ngModel to propagate the change

    expect(component.darkMode).toBeTrue();
  }));

  // Optional: Test property to view binding (if not covered by the above)
  it('should bind component darkMode property to checkbox state', fakeAsync(() => {
    component.darkMode = true;
    fixture.detectChanges();
    tick();

    const checkboxNativeElement = fixture.debugElement.query(By.css('#dark-mode-toggle')).nativeElement as HTMLInputElement;
    expect(checkboxNativeElement.checked).toBeTrue();

    component.darkMode = false;
    fixture.detectChanges();
    tick();
    expect(checkboxNativeElement.checked).toBeFalse();
  }));

  // The following test is a duplicate and does not use fakeAsync, so it should be removed.
  // it('should bind darkMode to the checkbox', () => {
  //   component.darkMode = true;
  //   fixture.detectChanges();
  //   const checkbox = fixture.debugElement.query(By.css('#dark-mode-toggle')).nativeElement as HTMLInputElement;
  //   expect(checkbox.checked).toBeTrue();

  //   component.darkMode = false;
  //   fixture.detectChanges();
  //   expect(checkbox.checked).toBeFalse();

  //   // Simulate user clicking checkbox
  //   checkbox.click();
  //   fixture.detectChanges();
  //   expect(component.darkMode).toBeTrue(); // Should update component property via ngModel
  // });
  });

  it('should emit close on cancel', () => {
    spyOn(component.close, 'emit');
    component.cancel();
    expect(component.close.emit).toHaveBeenCalled();
  });

  it('should call resetToDefaults on service and update all local properties including darkMode', () => {
    const newDefaultSettings: AppSettings = {
      numChannels: 2,
      channelDescriptions: ['DefaultA', 'DefaultB'],
      backendUrl: 'http://newdefault.com',
      crossfadeDurationSeconds: 0.8,
      darkMode: true // Ensure new default has darkMode set
    };
    mockChannelSettingsService.resetToDefaults.and.callFake(() => {
      mockChannelSettingsService.getCurrentAppSettings.and.returnValue(newDefaultSettings);
    });

    spyOn(window, 'confirm').and.returnValue(true);
    component.resetToDefaults();

    expect(mockChannelSettingsService.resetToDefaults).toHaveBeenCalled();
    expect(component.numChannels).toBe(newDefaultSettings.numChannels);
    expect(component.descriptions).toEqual(newDefaultSettings.channelDescriptions);
    expect(component.backendUrl).toBe(newDefaultSettings.backendUrl);
    // expect(component.crossfadeDurationSeconds).toBe(newDefaultSettings.crossfadeDurationSeconds); // Removed
    expect(component.darkMode).toBe(newDefaultSettings.darkMode); // Check darkMode reset
    expect(component.numChannelsError).toBeNull();
    expect(component.backendUrlError).toBeNull();
    // expect(component.durationError).toBeNull(); // Removed
  });

  it('should bind darkMode to the checkbox', () => {
    component.darkMode = true;
    fixture.detectChanges();
    const checkbox = fixture.debugElement.query(By.css('#dark-mode-toggle')).nativeElement as HTMLInputElement;
    expect(checkbox.checked).toBeTrue();

    component.darkMode = false;
    fixture.detectChanges();
    expect(checkbox.checked).toBeFalse();

    // Simulate user clicking checkbox
    checkbox.click();
    fixture.detectChanges();
    expect(component.darkMode).toBeTrue(); // Should update component property via ngModel
  });
});
