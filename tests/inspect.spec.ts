import { test } from '@playwright/test';

test('inspect DOM', async ({ page }) => {
  await page.goto('/');
  try {
    const btn = page.locator('button:has-text("Accept All"), button:has-text("Accept all")').first();
    if (await btn.isVisible({ timeout: 5000 })) await btn.click();
  } catch {}
  await page.locator('input#gh-ac').fill('Headphones');
  await page.locator('button#gh-search-btn').click();
  await page.waitForSelector('ul.srp-results', { timeout: 15000 });

  const info = await page.evaluate(() => {
    const ulSrp = document.querySelector('ul.srp-results')!;
    const firstCard = ulSrp?.querySelector('li.s-card') as HTMLElement | null;
    const h3Price = Array.from(document.querySelectorAll('h3')).find(h => h.textContent?.trim() === 'Price');
    const priceLi = h3Price?.closest('li');
    const priceBtn = priceLi?.querySelector('button');
    return {
      srp_exists: !!ulSrp,
      first_card_class: firstCard?.className,
      first_card_link_class: firstCard?.querySelector('a')?.className,
      first_card_title_class: firstCard?.querySelector('[class*="title"]')?.className,
      first_card_price_class: firstCard?.querySelector('[class*="price"]')?.className,
      price_btn_aria: priceBtn?.getAttribute('aria-label'),
      price_li_class: priceLi?.className,
    };
  });
  console.log('DOM INFO:', JSON.stringify(info, null, 2));
});
