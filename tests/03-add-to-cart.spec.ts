import { test, expect } from '../fixtures';
import { getPrimaryTestData } from '../utils/test-data-reader';

const data = getPrimaryTestData();

test.describe('Add to Cart', () => {
  // Fix #4: remove the item added by this test so the server-side cart is clean
  // for subsequent tests (negative "empty cart" test, fixture pre-clear checks).
  test.afterEach(async ({ cartPage }) => {
    try {
      await cartPage.goto();
      while (!(await cartPage.isCartEmpty())) {
        await cartPage.removeFirstItem();
      }
    } catch {
      // Cart already empty or unreachable — nothing to clean up.
    }
  });

  test('should add the third filtered item to cart @smoke', async ({
    searchPage,
    resultsPage,
    productPage,
    cartPage,
  }) => {
    let capturedTitle = '';

    await test.step('navigate, cookie consent, search, filter brand + price', async () => {
      await searchPage.open();
      await searchPage.search(data.searchTerm);
      await resultsPage.filterByBrand(data.brand);
      await resultsPage.setPriceRange(data.priceMin, data.priceMax);
    });

    await test.step(`select item #${data.itemIndex}`, async () => {
      await resultsPage.selectNthItem(data.itemIndex);
    });

    await test.step('capture PDP title then add to cart', async () => {
      // Read the title from the product page — more reliable than the SRP card
      // text, which eBay can truncate or reformat differently from the cart.
      capturedTitle = await productPage.getTitle();
      expect(capturedTitle.length).toBeGreaterThan(0);
      await productPage.addToCart();
    });

    await test.step('navigate to cart', async () => {
      await cartPage.goto();
    });

    await test.step('assert cart contains 1 item', async () => {
      expect(await cartPage.getItemCount()).toBe(1);
    });

    await test.step('assert cart references the captured product title', async () => {
      // Use the first three words of the PDP title as the match token. eBay may
      // truncate cart titles, but the leading words are reliably preserved.
      const token = capturedTitle.split(/\s+/).filter(Boolean).slice(0, 3).join(' ');
      expect(await cartPage.containsText(token)).toBe(true);
    });
  });
});
