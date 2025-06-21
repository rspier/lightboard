import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-scene-text-input-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './scene-text-input-modal.component.html',
  styleUrl: './scene-text-input-modal.component.css'
})
export class SceneTextInputModalComponent implements OnChanges, AfterViewChecked {
  @Input() isVisible: boolean = false;
  @Input() sceneLabel: string = '';
  @Input() initialValue: string = '';

  @Output() closeModal = new EventEmitter<void>();
  @Output() applyCommands = new EventEmitter<string>();

  @ViewChild('textInput') textInputField!: ElementRef<HTMLInputElement>;
  private fieldFocused: boolean = false;

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

  ngAfterViewChecked(): void {
    if (this.isVisible && this.textInputField && !this.fieldFocused) {
      // Use setTimeout to ensure the element is fully rendered and focusable
      // particularly if visibility is controlled by *ngIf which might lag slightly.
      setTimeout(() => {
        this.textInputField.nativeElement.focus();
        this.fieldFocused = true;
      }, 0);
    }
    // Reset flag when modal is hidden so it can be focused again next time it opens
    if (!this.isVisible && this.fieldFocused) {
      this.fieldFocused = false;
    }
  }
}
