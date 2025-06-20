import { TestBed } from '@angular/core/testing';
import { ChannelSettingsService, AppSettings } from './channel-settings.service';

describe('ChannelSettingsService', () => {
  let service: ChannelSettingsService;
  let store: { [key: string]: string | null } = {};
  const settingsKey = 'appSettings_v1';

  const defaultNumChannels = 4; // Default from service
  const defaultBackendUrl = ''; // Default from service
  const defaultCrossfadeDurationSeconds = 0.5; // Default from service
  const getDefaultDescriptions = (count: number) => Array.from({ length: count }, (_, i) => `Channel ${i + 1}`);

  const initialDefaultSettings: AppSettings = {
    numChannels: defaultNumChannels,
    channelDescriptions: getDefaultDescriptions(defaultNumChannels),
    backendUrl: defaultBackendUrl,
    crossfadeDurationSeconds: defaultCrossfadeDurationSeconds,
  };

  beforeEach(() => {
    store = {}; // Reset store for each test
    spyOn(localStorage, 'getItem').and.callFake((key: string) => store[key] || null);
    spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => { store[key] = value; });
    spyOn(localStorage, 'removeItem').and.callFake((key: string) => { delete store[key]; });

    TestBed.configureTestingModule({
      providers: [ChannelSettingsService]
    });
    // Service will be created new in tests that need to test constructor logic
    // or injected for tests that can use a shared/default instance.
  });

  it('should be created', () => {
    service = TestBed.inject(ChannelSettingsService);
    expect(service).toBeTruthy();
  });

  describe('Loading and Initialization with constructor', () => {
    it('should load default settings if localStorage is empty and save them', () => {
      service = new ChannelSettingsService(); // Test constructor behavior
      expect(service.getCurrentAppSettings()).toEqual(initialDefaultSettings);
      expect(localStorage.setItem).toHaveBeenCalledWith(settingsKey, JSON.stringify(initialDefaultSettings));
    });

    it('should load settings from localStorage if available and valid', () => {
      const storedAppSettings: AppSettings = {
        numChannels: 2,
        channelDescriptions: ['Custom1', 'Custom2'],
        backendUrl: 'http://local.test',
        crossfadeDurationSeconds: 1.5
      };
      store[settingsKey] = JSON.stringify(storedAppSettings);
      service = new ChannelSettingsService();
      expect(service.getCurrentAppSettings()).toEqual(storedAppSettings);
    });

    it('should use default numChannels if stored numChannels is invalid (e.g., 0)', () => {
      const storedAppSettings = { numChannels: 0, channelDescriptions: [], backendUrl:"", crossfadeDurationSeconds:1 };
      store[settingsKey] = JSON.stringify(storedAppSettings);
      service = new ChannelSettingsService();
      expect(service.getCurrentNumChannels()).toBe(defaultNumChannels);
      expect(service.getCurrentChannelDescriptions().length).toBe(defaultNumChannels);
    });

    it('should adjust descriptions if stored numChannels mismatches description length', () => {
      const storedAppSettings = { numChannels: 2, channelDescriptions: ['One', 'Two', 'Three'], backendUrl:"", crossfadeDurationSeconds:1 };
      store[settingsKey] = JSON.stringify(storedAppSettings);
      service = new ChannelSettingsService();
      expect(service.getCurrentNumChannels()).toBe(2);
      expect(service.getCurrentChannelDescriptions()).toEqual(['One', 'Two']);
    });

    it('should extend descriptions with defaults if stored numChannels is greater than description length', () => {
      const storedAppSettings = { numChannels: 3, channelDescriptions: ['One'], backendUrl:"", crossfadeDurationSeconds:1 };
      store[settingsKey] = JSON.stringify(storedAppSettings);
      service = new ChannelSettingsService();
      expect(service.getCurrentNumChannels()).toBe(3);
      expect(service.getCurrentChannelDescriptions()).toEqual(['One', 'Channel 2', 'Channel 3']);
    });

    it('should use default descriptions if stored descriptions are invalid type', () => {
        const storedAppSettings = { numChannels: 2, channelDescriptions: "not-an-array", backendUrl:"", crossfadeDurationSeconds:1 };
        store[settingsKey] = JSON.stringify(storedAppSettings);
        service = new ChannelSettingsService();
        expect(service.getCurrentChannelDescriptions()).toEqual(getDefaultDescriptions(2));
    });

    it('should use default backendUrl if stored is invalid (not a string)', () => {
      const storedAppSettings = { backendUrl: 123 }; // Invalid type
      store[settingsKey] = JSON.stringify(storedAppSettings);
      service = new ChannelSettingsService();
      expect(service.getCurrentBackendUrl()).toBe(defaultBackendUrl);
    });

    it('should use default backendUrl if stored is a malformed URL', () => {
        const storedAppSettings = { backendUrl: 'invalid-url' };
        store[settingsKey] = JSON.stringify(storedAppSettings);
        service = new ChannelSettingsService();
        expect(service.getCurrentBackendUrl()).toBe(defaultBackendUrl);
      });

    it('should use default crossfadeDuration if stored is invalid (e.g., 0)', () => {
      const storedAppSettings = { crossfadeDurationSeconds: 0 };
      store[settingsKey] = JSON.stringify(storedAppSettings);
      service = new ChannelSettingsService();
      expect(service.getCurrentCrossfadeDurationSeconds()).toBe(defaultCrossfadeDurationSeconds);
    });
  });

  describe('Updating Settings', () => {
    beforeEach(() => {
      service = new ChannelSettingsService();
      // Reset setItem spy calls for each specific update test
      (localStorage.setItem as jasmine.Spy).calls.reset();
    });

    it('updateNumChannels should update numChannels and adjust descriptions, then save', (done) => {
      const initialDescs = service.getCurrentChannelDescriptions(); // Should be 4 default names
      service.updateNumChannels(2);
      const settingsAfterUpdate = service.getCurrentAppSettings();
      expect(settingsAfterUpdate.numChannels).toBe(2);
      expect(settingsAfterUpdate.channelDescriptions).toEqual(initialDescs.slice(0,2));
      expect(localStorage.setItem).toHaveBeenCalledWith(settingsKey, JSON.stringify(settingsAfterUpdate));

      service.getAppSettings().subscribe(s => { // Check observable emission
        expect(s.numChannels).toBe(2);
        done();
      });
    });

    it('updateChannelDescriptions should update descriptions and save', (done) => {
      const newDescriptions = ['D1', 'D2', 'D3', 'D4']; // Assuming numChannels is 4
      service.updateChannelDescriptions(newDescriptions);
      const settingsAfterUpdate = service.getCurrentAppSettings();
      expect(settingsAfterUpdate.channelDescriptions).toEqual(newDescriptions);
      expect(localStorage.setItem).toHaveBeenCalledWith(settingsKey, JSON.stringify(settingsAfterUpdate));
      done();
    });

    it('updateSingleChannelDescription should update one description and save', (done) => {
      service.updateSingleChannelDescription(1, 'New Banana');
      const settingsAfterUpdate = service.getCurrentAppSettings();
      expect(settingsAfterUpdate.channelDescriptions[1]).toBe('New Banana');
      expect(localStorage.setItem).toHaveBeenCalledWith(settingsKey, JSON.stringify(settingsAfterUpdate));
      done();
    });

    it('updateBackendUrl should update backendUrl and save', (done) => {
      const newUrl = 'http://new.api';
      service.updateBackendUrl(newUrl);
      const settingsAfterUpdate = service.getCurrentAppSettings();
      expect(settingsAfterUpdate.backendUrl).toBe(newUrl);
      expect(localStorage.setItem).toHaveBeenCalledWith(settingsKey, JSON.stringify(settingsAfterUpdate));
      done();
    });

    it('updateCrossfadeDurationSeconds should update duration and save', (done) => {
      const newDuration = 2.5;
      service.updateCrossfadeDurationSeconds(newDuration);
      const settingsAfterUpdate = service.getCurrentAppSettings();
      expect(settingsAfterUpdate.crossfadeDurationSeconds).toBe(newDuration);
      expect(localStorage.setItem).toHaveBeenCalledWith(settingsKey, JSON.stringify(settingsAfterUpdate));
      done();
    });
  });

  it('resetToDefaults should reset all settings to their default values', (done) => {
    service = new ChannelSettingsService();
    service.updateBackendUrl("http://test.com"); // Change something
    (localStorage.setItem as jasmine.Spy).calls.reset();

    service.resetToDefaults();
    const currentSettings = service.getCurrentAppSettings();
    expect(currentSettings).toEqual(initialDefaultSettings); // Compare with the defined defaults
    expect(localStorage.setItem).toHaveBeenCalledWith(settingsKey, JSON.stringify(initialDefaultSettings));

    service.getAppSettings().subscribe(s => {
      expect(s).toEqual(initialDefaultSettings);
      done();
    });
  });
});
