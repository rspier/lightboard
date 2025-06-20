import { TestBed } from '@angular/core/testing';
import { ChannelSettingsService } from './channel-settings.service';

describe('ChannelSettingsService', () => {
  let service: ChannelSettingsService;
  let store: { [key: string]: string } = {}; // Mock localStorage

  const mockLocalStorage = {
    getItem: (key: string): string | null => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };

  beforeEach(() => {
    store = {}; // Reset store for each test
    spyOn(localStorage, 'getItem').and.callFake(mockLocalStorage.getItem);
    spyOn(localStorage, 'setItem').and.callFake(mockLocalStorage.setItem);
    // spyOn(localStorage, 'removeItem').and.callFake(mockLocalStorage.removeItem); // Not used by service
    // spyOn(localStorage, 'clear').and.callFake(mockLocalStorage.clear); // Not used by service

    TestBed.configureTestingModule({
      providers: [ChannelSettingsService]
    });
    service = TestBed.inject(ChannelSettingsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should load default descriptions if localStorage is empty and save them', () => {
    // Service constructor calls loadDescriptions which calls saveDescriptions if no data
    expect(service.getCurrentDescriptions()).toEqual(['Apple', 'Banana', 'Cherry', 'Date']);
    expect(localStorage.setItem).toHaveBeenCalledWith('channelDescriptions', JSON.stringify(['Apple', 'Banana', 'Cherry', 'Date']));
  });

  it('should load descriptions from localStorage if available and valid', () => {
    const stored = ['Test1', 'Test2', 'Test3', 'Test4'];
    // Pre-populate store before service instantiation for this test case
    store['channelDescriptions'] = JSON.stringify(stored);
    service = new ChannelSettingsService(); // Create a new instance for this test

    expect(service.getCurrentDescriptions()).toEqual(stored);
  });

  it('should update a specific description and save to localStorage', (done) => {
    const newName = 'Red Delicious';
    const initialDescriptions = service.getCurrentDescriptions(); // Get initial state for comparison
    const expectedDescriptions = [...initialDescriptions];
    expectedDescriptions[0] = newName;

    service.updateDescription(0, newName);
    expect(service.getCurrentDescriptions()[0]).toBe(newName);
    expect(localStorage.setItem).toHaveBeenCalledWith('channelDescriptions', JSON.stringify(expectedDescriptions));

    service.getDescriptions().subscribe(descriptions => {
      expect(descriptions[0]).toBe(newName);
      done();
    });
  });

  it('should update all descriptions and save to localStorage', (done) => {
    const newNames = ['One', 'Two', 'Three', 'Four'];
    service.updateAllDescriptions(newNames);
    expect(service.getCurrentDescriptions()).toEqual(newNames);
    expect(localStorage.setItem).toHaveBeenCalledWith('channelDescriptions', JSON.stringify(newNames));

    service.getDescriptions().subscribe(descriptions => {
      expect(descriptions).toEqual(newNames);
      done();
    });
  });

  it('should reset descriptions to defaults', (done) => {
    // First change them
    service.updateDescription(0, 'Changed');
    // Then reset
    service.resetToDefaults();
    const defaults = ['Apple', 'Banana', 'Cherry', 'Date'];
    expect(service.getCurrentDescriptions()).toEqual(defaults);
    expect(localStorage.setItem).toHaveBeenCalledWith('channelDescriptions', JSON.stringify(defaults));

    service.getDescriptions().subscribe(descriptions => {
      expect(descriptions).toEqual(defaults);
      done();
    });
  });

  it('should handle invalid JSON stored data by falling back to defaults', () => {
    store['channelDescriptions'] = "invalid json"; // Invalid JSON string
    service = TestBed.inject(ChannelSettingsService); // Re-inject
    expect(service.getCurrentDescriptions()).toEqual(['Apple', 'Banana', 'Cherry', 'Date']);
    expect(localStorage.setItem).toHaveBeenCalledWith('channelDescriptions', JSON.stringify(['Apple', 'Banana', 'Cherry', 'Date']));
  });

  it('should handle invalid array length stored data by falling back to defaults', () => {
    store['channelDescriptions'] = JSON.stringify(['OnlyOne']); // Array of wrong length
    service = TestBed.inject(ChannelSettingsService); // Re-inject
    expect(service.getCurrentDescriptions()).toEqual(['Apple', 'Banana', 'Cherry', 'Date']);
  });

  it('should handle invalid array item type stored data by falling back to defaults', () => {
    store['channelDescriptions'] = JSON.stringify(['Valid', 'Valid', 123, 'Valid']); // Contains a number
    service = TestBed.inject(ChannelSettingsService); // Re-inject
    expect(service.getCurrentDescriptions()).toEqual(['Apple', 'Banana', 'Cherry', 'Date']);
  });

  it('should not update description for out-of-bounds index (negative)', () => {
    const initialDescriptions = [...service.getCurrentDescriptions()];
    console.error = jasmine.createSpy(); // Suppress console error for this test
    service.updateDescription(-1, 'New Name');
    expect(service.getCurrentDescriptions()).toEqual(initialDescriptions);
    expect(console.error).toHaveBeenCalledWith('ChannelSettingsService: Index -1 out of bounds.');
  });

  it('should not update description for out-of-bounds index (too large)', () => {
    const initialDescriptions = [...service.getCurrentDescriptions()];
    console.error = jasmine.createSpy();
    service.updateDescription(initialDescriptions.length, 'New Name');
    expect(service.getCurrentDescriptions()).toEqual(initialDescriptions);
    expect(console.error).toHaveBeenCalledWith(`ChannelSettingsService: Index ${initialDescriptions.length} out of bounds.`);
  });

  it('should not update all descriptions if newDescriptions array is null', () => {
    const initialDescriptions = [...service.getCurrentDescriptions()];
    console.error = jasmine.createSpy();
    service.updateAllDescriptions(null as any); // Test with null
    expect(service.getCurrentDescriptions()).toEqual(initialDescriptions);
    expect(console.error).toHaveBeenCalledWith('ChannelSettingsService: Invalid descriptions array provided for updateAll.');
  });

  it('should not update all descriptions if newDescriptions array has wrong length', () => {
    const initialDescriptions = [...service.getCurrentDescriptions()];
    console.error = jasmine.createSpy();
    service.updateAllDescriptions(['Too', 'Short']); // Test with wrong length
    expect(service.getCurrentDescriptions()).toEqual(initialDescriptions);
    expect(console.error).toHaveBeenCalledWith('ChannelSettingsService: Invalid descriptions array provided for updateAll.');
  });
});
