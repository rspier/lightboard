import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SettingsModalComponent } from './settings-modal.component';
import { ChannelSettingsService } from '../channel-settings.service';
import { BehaviorSubject } from 'rxjs'; // Corrected import for BehaviorSubject

describe('SettingsModalComponent', () => {
  let component: SettingsModalComponent;
  let fixture: ComponentFixture<SettingsModalComponent>;
  let mockChannelSettingsService: jasmine.SpyObj<ChannelSettingsService>;
  // descriptionsSubject is not strictly needed here if we mock getCurrentDescriptions for initial state
  // and don't need to test ongoing updates from the service within these modal tests.

  const initialTestDescriptions = ['Apple', 'Banana', 'Cherry', 'Date'];

  beforeEach(async () => {
    // Create a fresh BehaviorSubject for each test setup if needed, or mock methods directly
    const descriptionsSubject = new BehaviorSubject<string[]>([...initialTestDescriptions]);

    mockChannelSettingsService = jasmine.createSpyObj('ChannelSettingsService',
      ['getCurrentDescriptions', 'updateAllDescriptions', 'resetToDefaults'],
      // If getDescriptions() observable is used by component, mock it here:
      // { getDescriptions: descriptionsSubject.asObservable() }
    );
    // Setup default return values for mocked methods
    mockChannelSettingsService.getCurrentDescriptions.and.returnValue([...initialTestDescriptions]);

    await TestBed.configureTestingModule({
      imports: [FormsModule, CommonModule, SettingsModalComponent], // SettingsModalComponent is standalone
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

  it('should load current descriptions on init', () => {
    expect(component.descriptions).toEqual(initialTestDescriptions);
    expect(mockChannelSettingsService.getCurrentDescriptions).toHaveBeenCalledTimes(1);
  });

  it('should call updateAllDescriptions on saveSettings and emit close', () => {
    spyOn(component.close, 'emit');
    component.descriptions[0] = 'New Apple'; // Modify local copy
    const expectedDescriptions = ['New Apple', 'Banana', 'Cherry', 'Date'];

    component.saveSettings();

    expect(mockChannelSettingsService.updateAllDescriptions).toHaveBeenCalledWith(expectedDescriptions);
    expect(component.close.emit).toHaveBeenCalled();
  });

  it('should emit close on cancel', () => {
    spyOn(component.close, 'emit');
    component.cancel();
    expect(component.close.emit).toHaveBeenCalled();
  });

  it('should call resetToDefaults on reset and update local descriptions', () => {
    const defaultDescsFromService = ['Default1', 'D2', 'D3', 'D4'];
    // When resetToDefaults is called, the service will update.
    // The component then calls getCurrentDescriptions again.
    mockChannelSettingsService.resetToDefaults.and.callFake(() => {
      // Simulate service updating its internal state and thus what getCurrentDescriptions returns next
      mockChannelSettingsService.getCurrentDescriptions.and.returnValue([...defaultDescsFromService]);
    });

    spyOn(window, 'confirm').and.returnValue(true); // Mock confirm to return true
    component.resetToDefaults();

    expect(mockChannelSettingsService.resetToDefaults).toHaveBeenCalledTimes(1);
    // Expect that getCurrentDescriptions was called again after reset to update local descriptions
    expect(mockChannelSettingsService.getCurrentDescriptions).toHaveBeenCalledTimes(2); // Once in ngOnInit, once in resetToDefaults
    expect(component.descriptions).toEqual(defaultDescsFromService);
  });

  it('should not call resetToDefaults if confirm is false', () => {
    spyOn(window, 'confirm').and.returnValue(false);
    component.resetToDefaults();
    expect(mockChannelSettingsService.resetToDefaults).not.toHaveBeenCalled();
  });
});
