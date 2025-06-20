import { ComponentFixture, TestBed } from '@angular/core/testing';
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
    crossfadeDurationSeconds: 1.0
  };

  beforeEach(async () => {
    mockChannelSettingsService = jasmine.createSpyObj('ChannelSettingsService',
      [
        'getCurrentAppSettings',
        'updateNumChannels',
        'updateChannelDescriptions',
        'updateBackendUrl',
        'updateCrossfadeDurationSeconds',
        'resetToDefaults',
        'getCurrentNumChannels', // Used by component.saveSettings
        'getCurrentChannelDescriptions' // Used by component.onNumChannelsChange & reset
      ]
    );

    mockChannelSettingsService.getCurrentAppSettings.and.returnValue({...initialTestSettings});
    // getCurrentNumChannels and getCurrentChannelDescriptions will be called by component logic,
    // so ensure they return values consistent with getCurrentAppSettings or what the test expects after updates.
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
    fixture.detectChanges(); // Trigger ngOnInit
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load current settings on init', () => {
    expect(mockChannelSettingsService.getCurrentAppSettings).toHaveBeenCalled();
    expect(component.numChannels).toBe(initialTestSettings.numChannels);
    expect(component.descriptions).toEqual(initialTestSettings.channelDescriptions);
    expect(component.backendUrl).toBe(initialTestSettings.backendUrl);
    expect(component.crossfadeDurationSeconds).toBe(initialTestSettings.crossfadeDurationSeconds);
  });

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
      component.numChannels = 2; // Set initial numChannels to ensure change
      component.onNumChannelsChange('4'); // Change to 4 channels
      expect(component.numChannels).toBe(4);
      expect(component.descriptions.length).toBe(4);
      expect(component.descriptions).toEqual(['One', 'Two', 'Channel 3', 'Channel 4']);
      expect(component.numChannelsError).toBeNull();
    });

    it('should set numChannelsError for invalid count and not change descriptions length from valid previous', () => {
      const initialDescriptions = [...component.descriptions];
      component.onNumChannelsChange('0'); // Invalid: too small
      expect(component.numChannelsError).toBeTruthy();
      expect(component.descriptions).toEqual(initialDescriptions); // Descriptions array should not have changed yet

      component.onNumChannelsChange('13'); // Invalid: too large
      expect(component.numChannelsError).toBeTruthy();
      expect(component.descriptions).toEqual(initialDescriptions);

      component.onNumChannelsChange('abc'); // Invalid: not a number
      expect(component.numChannelsError).toBeTruthy();
      expect(component.descriptions).toEqual(initialDescriptions);
    });
  });

  describe('saveSettings', () => {
    it('should call service update methods for valid settings and emit close', () => {
      spyOn(component.close, 'emit');
      component.numChannels = 3;
      component.descriptions = ['New1', 'New2', 'New3']; // Ensure descriptions match numChannels
      component.backendUrl = 'http://valid.url';
      component.crossfadeDurationSeconds = 2;

      // getCurrentNumChannels should return the "original" value (4) from the service perspective here
      // as set in the main beforeEach.
      // The component will then call updateNumChannels(3) if its local numChannels (3) is different.
      // If updateNumChannels internally changes what getCurrentNumChannels returns for subsequent calls,
      // that's service internal logic. For this test, we only care it's called correctly.
      // The mock for getCurrentChannelDescriptions is for when the component might re-fetch after potential numChannel change.
      // However, saveSettings in component currently slices its local descriptions.
      mockChannelSettingsService.getCurrentChannelDescriptions.and.returnValue(['New1', 'New2', 'New3']); // This is for when service is asked for descs for the new count

      component.saveSettings();

      expect(mockChannelSettingsService.updateNumChannels).toHaveBeenCalledWith(3);
      expect(mockChannelSettingsService.updateChannelDescriptions).toHaveBeenCalledWith(['New1', 'New2', 'New3']);
      expect(mockChannelSettingsService.updateBackendUrl).toHaveBeenCalledWith('http://valid.url');
      expect(mockChannelSettingsService.updateCrossfadeDurationSeconds).toHaveBeenCalledWith(2);
      expect(component.close.emit).toHaveBeenCalled();
      expect(component.numChannelsError).toBeNull();
      expect(component.backendUrlError).toBeNull();
      expect(component.durationError).toBeNull();
    });

    it('should show error and not save if numChannels is invalid', () => {
      spyOn(component.close, 'emit');
      component.numChannels = 0; // Invalid
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

    it('should show error and not save if crossfadeDuration is invalid', () => {
      spyOn(component.close, 'emit');
      component.crossfadeDurationSeconds = 0; // Invalid
      component.saveSettings();
      expect(component.durationError).toBeTruthy();
      expect(mockChannelSettingsService.updateCrossfadeDurationSeconds).not.toHaveBeenCalled();
      expect(component.close.emit).not.toHaveBeenCalled();
    });

    it('should save successfully if backendUrl is empty (optional)', () => {
      spyOn(component.close, 'emit');
      component.backendUrl = ''; // Empty is valid
      component.saveSettings();
      expect(component.backendUrlError).toBeNull();
      expect(mockChannelSettingsService.updateBackendUrl).toHaveBeenCalledWith('');
      expect(component.close.emit).toHaveBeenCalled(); // Assuming other fields are valid
    });
  });

  it('should emit close on cancel', () => {
    spyOn(component.close, 'emit');
    component.cancel();
    expect(component.close.emit).toHaveBeenCalled();
  });

  it('should call resetToDefaults on service and update local properties', () => {
    const newDefaultSettings: AppSettings = {
      numChannels: 2,
      channelDescriptions: ['DefaultA', 'DefaultB'],
      backendUrl: 'http://newdefault.com',
      crossfadeDurationSeconds: 0.8
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
    expect(component.crossfadeDurationSeconds).toBe(newDefaultSettings.crossfadeDurationSeconds);
    expect(component.numChannelsError).toBeNull();
    expect(component.backendUrlError).toBeNull();
    expect(component.durationError).toBeNull();
  });
});
