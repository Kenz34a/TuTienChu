// Actual Electron smoke check; uses an X display in Linux cloud environments.
import { _electron as electron, expect } from '@playwright/test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium } from '@playwright/test';

const temp = await mkdtemp(join(tmpdir(), 'van-tien-pc-check-'));
const executablePath = process.env.PC_TEST_EXECUTABLE;
const launch = () =>
  electron.launch({
    ...(executablePath ? { executablePath } : {}),
    args: [
      ...(executablePath ? [] : ['desktop/main.cjs']),
      `--user-data-dir=${join(temp, 'profile')}`,
      ...(process.env.PC_TEST_NO_SANDBOX === '1' ? ['--no-sandbox'] : []),
    ],
    env: { ...process.env },
  });
let app;
try {
  app = await launch();
  const page = await app.firstWindow();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await expect(page.getByRole('heading', { name: 'Hôm nay, tiến thêm một bước.' })).toBeVisible({
    timeout: 15000,
  });
  expect(
    await page.evaluate(() => ({
      platform: window.vanTienDesktop?.platform,
      nodeAccess: typeof window.require,
      origin: location.origin,
    })),
  ).toEqual({ platform: 'pc', nodeAccess: 'undefined', origin: 'vantien://app' });
  await page.getByRole('button', { name: /Tĩnh tâm tu luyện/ }).click();
  const load = () => page.evaluate(() => JSON.parse(localStorage.getItem('van-tien-ky.save.v1')));
  expect((await load()).metrics.meditations).toBe(1);
  await page.reload();
  expect((await load()).metrics.meditations).toBe(1);
  const backup = join(temp, 'backup.json');
  await app.evaluate(({ dialog }, path) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: path });
  }, backup);
  await page.getByRole('button', { name: 'Bản 1.2 · Lưu cục bộ' }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Xuất bản lưu/ })
    .click();
  await expect
    .poll(async () => {
      try {
        return JSON.parse(await readFile(backup, 'utf8')).metrics.meditations;
      } catch {
        return -1;
      }
    })
    .toBe(1);
  await page.getByRole('button', { name: 'Đóng', exact: true }).click();
  await page.getByRole('button', { name: 'Tài khoản & đồng bộ', exact: true }).click();
  await page.getByRole('button', { name: 'Tạo tài khoản', exact: true }).click();
  const username = `pc_${Date.now()}`;
  await page.getByLabel('Địa chỉ web của game', { exact: true }).fill('http://127.0.0.1:3000');
  await page.getByLabel('Tên tài khoản', { exact: true }).fill(username);
  await page.getByLabel('Mật khẩu', { exact: true }).fill('pc-smoke-password-123');
  await page.getByRole('button', { name: 'Tạo tài khoản & lưu đạo lộ', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Đã đồng bộ' })).toBeVisible({
    timeout: 15000,
  });
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium',
  });
  try {
    const web = await browser.newPage();
    await web.goto('http://127.0.0.1:3000');
    await web.getByRole('button', { name: 'Tài khoản & đồng bộ', exact: true }).click();
    await web.getByLabel('Tên tài khoản', { exact: true }).fill(username);
    await web.getByLabel('Mật khẩu', { exact: true }).fill('pc-smoke-password-123');
    await web.getByRole('button', { name: 'Đăng nhập tài khoản', exact: true }).click();
    await web.getByRole('button', { name: /Dùng bản trên tài khoản/ }).click();
    await expect
      .poll(() =>
        web.evaluate(
          () => JSON.parse(localStorage.getItem('van-tien-ky.save.v1')).metrics.meditations,
        ),
      )
      .toBe(1);
    await web.getByRole('button', { name: 'Đóng', exact: true }).click();
    await web.getByRole('button', { name: /Tĩnh tâm tu luyện/ }).click();
    await web.getByRole('button', { name: 'Tài khoản & đồng bộ', exact: true }).click();
    await web.getByRole('button', { name: 'Đồng bộ ngay', exact: true }).click();
    await expect(web.getByRole('status').filter({ hasText: 'Đã đồng bộ' })).toBeVisible();
    await page.getByRole('button', { name: 'Đồng bộ ngay', exact: true }).click();
    await expect.poll(async () => (await load()).metrics.meditations).toBe(2);
  } finally {
    await browser.close();
  }
  await page.screenshot({ path: resolve('release/app-pc.png') });
  expect(errors).toEqual([]);
  await app.close();
  app = await launch();
  const reopened = await app.firstWindow();
  await expect(
    reopened.getByRole('heading', { name: 'Hôm nay, tiến thêm một bước.' }),
  ).toBeVisible();
  await expect
    .poll(() =>
      reopened.evaluate(
        () => JSON.parse(localStorage.getItem('van-tien-ky.save.v1')).metrics.meditations,
      ),
    )
    .toBe(2);
  console.log(
    'PC app verified: bundled game, isolation, save/reopen, native JSON export and PC ↔ web account sync.',
  );
} finally {
  if (app) await app.close();
  await rm(temp, { recursive: true, force: true });
}
