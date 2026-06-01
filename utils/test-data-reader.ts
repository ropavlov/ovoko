import searchData from '../test-data/search.json';

/**
 * Strongly-typed reader for the external JSON test-data file.
 *
 * The data lives outside the spec files so the same suite can be re-pointed at
 * different inputs (e.g. other search terms / price ranges) without code edits,
 * satisfying the "input data retrieved from an external file" requirement.
 */
export interface TestData {
  searchTerm: string;
  brand: string;
  priceMin: number;
  priceMax: number;
  /** 1-based position of the item to select from the filtered results. */
  itemIndex: number;
  guestEmail: string;
}

/**
 * Loads and returns all test-data records from `test-data/search.json`.
 *
 * The JSON is imported natively (`resolveJsonModule`), giving us type inference
 * and a single bundled source of truth with no external parsing dependency.
 */
export function readTestData(): TestData[] {
  return searchData as TestData[];
}

/**
 * Returns the primary (first) test-data record, throwing a clear error if the
 * data file is empty — avoids opaque `undefined` failures inside specs.
 */
export function getPrimaryTestData(): TestData {
  const [first] = readTestData();
  if (!first) {
    throw new Error('No test data found in test-data/search.json');
  }
  return first;
}
