import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-scene-text-input-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './scene-text-input-modal.component.html',
  styleUrl: './scene-text-input-modal.component.css'
})
export class SceneTextInputModalComponent implements OnChanges {
  @Input() isVisible: boolean = false;
  @Input() sceneLabel: string = '';
  @Input() initialValue: string = '';

  @Output() closeModal = new EventEmitter<void>();
  @Output() applyCommands = new EventEmitter<string>();

  textInputValue: string = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialValue']) {
      this.textInputValue = this.initialValue;
    }
  }

  onApply(): void {
    this.applyCommands.emit(this.textInputValue);
  }

  onCancel(): void {
    this.closeModal.emit();
  }

  onInputEnter(event: KeyboardEvent): void {
    event.preventDefault(); // Good practice, though Enter in text input doesn't add newline by default
    this.onApply();
  }
}
