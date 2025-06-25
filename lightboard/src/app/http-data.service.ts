import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

export interface CombinedOutputData {
  channelNumber: number;
  channelDescription: string;
  value: number;
  color: string;
  // Add any other relevant fields that might be part of combinedOutputStates
}

@Injectable({
  providedIn: 'root'
})
export class HttpDataService {
  private http = inject(HttpClient);


  postCombinedOutput(url: string, data: CombinedOutputData[]): Observable<unknown> {
    if (!url) {
      // console.warn('HttpDataService: Backend URL is not configured. Skipping POST.');
      return throwError(() => new Error('Backend URL not configured.')); // Or return of(null) or EMPTY if you don't want an error
    }

    // console.log('HttpDataService: Posting to', url, data); // For debugging
    return this.http.post<unknown>(url, data).pipe(
      tap(() => { // Removed unused 'response'
        // console.log('HttpDataService: Successfully posted data.');
      }),
      catchError((error: HttpErrorResponse) => {
        // console.error('HttpDataService: Error posting data.', error.message);
        // More sophisticated error handling could be done here,
        // e.g., notifying a user feedback service, or retrying.
        return throwError(() => new Error(`Error posting data: ${error.statusText} (Status: ${error.status})`));
      })
    );
  }
}
