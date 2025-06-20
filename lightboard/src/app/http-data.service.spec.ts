import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpDataService, CombinedOutputData } from './http-data.service';

describe('HttpDataService', () => {
  let service: HttpDataService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [HttpDataService]
    });
    service = TestBed.inject(HttpDataService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // Verify that no unmatched requests are outstanding
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should POST combined output data to the specified URL', () => {
    const testUrl = 'https://example.com/api/data';
    const testData: CombinedOutputData[] = [{ channelNumber: 1, channelDescription: 'Test', value: 50, color: '#ff0000' }];
    const mockResponse = { success: true };

    service.postCombinedOutput(testUrl, testData).subscribe(response => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(testUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(testData);
    req.flush(mockResponse);
  });

  it('should return an error if URL is not configured', (done) => {
    service.postCombinedOutput('', []).subscribe({
      next: () => fail('should have failed due to no URL'),
      error: (err) => {
        expect(err.message).toContain('Backend URL not configured');
        done();
      }
    });
  });

  it('should handle HTTP errors when posting data', (done) => {
    const testUrl = 'https://example.com/api/data';
    const testData: CombinedOutputData[] = [{ channelNumber: 1, channelDescription: 'Test', value: 50, color: '#ff0000' }];
    const errorMessage = 'Forbidden';

    service.postCombinedOutput(testUrl, testData).subscribe({
        next: () => fail('should have failed with an HTTP error'),
        error: (error) => {
            expect(error.message).toContain('Error posting data: Forbidden (Status: 403)');
            done();
        }
    });

    const req = httpMock.expectOne(testUrl);
    expect(req.request.method).toBe('POST');
    req.flush(errorMessage, { status: 403, statusText: 'Forbidden' });
  });
});
