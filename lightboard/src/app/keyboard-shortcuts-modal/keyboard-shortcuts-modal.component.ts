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
  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: KeyboardEvent): void {
    if (this.isVisible) {
      // event.stopPropagation(); // Prevent other escape listeners if needed
      this.close();
    }
  }
}
