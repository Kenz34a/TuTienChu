import { expect, test, type Page } from '@playwright/test';
import { initialState, stats } from '../src/game/engine';
import { fingerprint } from '../src/cloud/client';
import type { GameState } from '../src/game/types';
import { qiCost } from '../src/game/expansion';
import { stoneCost, xpNeeded } from '../src/game/data';
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

test('Kim Dan shows exact missing resources and progresses through all four phases', async ({
  page,
}) => {
  const time = Date.now();
  await page.clock.install({ time });
  await page.clock.pauseAt(time + 1000);
  await seed(page, { stage: 8, xp: xpNeeded(8) * 3, lingqi: 0, stones: 10000 });
  const requirements = page.getByLabel('Yêu cầu đột phá', { exact: true });
  await expect(requirements).toContainText(`Thiếu ${qiCost(8)}`);
  await expect(requirements).not.toContainText('Tiên thạch');
  await page.getByRole('button', { name: 'Đột phá', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: /Còn thiếu.*linh khí/ })).toBeVisible();
  expect((await saved(page)).stage).toBe(8);
  await page.getByRole('button', { name: /Tĩnh tâm tu luyện/ }).click();
  await page.clock.fastForward(18 * 60000);
  for (const stage of [8, 9, 10, 11]) {
    if (stage > 8) await page.clock.fastForward(15 * 60000);
    await expect(requirements).toContainText('Đã đủ tài nguyên');
    const before = await saved(page);
    await page.getByRole('button', { name: 'Đột phá', exact: true }).click();
    await expect.poll(async () => (await saved(page)).stage).toBe(stage + 1);
    const after = await saved(page);
    expect(after.lingqi).toBe(before.lingqi - qiCost(stage));
    expect(after.stones).toBe(before.stones - stoneCost(stage));
  }
  await expect(page.locator('.cultivation-info h3')).toContainText('Nguyên Anh');
});

test('Kim Dan stone shortage is visible and can be checked without a disabled dead end', async ({
  page,
}) => {
  await seed(page, { stage: 8, xp: xpNeeded(8), lingqi: qiCost(8), stones: 0 });
  await expect(page.getByLabel('Yêu cầu đột phá')).toContainText(`Thiếu ${stoneCost(8)}`);
  const button = page.getByRole('button', { name: 'Đột phá', exact: true });
  await expect(button).toBeEnabled();
  await button.click();
  await expect(page.getByRole('status').filter({ hasText: /Còn thiếu.*linh thạch/ })).toBeVisible();
  expect((await saved(page)).stage).toBe(8);
});

