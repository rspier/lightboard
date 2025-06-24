import { TestBed } from '@angular/core/testing';
import { ChannelSettingsService, AppSettings } from './channel-settings.service';

describe('ChannelSettingsService', () => {
  let service: ChannelSettingsService;
  let store: Record<string, string | null> = {};
  const settingsKey = 'appSettings_v1';

  const defaultNumChannels = 4;
  const defaultBackendUrl = '';
  const defaultCrossfadeDurationSeconds = 0.5;
  const defaultDarkMode = false; // Default from service
  const getDefaultDescriptions = (count: number) => Array.from({ length: count }, (_, i) => `Channel ${i + 1}`);

  const initialDefaultSettings: AppSettings = {
    numChannels: defaultNumChannels,
    channelDescriptions: getDefaultDescriptions(defaultNumChannels),
    backendUrl: defaultBackendUrl,
    crossfadeDurationSeconds: defaultCrossfadeDurationSeconds,
    darkMode: defaultDarkMode // Added darkMode to initialDefaultSettings
  };

  beforeEach(() => {
    store = {};
    spyOn(localStorage, 'getItem').and.callFake((key: string) => store[key] || null);
    spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => { store[key] = value; });
    spyOn(localStorage, 'removeItem').and.callFake((key: string) => { delete store[key]; });

    TestBed.configureTestingModule({
      providers: [ChannelSettingsService]
    });
  });

  it('should be created', () => {
    service = TestBed.inject(ChannelSettingsService);
    expect(service).toBeTruthy();
  });

  describe('Loading and Initialization with constructor', () => {
    it('should load default settings if localStorage is empty and save them', () => {
      service = new ChannelSettingsService();
      expect(service.getCurrentAppSettings()).toEqual(initialDefaultSettings);
      expect(localStorage.setItem).toHaveBeenCalledWith(settingsKey, JSON.stringify(initialDefaultSettings));
    });

    it('should load settings from localStorage if available and valid', () => {
      const storedAppSettings: AppSettings = {
        numChannels: 2,
        channelDescriptions: ['Custom1', 'Custom2'],
        backendUrl: 'http://local.test',
        crossfadeDurationSeconds: 1.5,
        darkMode: true
      };
      store[settingsKey] = JSON.stringify(storedAppSettings);
      service = new ChannelSettingsService();
      expect(service.getCurrentAppSettings()).toEqual(storedAppSettings);
    });

    it('should use default darkMode if stored darkMode is invalid type', () => {
      const storedAppSettings = { ...initialDefaultSettings, darkMode: "not-a-boolean" };
      store[settingsKey] = JSON.stringify(storedAppSettings);
      service = new ChannelSettingsService();
      expect(service.getCurrentDarkMode()).toBe(defaultDarkMode);
    });

    it('should use default darkMode if darkMode is missing from stored settings', () => {
      const partialStoredSettings = { // darkMode is missing
        numChannels: 2,
        channelDescriptions: ['Custom1', 'Custom2'],
        backendUrl: 'http://local.test',
        crossfadeDurationSeconds: 1.5
      };
      store[settingsKey] = JSON.stringify(partialStoredSettings);
      service = new ChannelSettingsService();
      expect(service.getCurrentDarkMode()).toBe(defaultDarkMode);
    });
    // ... (other loading tests from before remain, ensure they are compatible or update if needed)
    it('should use default numChannels if stored numChannels is invalid (e.g., 0)', () => {
        const storedAppSettings = { ...initialDefaultSettings, numChannels: 0 };
        store[settingsKey] = JSON.stringify(storedAppSettings);
        service = new ChannelSettingsService();
        expect(service.getCurrentNumChannels()).toBe(defaultNumChannels);
        expect(service.getCurrentChannelDescriptions().length).toBe(defaultNumChannels);
      });
  });

  describe('Updating Settings', () => {
    beforeEach(() => {
      service = new ChannelSettingsService();
      (localStorage.setItem as jasmine.Spy).calls.reset();
    });

    it('updateDarkMode should update darkMode setting and save', (done) => {
      service.updateDarkMode(true);
      const settingsAfterUpdate = service.getCurrentAppSettings();
      expect(settingsAfterUpdate.darkMode).toBe(true);
      expect(localStorage.setItem).toHaveBeenCalledWith(settingsKey, JSON.stringify(settingsAfterUpdate));

      service.getAppSettings().subscribe(s => {
        expect(s.darkMode).toBe(true);
        done();
      });
    });

    it('updateDarkMode(false) should update darkMode setting and save', (done) => {
        service.updateDarkMode(true); // Set to true first
        service.updateDarkMode(false); // Then set to false
        const settingsAfterUpdate = service.getCurrentAppSettings();
        expect(settingsAfterUpdate.darkMode).toBe(false);
        expect(localStorage.setItem).toHaveBeenCalledWith(settingsKey, JSON.stringify(settingsAfterUpdate));
        done();
      });
    // ... (other update tests from before remain)
    it('updateNumChannels should update numChannels and adjust descriptions, then save', (done) => {
        const initialDescs = service.getCurrentChannelDescriptions();
        service.updateNumChannels(2);
        const settingsAfterUpdate = service.getCurrentAppSettings();
        expect(settingsAfterUpdate.numChannels).toBe(2);
        expect(settingsAfterUpdate.channelDescriptions).toEqual(initialDescs.slice(0,2));
        expect(localStorage.setItem).toHaveBeenCalledWith(settingsKey, JSON.stringify(settingsAfterUpdate));

        service.getAppSettings().subscribe(s => {
          expect(s.numChannels).toBe(2);
          done();
        });
      });
  });

  it('resetToDefaults should reset all settings including darkMode', (done) => {
    service = new ChannelSettingsService();
    service.updateDarkMode(true); // Change something
    service.updateNumChannels(2); // Change something else
    (localStorage.setItem as jasmine.Spy).calls.reset();

    service.resetToDefaults();
    const currentSettings = service.getCurrentAppSettings();
    expect(currentSettings).toEqual(initialDefaultSettings);
    expect(localStorage.setItem).toHaveBeenCalledWith(settingsKey, JSON.stringify(initialDefaultSettings));

    service.getAppSettings().subscribe(s => {
      expect(s).toEqual(initialDefaultSettings);
      done();
    });
  });
});
