import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing'; // Import ComponentFixture
import { App } from './app';
import { By } from '@angular/platform-browser'; // Import By

// Since App component now uses SlidePotentiometerComponent and ChannelValuesTableComponent in its template,
// and these are standalone, they are available via App's imports.
// No need to import them here directly into TestBed unless we want to test them in isolation here,
// or if App was not standalone and needed them in its 'declarations'.

describe('App', () => {
  let fixture: ComponentFixture<App>; // Declare fixture type
  let app: App; // Declare app component instance type

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App], // App is standalone and imports its own dependencies
      providers: [provideZonelessChangeDetection()]
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    app = fixture.componentInstance;
  });

  it('should create the app', () => {
    expect(app).toBeTruthy();
  });

  it('should render the potentiometer container', () => {
    fixture.detectChanges(); // Important to render the template
    const compiled = fixture.debugElement; // Use debugElement for By.css
    expect(compiled.query(By.css('.potentiometer-container'))).toBeTruthy();
  });

  it('should have initial potentiometer states', () => {
    expect(app.potentiometerStates.length).toBe(4);
    expect(app.potentiometerStates[0].channelDescription).toBe('Apple');
    expect(app.potentiometerStates[1].value).toBe(25);
  });
});
