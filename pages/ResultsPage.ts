import { Page, Locator } from '@playwright/test';

/**
 * Search results page (SRP) — brand/price filtering and item selection.
 */
export class ResultsPage {
  private readonly items: Locator;
  private readonly itemTitles: Locator;
  private readonly firstItemPrice: Locator;
  private readonly emptyResults: Locator;
  private readonly settleAnchor: Locator;

  constructor(private readonly page: Page) {
    // eBay SRP items use li.s-card; only real product cards have this class.
    this.items = page.locator('ul.srp-results li.s-card');
    this.itemTitles = this.items.locator('.s-card__title');
    this.firstItemPrice = this.items.locator('.s-card__price').first();

    this.emptyResults = page.locator(
      'h3:has-text("No results"), .srp-save-null-search',
    );
    this.settleAnchor = page.locator('ul.srp-results, .srp-save-null-search');
  }

  private async waitForResultsToSettle(): Promise<void> {
    await this.settleAnchor.first().waitFor({ state: 'visible' });
  }

  /**
   * Filters results to the given brand by appending the brand name to the
   * search box value and re-submitting. Using the search input is more reliable
   * than URL manipulation (eBay's JS normalises the URL on load, discarding
   * parameters added directly) and more reliable than sidebar interaction
   * (eBay degrades sidebar rendering under bot-detection pressure).
   */
  async filterByBrand(brand: string): Promise<void> {
    const searchInput = this.page.locator('input#gh-ac');
    // Fix #5: removed .catch(() => '') — if inputValue() throws the error should
    // surface rather than silently producing a bare brand search.
    const current = await searchInput.inputValue();
    const query = current.toLowerCase().includes(brand.toLowerCase())
      ? current
      : `${current} ${brand}`.trim();
    await searchInput.fill(query);
    // Fix #8: register the navigation wait before the click so the listener is
    // in place before domcontentloaded can fire.
    const navigation = this.page.waitForLoadState('domcontentloaded');
    await this.page.locator('button#gh-search-btn').click();
    await navigation;
    await this.waitForResultsToSettle();
  }

  /**
   * Applies a price range filter via eBay's _udlo / _udhi URL parameters and
   * re-navigates. Avoids the sidebar price inputs which require a specific
   * browser event sequence to enable the submit button.
   */
  async setPriceRange(min: number, max: number): Promise<void> {
    const url = new URL(this.page.url());
    url.searchParams.set('_udlo', String(min));
    url.searchParams.set('_udhi', String(max));
    await this.page.goto(url.toString());
    await this.waitForResultsToSettle();
  }

  /**
   * Navigates to the nth result (1-based).
   * Uses page.goto(href) rather than click() because links have target="_blank".
   * Fix #1: href is guarded before the non-null goto call.
   * Fix #9: return type is void — callers read the PDP title via ProductPage.getTitle().
   */
  async selectNthItem(n: number): Promise<void> {
    const item = this.items.nth(n - 1);
    await item.scrollIntoViewIfNeeded();
    const href = await item.locator('a.s-card__link').first().getAttribute('href');
    if (!href) throw new Error(`Item ${n} has no href — possible skeleton or JS-navigated card`);
    await this.page.goto(href);
    await this.page.waitForLoadState('domcontentloaded');
  }

  /** Number of real result cards currently rendered. */
  async getResultCount(): Promise<number> {
    await this.waitForResultsToSettle();
    return await this.items.count();
  }

  /** Visible, non-empty result titles currently rendered. */
  async getVisibleTitles(): Promise<string[]> {
    await this.waitForResultsToSettle();
    const titles = await this.itemTitles.allInnerTexts();
    return titles.map((t) => t.trim()).filter((t) => t.length > 0);
  }

  /** Parsed numeric price of the first result, or null if unavailable. */
  async getFirstItemPrice(): Promise<number | null> {
    await this.waitForResultsToSettle();
    const text = await this.firstItemPrice.innerText();
    const match = text.replace(/,/g, '').match(/[\d.]+/);
    return match ? Number.parseFloat(match[0]) : null;
  }

  /** True when eBay shows its "no results" / null-search state. */
  async isEmptyResults(): Promise<boolean> {
    await this.waitForResultsToSettle();
    return await this.emptyResults.first().isVisible();
  }

  /**
   * True when the brand name appears in the active search keyword (_nkw), which
   * confirms the brand was included in the last search submission.
   */
  async hasBrandFilterApplied(brand: string): Promise<boolean> {
    const nkw = new URL(this.page.url()).searchParams.get('_nkw') ?? '';
    return nkw.toLowerCase().includes(brand.toLowerCase());
  }
}
