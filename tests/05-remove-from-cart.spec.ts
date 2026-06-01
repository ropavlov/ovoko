import { test, expect } from '../fixtures';

test.describe('Cart Management', () => {
  test('should remove item from cart @smoke', async ({
    cartPage,
    cartWithItem,
  }) => {
    expect(cartWithItem.productTitle.length).toBeGreaterThan(0);

    await test.step('navigate to cart', async () => {
      await cartPage.goto();
    });

    await test.step('assert item is present (count = 1)', async () => {
      expect(await cartPage.getItemCount()).toBe(1);
    });

    await test.step('remove item', async () => {
      await cartPage.removeFirstItem();
    });

    await test.step('assert cart is empty', async () => {
      expect(await cartPage.getItemCount()).toBe(0);
    });

    await test.step('assert empty cart message is visible', async () => {
      expect(await cartPage.isCartEmpty()).toBe(true);
    });
  });
});
