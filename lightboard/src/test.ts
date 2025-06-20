// First, import Angular's Zone.js polyfill.
import 'zone.js';
// Then, import Zone.js testing utilities.
import 'zone.js/testing';

// Other standard test environment setup
import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';

// Prevent Karma from running prematurely.
// declare const __karma__: any;
// __karma__.loaded = function () {}; // Not strictly necessary with modern CLI but good for safety

// Initialize the Angular testing environment.
getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
);

// // Then we find all the tests.
// const context = require.context('./', true, /\.spec\.ts$/);
// // And load the modules.
// context.keys().map(context);

// // Finally, start Karma to run the tests.
// __karma__.start(); // Not strictly necessary with modern CLI but good for safety
