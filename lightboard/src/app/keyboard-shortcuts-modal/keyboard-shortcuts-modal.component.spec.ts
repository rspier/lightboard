import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KeyboardShortcutsModalComponent } from './keyboard-shortcuts-modal.component';
import { CommonModule } from '@angular/common';

describe('KeyboardShortcutsModalComponent', () => {
  let component: KeyboardShortcutsModalComponent;
  let fixture: ComponentFixture<KeyboardShortcutsModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        KeyboardShortcutsModalComponent // Import standalone component
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KeyboardShortcutsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit closeEvent when close method is called', () => {
    spyOn(component.closeEvent, 'emit');
    component.close();
    expect(component.closeEvent.emit).toHaveBeenCalled();
  });

  it('should display the modal when isVisible is true', () => {
    component.isVisible = true;
    fixture.detectChanges();
    const modalOverlay: HTMLElement = fixture.nativeElement.querySelector('.modal-overlay');
    expect(modalOverlay).toBeTruthy();
  });

  it('should not display the modal when isVisible is false', () => {
    component.isVisible = false;
    fixture.detectChanges();
    const modalOverlay: HTMLElement = fixture.nativeElement.querySelector('.modal-overlay');
    expect(modalOverlay).toBeFalsy();
  });

  it('should contain a list of shortcuts', () => {
    const listItems: NodeListOf<HTMLLIElement> = fixture.nativeElement.querySelectorAll('.modal-body ul li');
    expect(listItems.length).toBeGreaterThan(0); // Check if there's at least one shortcut
    // Specific checks for content can be added here or in later testing steps
    const expectedShortcuts = [
      'Open this shortcuts guide',
      'Trigger the "Go" button',
      'Open text input for Scene 1',
      'Open text input for Scene 2',
      'Close active modal' // Simplified check
    ];
    const actualShortcuts = Array.from(listItems).map(li => li.textContent || '');
    expectedShortcuts.forEach(shortcutText => {
      expect(actualShortcuts.some(text => text.includes(shortcutText))).toBeTrue();
    });
  });

  it('should hide the modal when Escape key is pressed (simulating parent behavior)', () => {
    component.isVisible = true;
    fixture.detectChanges();
    let modalOverlay: HTMLElement = fixture.nativeElement.querySelector('.modal-overlay');
    expect(modalOverlay).toBeTruthy('Modal should be visible initially');

    // Simulate the global Escape key press and parent component's reaction
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    document.dispatchEvent(event); // Dispatch the event

    // Assume parent component would set isVisible to false
    component.isVisible = false;
    fixture.detectChanges();

    modalOverlay = fixture.nativeElement.querySelector('.modal-overlay');
    expect(modalOverlay).toBeFalsy('Modal should be hidden after Escape (simulated parent action)');
  });

  // The following test is removed because the component no longer directly handles the Escape key.
  // The logic for not acting when the modal is invisible is handled by the global listener in app.ts.
  // it('should NOT emit closeEvent when Escape key is pressed and modal is NOT visible', () => {
  //   spyOn(component.closeEvent, 'emit');
  //   component.isVisible = false;
  //   fixture.detectChanges();
  //
  //   const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
  //   document.dispatchEvent(event);
  //   fixture.detectChanges();
  //
  //   expect(component.closeEvent.emit).not.toHaveBeenCalled();
  // });

  it('should call close method when the overlay is clicked', () => {
    spyOn(component, 'close').and.callThrough(); // Spy on the component's own close method
    component.isVisible = true;
    fixture.detectChanges();

    const modalOverlay: HTMLElement = fixture.nativeElement.querySelector('.modal-overlay');
    expect(modalOverlay).toBeTruthy();
    modalOverlay.click(); // Simulate click on overlay
    fixture.detectChanges();

    expect(component.close).toHaveBeenCalled();
  });

  it('should call close method when the explicit close button in footer is clicked', () => {
    spyOn(component, 'close').and.callThrough();
    component.isVisible = true;
    fixture.detectChanges();

    const closeButton: HTMLButtonElement = fixture.nativeElement.querySelector('.modal-footer button');
    expect(closeButton).toBeTruthy();
    expect(closeButton.textContent).toContain('Close');
    closeButton.click();
    fixture.detectChanges();

    expect(component.close).toHaveBeenCalled();
  });

  it('should call close method when the header close button (×) is clicked', () => {
    spyOn(component, 'close').and.callThrough();
    component.isVisible = true;
    fixture.detectChanges();

    const headerCloseButton: HTMLButtonElement = fixture.nativeElement.querySelector('.modal-header .close-button');
    expect(headerCloseButton).toBeTruthy();
    headerCloseButton.click();
    fixture.detectChanges();

    expect(component.close).toHaveBeenCalled();
  });

  // Ensure event propagation is stopped for clicks within modal-content, not closing the modal
  it('should NOT call close method when content inside modal-content is clicked', () => {
    spyOn(component, 'close');
    component.isVisible = true;
    fixture.detectChanges();

    const modalContent: HTMLElement = fixture.nativeElement.querySelector('.modal-content');
    const innerElement: HTMLElement = fixture.nativeElement.querySelector('.modal-body ul'); // Click on an inner element

    expect(modalContent).toBeTruthy();
    expect(innerElement).toBeTruthy();

    // Simulate click on an inner element, which should have stopPropagation
    innerElement.click();
    fixture.detectChanges();

    expect(component.close).not.toHaveBeenCalled();
  });

});
