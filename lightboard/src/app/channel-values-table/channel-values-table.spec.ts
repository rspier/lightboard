import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core'; // Import for zoneless
import { CommonModule } from '@angular/common';
import { ChannelValuesTableComponent } from './channel-values-table';
import { By } from '@angular/platform-browser';

describe('ChannelValuesTableComponent', () => { // Renamed
  let component: ChannelValuesTableComponent; // Renamed
  let fixture: ComponentFixture<ChannelValuesTableComponent>; // Renamed

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        ChannelValuesTableComponent
      ],
      providers: [provideZonelessChangeDetection()] // Add for zoneless
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChannelValuesTableComponent); // Renamed
    component = fixture.componentInstance;
    // fixture.detectChanges() will be called in individual tests
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should display table headers', () => {
    fixture.detectChanges();
    const table = fixture.debugElement.query(By.css('table'));
    expect(table).toBeTruthy();

    const headers = table.queryAll(By.css('th'));
    expect(headers.length).toBe(3);
    expect(headers[0].nativeElement.textContent).toBe('Channel Number');
    expect(headers[1].nativeElement.textContent).toBe('Description');
    expect(headers[2].nativeElement.textContent).toBe('Value');
  });

  it('should display "No data available." when channelData is empty', () => {
    component.channelData = [];
    fixture.detectChanges();

    const noDataRow = fixture.debugElement.query(By.css('tbody tr td[colspan="3"]'));
    expect(noDataRow).toBeTruthy();
    expect(noDataRow.nativeElement.textContent).toBe('No data available.');
  });

  it('should display "No data available." when channelData is null', () => {
    // Type gymnastics as component.channelData cannot be null by default
    (component as any).channelData = null;
    fixture.detectChanges();

    const noDataRow = fixture.debugElement.query(By.css('tbody tr td[colspan="3"]'));
    expect(noDataRow).toBeTruthy();
    expect(noDataRow.nativeElement.textContent).toBe('No data available.');
  });

  it('should render rows for each item in channelData', () => {
    component.channelData = [
      { channelNumber: 1, channelDescription: 'Desc 1', value: 10 },
      { channelNumber: 2, channelDescription: 'Desc 2', value: 20 }
    ];
    fixture.detectChanges();

    const dataRows = fixture.debugElement.queryAll(By.css('tbody tr'));
    // Expect 2 data rows, no "No data available" row.
    // The "No data available" row has a td with colspan=3, data rows don't.
    const actualDataRows = dataRows.filter(row => !row.query(By.css('td[colspan="3"]')));
    expect(actualDataRows.length).toBe(2);

    // Check content of the first data row
    const firstRowCells = actualDataRows[0].queryAll(By.css('td'));
    expect(firstRowCells.length).toBe(3);
    expect(firstRowCells[0].nativeElement.textContent).toBe('1');
    expect(firstRowCells[1].nativeElement.textContent).toBe('Desc 1');
    expect(firstRowCells[2].nativeElement.textContent).toBe('10');

    // Check content of the second data row
    const secondRowCells = actualDataRows[1].queryAll(By.css('td'));
    expect(secondRowCells.length).toBe(3);
    expect(secondRowCells[0].nativeElement.textContent).toBe('2');
    expect(secondRowCells[1].nativeElement.textContent).toBe('Desc 2');
    expect(secondRowCells[2].nativeElement.textContent).toBe('20');
  });
});
