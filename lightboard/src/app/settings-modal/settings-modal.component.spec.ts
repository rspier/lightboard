import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SettingsModalComponent } from './settings-modal.component';
import { ChannelSettingsService, AppSettings } from '../channel-settings.service';
import { ThemeService, Theme } from '../theme.service'; // Import ThemeService and Theme
import { By } from '@angular/platform-browser';

describe('SettingsModalComponent', () => {
  let component: SettingsModalComponent;
  let fixture: ComponentFixture<SettingsModalComponent>;
  let mockChannelSettingsService: jasmine.SpyObj<ChannelSettingsService>;
  let mockThemeService: jasmine.SpyObj<ThemeService>;

  const initialTestSettings: Omit<AppSettings, 'darkMode'> = { // darkMode removed
    numChannels: 4,
    channelDescriptions: ['Apple', 'Banana', 'Cherry', 'Date'],
    backendUrl: 'http://default.com',
    crossfadeDurationSeconds: 1.0,
  };

  const mockThemes: Theme[] = [
    { id: 'light', name: 'Light', className: 'light-theme' },
    { id: 'dark', name: 'Dark', className: 'dark-theme' },
  ];

  beforeEach(async () => {
    mockChannelSettingsService = jasmine.createSpyObj('ChannelSettingsService',
      [
        'getCurrentAppSettings',
        'updateNumChannels',
        'updateChannelDescriptions',
        'updateBackendUrl',
        // 'updateCrossfadeDurationSeconds', // Assuming this might be removed if not used elsewhere
        // 'updateDarkMode', // Removed
        'resetToDefaults',
        'getCurrentNumChannels',
        'getCurrentChannelDescriptions'
      ]
    );

    mockThemeService = jasmine.createSpyObj('ThemeService',
      ['getAvailableThemes', 'getActiveTheme', 'setActiveTheme']
    );

    // Adjust initialTestSettings if darkMode is truly gone from it
    const settingsForChannelService = { ...initialTestSettings };
    delete (settingsForChannelService as AppSettings & {darkMode?: boolean}).darkMode; // Simulate it not being part of the core settings anymore, provide a more specific type

    mockChannelSettingsService.getCurrentAppSettings.and.returnValue(settingsForChannelService as AppSettings); // Cast to AppSettings
    mockChannelSettingsService.getCurrentNumChannels.and.returnValue(initialTestSettings.numChannels);
    mockChannelSettingsService.getCurrentChannelDescriptions.and.returnValue([...initialTestSettings.channelDescriptions]);

    mockThemeService.getAvailableThemes.and.returnValue(mockThemes);
    mockThemeService.getActiveTheme.and.returnValue(mockThemes[0]); // Default to light theme

    await TestBed.configureTestingModule({
      imports: [FormsModule, CommonModule, SettingsModalComponent],
      providers: [
        { provide: ChannelSettingsService, useValue: mockChannelSettingsService },
        { provide: ThemeService, useValue: mockThemeService } // Provide mock ThemeService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // This calls ngOnInit
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load current channel settings and theme settings on init', () => {
    expect(mockChannelSettingsService.getCurrentAppSettings).toHaveBeenCalled();
    expect(component.numChannels).toBe(initialTestSettings.numChannels);
    expect(component.descriptions).toEqual(initialTestSettings.channelDescriptions);
    expect(component.backendUrl).toBe(initialTestSettings.backendUrl);

    expect(mockThemeService.getAvailableThemes).toHaveBeenCalled();
    expect(mockThemeService.getActiveTheme).toHaveBeenCalled();
    expect(component.availableThemes).toEqual(mockThemes);
    expect(component.selectedThemeId).toBe(mockThemes[0].id); // e.g., 'light'
  });

  // ... (onNumChannelsChange tests remain largely the same)
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
    it('should call service update methods for valid settings and emit closeModal', () => {
      spyOn(component.closeModal, 'emit');
      component.numChannels = 3;
      component.descriptions = ['New1', 'New2', 'New3'];
      component.backendUrl = 'http://valid.url';
      // Theme is handled by onThemeChange, saveSettings doesn't directly interact with themeService.setActiveTheme

      mockChannelSettingsService.getCurrentNumChannels.and.returnValue(initialTestSettings.numChannels);
      mockChannelSettingsService.getCurrentChannelDescriptions.and.returnValue(['New1', 'New2', 'New3']);

      component.saveSettings();

      expect(mockChannelSettingsService.updateNumChannels).toHaveBeenCalledWith(3);
      expect(mockChannelSettingsService.updateChannelDescriptions).toHaveBeenCalledWith(['New1', 'New2', 'New3']);
      expect(mockChannelSettingsService.updateBackendUrl).toHaveBeenCalledWith('http://valid.url');
      // No direct theme update call here, ThemeService handles its persistence (localStorage)
      expect(component.closeModal.emit).toHaveBeenCalled();
      expect(component.numChannelsError).toBeNull();
      expect(component.backendUrlError).toBeNull();
    });

    it('should show error and not save if numChannels is invalid', () => {
      spyOn(component.closeModal, 'emit'); // Changed to closeModal
      component.numChannels = 0;
      component.saveSettings();
      expect(component.numChannelsError).toBeTruthy();
      expect(mockChannelSettingsService.updateNumChannels).not.toHaveBeenCalled();
      expect(component.closeModal.emit).not.toHaveBeenCalled(); // Changed to closeModal
    });

    it('should show error and not save if backendUrl is invalid', () => {
      spyOn(component.closeModal, 'emit'); // Changed to closeModal
      component.backendUrl = 'invalidurl';
      component.saveSettings();
      expect(component.backendUrlError).toBeTruthy();
      expect(mockChannelSettingsService.updateBackendUrl).not.toHaveBeenCalled();
      expect(component.closeModal.emit).not.toHaveBeenCalled(); // Changed to closeModal
    });

    // it('should show error and not save if crossfadeDuration is invalid', () => { // Removed Test
    //   spyOn(component.closeModal, 'emit'); // Changed to closeModal
    //   component.crossfadeDurationSeconds = 0;
    //   component.saveSettings();
    //   expect(component.durationError).toBeTruthy();
    //   expect(mockChannelSettingsService.updateCrossfadeDurationSeconds).not.toHaveBeenCalled();
    //   expect(component.closeModal.emit).not.toHaveBeenCalled();
    // });
  }); // End of describe('saveSettings')

  describe('onThemeChange', () => {
    it('should call themeService.setActiveTheme with the new theme id', () => {
      const newThemeId = 'dark';
      component.onThemeChange(newThemeId);
      expect(mockThemeService.setActiveTheme).toHaveBeenCalledWith(newThemeId);
    });
  });

  it('should bind selectedThemeId to the select element (view to model and model to view)', async () => {
    mockThemeService.getActiveTheme.and.returnValue(mockThemes[0]); // Start with 'light'
    component.ngOnInit(); // Re-initialize based on mocked service state
    fixture.detectChanges();
    await fixture.whenStable();

    const selectDebugElement = fixture.debugElement.query(By.css('#theme-selector'));
    const selectNativeElement = selectDebugElement.nativeElement as HTMLSelectElement;

    // Model to View
    expect(selectNativeElement.value).toBe(mockThemes[0].id); // 'light'

    // Simulate user changing the selection (View to Model)
    selectNativeElement.value = mockThemes[1].id; // 'dark'
    selectNativeElement.dispatchEvent(new Event('change')); // Dispatch change for ngModel
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.selectedThemeId).toBe(mockThemes[1].id); // 'dark'
    // Also check if onThemeChange was triggered, which calls setActiveTheme
    expect(mockThemeService.setActiveTheme).toHaveBeenCalledWith(mockThemes[1].id);
  });

  it('should emit closeModal on cancel', () => {
    spyOn(component.closeModal, 'emit');
    component.cancel();
    expect(component.closeModal.emit).toHaveBeenCalled();
  });

  it('should call resetToDefaults on services and update local properties', () => {
    const newDefaultSettings: AppSettings = { // Define without darkMode
      numChannels: 2,
      channelDescriptions: ['DefaultA', 'DefaultB'],
      backendUrl: 'http://newdefault.com',
      crossfadeDurationSeconds: 0.8,
    };
    // Simulate ChannelSettingsService returning new defaults after reset
    mockChannelSettingsService.resetToDefaults.and.callFake(() => {
      mockChannelSettingsService.getCurrentAppSettings.and.returnValue(newDefaultSettings);
    });
    // Simulate ThemeService returning the light theme as active after reset
    mockThemeService.getActiveTheme.and.returnValue(mockThemes[0]); // Light theme

    spyOn(window, 'confirm').and.returnValue(true);
    component.resetToDefaults();

    expect(mockChannelSettingsService.resetToDefaults).toHaveBeenCalled();
    expect(mockThemeService.setActiveTheme).toHaveBeenCalledWith('light'); // Reset to light theme

    expect(component.numChannels).toBe(newDefaultSettings.numChannels);
    expect(component.descriptions).toEqual(newDefaultSettings.channelDescriptions);
    expect(component.backendUrl).toBe(newDefaultSettings.backendUrl);
    expect(component.selectedThemeId).toBe(mockThemes[0].id); // Should be 'light'

    expect(component.numChannelsError).toBeNull();
    expect(component.backendUrlError).toBeNull();
  });

});
