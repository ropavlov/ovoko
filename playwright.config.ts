import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

const AUTH_FILE = path.join(__dirname, '.auth/user.json');
const storageState = fs.existsSync(AUTH_FILE) ? AUTH_FILE : undefined;

/**
 * Playwright configuration for the eBay E2E automation suite.
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  // eBay mutates a single cart/session, so parallel specs would race each other.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  // eBay's sidebar can take >30 s to render on slow connections; give each test
  // enough headroom so the overall test timeout doesn't fire before the action
  // timeouts inside the page objects have had a chance to expire gracefully.
  timeout: 90_000,
  reporter: [['list'], ['allure-playwright', { outputFolder: 'allure-results' }]],
  use: {
    baseURL: process.env.BASE_URL ?? 'https://www.ebay.com',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    videoSize: { width: 1024, height: 768 },
    trace: 'on-first-retry',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    // ------------------------------------------------------------------
    // Auth setup — runs once before the browser projects and persists an
    // authenticated eBay session to .auth/user.json.  Requires EBAY_EMAIL
    // and EBAY_PASSWORD in .env; saves an empty state if they are absent.
    // ------------------------------------------------------------------
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },

    // ------------------------------------------------------------------
    // Browser projects — depend on setup so the auth state is always
    // available.  storageState loads the saved session for every test,
    // which prevents cart.ebay.com from triggering the hCaptcha challenge.
    //
    // Fix #2: storageState is conditional — if auth.setup.ts crashed before
    // writing the file, tests run unauthenticated rather than aborting with
    // an opaque ENOENT error that hides the real login failure.
    // ------------------------------------------------------------------
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState,
      },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState,
      },
      dependencies: ['setup'],
    },
  ],
});
