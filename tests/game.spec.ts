import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const SAVE_KEY = 'van-tien-ky.save.v1';

test('all worlds list multiple monster species and hidden areas', async ({ page }) => {
  await page.goto('/');
  if (await page.getByRole('button', { name: 'Mở menu' }).isVisible())
    await page.getByRole('button', { name: 'Mở menu' }).click();
  await page
    .getByRole('navigation', { name: 'Điều hướng chính' })
    .getByRole('button', { name: 'Khám phá', exact: true })
    .click();
  for (const world of ['Địa Giới', 'Tiên Giới', 'Thần Giới']) {
    await page.getByRole('tab', { name: new RegExp(world) }).click();
    await expect(page.getByRole('region', { name: 'Bí cảnh ẩn' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Phá phong ấn/ })).toBeDisabled();
    await page.locator('.map-bestiary').first().click();
    await expect(page.locator('.bestiary-enemy')).toHaveCount(8);
    await expect(page.locator('.bestiary-enemy.elite')).toHaveCount(3);
    await page.getByRole('button', { name: 'Đóng', exact: true }).click();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
});

test('discover, enter and defeat the hidden boss through actual combat actions', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Math.random = () => 0.9;
  });
  await page.goto('/');
  await page.evaluate((key) => {
    const save = JSON.parse(localStorage.getItem(key)!);
    save.stage = 9;
    save.hp = 100000;
    save.inventory.key = 1;
    save.inventory.pill = 8;
    save.encounters.visits = { bamboo: 4 };
    localStorage.setItem(key, JSON.stringify(save));
  }, SAVE_KEY);
  await page.reload();
  if (await page.getByRole('button', { name: 'Mở menu' }).isVisible())
    await page.getByRole('button', { name: 'Mở menu' }).click();
  await page
    .getByRole('navigation', { name: 'Điều hướng chính' })
    .getByRole('button', { name: 'Khám phá', exact: true })
    .click();
  await page.locator('.map-go').first().click();
  await expect(page.getByRole('heading', { name: 'Vô Danh Cổ Động' })).toBeVisible();
  await page.getByRole('button', { name: /Phá phong ấn/ }).click();
  const battle = page.getByRole('dialog', { name: 'Một cuộc chạm trán' });
  await expect(battle).toContainText('U Minh Lang Vương');
  await page.reload();
  await expect(battle).toContainText('Boss ẩn');
  for (let i = 0; i < 30 && (await battle.isVisible()); i++) {
    const hp = Number(
      await battle
        .getByRole('progressbar', { name: 'Sinh lực người chơi', exact: true })
        .getAttribute('aria-valuenow'),
    );
    const potion = battle.getByRole('button', { name: /Hồi Xuân Đan/ }),
      skill = battle.getByRole('button', { name: /Lưu Vân Quyết/ });
    if (hp < 45 && (await potion.isEnabled())) await potion.click();
    else if (await skill.isEnabled()) await skill.click();
    else await battle.getByRole('button', { name: 'Công kích', exact: true }).click();
  }
  await expect(battle).not.toBeVisible();
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
  expect(saved.encounters.defeatedBosses).toEqual(['boss-earth']);
  expect(saved.inventory.key).toBe(0);
  expect(saved.inventory.elixir).toBe(2);
  expect(saved.bag.at(-1).rank).toBe(2);
});
test('complete beginner loop: cultivation, quest, gear, alchemy, NPC and sect', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Hôm nay, tiến thêm một bước.' })).toBeVisible();
  await page.clock.install();
  await page.getByRole('button', { name: /Tĩnh tâm tu luyện/ }).click();
  await page.clock.fastForward(3 * 60000);
  await page.getByRole('button', { name: 'Nhận', exact: true }).first().click();
  await page.clock.fastForward(8 * 60000);
  await page.getByRole('button', { name: 'Đột phá', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Luyện Khí Trung kỳ');
  const nav = page
    .getByRole('navigation', { name: /Điều hướng/ })
    .filter({ visible: true })
    .first();
  await nav.getByRole('button', { name: 'Ba lô', exact: true }).click();
  await page.getByRole('button', { name: /Bích Linh Nhẫn/ }).click();
  await page.locator('.gear-detail').getByRole('button', { name: 'Trang bị', exact: true }).click();
  await expect(page.getByText('Đang trang bị · Cường hóa')).toBeVisible();
  if (await page.getByRole('button', { name: 'Mở menu' }).isVisible())
    await page.getByRole('button', { name: 'Mở menu' }).click();
  await page
    .getByRole('navigation', { name: 'Điều hướng chính' })
    .getByRole('button', { name: 'Luyện chế' })
    .click();
  await page.getByRole('button', { name: 'Khai lò luyện đan' }).first().click();
  await expect(page.getByRole('status')).toContainText('Chế tạo thành công');
  if (await page.getByRole('button', { name: 'Mở menu' }).isVisible())
    await page.getByRole('button', { name: 'Mở menu' }).click();
  await page
    .getByRole('navigation', { name: 'Điều hướng chính' })
    .getByRole('button', { name: 'Khám phá', exact: true })
    .click();
  await page.getByRole('button', { name: /Vân Hạc Chân Nhân/ }).click();
  await expect(page.getByRole('dialog', { name: 'Vân Hạc Chân Nhân' })).toBeVisible();
  await page.getByRole('button', { name: 'Đóng', exact: true }).click();
  const visibleNav = page
    .getByRole('navigation', { name: /Điều hướng/ })
    .filter({ visible: true })
    .first();
  await visibleNav.getByRole('button', { name: 'Tông môn', exact: true }).click();
  await page.getByRole('button', { name: 'Bái nhập sơn môn' }).first().click();
  await expect(page.getByRole('button', { name: /Đóng góp/ })).toBeVisible();
  await page.reload();
  const save = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
  expect(save.stage).toBe(1);
  expect(save.claimed).toContain('first');
  expect(save.sect).toBe('cloud');
  expect(save.npcMet).toContain('elder');
  expect(save.equipped.ring.uid).toBe('g2');
  expect(save.metrics.crafts).toBe(1);
  expect(errors).toEqual([]);
});

test('battle actions and reward are playable via UI', async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0.3;
  });
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Khám phá', exact: true })
    .filter({ visible: true })
    .last()
    .click();
  // On mobile the last visible navigation button opens the world; choose the first unlocked card there.
  if (!(await page.getByRole('dialog', { name: 'Một cuộc chạm trán' }).isVisible())) {
    await page.locator('.map-go').filter({ hasText: 'Khám phá' }).first().click();
  }
  await expect(page.getByRole('dialog', { name: 'Một cuộc chạm trán' })).toBeVisible();
  await page.getByRole('button', { name: /Lưu Vân Quyết/ }).click();
  await expect(page.getByRole('button', { name: /Lưu Vân Quyết/ })).toBeDisabled();
  for (
    let i = 0;
    i < 5 && (await page.getByRole('dialog', { name: 'Một cuộc chạm trán' }).isVisible());
    i++
  )
    await page.getByRole('button', { name: 'Công kích', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Một cuộc chạm trán' })).not.toBeVisible();
  await expect(page.getByRole('status')).toContainText('Đánh bại');
  const save = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
  expect(save.metrics.kills).toBe(1);
});

