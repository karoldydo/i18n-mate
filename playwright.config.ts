import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Validate required environment variables for E2E tests
const required = ['E2E_USERNAME', 'E2E_PASSWORD'];
const missing = required.filter((name) => !process.env[name]?.trim());

if (missing.length) {
  throw new Error(
    `Missing required environment variables for E2E tests: ${missing.join(', ')}\n` +
      'Please ensure these variables are set in your .env file.'
  );
}

/**
 * Playwright E2E Test Configuration
 *
 * Following guidelines from .cursor/rules/e2e-test.mdc:
 * - Chromium/Desktop Chrome browser only
 * - Browser contexts for test isolation
 * - Trace viewer for debugging
 * - Parallel execution for speed
 *
 * Environment variables required for E2E tests:
 * - E2E_USERNAME: Test user email
 * - E2E_PASSWORD: Test user password
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Run tests in files in parallel
  fullyParallel: true,

  // Configure projects for Chromium only (per guidelines)
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Reporter to use
  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Test directory
  testDir: './tests/e2e',

  // Maximum time one test can run for
  timeout: 30 * 1000,

  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: 'http://localhost:5173',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Video on failure
    video: 'retain-on-failure',
  },

  // Run your local dev server before starting the tests
  webServer: {
    command: 'npm run dev',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    url: 'http://localhost:5173',
  },

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
});
