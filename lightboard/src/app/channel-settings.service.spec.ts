import { TestBed } from '@angular/core/testing';
import { ChannelSettingsService, AppSettings } from './channel-settings.service';

describe('ChannelSettingsService', () => {
  let service: ChannelSettingsService;
  let store: Record<string, string | null> = {};
  const settingsKey = 'appSettings_v1';

  const defaultNumChannels = 4;
  const defaultBackendUrl = '';
  const defaultCrossfadeDurationSeconds = 0.5;
  // const defaultDarkMode = false; // Removed
  const getDefaultDescriptions = (count: number) => Array.from({ length: count }, (_, i) => `Channel ${i + 1}`);

  const initialDefaultSettings: AppSettings = {
    numChannels: defaultNumChannels,
    channelDescriptions: getDefaultDescriptions(defaultNumChannels),
    backendUrl: defaultBackendUrl,
    crossfadeDurationSeconds: defaultCrossfadeDurationSeconds,
    // darkMode: defaultDarkMode // Removed
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
        // darkMode: true // darkMode removed
      };
      store[settingsKey] = JSON.stringify(storedAppSettings);
      service = new ChannelSettingsService();
      expect(service.getCurrentAppSettings()).toEqual(storedAppSettings as AppSettings); // Cast if AppSettings type is strict
    });

    // Tests for darkMode loading are removed as the property is gone.
    // it('should use default darkMode if stored darkMode is invalid type', () => { ... });
    // it('should use default darkMode if darkMode is missing from stored settings', () => { ... });

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

    // Tests for updateDarkMode are removed.
    // it('updateDarkMode should update darkMode setting and save', (done) => { ... });
    // it('updateDarkMode(false) should update darkMode setting and save', (done) => { ... });

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

  it('resetToDefaults should reset all settings (darkMode is not part of this service anymore)', (done) => {
    service = new ChannelSettingsService();
    // service.updateDarkMode(true); // This method is removed
    service.updateNumChannels(2); // Change something else
    service.updateBackendUrl('http://test.com');
    (localStorage.setItem as jasmine.Spy).calls.reset();

    service.resetToDefaults();
    const currentSettings = service.getCurrentAppSettings();
    // initialDefaultSettings should also be defined without darkMode for this comparison
    const expectedDefaultSettings: AppSettings = {
      numChannels: defaultNumChannels,
      channelDescriptions: getDefaultDescriptions(defaultNumChannels),
      backendUrl: defaultBackendUrl,
      crossfadeDurationSeconds: defaultCrossfadeDurationSeconds,
    };
    expect(currentSettings).toEqual(expectedDefaultSettings);
    expect(localStorage.setItem).toHaveBeenCalledWith(settingsKey, JSON.stringify(expectedDefaultSettings));

    service.getAppSettings().subscribe(s => {
      expect(s).toEqual(expectedDefaultSettings);
      done();
    });
  });
});
