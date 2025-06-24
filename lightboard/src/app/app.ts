import { Component, OnInit, OnDestroy, ChangeDetectorRef, Renderer2, Inject } from '@angular/core';
import { DOCUMENT, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { SlidePotentiometerComponent } from './slide-potentiometer/slide-potentiometer';
import { CombinedOutputDisplayComponent } from './combined-output-display/combined-output-display.component';
import { SettingsModalComponent } from './settings-modal/settings-modal.component';
import { KeyboardShortcutsModalComponent } from './keyboard-shortcuts-modal/keyboard-shortcuts-modal.component';
import { SceneTextInputModalComponent } from './scene-text-input-modal/scene-text-input-modal.component';
// import { RotaryDialComponent } from './rotary-dial/rotary-dial.component'; // Removed
import { ChannelSettingsService, AppSettings } from './channel-settings.service';
import { HttpDataService, CombinedOutputData } from './http-data.service';
import { GIT_COMMIT_HASH } from '../environments/version';

interface PotentiometerState {
  channelNumber: number;
  channelDescription: string;
  value: number;
  color: string;
}

interface ParsedCommand {
  channel: number; // 1-based
  level: number;   // 0-100
  color?: string;  // Hex string like #RRGGBB, normalized
}

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    FormsModule,
    RouterOutlet,
    SlidePotentiometerComponent,
    CombinedOutputDisplayComponent,
    SettingsModalComponent,
    SceneTextInputModalComponent,
    KeyboardShortcutsModalComponent
    // RotaryDialComponent // Removed
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  protected title = 'lightboard';
  public gitCommitHash: string = GIT_COMMIT_HASH;

  row1States: PotentiometerState[] = [];
  row2States: PotentiometerState[] = [];
  crossfaderValue: number = 50;
  combinedOutputStates: PotentiometerState[] = [];
  isAnimating: boolean = false;
  animationInterval: any = null;
  showSettingsModal: boolean = false;
  showShortcutsModal: boolean = false;
  private settingsSubscription: Subscription | undefined;

  // Crossfade duration managed by app, controlled by rotary dial
  displayCrossfadeDurationSeconds: number = 0.5; // Default, will be overwritten by service on init

  // State variables for Scene Text Input Modal
  showSceneTextInputModal: boolean = false;
  currentSceneForModal: 1 | 2 | null = null;
  modalInitialText: string = '';
  scene1CommandsString: string = '';
  scene2CommandsString: string = '';
  modalFeedbackMessages: {text: string, type: 'error' | 'success'}[] = []; // Renamed and typed

  private unlistenKeyDown: (() => void) | undefined; // For keyboard shortcut listener cleanup

  private currentNumChannels: number;
  private currentBackendUrl: string;
  private currentCrossfadeDurationMs: number;
  private currentDarkMode: boolean;
  isShiftPressed: boolean = false; // For dynamic arrow and shift-action
  // effectiveGoTarget will be determined by a method now

  private defaultColorsScene1: string[] = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#800080', '#a52a2a', '#808000', '#008080', '#800000'];
  private defaultColorsScene2: string[] = ['#00ffff', '#ff00ff', '#ffff00', '#0000ff', '#00ff00', '#ff0000', '#800080', '#ffa500', '#808000', '#a52a2a', '#800000', '#008080'];
  private unlistenShiftDown: (() => void) | undefined;
  private unlistenShiftUp: (() => void) | undefined;

  constructor(
    private cdr: ChangeDetectorRef,
    private channelSettingsService: ChannelSettingsService,
    private httpDataService: HttpDataService,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {
    const initialSettings = this.channelSettingsService.getCurrentAppSettings();
    this.currentNumChannels = initialSettings.numChannels;
    this.currentBackendUrl = initialSettings.backendUrl;
    // Initialize displayCrossfadeDurationSeconds from service, which then updates currentCrossfadeDurationMs
    this.displayCrossfadeDurationSeconds = initialSettings.crossfadeDurationSeconds;
    this.currentCrossfadeDurationMs = this.displayCrossfadeDurationSeconds * 1000;
    this.currentDarkMode = initialSettings.darkMode;
    this.initializeChannelStates(this.currentNumChannels, initialSettings.channelDescriptions);
    this.applyTheme(this.currentDarkMode);
  }

  initializeChannelStates(numChannels: number, descriptions: string[]): void {
    this.row1States = [];
    this.row2States = [];
    for (let i = 0; i < numChannels; i++) {
      this.row1States.push({ channelNumber: i + 1, channelDescription: descriptions[i] || `Channel ${i + 1}`, value: 0, color: this.defaultColorsScene1[i] || '#ffffff' });
      this.row2States.push({ channelNumber: i + 1, channelDescription: descriptions[i] || `Channel ${i + 1}`, value: 100, color: this.defaultColorsScene2[i] || '#ffffff' });
    }
    this.calculateCombinedOutputs();
  }

  ngOnInit(): void {
    this.settingsSubscription = this.channelSettingsService.getAppSettings().subscribe(settings => {
      let channelsOrDescriptionsChanged = false;
      if (this.currentNumChannels !== settings.numChannels) {
        this.currentNumChannels = settings.numChannels;
        this.initializeChannelStates(settings.numChannels, settings.channelDescriptions);
        channelsOrDescriptionsChanged = true;
      } else {
        const newDescriptions = settings.channelDescriptions;
        let descriptionsActuallyChanged = false;
        this.row1States = this.row1States.map((state, index) => { if(state.channelDescription !== (newDescriptions[index] || `Channel ${index + 1}`)) { descriptionsActuallyChanged = true; } return { ...state, channelDescription: newDescriptions[index] || `Channel ${index + 1}` }; });
        this.row2States = this.row2States.map((state, index) => { if(state.channelDescription !== (newDescriptions[index] || `Channel ${index + 1}`)) { descriptionsActuallyChanged = true; } return { ...state, channelDescription: newDescriptions[index] || `Channel ${index + 1}` }; });
        if(descriptionsActuallyChanged) channelsOrDescriptionsChanged = true;
      }
      this.currentBackendUrl = settings.backendUrl;
      // Update displayCrossfadeDurationSeconds if it changed in settings (e.g., due to reset)
      // This will also update currentCrossfadeDurationMs via its setter or direct update.
      if (this.displayCrossfadeDurationSeconds !== settings.crossfadeDurationSeconds) {
        this.displayCrossfadeDurationSeconds = settings.crossfadeDurationSeconds;
        this.currentCrossfadeDurationMs = this.displayCrossfadeDurationSeconds * 1000;
      }
      if (this.currentDarkMode !== settings.darkMode) {
        this.currentDarkMode = settings.darkMode;
        this.applyTheme(this.currentDarkMode);
      }
      if (channelsOrDescriptionsChanged) { this.calculateCombinedOutputs(); }
      this.cdr.detectChanges();
    });

    // Shift key listeners
    this.unlistenShiftDown = this.renderer.listen('document', 'keydown', (event: KeyboardEvent) => {
      if (event.key === 'Shift' && !this.isShiftPressed) {
        this.isShiftPressed = true;
        this.updateEffectiveGoTarget();
      }
    });
    this.unlistenShiftUp = this.renderer.listen('document', 'keyup', (event: KeyboardEvent) => {
      if (event.key === 'Shift' && this.isShiftPressed) {
        this.isShiftPressed = false;
        this.updateEffectiveGoTarget();
      }
    });

    // Setup global keyboard listener for other shortcuts
    this.unlistenKeyDown = this.renderer.listen('document', 'keydown', (event: KeyboardEvent) => {
      const activeElement = document.activeElement as HTMLElement;
      const isInputFocused = activeElement &&
                             (activeElement.tagName === 'INPUT' ||
                              activeElement.tagName === 'TEXTAREA' ||
                              activeElement.tagName === 'SELECT');

      // Handle Escape key for modals first
      if (event.key === 'Escape') {
        if (this.showShortcutsModal) { event.preventDefault(); this.closeShortcutsModal(); return; }
        if (this.showSceneTextInputModal) { event.preventDefault(); this.handleCloseSceneTextInputModal(); return; }
        if (this.showSettingsModal) { event.preventDefault(); this.toggleSettingsModal(); return; }
      }

      // If Shift is pressed, it might be part of Space+Shift for Go button, or another Shift-modified shortcut (none currently)
      // The primary check for other shortcuts not to activate when an input/modal is active:
      if (isInputFocused || this.showSceneTextInputModal || this.showSettingsModal || this.showShortcutsModal) {
        // Allow Shift key itself to pass through for its own state tracking, even if a modal is open.
        // Otherwise, if a modal opens while Shift is held, 'isShiftPressed' might get stuck.
        if (event.key !== 'Shift') {
          return;
        }
      }

      // Process other shortcuts
      // Note: event.shiftKey is used here for Q and W to ensure they are NOT triggered if Shift is held.
      // For Spacebar, onGoButtonClick will use this.isShiftPressed internally.
      if (!event.shiftKey && event.key.toLowerCase() === 'q') { event.preventDefault(); this.toggleSceneTextInput(1); }
      else if (!event.shiftKey && event.key.toLowerCase() === 'w') { event.preventDefault(); this.toggleSceneTextInput(2); }
      else if (event.key === '?') { event.preventDefault(); this.toggleShortcutsModal(); }
      else if (event.code === 'Space' || event.key === ' ') {
        event.preventDefault();
        this.onGoButtonClick(); // onGoButtonClick will use this.isShiftPressed
      }
    });

    // Explicitly ensure shortcuts modal is closed after init,
    // as a safeguard against unexpected opening.
    this.showShortcutsModal = false;
    this.cdr.detectChanges(); // Ensure UI reflects this state if it was somehow changed
  }

  ngOnDestroy(): void {
    if (this.animationInterval) { clearInterval(this.animationInterval); }
    if (this.settingsSubscription) { this.settingsSubscription.unsubscribe(); }
    if (this.unlistenKeyDown) { this.unlistenKeyDown(); }
    if (this.unlistenShiftDown) { this.unlistenShiftDown(); }
    if (this.unlistenShiftUp) { this.unlistenShiftUp(); }
  }

  private applyTheme(isDarkMode: boolean): void {
    if (isDarkMode) { this.renderer.addClass(this.document.body, 'dark-theme'); } else { this.renderer.removeClass(this.document.body, 'dark-theme'); }
  }
  private hexToRgb(hex: string): { r: number; g: number; b: number } | null { const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex); return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null; }
  private rgbToHex(r: number, g: number, b: number): string { return ("#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).padStart(6, '0')).toLowerCase(); }

  calculateCombinedOutputs(): void {
    if (!this.row1States || !this.row2States || this.row1States.length !== this.row2States.length || this.row1States.length === 0 || this.row1States.length !== this.currentNumChannels ) {
      this.combinedOutputStates = Array.from({length: this.currentNumChannels || 0}, (_, i) => {
        const desc = this.channelSettingsService.getCurrentChannelDescriptions();
        return { channelNumber: i + 1, channelDescription: (desc && desc[i]) || `Channel ${i+1}`, value: 0, color: '#000000' };
      });
      return;
    }

    this.combinedOutputStates = this.row1States.map((row1State, index) => {
      const row2State = this.row2States[index];
      const crossfadeS1Ratio = this.crossfaderValue / 100; // Scene 1's influence
      const crossfadeS2Ratio = 1 - crossfadeS1Ratio;    // Scene 2's influence

      // Calculate combined intensity (value) - remains unchanged
      const combinedValue = (row1State.value * crossfadeS1Ratio) + (row2State.value * crossfadeS2Ratio);

      // New color blending logic
      let blendedColorHex = '#000000'; // Default to black
      const intensity1 = row1State.value / 100.0; // Normalize to 0-1
      const intensity2 = row2State.value / 100.0; // Normalize to 0-1

      const color1_rgb = this.hexToRgb(row1State.color);
      const color2_rgb = this.hexToRgb(row2State.color);

      if (intensity1 > 0 && intensity2 <= 0) {
        blendedColorHex = row1State.color;
      } else if (intensity1 <= 0 && intensity2 > 0) {
        blendedColorHex = row2State.color;
      } else if (intensity1 > 0 && intensity2 > 0 && color1_rgb && color2_rgb) {
        const weightedIntensity1 = intensity1 * crossfadeS1Ratio;
        const weightedIntensity2 = intensity2 * crossfadeS2Ratio;
        const totalEffectiveIntensityForColor = weightedIntensity1 + weightedIntensity2;

        if (totalEffectiveIntensityForColor < 0.001) { // Threshold for effectively no color contribution
          blendedColorHex = '#000000';
        } else {
          const blendRatioForColor1 = weightedIntensity1 / totalEffectiveIntensityForColor;
          const blendRatioForColor2 = 1 - blendRatioForColor1; // Or weightedIntensity2 / totalEffectiveIntensityForColor

          const blendedR = Math.round((color1_rgb.r * blendRatioForColor1) + (color2_rgb.r * blendRatioForColor2));
          const blendedG = Math.round((color1_rgb.g * blendRatioForColor1) + (color2_rgb.g * blendRatioForColor2));
          const blendedB = Math.round((color1_rgb.b * blendRatioForColor1) + (color2_rgb.b * blendRatioForColor2));
          blendedColorHex = this.rgbToHex(blendedR, blendedG, blendedB);
        }
      } else { // Both intensities are 0, or one/both colors are invalid (hexToRgb returned null)
        blendedColorHex = '#000000';
      }

      return {
        channelNumber: row1State.channelNumber,
        channelDescription: row1State.channelDescription,
        value: Math.round(combinedValue),
        color: blendedColorHex
      };
    });
  }

  getEffectiveGoTarget(): 0 | 100 {
    if (this.crossfaderValue === 0) {
      return 100; // Only one way to go: up
    }
    if (this.crossfaderValue === 100) {
      return 0; // Only one way to go: down
    }
    // For intermediate values, Shift reverses the natural direction
    const naturalTargetValue = this.crossfaderValue >= 50 ? 0 : 100;
    return this.isShiftPressed ? (naturalTargetValue === 0 ? 100 : 0) : naturalTargetValue;
  }

  onPotentiometerChange(): void { this.calculateCombinedOutputs(); if (this.currentBackendUrl && this.combinedOutputStates && this.combinedOutputStates.length > 0) { this.httpDataService.postCombinedOutput(this.currentBackendUrl, this.combinedOutputStates as CombinedOutputData[]).subscribe({ next: () => {}, error: (err) => { console.error('Error posting data:', err); } }); } }
  onGoButtonClick(event?: MouseEvent): void { // event is passed but isShiftPressed property is now the source of truth for shift state affecting action
    if (this.isAnimating) {
      if (this.animationInterval) {
        clearInterval(this.animationInterval);
        this.animationInterval = null;
      }
      this.isAnimating = false;
      this.cdr.detectChanges();
    } else {
      this.animateCrossfader(this.getEffectiveGoTarget());
    }
  }
  animateCrossfader(targetValue: number): void { this.isAnimating = true; if (this.animationInterval) clearInterval(this.animationInterval); const totalDuration = this.currentCrossfadeDurationMs; const steps = 25; const intervalDuration = Math.max(1, totalDuration / steps); const initialValue = this.crossfaderValue; const stepSize = (targetValue - initialValue) / steps; let currentStep = 0; this.animationInterval = setInterval(() => { currentStep++; if (currentStep >= steps) { this.crossfaderValue = targetValue; clearInterval(this.animationInterval); this.animationInterval = null; this.isAnimating = false; } else { this.crossfaderValue = initialValue + (stepSize * currentStep); } this.crossfaderValue = Math.max(0, Math.min(100, this.crossfaderValue)); this.onPotentiometerChange(); this.cdr.detectChanges(); }, intervalDuration); }

  private updateEffectiveGoTarget(): void {
    // This method is called on Shift keydown/keyup to update UI if needed
    // For now, button text relies on getEffectiveGoTarget directly,
    // but cdr.detectChanges() ensures Shift state change is reflected.
    this.cdr.detectChanges();
  }

  toggleSettingsModal(): void {
    this.showSettingsModal = !this.showSettingsModal;
    this.cdr.detectChanges(); // Ensure UI updates
  }
  toggleShortcutsModal(): void {
    this.showShortcutsModal = !this.showShortcutsModal;
    this.cdr.detectChanges(); // Ensure UI updates
  }
  closeShortcutsModal(): void {
    this.showShortcutsModal = false;
    this.cdr.detectChanges(); // Ensure UI updates
  }
  public trackByCombinedState(index: number, item: PotentiometerState): number { return item.channelNumber; }
  public trackByState(index: number, item: PotentiometerState): number { return item.channelNumber; }

  onCrossfadeDurationSliderChange(event: Event): void {
    const newDuration = parseFloat((event.target as HTMLInputElement).value);
    this.displayCrossfadeDurationSeconds = newDuration;
    this.currentCrossfadeDurationMs = newDuration * 1000;
    this.channelSettingsService.updateCrossfadeDurationSeconds(newDuration);
    this.cdr.detectChanges();
  }

  // Updated toggle function for modal
  toggleSceneTextInput(sceneNumber: 1 | 2): void {
    this.currentSceneForModal = sceneNumber;
    this.modalInitialText = ''; // Always open with a clear input field
    if (sceneNumber === 1) {
      this.scene1CommandsString = ''; // Clear stored commands for Scene 1
    } else if (sceneNumber === 2) {
      this.scene2CommandsString = ''; // Clear stored commands for Scene 2
    }
    this.showSceneTextInputModal = true;
    this.modalFeedbackMessages = []; // Clear previous messages when opening modal
    this.cdr.detectChanges();
  }

  // Handler for closing the modal
  handleCloseSceneTextInputModal(): void {
    this.showSceneTextInputModal = false;
    this.currentSceneForModal = null;
    this.modalInitialText = ''; // Clear initial text for next opening
    this.modalFeedbackMessages = []; // Also clear messages when modal is explicitly closed
    this.cdr.detectChanges();
  }

  // Handler for applying commands from the modal
  handleApplySceneCommandsFromModal(commandsText: string): void {
    if (this.currentSceneForModal === null) {
      console.error('currentSceneForModal is null. Cannot apply commands.');
      // This case should ideally not happen if UI controls are correct
      this.modalFeedbackMessages = [{ text: 'Error: No scene selected. Please try opening the input again.', type: 'error'}];
      this.showSceneTextInputModal = false; // Close modal if something went wrong with context
      this.cdr.detectChanges();
      return;
    }
    const targetScene = this.currentSceneForModal;
    if (targetScene === 1) { this.scene1CommandsString = commandsText; } else { this.scene2CommandsString = commandsText; }

    this.modalFeedbackMessages = []; // Clear previous messages for new attempt

    const { commands, errors } = this.parseSceneCommands(commandsText, this.currentNumChannels);

    if (errors.length > 0) {
      errors.forEach(err => this.modalFeedbackMessages.push({ text: err, type: 'error' }));
      if (commands.length > 0) {
        this.modalFeedbackMessages.push({ text: "Some commands were parsed but not applied due to errors. Please fix errors and try again.", type: 'error'});
      }
      // Modal remains open for user to correct errors. Messages are passed to modal.
    } else if (commands.length > 0) {
      const targetStates = targetScene === 1 ? this.row1States : this.row2States;
      const newStates = targetStates.map(s => ({ ...s }));
      let applicationErrorOccurred = false;

      commands.forEach(cmd => {
        const stateToUpdate = newStates.find(s => s.channelNumber === cmd.channel);
        if (stateToUpdate) {
          stateToUpdate.value = cmd.level;
          if (cmd.color) {
            stateToUpdate.color = cmd.color;
          }
        } else {
           this.modalFeedbackMessages.push({ text: `Error during application: Channel ${cmd.channel} not found in scene ${targetScene}. This shouldn't happen if parsing is correct.`, type: 'error'});
           applicationErrorOccurred = true;
        }
      });

      if (!applicationErrorOccurred) {
        if (targetScene === 1) { this.row1States = newStates; } else { this.row2States = newStates; }
        this.calculateCombinedOutputs();
        this.onPotentiometerChange();
        this.modalFeedbackMessages.push({ text: `Applied ${commands.length} command(s) successfully to Scene ${targetScene}.`, type: 'success'});
        this.showSceneTextInputModal = false;
        this.currentSceneForModal = null;
      } else {
        // Application errors occurred, modal remains open, messages passed.
      }
    } else {
      this.modalFeedbackMessages.push({ text: "No commands were entered or applied.", type: 'error' }); // Or 'info' type if we add it
      // Decide if modal should close here. For now, let's keep it open to show the message.
      // If we want it to close:
      // this.showSceneTextInputModal = false;
      // this.currentSceneForModal = null;
    }
    this.cdr.detectChanges();
  }

  // Updated parseSceneCommands to handle space-separated commands from a single input string.
  private parseSceneCommands(textInput: string, numChannels: number): { commands: ParsedCommand[], errors: string[] } {
    const commands: ParsedCommand[] = [];
    const errors: string[] = [];

    // Trim the whole input, then split by any sequence of one or more commas or whitespace characters.
    // Filter out any empty strings that might result from multiple delimiters.
    const commandSegments = textInput.trim().split(/[,\s]+/).filter(segment => segment.length > 0);

    // Regex for an individual command segment
    const commandRegex = /^\s*(\d+)\s*@\s*(\d{1,3})\s*(?:#?\s*([0-9a-fA-F]{3}|[0-9a-fA-F]{6}))?\s*$/;

    commandSegments.forEach((segment, index) => {
      const match = segment.match(commandRegex);
      if (!match) {
        errors.push(`Command ${index + 1} ("${segment}"): Malformed. Expected format: channel@level[#color]`);
        return;
      }

      const channel = parseInt(match[1], 10);
      const level = parseInt(match[2], 10);
      let colorHex = match[3] ? match[3].toUpperCase() : undefined;
      let segmentError = false;

      if (isNaN(channel) || channel <= 0 || channel > numChannels) {
        errors.push(`Command ${index + 1} ("${segment}"): Channel ${match[1]} out of range (1-${numChannels}).`);
        segmentError = true;
      }
      if (isNaN(level) || level < 0 || level > 100) {
        errors.push(`Command ${index + 1} ("${segment}"): Level ${match[2]} out of range (0-100).`);
        segmentError = true;
      }
      if (colorHex) {
        if (!/^[0-9A-F]+$/.test(colorHex) || (colorHex.length !== 3 && colorHex.length !== 6)) {
          errors.push(`Command ${index + 1} ("${segment}"): Invalid color "${match[3]}". Use 3 or 6 hex characters.`);
          segmentError = true;
        } else {
          if (colorHex.length === 3) {
            colorHex = `${colorHex[0]}${colorHex[0]}${colorHex[1]}${colorHex[1]}${colorHex[2]}${colorHex[2]}`;
          }
          colorHex = `#${colorHex}`;
        }
      }
      if (!segmentError) {
        commands.push({ channel, level, color: colorHex });
      }
    });
    return { commands, errors };
  }
}
