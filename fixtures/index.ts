import { test as base } from '@playwright/test';
import { SearchPage } from '../pages/SearchPage';
import { ResultsPage } from '../pages/ResultsPage';
import { ProductPage } from '../pages/ProductPage';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { getPrimaryTestData } from '../utils/test-data-reader';

type Fixtures = {
  searchPage: SearchPage;
  resultsPage: ResultsPage;
  productPage: ProductPage;
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
  /** A cart pre-loaded with the 3rd filtered item; yields its title. */
  cartWithItem: { productTitle: string };
};

// Auto-dismiss the eBay GDPR consent banner on any page load so tests are not
// blocked regardless of which domain they start on (www vs cart vs signin).
// Registered on the base page fixture so it covers every test unconditionally,
// including the cartWithItem fixture which bypasses the searchPage fixture.
function autoAcceptCookies(page: import('@playwright/test').Page): void {
  page.on('load', () => {
    // Fire-and-forget: Playwright does not await event-listener promises.
    // Errors are suppressed so a missing banner never fails the test.
    void (async () => {
      for (const selector of [
        'button#gdpr-banner-accept',
        'button:has-text("Accept all")',
        'button:has-text("I Accept")',
      ]) {
        try {
          const btn = page.locator(selector).first();
          if (await btn.isVisible({ timeout: 1_500 })) {
            await btn.click();
            return;
          }
        } catch {
          // Banner absent for this selector — try next.
        }
      }
    })();
  });
}

export const test = base.extend<Fixtures>({
  // Register the cookie-consent auto-handler once on the shared page instance
  // so every fixture and test benefits without each having to opt in.
  page: async ({ page }, use) => {
    autoAcceptCookies(page);
    await use(page);
  },
  searchPage: async ({ page }, use) => {
    await use(new SearchPage(page));
  },
  resultsPage: async ({ page }, use) => {
    await use(new ResultsPage(page));
  },
  productPage: async ({ page }, use) => {
    await use(new ProductPage(page));
  },
  cartPage: async ({ page }, use) => {
    await use(new CartPage(page));
  },
  checkoutPage: async ({ page }, use) => {
    await use(new CheckoutPage(page));
  },

  /**
   * Sets up a cart containing exactly the 3rd Sony headphone within the price
   * range, then yields its title. After the test, makes a best-effort attempt
   * to empty the cart so tests stay independent — wrapped in try/catch because
   * the remove-from-cart test may have already emptied it.
   */
  cartWithItem: async ({ page }, use) => {
    const data = getPrimaryTestData();
    const searchPage = new SearchPage(page);
    const resultsPage = new ResultsPage(page);
    const productPage = new ProductPage(page);
    const cartPage = new CartPage(page);

    let productTitle = '';

    // Ensure the cart is empty before setup so a previous cleanup failure cannot
    // cause item accumulation across test runs.
    await test.step('Setup: clear any pre-existing cart items', async () => {
      await cartPage.goto();
      while (!(await cartPage.isCartEmpty())) {
        await cartPage.removeFirstItem();
      }
    });

    await test.step('Setup: navigate and handle consent', async () => {
      await searchPage.open();
    });

    await test.step('Setup: search and filter', async () => {
      await searchPage.search(data.searchTerm);
      await resultsPage.filterByBrand(data.brand);
      await resultsPage.setPriceRange(data.priceMin, data.priceMax);
    });

    await test.step('Setup: add item to cart', async () => {
      await resultsPage.selectNthItem(data.itemIndex);
      // Capture title from the PDP — more reliable than the SRP card text.
      productTitle = await productPage.getTitle();
      await productPage.addToCart();
    });

    await use({ productTitle });

    // Best-effort teardown — remove all items so subsequent tests start clean.
    try {
      await cartPage.goto();
      while (!(await cartPage.isCartEmpty())) {
        await cartPage.removeFirstItem();
      }
    } catch {
      // Cart already empty or unreachable — nothing to clean up.
    }
  },
});

export { expect } from '@playwright/test';
