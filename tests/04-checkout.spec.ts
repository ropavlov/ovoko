import { test, expect } from '../fixtures';
import { getPrimaryTestData } from '../utils/test-data-reader';

const data = getPrimaryTestData();

test.describe('Checkout', () => {
  test('should proceed to checkout with guest email @regression', async ({
    page,
    cartPage,
    checkoutPage,
    cartWithItem,
  }) => {
    expect(cartWithItem.productTitle.length).toBeGreaterThan(0);

    await test.step('proceed to checkout from cart', async () => {
      await cartPage.goto();
      await cartPage.proceedToCheckout();
    });

    await test.step('enter guest email from test data', async () => {
      await checkoutPage.enterGuestEmail(data.guestEmail);
    });

    await test.step('continue as guest', async () => {
      await checkoutPage.continueAsGuest();
    });

    await test.step('assert we reached the shipping or payment step', async () => {
      expect(await checkoutPage.isOnPaymentStep()).toBe(true);
    });

    await test.step('assert URL indicates checkout / shipping', async () => {
      const url = page.url().toLowerCase();
      expect(url.includes('checkout') || url.includes('ship')).toBe(true);
    });
  });
});
