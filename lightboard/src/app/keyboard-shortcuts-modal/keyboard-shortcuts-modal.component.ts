import { Component, EventEmitter, Output, Input } from '@angular/core'; // Removed HostListener
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-keyboard-shortcuts-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './keyboard-shortcuts-modal.component.html',
  styleUrls: ['./keyboard-shortcuts-modal.component.css']
})
export class KeyboardShortcutsModalComponent {
  @Input() isVisible = false;
  @Output() closeEvent = new EventEmitter<void>();

  constructor() {
    // This component intentionally has no specific constructor logic.
  }

  close(): void {
    this.closeEvent.emit();
  }

  // Removed the component-internal HostListener for Escape.
  // Closure via Escape key will be handled by the global listener in app.ts,
  // which calls closeShortcutsModal() that is connected to this component's parent.
  // This simplifies the modal component and centralizes Escape key logic.
}
