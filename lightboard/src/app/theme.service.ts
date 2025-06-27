import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Theme {
  id: string; // e.g., 'light', 'dark', 'lcars'
  name: string; // e.g., 'Light', 'Dark', 'LCARS'
  className: string; // e.g., 'light-theme', 'dark-theme', 'lcars-theme'
}

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private renderer: Renderer2;
  private currentThemeId: string;
  private themes: Theme[] = [
    { id: 'light', name: 'Light', className: 'light-theme' }, // Default light theme has no specific class in styles.css but we'll add one for consistency
    { id: 'dark', name: 'Dark', className: 'dark-theme' },
    { id: 'lcars', name: 'LCARS', className: 'lcars-theme' },
    { id: 'steampunk', name: 'Steampunk', className: 'steampunk-theme' },
    { id: 'extra-dark', name: 'Extra Dark', className: 'extra-dark-theme' },
    { id: 'metal', name: 'Metal', className: 'metal-theme' },
    { id: 'apple-2', name: 'Apple ][', className: 'apple-2-theme' },
    { id: 'glass', name: 'Glass', className: 'glass-theme' },
    { id: 'night-vision', name: 'Night Vision', className: 'night-vision-theme' },
  ];

  public activeTheme$: BehaviorSubject<Theme | null> = new BehaviorSubject<Theme | null>(null);

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
    // Load initial theme from local storage or default to 'light'
    const savedThemeId = localStorage.getItem('activeThemeId') || 'light';
    this.currentThemeId = savedThemeId;
    this.applyTheme(this.currentThemeId);
  }

  getAvailableThemes(): Theme[] {
    return this.themes;
  }

  getActiveTheme(): Theme | null {
    return this.themes.find(t => t.id === this.currentThemeId) || null;
  }

  setActiveTheme(themeId: string): void {
    const theme = this.themes.find(t => t.id === themeId);
    if (theme) {
      this.currentThemeId = theme.id;
      this.applyTheme(theme.id);
      localStorage.setItem('activeThemeId', theme.id);
      this.activeTheme$.next(theme);
    } else {
      console.warn(`Theme with id '${themeId}' not found.`);
    }
  }

  cycleNextTheme(): void {
    const currentIndex = this.themes.findIndex(t => t.id === this.currentThemeId);
    const nextIndex = (currentIndex + 1) % this.themes.length;
    this.setActiveTheme(this.themes[nextIndex].id);
  }

  private applyTheme(themeId: string): void {
    const theme = this.themes.find(t => t.id === themeId);
    if (theme) {
      // Remove all other theme classes
      this.themes.forEach(t => {
        if (t.className) {
          this.renderer.removeClass(document.body, t.className);
        }
      });
      // Add the new theme class
      this.renderer.addClass(document.body, theme.className);
      this.activeTheme$.next(theme); // Update BehaviorSubject
    }
  }
}
