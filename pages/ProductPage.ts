import { Page, Locator } from '@playwright/test';

export class ProductPage {
  private readonly title: Locator;
  private readonly addToCartButton: Locator;
  private readonly atcConfirmationLayer: Locator;

  constructor(private readonly page: Page) {
    this.title = page.locator('h1.x-item-title__mainTitle span');
    this.addToCartButton = page
      .locator('#atcBtn_btn_1, button:has-text("Add to cart")')
      .first();
    // Real ATC confirmation layer data-testid verified 2026-06.
    this.atcConfirmationLayer = page.locator('[data-testid="x-atc-layer-v3"]');
  }

  /** Reads the product title from the item header. */
  async getTitle(): Promise<string> {
    return (await this.title.innerText()).trim();
  }

  /**
   * For every unselected MSKU variant dropdown (Color, Option, Bundle, etc.),
   * opens the dropdown and picks the "Most popular" option when eBay marks one,
   * otherwise falls back to the first available option.
   *
   * eBay uses button.listbox-button__control[value="Select"] for each unresolved
   * selector. The button's aria-controls attribute points to the dropdown panel
   * that contains the options. We interact with the visible UI rather than the
   * hidden native <select> because eBay's JS listens to the widget, not the
   * underlying element.
   */
  async selectFirstAvailableVariants(): Promise<void> {
    // Covers both x-msku-evo (current) and x-msku (older) widget variants.
    const btnSelector =
      '.x-msku-evo button.listbox-button__control[value="Select"], ' +
      '.x-msku button.listbox-button__control[value="Select"]';

    const count = await this.page.locator(btnSelector).count();

    for (let i = 0; i < count; i++) {
      // Re-query on every iteration — the DOM updates after each selection.
      const btn = this.page.locator(btnSelector).first();
      const dropId = await btn.getAttribute('aria-controls');
      await btn.click();

      // Exclude disabled (out-of-stock) options — they have aria-disabled="true".
      const optionInDrop = this.page.locator(
        `#${dropId} .listbox__option[data-sku-value-name]:not([aria-disabled="true"])`,
      );
      await optionInDrop.first().waitFor({ state: 'visible', timeout: 5_000 });

      // Prefer "Most popular" when present; otherwise take the first clickable option.
      const popular = optionInDrop.filter({ hasText: 'Most popular' }).first();
      const target = (await popular.count()) > 0 ? popular : optionInDrop.first();
      await target.click();
    }
  }

  /**
   * Selects required variants (if any), clicks Add to cart, then waits for
   * eBay's confirmation overlay. If no overlay appears the item was likely
   * added via redirect — continue either way.
   */
  async addToCart(): Promise<void> {
    await this.selectFirstAvailableVariants();
    await this.addToCartButton.click();
    try {
      await this.atcConfirmationLayer.waitFor({ state: 'visible', timeout: 8_000 });
    } catch {
      // No overlay — eBay redirected or used a different flow.
    }
  }
}
