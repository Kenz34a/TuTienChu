import { test, expect, type Page } from '@playwright/test';
const KEY = 'van-tien-ky.save.v1';
const state = (p: Page) => p.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY);
async function menu(p: Page, name: string) {
  if (await p.getByRole('button', { name: 'Mở menu' }).isVisible())
    await p.getByRole('button', { name: 'Mở menu' }).click();
  await p
    .getByRole('navigation', { name: 'Điều hướng chính' })
    .getByRole('button', { name, exact: true })
    .click();
}
async function register(p: Page, name: string) {
  await p.getByRole('button', { name: 'Tài khoản & đồng bộ', exact: true }).click();
  await p.getByRole('button', { name: 'Tạo tài khoản', exact: true }).click();
  await p.getByLabel('Tên tài khoản', { exact: true }).fill(name);
  await p.getByLabel('Mật khẩu', { exact: true }).fill('market-browser-password-123');
  await p.getByRole('button', { name: 'Tạo tài khoản & lưu đạo lộ', exact: true }).click();
  await expect(p.getByRole('status').filter({ hasText: 'Đã đồng bộ' })).toBeVisible({
    timeout: 15000,
  });
  await p.getByRole('button', { name: 'Đóng', exact: true }).click();
}

test('plays the pet, garden, expedition and talisman loop and keeps it after reload', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Vào Động Thiên', exact: true }).click();
  await expect(page.getByText('95+', { exact: true })).toBeVisible();
  const now = Date.now();
  await page.clock.install({ time: now });
  await page.clock.pauseAt(now + 1000);
  const fox = page
    .locator('.dao-card')
    .filter({ has: page.getByRole('heading', { name: 'Thanh Vĩ Hồ', exact: true }) });
  await fox.getByRole('button', { name: 'Kết khế ước', exact: true }).click();
  expect((await state(page)).adventure.activePet).toBe('fox');
  await page
    .getByRole('navigation', { name: 'Động Thiên', exact: true })
    .getByRole('button', { name: 'Linh viên', exact: true })
    .click();
  await page.getByRole('button', { name: 'Gieo linh dược', exact: true }).first().click();
  await expect(
    page.getByRole('button', { name: 'Thu hoạch 3 nguyên liệu', exact: true }),
  ).toBeDisabled();
  await page
    .getByRole('navigation', { name: 'Động Thiên', exact: true })
    .getByRole('button', { name: 'Viễn chinh', exact: true })
    .click();
  await page.getByRole('button', { name: 'Khởi hành', exact: true }).first().click();
  await expect(
    page.getByRole('button', { name: 'Nhận chiến lợi phẩm', exact: true }),
  ).toBeDisabled();
  await page.clock.fastForward(181000);
  await page.getByRole('button', { name: 'Nhận chiến lợi phẩm', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Động Thiên', exact: true })
    .getByRole('button', { name: 'Linh viên', exact: true })
    .click();
  await page.getByRole('button', { name: 'Thu hoạch 3 nguyên liệu', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Động Thiên', exact: true })
    .getByRole('button', { name: 'Phù lục', exact: true })
    .click();
  await page
    .locator('.dao-card')
    .first()
    .getByRole('button', { name: 'Luyện phù', exact: true })
    .click();
  await page
    .locator('.dao-card')
    .first()
    .getByRole('button', { name: 'Dùng · 2', exact: true })
    .click();
  await expect(page.locator('.dao-buff')).toContainText('+12%');
  expect((await state(page)).adventure).toMatchObject({
    harvests: 1,
    sealsCrafted: 1,
    expeditions: { completed: { quay: 1 } },
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: `test-results/dao-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.reload();
  expect((await state(page)).adventure.pets.fox.level).toBe(1);
  expect((await state(page)).adventure.sealsCrafted).toBe(1);
  expect(errors).toEqual([]);
});

test('trades between two actual accounts with escrow, private delivery and saved receipts', async ({
  page,
  browser,
}) => {
  test.setTimeout(90000);
  const unique = Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    sellerName = 'sell_' + unique,
    buyerName = 'buy_' + unique;
  await page.goto('/');
  await register(page, sellerName);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } }),
    buyer = await context.newPage();
  try {
    await buyer.goto('http://127.0.0.1:4173');
    await register(buyer, buyerName);
    await page.getByRole('button', { name: 'Mở Vạn Bảo Các', exact: true }).click();
    await page
      .getByRole('navigation', { name: 'Vạn Bảo Các', exact: true })
      .getByRole('button', { name: 'Ký gửi', exact: true })
      .click();
    await page.getByLabel('Bảo vật từ ba lô').selectOption('item:herb');
    await page.getByLabel('Số lượng', { exact: true }).fill('3');
    await page.getByLabel('Giá mỗi món').fill('50');
    await page.getByLabel('Người nhận riêng (không bắt buộc)').fill(buyerName);
    await page.getByRole('button', { name: 'Gửi đơn riêng', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Đã ký gửi.' })).toBeVisible();
    expect((await state(page)).inventory.herb).toBe(5);
    await buyer.getByRole('button', { name: 'Mở Vạn Bảo Các', exact: true }).click();
    await buyer
      .getByRole('navigation', { name: 'Vạn Bảo Các', exact: true })
      .getByRole('button', { name: 'Đơn riêng', exact: true })
      .click();
    await buyer.getByRole('button', { name: 'Mua bảo vật', exact: true }).click();
    const dialog = buyer.getByRole('dialog', { name: 'Nhận bảo vật hữu duyên?' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('150');
    await dialog.getByRole('button', { name: 'Xác nhận mua', exact: true }).click();
    await expect(buyer.getByRole('status').filter({ hasText: 'Đã mua bảo vật.' })).toBeVisible();
    expect((await state(buyer)).stones).toBe(30);
    expect((await state(buyer)).inventory.herb).toBe(11);
    await page.getByRole('button', { name: 'Tài khoản & đồng bộ', exact: true }).click();
    await page.getByRole('button', { name: 'Đồng bộ ngay', exact: true }).click();
    await expect.poll(async () => (await state(page)).stones).toBe(327);
    await page.getByRole('button', { name: 'Đóng', exact: true }).click();
    await page
      .getByRole('navigation', { name: 'Vạn Bảo Các', exact: true })
      .getByRole('button', { name: 'Lịch sử', exact: true })
      .click();
    await expect(page.getByText(/Đã bán cho/)).toBeVisible();
    await buyer.reload();
    expect((await state(buyer)).adventure.marketTrades).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `test-results/market-${test.info().project.name}.png`,
      fullPage: true,
    });
  } finally {
    await context.close();
  }
});
