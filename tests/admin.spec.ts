import { expect, test, type Browser, type Page } from '@playwright/test';
import { createApp } from '../server/app';
import { initialState } from '../src/game/engine';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

async function backend() {
  const dir = await mkdtemp(join(tmpdir(), 'van-tien-admin-ui-'));
  const service = createApp({
    databasePath: join(dir, 'van-tien-ky.sqlite'),
    allowedOrigins: ['http://127.0.0.1:4173'],
  });
  const server = service.app.listen(0, '127.0.0.1');
  await new Promise<void>((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const request = async (
    path: string,
    token?: string,
    body?: unknown,
    method = body === undefined ? 'GET' : 'POST',
  ) => {
    const r = await fetch(base + '/api' + path, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: r.status, data: await r.json() };
  };
  const register = async (username: string) => {
    const a = (
      await request('/auth/register', undefined, { username, password: 'admin-ui-password-123' })
    ).data;
    await request('/save', a.token, { revision: 0, state: initialState() }, 'PUT');
    return a;
  };
  const owner = await register('server_owner'),
    player = await register('ordinary_player');
  const cli = spawnSync(process.execPath, ['scripts/admin.mjs', 'grant', 'server_owner'], {
    cwd: resolve('.'),
    env: { ...process.env, DATA_DIR: dir },
    encoding: 'utf8',
  });
  expect(cli.status).toBe(0);
  return {
    base,
    request,
    owner,
    player,
    close: async () => {
      await new Promise<void>((r) => {
        server.close(() => r());
        server.closeAllConnections();
      });
      service.close();
      await rm(dir, { recursive: true, force: true });
    },
  };
}
async function configure(page: Page, server: string) {
  await page.addInitScript((s) => localStorage.setItem('van-tien-ky.server.v1', s), server);
}
async function adminLogin(page: Page, server: string, username = 'server_owner') {
  await configure(page, server);
  await page.goto('/admin');
  await page.getByLabel('Tài khoản admin', { exact: true }).fill(username);
  await page.getByLabel('Mật khẩu', { exact: true }).fill('admin-ui-password-123');
  await page.getByRole('button', { name: 'Vào trang quản trị', exact: true }).click();
}
async function playerLogin(
  browser: Browser,
  server: string,
  viewport: { width: number; height: number } | null,
) {
  const context = await browser.newContext(viewport ? { viewport } : {});
  const page = await context.newPage();
  await configure(page, server);
  await page.goto('/');
  await page.getByRole('button', { name: 'Tài khoản & đồng bộ', exact: true }).click();
  await page.getByLabel('Tên tài khoản', { exact: true }).fill('ordinary_player');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('admin-ui-password-123');
  await page.getByRole('button', { name: 'Đăng nhập tài khoản', exact: true }).click();
  await page.getByRole('button', { name: /Dùng bản trên tài khoản/ }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Đã đồng bộ' })).toBeVisible();
  await page.getByRole('button', { name: 'Đóng', exact: true }).click();
  return { context, page };
}
const confirm = async (page: Page) =>
  page
    .getByRole('dialog', { name: 'Xác nhận điều hành' })
    .getByRole('button', { name: 'Xác nhận thay đổi', exact: true })
    .click();
test('administrator creates a real gift, player redeems it once and history survives reopening', async ({
  page,
  browser,
}) => {
  const f = await backend();
  let player: Awaited<ReturnType<typeof playerLogin>> | undefined;
  try {
    await adminLogin(page, f.base);
    await expect(page.getByRole('heading', { name: 'Máy chủ', exact: true })).toBeVisible();
    await page
      .getByRole('navigation', { name: 'Điều hướng quản trị' })
      .getByRole('button', { name: 'Giftcode', exact: true })
      .click();
    await page.getByLabel('Mã quà tặng', { exact: true }).fill('LAP_TEST');
    await page.getByLabel('Tên gói quà', { exact: true }).fill('Quà test laptop');
    await page.getByLabel('Linh thạch', { exact: true }).fill('750');
    await page.getByLabel('Tiên thạch', { exact: true }).fill('3');
    await page.getByRole('button', { name: 'Tạo giftcode', exact: true }).click();
    await expect(page.locator('.admin-code-card').filter({ hasText: 'LAP_TEST' })).toContainText(
      '750 linh thạch',
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    player = await playerLogin(browser, f.base, page.viewportSize());
    await player.page.getByRole('button', { name: 'Nhập giftcode', exact: true }).click();
    await player.page.getByLabel('Mã quà tặng', { exact: true }).fill(' lap_test ');
    await player.page.getByRole('button', { name: 'Nhận quà', exact: true }).click();
    await expect(
      player.page.getByRole('status').filter({ hasText: 'Đã nhận LAP_TEST' }),
    ).toBeVisible();
    await expect
      .poll(
        async () =>
          JSON.parse(
            (await player!.page.evaluate(() => localStorage.getItem('van-tien-ky.save.v1'))) ||
              '{}',
          ).stones,
      )
      .toBe(930);
    await expect(player.page.locator('.gift-history article')).toHaveCount(1);
    await player.page.getByLabel('Mã quà tặng', { exact: true }).fill('LAP_TEST');
    await player.page.getByRole('button', { name: 'Nhận quà', exact: true }).click();
    await expect(player.page.getByRole('alert')).toContainText('đã nhận giftcode');
    expect((await f.request('/save', f.player.token)).data.state.stones).toBe(930);
    await player.page.reload();
    await player.page.getByRole('button', { name: 'Nhập giftcode', exact: true }).click();
    await expect(player.page.locator('.gift-history article')).toHaveCount(1);
    await page
      .getByRole('navigation', { name: 'Điều hướng quản trị' })
      .getByRole('button', { name: 'Lịch sử quà', exact: true })
      .click();
    await expect(page.locator('tbody')).toContainText('ordinary_player');
  } finally {
    await player?.context.close();
    await f.close();
  }
});
test('admin edits four-phase characters, broadcasts maintenance and controls real world bosses', async ({
  page,
  browser,
}) => {
  const f = await backend();
  let player: Awaited<ReturnType<typeof playerLogin>> | undefined;
  try {
    await adminLogin(page, f.base);
    await expect(page.getByRole('heading', { name: 'Máy chủ', exact: true })).toBeVisible();
    const nav = page.getByRole('navigation', { name: 'Điều hướng quản trị' });
    await nav.getByRole('button', { name: 'Người chơi', exact: true }).click();
    await page
      .getByRole('row')
      .filter({ hasText: 'ordinary_player' })
      .getByRole('button', { name: 'Điều hành', exact: true })
      .click();
    await page.getByLabel('Tổng linh thạch', { exact: true }).fill('8888');
    await page.getByRole('combobox', { name: 'Cảnh giới', exact: true }).selectOption('10');
    await page.getByRole('button', { name: 'Lưu nhân vật', exact: true }).click();
    await confirm(page);
    await expect(page.getByRole('status').filter({ hasText: 'Đã lưu thay đổi' })).toBeVisible();
    expect((await f.request('/save', f.player.token)).data.state).toMatchObject({
      stage: 10,
      stones: 8888,
    });
    player = await playerLogin(browser, f.base, page.viewportSize());
    await expect(player.page.locator('.cultivation-info h3')).toContainText('Kim Đan');
    await expect(player.page.locator('.cultivation-info h3')).toContainText('Hậu kỳ');
    await nav.getByRole('button', { name: 'Boss thế giới', exact: true }).click();
    const card = page.locator('.admin-boss-list .admin-card').first();
    await card.getByRole('button', { name: 'Hồi sinh ngay', exact: true }).click();
    await confirm(page);
    await expect.poll(async () => (await f.request('/community')).data.bosses[0].active).toBe(true);
    await nav.getByRole('button', { name: 'Máy chủ', exact: true }).click();
    await page
      .getByLabel('Thông báo toàn máy chủ', { exact: true })
      .fill('Bảo trì thử nghiệm từ admin laptop');
    await page.getByLabel('Bật chế độ bảo trì', { exact: true }).check();
    await page.getByRole('button', { name: 'Lưu cấu hình máy chủ', exact: true }).click();
    await confirm(page);
    await expect(page.getByRole('status').filter({ hasText: 'Đã lưu thay đổi' })).toBeVisible();
    await player.page.reload();
    await expect(player.page.getByRole('region', { name: 'Thông báo máy chủ' })).toContainText(
      'Bảo trì thử nghiệm từ admin laptop',
    );
    expect(
      (await f.request('/save', f.player.token, { revision: 2, state: initialState() }, 'PUT'))
        .status,
    ).toBe(503);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  } finally {
    await player?.context.close();
    await f.close();
  }
});
test('ordinary account cannot enter the dedicated administrator page', async ({ page }) => {
  const f = await backend();
  try {
    await adminLogin(page, f.base, 'ordinary_player');
    await expect(page.getByRole('alert')).toContainText('không có quyền quản trị');
    await expect(page.getByRole('navigation', { name: 'Điều hướng quản trị' })).toHaveCount(0);
  } finally {
    await f.close();
  }
});
