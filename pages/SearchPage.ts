import { Page, Locator } from '@playwright/test';
import { assertNotBotChallenge } from '../utils/bot-detection';

/**
 * Home page + global search bar.
 *
 * NOTE: eBay's markup changes frequently. The locators below are the documented
 * best-guess selectors. Before a real run, regenerate them with:
 *   npx playwright codegen https://www.ebay.com
 */
export class SearchPage {
  private readonly searchInput: Locator;
  private readonly searchButton: Locator;

  constructor(private readonly page: Page) {
    // Global search box and submit button — stable, long-lived eBay IDs.
    this.searchInput = page.locator('input#gh-ac');
    this.searchButton = page.locator('button#gh-search-btn');
  }

  /** Navigates to the eBay home page (baseURL). */
  async goto(): Promise<void> {
    await this.page.goto('/');
    await assertNotBotChallenge(this.page);
  }

  /** Convenience: navigate to the home page and dismiss the cookie banner. */
  async open(): Promise<void> {
    await this.goto();
    await this.handleCookieConsent();
  }

  /**
   * Dismisses the GDPR cookie-consent banner if it is present.
   * Only shown in some regions, so absence is not an error — we try a few known
   * selectors with a short timeout and silently continue when none appear.
   */
  async handleCookieConsent(): Promise<void> {
    const consentSelectors = [
      'button#gdpr-banner-accept',
      'button:has-text("Accept all")',
      'button:has-text("I Accept")',
    ];

    for (const selector of consentSelectors) {
      const button = this.page.locator(selector).first();
      let visible = false;
      try {
        visible = await button.isVisible({ timeout: 5_000 });
      } catch {
        // Selector timed out — banner not present for this selector, try the next.
        continue;
      }
      if (visible) {
        await button.click();
        return;
      }
    }
  }

  /** Searches for the given term and waits for the results document to load. */
  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
    await this.searchButton.click();
    await this.page.waitForLoadState('domcontentloaded');
    await assertNotBotChallenge(this.page);
  }
}