test('fifty titles unlock, equip, preview and persist effects on character', async ({ page }) => {
  await seed(page, { stage: 8, metrics: { ...initialState().metrics, kills: 10 } });
  await view(page, 'Danh hiệu');
  await expect(page.locator('.honor-card')).toHaveCount(50);
  const card = page.getByRole('article', { name: 'Kim Đan Chân Nhân', exact: true });
  await card.getByRole('button', { name: 'Trang bị danh hiệu', exact: true }).click();
  expect((await saved(page)).titles.equipped).toBe('realm-golden');
  await expect(page.getByLabel('Danh hiệu đang mang')).toContainText('+5% hiệu quả thiền');
  await expect(card.locator('.title-badge')).toHaveClass(/title-animated/);
  await page.getByRole('button', { name: 'Tắt hiệu ứng danh hiệu', exact: true }).click();
  await expect(card.locator('.title-badge')).not.toHaveClass(/title-animated/);
  await page.reload();
  await view(page, 'Nhân vật');
  await expect(page.locator('.profile-card .title-badge')).toContainText('Kim Đan Chân Nhân');
  await expect(page.locator('.profile-card .title-badge')).not.toHaveClass(/title-animated/);
  await view(page, 'Danh hiệu');
  await page.getByRole('button', { name: 'Bật hiệu ứng danh hiệu', exact: true }).click();
  await page.getByLabel('Tìm danh hiệu').fill('Hồng Mông');
  const locked = page.getByRole('article', { name: 'Hồng Mông Thần Đế', exact: true });
  await expect(locked.getByRole('button', { name: 'Chưa mở khóa', exact: true })).toBeDisabled();
  await locked.getByRole('button', { name: 'Xem hiệu ứng Hồng Mông Thần Đế', exact: true }).click();
  await expect(locked.locator('.title-badge')).toHaveClass(/title-animated/);
  expect((await saved(page)).titles.equipped).toBe('realm-golden');
  await page.getByRole('button', { name: 'Gỡ danh hiệu', exact: true }).click();
  expect((await saved(page)).titles.equipped).toBeNull();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('cultivation guide lists twenty realm methods and optional aids change the actual breakthrough cost', async ({
  page,
}) => {
  await seed(page, {
    stage: 8,
    xp: xpNeeded(8),
    lingqi: Math.ceil(qiCost(8) * 0.8),
    stones: stoneCost(8),
    inventory: { ...initialState().inventory, elixir: 1 },
  });
  await page.getByRole('main').getByRole('button', { name: 'Cách đột phá', exact: true }).click();
  await expect(page.locator('.realm-method-card')).toHaveCount(20);
  await expect(
    page.getByRole('article', { name: 'Cách đột phá Kim Đan', exact: true }),
  ).toContainText('Toái đan thành anh');
  await page.getByRole('button', { name: 'Về tu luyện & đột phá', exact: true }).click();
  await page.getByLabel('Phương thức đột phá', { exact: true }).selectOption('pill');
  await expect(page.getByLabel('Yêu cầu đột phá')).toContainText('Tụ Linh Đan');
  await expect(page.getByLabel('Yêu cầu đột phá')).toContainText('Đã đủ tài nguyên');
  await page.getByRole('button', { name: 'Đột phá', exact: true }).click();
  await expect.poll(async () => (await saved(page)).stage).toBe(9);
  expect((await saved(page)).inventory.elixir).toBe(0);
});

test('dashboard exposes rankings and world chat exchanges real messages between two devices', async ({
  page,
  browser,
}) => {
  test.setTimeout(60000);
  const user = `chat_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const register = await page.request.post('/api/auth/register', {
    data: { username: user, password: 'chat-e2e-password-123' },
  });
  expect(register.status()).toBe(201);
  const a = await register.json();
  const s = initialState();
  s.name = `Kiếm Tâm ${user.slice(-4)}`;
  s.stage = 8;
  s.titles = {
    owned: ['realm-foundation', 'realm-golden'],
    equipped: 'realm-golden',
    effects: true,
  };
  expect(
    (
      await page.request.put('/api/save', {
        headers: { Authorization: `Bearer ${a.token}` },
        data: { revision: 0, state: s },
      })
    ).status(),
  ).toBe(200);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const second = await context.newPage();
  const seedAccount = async (p: Page) => {
    await p.addInitScript(
      ({ s, token, username, mark }) => {
        if (!localStorage.getItem('van-tien-ky.save.v1')) {
          localStorage.setItem('van-tien-ky.save.v1', JSON.stringify(s));
          localStorage.setItem(
            'van-tien-ky.account.v1',
            JSON.stringify({
              token,
              username,
              server: location.origin,
              revision: 1,
              baseline: mark,
            }),
          );
        }
      },
      { s, token: a.token, username: user, mark: fingerprint(s) },
    );
    await p.goto('/');
  };
  try {
    await seedAccount(page);
    await seedAccount(second);
    await page
      .getByRole('main')
      .getByRole('button', { name: 'Bảng xếp hạng', exact: true })
      .click();
    await expect(page.locator('.ranking-row.self')).toContainText(s.name);
    await expect(page.locator('.ranking-row.self .title-badge')).toContainText('Kim Đan Chân Nhân');
    await view(page, 'Chat thế giới');
    await second
      .getByRole('main')
      .getByRole('button', { name: 'Chat thế giới', exact: true })
      .click();
    const text = `Truyền âm ${user} <script>window.chatInjected=1</script>`;
    await page.getByLabel('Truyền âm đến đạo hữu', { exact: true }).fill(text);
    await page.getByRole('button', { name: 'Gửi tin nhắn', exact: true }).click();
    await expect(second.getByRole('log', { name: 'Tin nhắn thế giới' })).toContainText(text, {
      timeout: 15000,
    });
    expect(await second.evaluate(() => (window as any).chatInjected)).toBeUndefined();
    await expect(second.getByRole('log')).toContainText('Kim Đan Chân Nhân');
    await second.getByLabel('Truyền âm đến đạo hữu', { exact: true }).fill(`Đã nhận ${user}`);
    await expect(second.getByRole('button', { name: 'Gửi tin nhắn', exact: true })).toBeEnabled({
      timeout: 10000,
    });
    await second.getByRole('button', { name: 'Gửi tin nhắn', exact: true }).click();
    await expect(page.getByRole('log')).toContainText(`Đã nhận ${user}`, { timeout: 15000 });
    await page.getByRole('button', { name: 'Tiên giới', exact: true }).click();
    await expect(
      page.getByLabel('Chưa đủ tu vi để gửi ở giới này', { exact: true }),
    ).toBeDisabled();
    expect(await second.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  } finally {
    await context.close();
  }
});

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
    stage: 4,
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
    stage: 4,
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
  s.stage = 12;
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
  s.stage = 36;
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
