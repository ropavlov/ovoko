import { Page, Locator } from '@playwright/test';

/**
 * Guest checkout flow: cart -> sign-in -> guest email -> shipping/payment.
 * We proceed only as far as eBay allows without authenticating or paying.
 *
 * NOTE: locators are documented best-guesses; verify with codegen before a run.
 */
export class CheckoutPage {
  private readonly emailInput: Locator;
  private readonly continueButton: Locator;
  private readonly continueAsGuestButton: Locator;
  private readonly paymentOrShippingStep: Locator;

  constructor(private readonly page: Page) {
    this.emailInput = page
      .locator('input[type="email"], input[name="userId"]')
      .first();
    // Exact match so this does not also resolve the "Continue as guest" button.
    this.continueButton = page
      .getByRole('button', { name: 'Continue', exact: true })
      .first();
    this.continueAsGuestButton = page
      .getByRole('button', { name: /continue as guest/i })
      .first();
    this.paymentOrShippingStep = page.locator(
      'h1:has-text("Shipping"), h1:has-text("Payment"), [data-testid="checkout-address-form"]',
    );
  }

  /** Enters the guest email on the sign-in step. */
  async enterGuestEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  /**
   * Continues past the sign-in step, handling the optional
   * "Create account vs Continue as guest" interstitial when it appears.
   */
  async continueAsGuest(): Promise<void> {
    await this.continueButton.click();
    await this.page.waitForLoadState('domcontentloaded');

    try {
      if (await this.continueAsGuestButton.isVisible({ timeout: 5_000 })) {
        await this.continueAsGuestButton.click();
        await this.page.waitForLoadState('domcontentloaded');
      }
    } catch {
      // No guest prompt — eBay went straight to shipping/payment.
    }
  }

  /** True once a shipping or payment form is visible (furthest reachable step). */
  async isOnPaymentStep(): Promise<boolean> {
    return await this.paymentOrShippingStep.first().isVisible();
  }
}