test('install assets and offline reload preserve the game', async ({ page, context }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Tĩnh tâm tu luyện/ }).click();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), {
          once: true,
        }),
      );
  });
  const manifest = await page.request.get('/manifest.webmanifest');
  const data = await manifest.json();
  expect(data.display).toBe('standalone');
  for (const icon of data.icons) expect((await page.request.get(icon.src)).status()).toBe(200);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Hôm nay, tiến thêm một bước.' })).toBeVisible();
  // Prove the network is unavailable rather than depending on the browser's
  // navigator.onLine flag (which differs across CDP/browser versions).
  expect(
    await page.evaluate(async () => {
      try {
        await fetch('/offline-network-probe', { cache: 'no-store' });
        return false;
      } catch {
        return true;
      }
    }),
  ).toBe(true);
  await expect(page.getByRole('button', { name: /Xuất định/ })).toBeVisible();
  const save = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
  expect(save.training.active).toBe(true);
  expect(save.metrics.meditations).toBe(0);
});

test('responsive layout, navigation, and destructive action confirmation', async ({ page }) => {
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  if (await page.getByRole('button', { name: 'Mở menu' }).isVisible())
    await page.getByRole('button', { name: 'Mở menu' }).click();
  await page.getByRole('button', { name: 'Cài đặt', exact: true }).click();
  await page.getByRole('button', { name: 'Bắt đầu lại', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Xác nhận bắt đầu lại' })).toBeVisible();
  await page.getByRole('button', { name: 'Giữ đạo lộ hiện tại' }).click();
  await expect(page.getByRole('button', { name: 'Xác nhận bắt đầu lại' })).not.toBeVisible();
});

test('export, invalid import protection, and valid import work on the device', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Tĩnh tâm tu luyện/ }).click();
  await page.getByRole('button', { name: 'Bản 1.3 · Lưu cục bộ' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /^Xuất bản lưu/ }).click();
  const download = await downloadPromise;
  const saved = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(saved.training.active).toBe(true);
  expect(saved.metrics.meditations).toBe(0);
  await page.locator('input[type=file]').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"version":99}'),
  });
  await expect(page.getByRole('status')).toContainText('Bản lưu không hợp lệ');
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).metrics.meditations,
      SAVE_KEY,
    ),
  ).toBe(0);
  saved.name = 'Mộng Vân';
  saved.stage = 2;
  await page.locator('input[type=file]').setInputFiles({
    name: 'progress.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(saved)),
  });
  await expect(page.getByRole('status')).toContainText('Đã khôi phục');
  await page.getByRole('button', { name: 'Đóng', exact: true }).click();
  await page.reload();
  const restored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
  expect(restored.name).toBe('Mộng Vân');
  expect(restored.stage).toBe(2);
});

