import { Page } from '@playwright/test';

/**
 * Known eBay bot-detection page patterns.
 * When eBay detects an automated browser (especially from CI data-center IPs)
 * it serves one of these interstitials instead of the requested page.
 */
const BOT_TITLE_PATTERNS = [
  'pardon our interruption',
  'security measure',
  'verify yourself',
  'please verify',
  'robot or human',
];

const BOT_URL_PATTERNS = ['captcha', 'splashui', 'interrupt', 'verify'];

/**
 * Throws immediately if the current page is an eBay bot-detection challenge.
 * Call this after every page.goto() so tests fail fast with a clear message
 * instead of timing out 90 s later waiting for elements that are not present.
 */
export async function assertNotBotChallenge(page: Page): Promise<void> {
  const title = (await page.title()).toLowerCase();
  const url = page.url().toLowerCase();

  const detected =
    BOT_TITLE_PATTERNS.some((p) => title.includes(p)) ||
    BOT_URL_PATTERNS.some((p) => url.includes(p));

  if (detected) {
    throw new Error(
      `eBay bot-detection triggered: "${await page.title()}" — ${page.url()}\n` +
        `Set EBAY_EMAIL + EBAY_PASSWORD so tests run with an authenticated session, ` +
        `or run locally in headed mode from a residential IP.`,
    );
  }
}
