import { Component, EventEmitter, Output, Input, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-keyboard-shortcuts-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './keyboard-shortcuts-modal.component.html',
  styleUrls: ['./keyboard-shortcuts-modal.component.css']
})
export class KeyboardShortcutsModalComponent {
  @Input() isVisible: boolean = false;
  @Output() closeEvent = new EventEmitter<void>();

  constructor() { }

  close(): void {
    this.closeEvent.emit();
  }

  // Optional: Close modal on Escape key press directly within the component
  // This can be redundant if the parent component already handles global Escape
  // but can be useful if this modal is used in different contexts.
  @HostListener('document:keydown.escape') // Removed ['$event']
  onEscapeKey(): void { // Removed event parameter
    if (this.isVisible) {
      // No event object to call stopPropagation or preventDefault on,
      // but for a simple close operation, it's often not needed here.
      // The global handler in app.ts should manage preventDefault.
      this.close();
    }
  }
}
