# eBay UI Automation — Playwright + TypeScript

End-to-end automation of an eBay shopping flow, built as a Senior QA Automation home task. The suite drives a real purchase journey — search, filter, add to cart, guest checkout, and removal — using the Page Object Model, typed external test data, custom fixtures, multi-browser execution, and Allure reporting.

## Overview

The suite automates the following flow against `https://www.ebay.com`, split into independent, individually runnable test cases:

1. Search for "Headphones"
2. Filter results to the Sony brand
3. Apply a 50–200 price range
4. Select the third item in the filtered list
5. Select required product options (color, bundle, etc.) — picks "Most popular" when available, otherwise the first clickable option
6. Add the item to the cart
7. Begin guest checkout and proceed as far as possible without paying
8. Return to the cart and remove the item

Negative scenarios (no-result searches, impossible price ranges, empty cart) are covered alongside the happy path.

## Prerequisites

- Node.js 20+
- Allure CLI for viewing reports: `npm install -g allure-commandline`

## Installation

```bash
npm ci
npx playwright install --with-deps
```

## Configuration

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env
```

| Variable | Description | Required |
|---|---|---|
| `EBAY_EMAIL` | eBay account email for authentication | **Yes** — cart tests fail without it |
| `EBAY_PASSWORD` | eBay account password | **Yes** — cart tests fail without it |
| `BASE_URL` | Base URL under test | No (default: `https://www.ebay.com`) |
| `GUEST_EMAIL` | Fake email used for guest checkout | No (default: `testguest.automation@example.com`) |
| `TEST_DATA_PATH` | Path to the JSON test-data file | No (default: `test-data/search.json`) |

> **Why credentials are required:** eBay cart operations require an authenticated session. Without credentials, `auth.setup.ts` saves an empty storage state and tests 03, 04, and 05 will fail. The session is saved to `.auth/user.json` and reused across runs — eBay sessions last weeks so re-login is rare.

Test inputs (search term, brand, price range, guest email) live in `test-data/search.json` and are read through a typed loader (`utils/test-data-reader.ts`), so the suite can be re-pointed at new inputs without code changes.

## Running Tests

| Command | What it runs |
|---|---|
| `npm test` | Full suite, all browsers |
| `npm run test:chrome` | Chromium only |
| `npm run test:firefox` | Firefox only |
| `npm run test:smoke` | `@smoke`-tagged tests |
| `npm run test:regression` | `@regression`-tagged tests |
| `npm run test:negative` | `@negative`-tagged tests |
| `npm run test:headed` | Full suite in headed mode |
| `npm run test:debug` | Playwright inspector / debug mode |
| `npm run lint` | ESLint over all TypeScript |
| `npm run format` | Prettier write |
| `npm run typecheck` | `tsc --noEmit` type check |

## Viewing the Report

```bash
npm run report
```

This generates the Allure report from `allure-results/` and opens it in a browser (`report:generate` + `report:open` can also be run separately).

## CI

GitHub Actions (`.github/workflows/playwright.yml`) installs dependencies with `npm ci`, installs browsers, runs the full suite with `CI=true` (enabling retries and a single worker), and uploads both the raw `allure-results` and the generated `allure-report` as artifacts on every run, pass or fail.

## Project Structure

```
.
├── .env.example
├── .eslintrc.json
├── .prettierrc
├── .gitignore
├── playwright.config.ts
├── tsconfig.json
├── package.json
├── test-data/
│   └── search.json
├── utils/
│   └── test-data-reader.ts
├── pages/
│   ├── SearchPage.ts
│   ├── ResultsPage.ts
│   ├── ProductPage.ts
│   ├── CartPage.ts
│   └── CheckoutPage.ts
├── fixtures/
│   └── index.ts
├── tests/
│   ├── 01-search.spec.ts
│   ├── 02-filters.spec.ts
│   ├── 03-add-to-cart.spec.ts
│   ├── 04-checkout.spec.ts
│   ├── 05-remove-from-cart.spec.ts
│   └── negative.spec.ts
└── .github/
    └── workflows/
        └── playwright.yml
```

## Architecture Notes

- **Page Object Model** — each page exposes intent-level methods; tests never touch raw locators.
- **Custom fixtures** (`fixtures/index.ts`) — all specs import `test`/`expect` from here, not from `@playwright/test`. The `cartWithItem` fixture sets up a cart with one item and cleans up afterward (best-effort, try/catch), keeping every test independently runnable. A `page.on('load')` auto-handler dismisses the GDPR cookie-consent banner on any domain without requiring each test to handle it manually.
- **MSKU variant selection** (`ProductPage.selectFirstAvailableVariants`) — before clicking "Add to cart", all unresolved product option dropdowns (Color, Style, Bundle, etc.) are resolved automatically. "Most popular" is preferred when eBay marks one; out-of-stock (`aria-disabled`) options are skipped; the first clickable option is the fallback.
- **`test.step()`** wraps every logical action group, producing a readable Allure report.
- **Tags** — `@smoke`, `@regression`, `@negative` select subsets via `--grep`.

## Assumptions & Known Limitations

- Cart tests (03, 04, 05) require a real eBay account — set `EBAY_EMAIL` and `EBAY_PASSWORD` in `.env`. Tests 01, 02, and negative scenarios run without credentials.
- eBay's checkout requires sign-in or a guest email; tests proceed to the shipping step using a fake email and never submit payment.
- Product option selectors (Color, Bundle, etc.) are handled generically but eBay may introduce new widget types. If a new variant selector pattern appears, update `ProductPage.selectFirstAvailableVariants`.
- Search results are dynamic — the third item changes between runs. The suite is designed to handle any item in that position, including those with multiple required options.
- eBay employs bot detection; running from data-center IPs or headless CI may trigger challenges. Local headed runs are the most reliable.
