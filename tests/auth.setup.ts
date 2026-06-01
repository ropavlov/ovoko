import { test as setup, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const AUTH_FILE = path.join(__dirname, '../.auth/user.json');

/**
 * Logs into eBay with EBAY_EMAIL / EBAY_PASSWORD from .env and saves the
 * browser storage state to .auth/user.json.  All test projects load that file
 * so cart.ebay.com is reached as an authenticated user, bypassing the hCaptcha
 * challenge that fires for anonymous automated sessions.
 *
 * If credentials are absent the setup saves an empty state; non-cart tests
 * still run, cart tests (03, 04, 05) fail with a clear assertion error rather
 * than a cryptic timeout.
 *
 * Run in headed mode the first time so any CAPTCHA challenge can be solved
 * manually. Once .auth/user.json exists the session is reused for weeks.
 */
setup('authenticate with eBay', async ({ page }) => {
  // Reuse existing session — eBay sessions last weeks. Re-logging in on every
  // run wastes ~15 s and risks triggering login rate-limiting or a fresh CAPTCHA.
  if (fs.existsSync(AUTH_FILE) && fs.statSync(AUTH_FILE).size > 200) {
    console.log('\n[auth.setup] Reusing existing session from .auth/user.json\n');
    return;
  }

  if (!process.env.EBAY_EMAIL || !process.env.EBAY_PASSWORD) {
    console.warn(
      '\n[auth.setup] EBAY_EMAIL / EBAY_PASSWORD not set — saving empty ' +
        'storage state.  Cart tests (03, 04, 05) will fail.\n',
    );
    fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
    fs.writeFileSync(AUTH_FILE, JSON.stringify({ cookies: [], origins: [] }));
    return;
  }

  const email = process.env.EBAY_EMAIL;
  const password = process.env.EBAY_PASSWORD;

  await page.goto('/');

  // Dismiss GDPR cookie-consent banner if present (region-dependent).
  // auth.setup runs in its own browser context before the test fixtures load,
  // so the fixture-level auto-handler does not apply here.
  for (const selector of [
    'button#gdpr-banner-accept',
    'button:has-text("Accept all")',
    'button:has-text("I Accept")',
  ]) {
    try {
      const btn = page.locator(selector).first();
      if (await btn.isVisible({ timeout: 3_000 })) {
        await btn.click();
        break;
      }
    } catch {
      // Banner not present for this selector — try next.
    }
  }

  // Click the "Sign in" link in the page header.
  // The link has no stable ID in current eBay markup; match by href domain.
  await page
    .locator('.gh-identity-signed-out-unrecognized a[href*="signin.ebay.com"]')
    .first()
    .click();
  await page.waitForLoadState('domcontentloaded');

  // Fail fast and clearly if eBay shows a bot-detection CAPTCHA instead of
  // the login form. The fix is to run headed once and solve the challenge, or
  // to wait a few minutes before retrying.
  if (page.url().includes('captcha') || page.url().includes('splashui')) {
    throw new Error(
      '[auth.setup] eBay showed a CAPTCHA challenge instead of the login form.\n' +
        'Run the suite in headed mode (npm run test:headed) to solve it manually,\n' +
        'or wait a few minutes and retry.',
    );
  }

  // Step 1 — enter email / username.
  const emailForm = page.locator('form').filter({
    has: page.locator('input[name="userid"]'),
  });
  await emailForm
    .locator('input[name="userid"], input[type="email"]')
    .first()
    .fill(email);
  await emailForm
    .locator('#signin-continue-btn, button[type="submit"]')
    .first()
    .click();
  await page.waitForLoadState('domcontentloaded');

  // Step 2 — enter password.
  const passwordForm = page.locator('form').filter({
    has: page.locator('input[type="password"]'),
  });
  const passwordInput = passwordForm.locator('input[type="password"]').first();
  await passwordInput.waitFor({ state: 'visible', timeout: 10_000 });
  await passwordInput.fill(password);
  await passwordForm
    .locator('#signin-btn, button[type="submit"]')
    .first()
    .click();
  await page.waitForLoadState('domcontentloaded');

  // Verify we landed on an authenticated page.
  // eBay shows a greeting like "Hi, username!" and removes the "Sign in" link.
  await expect(
    page.locator('.gh-username, [class*="signed-in"], a[href*="myebay"]').first(),
  ).toBeVisible({ timeout: 15_000 });

  // Persist session cookies + localStorage for reuse across test runs.
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  await page.context().storageState({ path: AUTH_FILE });
  console.log(`\n[auth.setup] Session saved to ${AUTH_FILE}\n`);
});
