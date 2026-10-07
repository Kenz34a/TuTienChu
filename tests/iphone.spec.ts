import { test, expect } from '@playwright/test';
import { offlineOrigin } from './offline-origin';

test('iPhone Safari offers home-screen installation and preserves offline cultivation', async ({
  page,
  context,
}) => {
  const origin = await offlineOrigin();
  try {
    await page.goto(origin.base);
    await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute(
      'content',
      'yes',
    );
    await page.getByRole('button', { name: 'Bản 1.6 · Lưu cục bộ', exact: true }).click();
    await page.getByRole('button', { name: /Cài ứng dụng/ }).click();
    await expect(
      page.getByRole('heading', { name: 'Chơi miễn phí trên iPhone & iPad' }),
    ).toBeVisible();
    await expect(page.getByText('App iOS riêng', { exact: true })).toBeVisible();
    await expect(page.getByText(/Thêm vào MH chính/)).toBeVisible();
    await page.getByRole('button', { name: 'Đóng', exact: true }).click();
    await page.getByRole('button', { name: /Tĩnh tâm tu luyện/ }).click();
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller)
        await new Promise<void>((r) =>
          navigator.serviceWorker.addEventListener('controllerchange', () => r(), { once: true }),
        );
    });
    await origin.pause();
    await expect(fetch(origin.base + '/api/health')).rejects.toThrow();
    await page.reload();
    await expect(page.getByRole('button', { name: /Xuất định/ })).toBeVisible();
    expect(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem('van-tien-ky.save.v1')!).training.active,
      ),
    ).toBe(true);
  } finally {
    await origin.close();
  }
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
});

test('iPhone Safari can export and re-import its character through a real file', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Bản 1.6 · Lưu cục bộ', exact: true }).click();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: /Xuất bản lưu/ }).click();
  const download = await downloaded,
    path = await download.path();
  expect(download.suggestedFilename()).toMatch(/^van-tien-ky-.+\.json$/);
  expect(path).toBeTruthy();
  await page.locator('input[type="file"]').setInputFiles(path!);
  await expect(page.getByRole('status').filter({ hasText: /Đã khôi phục/ })).toBeVisible();
});
