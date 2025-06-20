# Lightboard Control Simulator

This project is an interactive web application simulating a lightboard control panel, allowing users to manage multiple channels, scenes, colors, and a crossfader, with settings persistence and data output capabilities.

**Note:** This project was developed primarily with the assistance of Jules AI, a large language model from Google.

## Features & Capabilities

*   **Dynamic Channel Configuration:**
    *   Supports a configurable number of channels, ranging from 1 to 12.
    *   Channel names (descriptions) are customizable.
*   **Dual Scene Control:**
    *   Provides two independent "scenes" (rows of sliders) for all configured channels.
    *   Each channel slider controls a value (0-100).
*   **Per-Channel Color Selection:**
    *   Each channel within each scene can have its color individually selected using a native color picker.
*   **Master Crossfader:**
    *   A master crossfader slider (0-100) blends the values and colors from Scene 1 and Scene 2.
    *   **Animated "Go" Button:** A "Go" button allows the crossfader to automatically transition to the opposite end (0 or 100) over a configurable duration.
*   **Output Display Table:**
    *   A table displays the final combined (blended) output for each channel, showing its number, resolved description, blended value, and blended color.
    *   Table row backgrounds dynamically change:
        *   The *color* of the row is determined by the blended color from the scenes and crossfader.
        *   The *intensity* of this color (from black to the full blended color) is determined by the blended value (0 = black, 100 = full blended color).
*   **Settings Panel (Modal Dialog):**
    *   Accessed via a gear icon.
    *   Allows users to:
        *   Edit channel names (descriptions).
        *   Configure the number of active channels (1-12).
        *   Set the crossfade animation duration (0.1 to 300 seconds).
        *   Specify a backend URL for data output.
    *   Includes options to save changes or reset all settings to defaults.
*   **Persistent Settings:**
    *   All configurations (channel names, number of channels, backend URL, crossfade duration) are saved to the browser's `localStorage`, persisting across sessions.
*   **Data Output:**
    *   The combined output data for all channels (number, description, value, color) is automatically POSTed as a JSON payload to the configured backend URL whenever the combined output changes.
*   **Deployment:**
    *   Includes a GitHub Actions workflow (`.github/workflows/deploy-gh-pages.yml`) for automated building and deployment of the application to GitHub Pages.

## Limitations & Known Issues

*   **Unit Tests:** While many features are covered by unit tests (currently 67 tests), a few tests related to `AppComponent`'s change detection in its zoneless setup, and one specific test in `SettingsModalComponent` concerning mock interactions, are currently failing and require further investigation for a fully green test suite.
*   **Backend Implementation:** This project includes only the frontend application. A compatible backend server must be implemented separately to receive and process the data POSTed by the application.
*   **UI/UX Polish:** The user interface is functional. Further enhancements could be made for improved aesthetics and overall user experience (e.g., a more sophisticated color picker).
*   **HTTP Error Handling:** Basic error logging for HTTP POST requests is present in the console. More robust user-facing error handling or retry mechanisms are not yet implemented.
*   **HTTP Post Frequency:** Data is POSTed on every change to the combined output. For very rapid changes (e.g., fast slider scrubbing or short animations), this might lead to a high volume of requests. Debouncing or throttling these requests could be a future optimization.

## How to Run

This is an Angular application. To run it locally:

1.  **Clone the repository.**
2.  **Navigate to the `lightboard` project directory:** `cd lightboard`
3.  **Install dependencies:** `npm install` (or `npm ci` for a cleaner install based on `package-lock.json`)
4.  **Serve the application (development mode):** `ng serve`
    *   Open your browser to `http://localhost:4200/`.
5.  **Run unit tests:** `ng test`
6.  **Build the application (production mode):** `ng build --configuration production`
    *   The build artifacts will be stored in the `dist/lightboard/browser/` directory.

---