test('every screen stays within the viewport and race bonuses update', async ({ page }) => {
  await page.goto('/');
  for (const label of [
    'Đạo lộ',
    'Khám phá',
    'Ba lô',
    'Nhiệm vụ',
    'Tông môn',
    'Luyện chế',
    'Nhân vật',
    'Bí kíp',
    'Phó bản',
    'Thiên bảng',
    'Linh căn & truyền thừa',
  ]) {
    if (await page.getByRole('button', { name: 'Mở menu' }).isVisible())
      await page.getByRole('button', { name: 'Mở menu' }).click();
    await page
      .getByRole('navigation', { name: 'Điều hướng chính' })
      .getByRole('button', { name: new RegExp(`^${label}`) })
      .click();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      label,
    ).toBe(true);
  }
  if (await page.getByRole('button', { name: 'Mở menu' }).isVisible())
    await page.getByRole('button', { name: 'Mở menu' }).click();
  await page
    .getByRole('navigation', { name: 'Điều hướng chính' })
    .getByRole('button', { name: 'Nhân vật', exact: true })
    .click();
  await page.getByRole('textbox', { name: /Đạo hiệu/ }).fill('Thanh Long');
  await page.locator('input[value="dragon"]').check();
  await page.getByRole('button', { name: /Lưu đạo hiệu/ }).click();
  await expect(page.locator('.profile-card')).toContainText('Long tộc');
  await expect(page.locator('input[value="fox"]')).toBeDisabled();
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).race, SAVE_KEY)).toBe(
    'dragon',
  );
});

test('corrupt saves stay intact until the player explicitly starts again', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('van-tien-ky.save.v1', 'broken-save'));
  await page.goto('/');
  await expect(page.getByText('Bản lưu cũ gặp lỗi.')).toBeVisible();
  await page.getByRole('button', { name: /Tĩnh tâm tu luyện/ }).click();
  expect(await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY)).toBe('broken-save');
  await page.getByRole('button', { name: 'Quản lý bản lưu' }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: /^Xuất bản lưu cũ/ }).click();
  expect(await readFile((await (await pending).path())!, 'utf8')).toBe('broken-save');
  await page.getByRole('button', { name: 'Bắt đầu lại', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận bắt đầu lại' }).click();
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
  expect(saved.metrics.meditations).toBe(0);
});

test('storage write failures are visible and the current game can still be exported', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    };
  });
  await page.goto('/');
  await expect(page.getByText('Không thể tự lưu trên thiết bị.')).toBeVisible();
  await page.getByRole('button', { name: /Tĩnh tâm tu luyện/ }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Xuất bản lưu', exact: true }).click();
  const saved = JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
  expect(saved.training.active).toBe(true);
  expect(saved.metrics.meditations).toBe(0);
});
