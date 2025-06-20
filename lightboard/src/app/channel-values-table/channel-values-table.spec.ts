import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { ChannelValuesTableComponent } from './channel-values-table';
import { By } from '@angular/platform-browser';

// Define the interface for consistent typing in tests, matching component's expectation
interface ChannelDataItem {
  channelNumber: number;
  channelDescription: string;
  value: number;
  color: string;
}

describe('ChannelValuesTableComponent', () => {
  let component: ChannelValuesTableComponent;
  let fixture: ComponentFixture<ChannelValuesTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        ChannelValuesTableComponent
      ],
      providers: []
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

  it('should render rows for each item in channelData (now expecting color property)', () => {
    component.channelData = [
      { channelNumber: 1, channelDescription: 'Desc 1', value: 10, color: '#ff0000' },
      { channelNumber: 2, channelDescription: 'Desc 2', value: 20, color: '#00ff00' }
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

  describe('getDynamicRowStyles()', () => {
    it('should return black background and white text for value 0 with red base', () => {
      const styles = component.getDynamicRowStyles(0, '#ff0000');
      expect(styles.backgroundColor).toBe('#000000');
      expect(styles.color).toBe('#ffffff');
    });

    it('should return red background and white text for value 100 with red base', () => {
      const styles = component.getDynamicRowStyles(100, '#ff0000');
      expect(styles.backgroundColor).toBe('#ff0000');
      expect(styles.color).toBe('#ffffff');
    });

    it('should return 50% intensity red background and white text for value 50 with red base', () => {
      const styles = component.getDynamicRowStyles(50, '#ff0000');
      expect(styles.backgroundColor).toBe('#800000');
      expect(styles.color).toBe('#ffffff');
    });

    it('should return 100% intensity yellow background and black text for value 100 with yellow base', () => {
      const styles = component.getDynamicRowStyles(100, '#ffff00');
      expect(styles.backgroundColor).toBe('#ffff00');
      expect(styles.color).toBe('#000000');
    });

    it('should handle invalid itemColor by defaulting (e.g., to white base), value 50 should give gray', () => {
      const styles = component.getDynamicRowStyles(50, 'invalid-color');
      expect(styles.backgroundColor).toBe('#808080');
      expect(styles.color).toBe('#000000');
    });

    it('should clamp values below 0 for styling (e.g. with red base)', () => {
      const styles = component.getDynamicRowStyles(-10, '#ff0000');
      expect(styles.backgroundColor).toBe('#000000');
      expect(styles.color).toBe('#ffffff');
    });

    it('should clamp values above 100 for styling (e.g. with red base)', () => {
      const styles = component.getDynamicRowStyles(110, '#ff0000');
      expect(styles.backgroundColor).toBe('#ff0000');
      expect(styles.color).toBe('#ffffff');
    });
  });
});
