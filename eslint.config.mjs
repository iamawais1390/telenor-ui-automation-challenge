// @ts-check
import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import playwright from 'eslint-plugin-playwright';
import globals from 'globals';

export default defineConfig([
  {
    files: ['**/*.js'],
    ignores: [
      'node_modules',
      'test-results',
      'playwright-report',
      'allure-results',
      'allure-report',
    ],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: globals.node,
    },
  },
  {
    // Playwright's config loader accepts import/export regardless of
    // package.json's "type", so this is the one file in the repo that's
    // legitimately ESM rather than CommonJS.
    files: ['playwright.config.js'],
    languageOptions: {
      sourceType: 'module',
    },
  },
  {
    files: ['tests/**/*.js'],
    extends: [playwright.configs['flat/recommended']],
    rules: {
      // Assertions go through assertions/*.js's ElementAssertions/PageAssertions
      // wrappers, not raw expect().
      'playwright/expect-expect': [
        'warn',
        {
          assertFunctionNames: [
            'assertIsNotEmpty',
            'assertIsEmpty',
            'assertContainsText',
            'assertHasAttribute',
            'assertHasTitle',
            'assertHasURL',
          ],
        },
      ],
    },
  },
]);
