import { Page, Locator, expect } from '@playwright/test';
import { assertNotBotChallenge } from '../utils/bot-detection';

/**
 * Shopping cart page (cart.ebay.com) — item count, removal, checkout entry.
 *
 * NOTE: locators are documented best-guesses; verify with codegen before a run.
 */
export class CartPage {
  private readonly items: Locator;
  private readonly removeButton: Locator;
  private readonly checkoutButton: Locator;
  private readonly emptyState: Locator;

  constructor(private readonly page: Page) {
    // Real eBay cart DOM (verified 2026-06): items are .cart-bucket-lineitem
    // inside [data-test-id="cart-bucket"]. Note: eBay uses data-test-id (hyphen),
    // not data-testid (camelCase) on the cart domain.
    this.items = page.locator('[data-test-id="cart-bucket"] .cart-bucket-lineitem');
    this.removeButton = page.locator('[data-test-id="cart-remove-item"]').first();
    this.checkoutButton = page
      .locator(
        'button:has-text("Go to checkout"), button:has-text("Proceed to checkout")',
      )
      .first();
    // OR-locator: a `text=` selector cannot be comma-combined with a CSS one,
    // so compose the two candidate empty-state signals explicitly.
    this.emptyState = page
      .getByText("You don't have any items in your cart.")
      .or(page.getByText('Your cart is empty'))
      .or(page.locator('[data-testid="cart-empty-state"]'));
  }

  /** Navigates directly to the cart. Respects CART_URL for non-prod environments. */
  async goto(): Promise<void> {
    await this.page.goto(process.env.CART_URL ?? 'https://cart.ebay.com/');
    await assertNotBotChallenge(this.page);
  }

  /**
   * Number of line items currently in the cart. Waits until the cart has
   * rendered either at least one item or its empty state before counting,
   * so callers never read a half-rendered cart. Returns 0 when cart.ebay.com
   * returns its error page (shown for sessions with no cart state).
   */
  async getItemCount(): Promise<number> {
    if (await this.isErrorPage()) return 0;
    await this.waitForCartReady();
    return await this.items.count();
  }

  /**
   * Removes the first cart item. Removal is an in-page (XHR) update, so we
   * assert the item count drops rather than relying on a navigation event.
   */
  async removeFirstItem(): Promise<void> {
    const initialCount = await this.items.count();
    await this.removeButton.click();
    await expect(this.items).toHaveCount(Math.max(initialCount - 1, 0));
  }

  /** Starts the checkout flow from the cart. */
  async proceedToCheckout(): Promise<void> {
    await this.checkoutButton.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  /** True when the cart shows its empty state or is inaccessible (error page). */
  async isCartEmpty(): Promise<boolean> {
    if (await this.isErrorPage()) return true;
    await this.waitForCartReady();
    return await this.emptyState.first().isVisible();
  }

  /** Waits until the cart has rendered its items or its empty state. */
  private async waitForCartReady(): Promise<void> {
    await this.items.first().or(this.emptyState).waitFor({ state: 'visible' });
  }

  /**
   * True when cart.ebay.com cannot render a usable cart — generic error page
   * or any eBay bot-detection / verification page.
   */
  private async isErrorPage(): Promise<boolean> {
    const title = (await this.page.title()).toLowerCase();
    const url = this.page.url().toLowerCase();
    return (
      title.includes('error') ||
      title.includes('verify') ||
      title.includes('pardon') ||
      title.includes('security measure') ||
      url.includes('captcha') ||
      url.includes('splashui') ||
      url.includes('interrupt')
    );
  }

  /**
   * True when a cart line item references the given text (e.g. a product title
   * token). Scoped to the cart items so unrelated page sections — "recently
   * viewed", recommendations — cannot produce a false match.
   */
  async containsText(text: string): Promise<boolean> {
    return (await this.items.filter({ hasText: text }).count()) > 0;
  }
}
