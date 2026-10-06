import { expect, test, type Page } from '@playwright/test';
import { initialState, stats } from '../src/game/engine';
import { fingerprint } from '../src/cloud/client';
import type { GameState } from '../src/game/types';
const KEY = 'van-tien-ky.save.v1';
async function view(page: Page, name: string) {
  if (await page.getByRole('button', { name: 'Mở menu' }).isVisible())
    await page.getByRole('button', { name: 'Mở menu' }).click();
  await page
    .getByRole('navigation', { name: 'Điều hướng chính' })
    .getByRole('button', { name, exact: true })
    .click();
}
async function seed(page: Page, patch: Partial<GameState>) {
  const s = { ...initialState(), ...patch };
  await page.addInitScript(
    ({ s, key }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(s));
    },
    { s, key: KEY },
  );
  await page.goto('/');
}
async function saved(page: Page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY);
}

test('meditation uses elapsed time and the dark/light preference survives reopening', async ({
  page,
}) => {
  const time = Date.now();
  await page.clock.install({ time });
  await page.clock.pauseAt(time + 1000);
  await page.goto('/');
  const old = await saved(page);
  await page.getByRole('button', { name: /Tĩnh tâm tu luyện/ }).click();
  expect((await saved(page)).xp).toBe(old.xp);
  await page.getByRole('button', { name: /Xuất định/ }).click();
  await page.getByRole('button', { name: /Tĩnh tâm tu luyện/ }).click();
  expect((await saved(page)).metrics.meditations).toBe(0);
  await page.clock.fastForward(59000);
  expect((await saved(page)).xp).toBe(old.xp);
  await page.clock.fastForward(1000);
  await expect.poll(async () => (await saved(page)).metrics.meditations).toBe(1);
  expect((await saved(page)).lingqi).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Bật giao diện tối', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect((await saved(page)).training.active).toBe(true);
  await page.getByRole('button', { name: 'Bật giao diện sáng', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('root awakening, purification and ancient inheritance persist in the save', async ({
  page,
}) => {
  await seed(page, {
    stage: 3,
    stones: 5000,
    lingqi: 500,
    manuals: { breath: 3 },
    training: { active: false, remainder: 0, totalSeconds: 900, boostedSeconds: 0 },
    npcMet: ['elder'],
  });
  await view(page, 'Linh căn & truyền thừa');
  await page.getByRole('button', { name: 'Kiểm tra linh căn', exact: true }).click();
  expect((await saved(page)).spiritualRoot.level).toBe(1);
  await page.getByRole('button', { name: 'Tẩy luyện linh căn', exact: true }).click();
  expect((await saved(page)).spiritualRoot.level).toBe(2);
  await page.getByRole('button', { name: 'Nhận truyền thừa', exact: true }).click();
  expect((await saved(page)).inheritances).toContain('cloud-legacy');
  await page.reload();
  await view(page, 'Linh căn & truyền thừa');
  await expect(page.getByText('Đạo thống đã tiếp nối', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('player founds and upgrades a sect and recruits a real saved NPC member', async ({ page }) => {
  await seed(page, {
    stage: 3,
    stones: 10000,
    inventory: { ore: 100, herb: 8, pill: 3, essence: 2 },
  });
  await view(page, 'Tông môn');
  await page.getByRole('textbox', { name: 'Tên tông môn', exact: true }).fill('Thiên Trúc Tông');
  await page.getByRole('button', { name: 'Khai sơn lập phái', exact: true }).click();
  expect((await saved(page)).customSect.name).toBe('Thiên Trúc Tông');
  for (let i = 0; i < 12; i++)
    await page.getByRole('button', { name: 'Góp 50 linh thạch vào ngân khố', exact: true }).click();
  await page
    .locator('.building-card')
    .filter({ hasText: 'Đại điện' })
    .getByRole('button', { name: 'Nâng cấp', exact: true })
    .click();
  await page.getByRole('button', { name: 'Chiêu mộ · 100 ngân khố', exact: true }).click();
  const state = await saved(page);
  expect(state.customSect.level).toBe(2);
  expect(state.customSect.members).toBe(2);
  expect(state.customSect.treasury).toBe(0);
  await page.reload();
  await view(page, 'Tông môn');
  await expect(page.locator('.custom-sect-panel')).toContainText('2/20 đệ tử NPC');
});

test('dungeon combat advances across three waves and survives a mid-fight reload', async ({
  page,
}) => {
  const s = initialState();
  s.stage = 9;
  s.hp = stats(s).maxHp;
  s.inventory.pill = 20;
  await seed(page, s);
  await view(page, 'Phó bản');
  await page
    .locator('.content-card')
    .filter({ has: page.getByRole('heading', { name: 'Thanh Vân Thí Luyện', exact: true }) })
    .getByRole('button', { name: 'Vào phó bản', exact: true })
    .click();
  const battle = page.getByRole('dialog', { name: 'Một cuộc chạm trán', exact: true });
  await expect(battle).toContainText('Mộc Linh Khôi Lỗi');
  await page.reload();
  await expect(battle).toContainText('Mộc Linh Khôi Lỗi');
  for (let i = 0; i < 35 && (await battle.isVisible()); i++) {
    const skill = battle.getByRole('button', { name: /Lưu Vân Quyết/ });
    if (await skill.isEnabled()) await skill.click();
    else await battle.getByRole('button', { name: 'Công kích', exact: true }).click();
  }
  await expect(battle).not.toBeVisible();
  expect((await saved(page)).dungeons.clears.trial).toBe(1);
  expect((await saved(page)).dungeons.active).toBeNull();
});

test('the three currencies can be viewed and exchanged without gaining value', async ({ page }) => {
  await seed(page, { stones: 2000, wallet: { immortal: 1, divine: 1 } });
  await page.getByRole('button', { name: /Cửa hàng, / }).click();
  await expect(page.locator('.wallet-grid')).toContainText('Tiên thạch');
  await expect(page.locator('.wallet-grid')).toContainText('Thần thạch');
  await page.getByRole('button', { name: '1 thần → 1.000 tiên', exact: true }).click();
  expect((await saved(page)).wallet).toEqual({ immortal: 1001, divine: 0 });
  await page.getByRole('button', { name: '1.000 tiên → 1 thần', exact: true }).click();
  expect((await saved(page)).wallet).toEqual({ immortal: 1, divine: 1 });
});

test('leaderboard, top online and login notices use actual server accounts', async ({ page }) => {
  const username = `rank_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const registered = await page.request.post('/api/auth/register', {
    data: { username, password: 'ranking-test-password' },
  });
  expect(registered.status()).toBe(201);
  const account = await registered.json();
  const s = initialState();
  s.name = `Tinh Hà ${username.slice(-5)}`;
  s.stage = 27;
  expect(
    (
      await page.request.put('/api/save', {
        headers: { Authorization: `Bearer ${account.token}` },
        data: { revision: 0, state: s },
      })
    ).status(),
  ).toBe(200);
  await page.addInitScript(
    ({ s, a, mark }) => {
      localStorage.setItem('van-tien-ky.save.v1', JSON.stringify(s));
      localStorage.setItem(
        'van-tien-ky.account.v1',
        JSON.stringify({ ...a, server: location.origin, revision: 1, baseline: mark }),
      );
    },
    { s, a: { token: account.token, username }, mark: fingerprint(s) },
  );
  await page.goto('/');
  await view(page, 'Thiên bảng');
  await expect(page.locator('.ranking-row.self')).toContainText(s.name, { timeout: 15000 });
  await page.getByRole('button', { name: 'Top online', exact: true }).click();
  await expect(page.locator('.ranking-row.self')).toContainText(s.name);
  await page.getByRole('button', { name: 'Thông báo', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Thông báo tam giới' })).toContainText(
    'Chào mừng trở lại',
  );
  await page.getByRole('button', { name: 'Đánh dấu tất cả đã đọc', exact: true }).click();
  await expect(page.locator('.notification-count')).toHaveCount(0);
});
