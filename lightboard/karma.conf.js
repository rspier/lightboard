// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage') // Keep coverage for now, can be removed if CLI handles it
      // require('@angular-devkit/build-angular/plugins/karma') // Removed problematic line
    ],
    client: {
      jasmine: {
        // you can add configuration options for Jasmine here
      },
      clearContext: false // leave Jasmine Spec Runner output visible in browser
    },
    jasmineHtmlReporter: {
      suppressAll: true // removes the duplicated traces
    },
    coverageReporter: { // Keep this, useful for local runs
      dir: require('path').join(__dirname, './coverage/lightboard'),
      subdir: '.',
      reporters: [
        { type: 'html' },
        { type: 'text-summary' }
      ]
    },
    reporters: ['progress', 'kjhtml'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true, // CLI will override for CI
    browsers: ['Chrome'], // Default for local
    customLaunchers: {
      ChromeHeadlessNoSandbox: {
        base: 'ChromeHeadless',
        flags: [
          '--no-sandbox',
          '--disable-gpu', // Often needed in CI
          '--disable-dev-shm-usage' // Overcome resource limits in CI
        ]
      }
    },
    singleRun: false, // CLI will override for CI
    restartOnFileChange: true
  });
};
