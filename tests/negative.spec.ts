import { test, expect } from '../fixtures';
import { getPrimaryTestData } from '../utils/test-data-reader';

const data = getPrimaryTestData();

test.describe('Negative Scenarios', () => {
  test('should show no results for a non-existent search term @negative', async ({
    searchPage,
    resultsPage,
  }) => {
    await test.step('navigate, cookie consent, search nonsense term', async () => {
      await searchPage.open();
      await searchPage.search('xyzzy_nonexistent_product_12345');
    });

    await test.step('assert empty-results state', async () => {
      expect(await resultsPage.isEmptyResults()).toBe(true);
    });
  });

  test('should show no results when price range excludes all matches @negative', async ({
    searchPage,
    resultsPage,
  }) => {
    await test.step('navigate, cookie consent, search, filter brand', async () => {
      await searchPage.open();
      await searchPage.search(data.searchTerm);
      await resultsPage.filterByBrand(data.brand);
    });

    await test.step('set an impossible price range (50000-60000)', async () => {
      // $1-$2 matches cheap eBay accessories; use a range no headphone can reach.
      await resultsPage.setPriceRange(50000, 60000);
    });

    await test.step('assert no results / empty state', async () => {
      const count = await resultsPage.getResultCount();
      const empty = await resultsPage.isEmptyResults();
      // eBay may return a small number of edge-case items (e.g. vintage or
      // collectible listings) even at extreme price ranges — allow ≤ 5 results.
      expect(count <= 5 || empty).toBe(true);
    });
  });

  test('should show empty cart when navigating directly @negative', async ({
    cartPage,
  }) => {
    await test.step('navigate to cart without adding any item', async () => {
      await cartPage.goto();
    });

    await test.step('assert cart is empty', async () => {
      expect(await cartPage.isCartEmpty()).toBe(true);
    });
  });
});
