import { Page } from '@playwright/test';

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
 *
 * Strategy:
 * 1. Check the URL first — it is always available with no page interaction.
 * 2. Check the page title with a 3 s timeout. On some Chromium runs the JS
 *    context on the challenge page is never ready, causing page.title() to
 *    hang until the 90 s test timeout fires. A 3 s cap converts that 90 s
 *    stall into a fast, descriptive failure.
 */
export async function assertNotBotChallenge(page: Page): Promise<void> {
  const url = page.url().toLowerCase();

  if (BOT_URL_PATTERNS.some((p) => url.includes(p))) {
    throw new Error(
      `eBay bot-detection triggered — ${page.url()}\n` +
        `Set EBAY_EMAIL + EBAY_PASSWORD for an authenticated session, ` +
        `or run locally in headed mode from a residential IP.`,
    );
  }

  // Use a race so a stuck JS context never blocks longer than 3 s.
  const title = await Promise.race([
    page.evaluate(() => document.title.toLowerCase()).catch(() => ''),
    new Promise<string>((resolve) => setTimeout(() => resolve('unresponsive'), 3_000)),
  ]);

  if (title === 'unresponsive' || BOT_TITLE_PATTERNS.some((p) => title.includes(p))) {
    const label = title === 'unresponsive' ? 'page unresponsive (JS context not ready)' : `"${title}"`;
    throw new Error(
      `eBay bot-detection triggered: ${label} — ${page.url()}\n` +
        `Set EBAY_EMAIL + EBAY_PASSWORD for an authenticated session, ` +
        `or run locally in headed mode from a residential IP.`,
    );
  }
}
