import { test, expect } from '../fixtures';
import { getPrimaryTestData } from '../utils/test-data-reader';

const data = getPrimaryTestData();

test.describe('Filters', () => {
  test(`should filter results by ${data.brand} brand @smoke`, async ({
    searchPage,
    resultsPage,
  }) => {
    await test.step('navigate, cookie consent, search', async () => {
      await searchPage.open();
      await searchPage.search(data.searchTerm);
    });

    await test.step('apply brand filter', async () => {
      await resultsPage.filterByBrand(data.brand);
    });

    await test.step('assert brand filter is applied and results exist', async () => {
      // eBay brand filter operates on item metadata, not title text — verify the
      // filter was applied via the URL parameter eBay appends after refinement.
      expect(await resultsPage.hasBrandFilterApplied(data.brand)).toBe(true);
      expect(await resultsPage.getResultCount()).toBeGreaterThan(0);
    });
  });

  test(`should filter results by price range ${data.priceMin}-${data.priceMax} @regression`, async ({
    searchPage,
    resultsPage,
  }) => {
    await test.step('navigate, cookie consent, search, brand filter', async () => {
      await searchPage.open();
      await searchPage.search(data.searchTerm);
      await resultsPage.filterByBrand(data.brand);
    });

    await test.step('apply price range', async () => {
      await resultsPage.setPriceRange(data.priceMin, data.priceMax);
    });

    await test.step('assert result count > 0', async () => {
      expect(await resultsPage.getResultCount()).toBeGreaterThan(0);
    });

    await test.step('assert first item price is within range', async () => {
      const price = await resultsPage.getFirstItemPrice();
      expect(price).not.toBeNull();
      expect(price!).toBeGreaterThanOrEqual(data.priceMin);
      expect(price!).toBeLessThanOrEqual(data.priceMax);
    });
  });
});
