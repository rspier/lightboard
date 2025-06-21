import { Component, OnInit, OnDestroy, ChangeDetectorRef, Renderer2, Inject } from '@angular/core';
import { DOCUMENT, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { SlidePotentiometerComponent } from './slide-potentiometer/slide-potentiometer';
import { CombinedOutputDisplayComponent } from './combined-output-display/combined-output-display.component';
import { SettingsModalComponent } from './settings-modal/settings-modal.component';
import { SceneTextInputModalComponent } from './scene-text-input-modal/scene-text-input-modal.component';
import { ChannelSettingsService, AppSettings } from './channel-settings.service';
import { HttpDataService, CombinedOutputData } from './http-data.service';

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
    SceneTextInputModalComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  protected title = 'lightboard';

  row1States: PotentiometerState[] = [];
  row2States: PotentiometerState[] = [];
  crossfaderValue: number = 50;
  combinedOutputStates: PotentiometerState[] = [];
  isAnimating: boolean = false;
  animationInterval: any = null;
  showSettingsModal: boolean = false;
  private settingsSubscription: Subscription | undefined;

  // State variables for Scene Text Input Modal
  showSceneTextInputModal: boolean = false;
  currentSceneForModal: 1 | 2 | null = null;
  modalInitialText: string = '';
  scene1CommandsString: string = '';
  scene2CommandsString: string = '';
  applyTextCommandErrors: string[] = [];

  private currentNumChannels: number;
  private currentBackendUrl: string;
  private currentCrossfadeDurationMs: number;
  private currentDarkMode: boolean;
  private defaultColorsScene1: string[] = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#800080', '#a52a2a', '#808000', '#008080', '#800000'];
  private defaultColorsScene2: string[] = ['#00ffff', '#ff00ff', '#ffff00', '#0000ff', '#00ff00', '#ff0000', '#800080', '#ffa500', '#808000', '#a52a2a', '#800000', '#008080'];

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
    this.currentCrossfadeDurationMs = initialSettings.crossfadeDurationSeconds * 1000;
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
      this.currentCrossfadeDurationMs = settings.crossfadeDurationSeconds * 1000;
      if (this.currentDarkMode !== settings.darkMode) { this.currentDarkMode = settings.darkMode; this.applyTheme(this.currentDarkMode); }
      if (channelsOrDescriptionsChanged) { this.calculateCombinedOutputs(); }
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    if (this.animationInterval) { clearInterval(this.animationInterval); }
    if (this.settingsSubscription) { this.settingsSubscription.unsubscribe(); }
  }

  private applyTheme(isDarkMode: boolean): void { if (isDarkMode) { this.renderer.addClass(this.document.body, 'dark-theme'); } else { this.renderer.removeClass(this.document.body, 'dark-theme'); } }
  private hexToRgb(hex: string): { r: number; g: number; b: number } | null { const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex); return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null; }
  private rgbToHex(r: number, g: number, b: number): string { return ("#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).padStart(6, '0')).toLowerCase(); }

  calculateCombinedOutputs(): void {
    if (!this.row1States || !this.row2States || this.row1States.length !== this.row2States.length || this.row1States.length === 0 || this.row1States.length !== this.currentNumChannels ) { this.combinedOutputStates = Array.from({length: this.currentNumChannels || 0}, (_, i) => { const desc = this.channelSettingsService.getCurrentChannelDescriptions(); return { channelNumber: i + 1, channelDescription: (desc && desc[i]) || `Channel ${i+1}`, value: 0, color: '#000000' }; }); return; }
    this.combinedOutputStates = this.row1States.map((row1State, index) => { const row2State = this.row2States[index]; const crossfadeRatio = this.crossfaderValue / 100; const invCrossfadeRatio = 1 - crossfadeRatio; const combinedValue = (row1State.value * crossfadeRatio) + (row2State.value * invCrossfadeRatio); let blendedColorHex = '#ffffff'; const rgb1 = this.hexToRgb(row1State.color); const rgb2 = this.hexToRgb(row2State.color); if (rgb1 && rgb2) { const blendedR = Math.round(rgb1.r * crossfadeRatio + rgb2.r * invCrossfadeRatio); const blendedG = Math.round(rgb1.g * crossfadeRatio + rgb2.g * invCrossfadeRatio); const blendedB = Math.round(rgb1.b * crossfadeRatio + rgb2.b * invCrossfadeRatio); blendedColorHex = this.rgbToHex(blendedR, blendedG, blendedB); } else { if(rgb1) blendedColorHex = row1State.color; else if(rgb2) blendedColorHex = row2State.color; } return { channelNumber: row1State.channelNumber, channelDescription: row1State.channelDescription, value: Math.round(combinedValue), color: blendedColorHex }; });
  }

  onPotentiometerChange(): void { this.calculateCombinedOutputs(); if (this.currentBackendUrl && this.combinedOutputStates && this.combinedOutputStates.length > 0) { this.httpDataService.postCombinedOutput(this.currentBackendUrl, this.combinedOutputStates as CombinedOutputData[]).subscribe({ next: () => {}, error: (err) => { console.error('Error posting data:', err); } }); } }
  onGoButtonClick(): void { if (this.isAnimating) { if (this.animationInterval) { clearInterval(this.animationInterval); this.animationInterval = null; } this.isAnimating = false; this.cdr.detectChanges(); } else { const targetValue = this.crossfaderValue >= 50 ? 0 : 100; this.animateCrossfader(targetValue); } }
  animateCrossfader(targetValue: number): void { this.isAnimating = true; if (this.animationInterval) clearInterval(this.animationInterval); const totalDuration = this.currentCrossfadeDurationMs; const steps = 25; const intervalDuration = Math.max(1, totalDuration / steps); const initialValue = this.crossfaderValue; const stepSize = (targetValue - initialValue) / steps; let currentStep = 0; this.animationInterval = setInterval(() => { currentStep++; if (currentStep >= steps) { this.crossfaderValue = targetValue; clearInterval(this.animationInterval); this.animationInterval = null; this.isAnimating = false; } else { this.crossfaderValue = initialValue + (stepSize * currentStep); } this.crossfaderValue = Math.max(0, Math.min(100, this.crossfaderValue)); this.onPotentiometerChange(); this.cdr.detectChanges(); }, intervalDuration); }
  toggleSettingsModal(): void { this.showSettingsModal = !this.showSettingsModal; }
  public trackByCombinedState(index: number, item: PotentiometerState): number { return item.channelNumber; }
  public trackByState(index: number, item: PotentiometerState): number { return item.channelNumber; }

  // Updated toggle function for modal
  toggleSceneTextInput(sceneNumber: 1 | 2): void {
    this.currentSceneForModal = sceneNumber;
    this.modalInitialText = sceneNumber === 1 ? this.scene1CommandsString : this.scene2CommandsString;
    this.showSceneTextInputModal = true;
    this.applyTextCommandErrors = []; // Clear previous errors when opening modal
    this.cdr.detectChanges();
  }

  // Handler for closing the modal
  handleCloseSceneTextInputModal(): void {
    this.showSceneTextInputModal = false;
    this.currentSceneForModal = null;
    this.modalInitialText = ''; // Clear initial text for next opening
    this.cdr.detectChanges();
  }

  // Handler for applying commands from the modal
  handleApplySceneCommandsFromModal(commandsText: string): void {
    if (this.currentSceneForModal === null) {
      console.error('currentSceneForModal is null. Cannot apply commands.');
      this.applyTextCommandErrors = ['Error: No scene selected. Please try opening the input again.'];
      this.showSceneTextInputModal = false;
      this.cdr.detectChanges();
      return;
    }
    const targetScene = this.currentSceneForModal;
    if (targetScene === 1) { this.scene1CommandsString = commandsText; } else { this.scene2CommandsString = commandsText; }
    this.applyTextCommandErrors = [];
    const { commands, errors } = this.parseSceneCommands(commandsText, this.currentNumChannels);

    if (errors.length > 0) {
      this.applyTextCommandErrors.push(...errors);
      if (commands.length > 0) { // If there were some valid commands amidst errors
        this.applyTextCommandErrors.push("Some commands were parsed but not applied due to errors. Please fix errors and try again.");
      }
      // Modal remains open for user to correct errors. Errors are displayed in the main app view.
    } else if (commands.length > 0) {
      const targetStates = targetScene === 1 ? this.row1States : this.row2States;
      const newStates = targetStates.map(s => ({ ...s }));
      let applicationErrorOccurred = false; // Flag for errors during application phase

      commands.forEach(cmd => {
        const stateToUpdate = newStates.find(s => s.channelNumber === cmd.channel);
        if (stateToUpdate) {
          stateToUpdate.value = cmd.level;
          if (cmd.color) {
            stateToUpdate.color = cmd.color;
          }
        } else {
          // This error should ideally be caught by parseSceneCommands if channel numbers are validated against currentNumChannels
           this.applyTextCommandErrors.push(`Error during application: Channel ${cmd.channel} not found in scene ${targetScene}. This shouldn't happen if parsing is correct.`);
           applicationErrorOccurred = true;
        }
      });

      if (!applicationErrorOccurred) {
        if (targetScene === 1) { this.row1States = newStates; } else { this.row2States = newStates; }
        this.calculateCombinedOutputs();
        this.onPotentiometerChange();
        this.applyTextCommandErrors.push(`Applied ${commands.length} command(s) successfully to Scene ${targetScene}.`);
        this.showSceneTextInputModal = false; // Close modal on success
        this.currentSceneForModal = null;
      } else {
        // Errors occurred during the application phase itself (e.g. channel not found after parsing said it was ok)
        // Modal would remain open as per current logic flow (since showSceneTextInputModal not set to false here)
        // but errors are in applyTextCommandErrors.
      }
    } else { // No commands entered and no parsing errors
      this.applyTextCommandErrors.push("No commands were entered or applied.");
      this.showSceneTextInputModal = false; // Close modal as there's nothing to do
      this.currentSceneForModal = null;
    }
    this.cdr.detectChanges();
  }

  // Updated parseSceneCommands to handle space-separated commands from a single input string.
  private parseSceneCommands(textInput: string, numChannels: number): { commands: ParsedCommand[], errors: string[] } {
    const commands: ParsedCommand[] = [];
    const errors: string[] = [];

    // Trim the whole input, then split by any sequence of one or more whitespace characters.
    // Filter out any empty strings that might result from multiple spaces between commands.
    const commandSegments = textInput.trim().split(/\s+/).filter(segment => segment.length > 0);

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
