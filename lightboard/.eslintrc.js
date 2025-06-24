module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.app.json',
  },
  env: {
    browser: true,
    es2021: true,
    node: true,
    jasmine: true,
  },
  plugins: [
    '@typescript-eslint',
    'angular',
  ],
  extends: [
    'eslint:recommended',
    // 'plugin:@typescript-eslint/recommended', // Avoid full extension due to conflicts
    'plugin:angular/johnpapa',
  ],
  rules: {
    // --- Manually selected TypeScript rules (mimicking parts of @typescript-eslint/recommended) ---
    '@typescript-eslint/no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }],
    '@typescript-eslint/explicit-module-boundary-types': 'off', // Often off for Angular
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-empty-function': 'warn',
    '@typescript-eslint/no-inferrable-types': 'warn',
    // Add other important TS rules as needed, e.g.:
    // '@typescript-eslint/no-non-null-assertion': 'warn',
    // '@typescript-eslint/explicit-function-return-type': 'off', // Often off

    // --- Ensure our specific Angular rules are defined and active ---
    // These were previously "not found" when @typescript-eslint/recommended was active
    // 'angular/component-class-suffix': ['error', { 'suffixes': ['Component', 'Page', 'Modal', 'Dialog', 'Widget', 'Display'] }], // Removed due to "not found" issues
    // 'angular/directive-class-suffix': ['error', { 'suffixes': ['Directive', 'Validator'] }], // Removed due to "not found" issues
    // 'angular/prefer-on-push-component-change-detection': 'warn', // This should be handled by johnpapa if desired

    // --- General JS rules (some might be in eslint:recommended but can be configured here too) ---
    'no-prototype-builtins': 'warn',
    'no-empty': 'warn', // Customize if needed, e.g., allow empty catch
    'no-console': 'warn', // Good practice to avoid console logs in production

    // --- Rules from 'eslint:recommended' we might want to adjust ---
    // Example: 'no-unused-vars' is handled by '@typescript-eslint/no-unused-vars' above,
    // but if there were JS files, the base 'no-unused-vars' would apply.
    // We can turn off the base rule if the @typescript-eslint version is preferred for TS files.
    'no-unused-vars': 'off', // Turn off base rule, rely on @typescript-eslint/no-unused-vars for TS

    // Disable AngularJS specific rules that are misapplied
    'angular/interval-service': 'off',
    'angular/document-service': 'off',
    'angular/timeout-service': 'off',

  },
  overrides: [
    {
      files: ['*.spec.ts'],
      parserOptions: {
        project: './tsconfig.spec.json',
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'angular/component-class-suffix': 'off',
        'angular/directive-class-suffix': 'off',
        'angular/prefer-on-push-component-change-detection': 'off',
        // Other spec-specific overrides
      },
    },
    {
      files: ['src/main.ts', 'src/test.ts'],
      rules: {
        'angular/component-class-suffix': 'off',
        'angular/directive-class-suffix': 'off',
        'angular/prefer-on-push-component-change-detection': 'off',
      }
    }
  ],
};
