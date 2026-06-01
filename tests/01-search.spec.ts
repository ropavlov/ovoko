import { test, expect } from '../fixtures';
import { getPrimaryTestData } from '../utils/test-data-reader';

const data = getPrimaryTestData();

test.describe('Search', () => {
  test(`should return results for '${data.searchTerm}' search @smoke`, async ({
    page,
    searchPage,
    resultsPage,
  }) => {
    await test.step('navigate and dismiss cookie banner', async () => {
      await searchPage.open();
    });

    await test.step('search for term from test data', async () => {
      await searchPage.search(data.searchTerm);
    });

    await test.step('assert result count > 0', async () => {
      expect(await resultsPage.getResultCount()).toBeGreaterThan(0);
    });

    await test.step('assert URL reflects the search term', async () => {
      expect(page.url().toLowerCase()).toContain(
        data.searchTerm.toLowerCase(),
      );
    });
  });
});
