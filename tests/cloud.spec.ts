import { test, expect, type Page } from '@playwright/test';
import { offlineOrigin } from './offline-origin';
const password = 'cloud-test-password-123';
async function openAccount(page: Page) {
  await page.getByRole('button', { name: 'Tài khoản & đồng bộ', exact: true }).click();
}
async function signin(page: Page, username: string, register = false) {
  await openAccount(page);
  if (register) await page.getByRole('button', { name: 'Tạo tài khoản', exact: true }).click();
  await page.getByLabel('Tên tài khoản', { exact: true }).fill(username);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page
    .getByRole('button', {
      name: register ? 'Tạo tài khoản & lưu đạo lộ' : 'Đăng nhập tài khoản',
      exact: true,
    })
    .click();
}
async function closeAccount(page: Page) {
  await page.getByRole('button', { name: 'Đóng', exact: true }).click();
}
async function state(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('van-tien-ky.save.v1') || '{}'));
}
async function meditation(page: Page) {
  const start = page.getByRole('button', { name: /Tĩnh tâm tu luyện/ });
  if (await start.isVisible()) await start.click();
  await page.clock.fastForward(60000);
  await page.getByRole('button', { name: /Xuất định/ }).click();
}

test('shares a character across devices and safely resolves offline changes', async ({
  page,
  browser,
  browserName,
}) => {
  test.setTimeout(90000);
  const username = `cloud_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const outage = browserName === 'webkit' ? await offlineOrigin() : undefined;
  const origin = outage?.base || 'http://127.0.0.1:4173';
  await page.goto(origin);
  await page.clock.install();
  await meditation(page);
  await signin(page, username, true);
  await expect(page.getByRole('status').filter({ hasText: 'Đã đồng bộ' })).toBeVisible({
    timeout: 15000,
  });
  const saved = await state(page);
  const secondContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  // Keep the offline API guard through PWA reloads: a service-worker-controlled
  // request can escape Playwright routing even when the page request is aborted.
  await secondContext.addInitScript(() => {
    const getOnline = Object.getOwnPropertyDescriptor(Navigator.prototype, 'onLine')!.get!;
    Object.defineProperty(navigator, 'onLine', {
      get: () =>
        localStorage.getItem('test-api-offline') === 'true' ? false : getOnline.call(navigator),
    });
  });
  let apiOffline = false;
  await secondContext.route('**/api/**', (route) =>
    apiOffline ? route.abort('internetdisconnected') : route.continue(),
  );
  const second = await secondContext.newPage();
  try {
    await second.goto(origin);
    await second.clock.install();
    await signin(second, username);
    await expect(second.getByRole('heading', { name: 'Chọn đạo lộ muốn tiếp tục' })).toBeVisible();
    await second.getByRole('button', { name: /Dùng bản trên tài khoản/ }).click();
    await expect
      .poll(async () => (await state(second)).metrics.meditations)
      .toBe(saved.metrics.meditations);
    // Choosing the cloud must never upload the previous local character.
    await expect(second.getByRole('status').filter({ hasText: 'Đã đồng bộ' })).toBeVisible();
    await page.getByRole('button', { name: 'Đồng bộ ngay', exact: true }).click();
    await expect
      .poll(async () => (await state(page)).metrics.meditations)
      .toBe(saved.metrics.meditations);
    await closeAccount(page);
    await closeAccount(second);
    await second.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller)
        await new Promise<void>((resolve) =>
          navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), {
            once: true,
          }),
        );
    });
    apiOffline = true;
    await second.evaluate(() => localStorage.setItem('test-api-offline', 'true'));
    if (outage) {
      await outage.pause();
      await expect(fetch(origin + '/api/health')).rejects.toThrow();
    } else await secondContext.setOffline(true);
    await meditation(second);
    await second.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await second.reload();
    await expect
      .poll(async () => (await state(second)).metrics.meditations)
      .toBe(saved.metrics.meditations + 1);
    if (outage) await outage.resume();
    await meditation(page);
    await openAccount(page);
    await page.getByRole('button', { name: 'Đồng bộ ngay', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Đã đồng bộ' })).toBeVisible();
    apiOffline = false;
    await second.evaluate(() => localStorage.removeItem('test-api-offline'));
    if (!outage) await secondContext.setOffline(false);
    await openAccount(second);
    await expect(second.getByRole('heading', { name: 'Chọn đạo lộ muốn tiếp tục' })).toBeVisible({
      timeout: 20000,
    });
    await second.getByRole('button', { name: /Dùng bản trên thiết bị/ }).click();
    await expect(second.getByRole('status').filter({ hasText: 'Đã đồng bộ' })).toBeVisible({
      timeout: 15000,
    });
    await second.reload();
    await openAccount(second);
    await expect(second.getByRole('status').filter({ hasText: 'Đã đồng bộ' })).toBeVisible({
      timeout: 15000,
    });
    await second.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
    await expect(
      second.getByRole('button', { name: 'Đăng nhập tài khoản', exact: true }),
    ).toBeVisible();
    expect((await state(second)).metrics.meditations).toBe(saved.metrics.meditations + 1);
  } finally {
    await secondContext.close();
    await outage?.close();
  }
});
