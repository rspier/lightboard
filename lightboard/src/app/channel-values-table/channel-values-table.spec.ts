import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChannelValuesTableComponent } from './channel-values-table';
import { By } from '@angular/platform-browser';

describe('ChannelValuesTableComponent', () => {
  let component: ChannelValuesTableComponent;
  let fixture: ComponentFixture<ChannelValuesTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        ChannelValuesTableComponent
      ],
      providers: [provideZonelessChangeDetection()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChannelValuesTableComponent);
    component = fixture.componentInstance;
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
    const actualDataRows = dataRows.filter(row => !row.query(By.css('td[colspan="3"]')));
    expect(actualDataRows.length).toBe(2);

    const firstRowCells = actualDataRows[0].queryAll(By.css('td'));
    expect(firstRowCells.length).toBe(3);
    expect(firstRowCells[0].nativeElement.textContent).toBe('1');
    expect(firstRowCells[1].nativeElement.textContent).toBe('Desc 1');
    expect(firstRowCells[2].nativeElement.textContent).toBe('10');

    const secondRowCells = actualDataRows[1].queryAll(By.css('td'));
    expect(secondRowCells.length).toBe(3);
    expect(secondRowCells[0].nativeElement.textContent).toBe('2');
    expect(secondRowCells[1].nativeElement.textContent).toBe('Desc 2');
    expect(secondRowCells[2].nativeElement.textContent).toBe('20');
  });

  // Tests for getDynamicRowStyles method
  describe('getDynamicRowStyles()', () => {
    it('should return black background and white text for value 0', () => {
      const styles = component.getDynamicRowStyles(0);
      expect(styles.backgroundColor).toBe('#000000');
      expect(styles.color).toBe('#FFFFFF');
    });

    it('should return white background and black text for value 100', () => {
      const styles = component.getDynamicRowStyles(100);
      expect(styles.backgroundColor).toBe('#ffffff');
      expect(styles.color).toBe('#000000');
    });

    it('should return mid-gray background and black text for value 50', () => {
      // gray = Math.round((50/100)*255) = Math.round(127.5) = 128. hex = '80'.
      // textColor = (128 < 128) is false, so #000000.
      const styles = component.getDynamicRowStyles(50);
      expect(styles.backgroundColor).toBe('#808080');
      expect(styles.color).toBe('#000000');
    });

    it('should return dark gray background and white text for value 25', () => {
      // gray = Math.round((25/100)*255) = Math.round(63.75) = 64. hex = '40'.
      // textColor = (64 < 128) is true, so #FFFFFF.
      const styles = component.getDynamicRowStyles(25);
      expect(styles.backgroundColor).toBe('#404040');
      expect(styles.color).toBe('#FFFFFF');
    });

    it('should clamp values below 0 to 0 for styling', () => {
      const styles = component.getDynamicRowStyles(-10);
      expect(styles.backgroundColor).toBe('#000000');
      expect(styles.color).toBe('#FFFFFF');
    });

    it('should clamp values above 100 to 100 for styling', () => {
      const styles = component.getDynamicRowStyles(110);
      expect(styles.backgroundColor).toBe('#ffffff');
      expect(styles.color).toBe('#000000');
    });
  });
});
