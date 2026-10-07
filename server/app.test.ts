import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from './app';
import { initialState } from '../src/game/engine';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Server } from 'node:http';

const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const close of cleanups.splice(0).reverse()) await close();
});
async function fixture(
  path = ':memory:',
  clock?: () => number,
  pcPath?: string,
  appReleaseTag?: string,
) {
  const service = await createApp({ databasePath: path, now: clock, pcPath, appReleaseTag });
  const server: Server = await new Promise((resolve) => {
    const s = service.app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw Error('Server not listening');
  const base = `http://127.0.0.1:${address.port}`;
  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    await new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
    await service.close();
  };
  cleanups.push(close);
  const request = async (
    path: string,
    token?: string,
    body?: unknown,
    method = body === undefined ? 'GET' : 'POST',
    origin?: string,
  ) => {
    const response = await fetch(base + path, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(origin ? { Origin: origin } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return {
      status: response.status,
      data: response.status === 204 ? null : await response.json(),
      headers: response.headers,
    };
  };
  const register = async (name = 'test_player') => {
    const r = await request('/api/auth/register', undefined, {
      username: name,
      password: 'test-password-123',
    });
    expect(r.status).toBe(201);
    return r.data;
  };
  return { request, register, close, base };
}
describe('shared web and Android accounts', () => {
  it('serves app downloads through the configured trusted release when hosting has no local packages', async () => {
    const f = await fixture(':memory:', undefined, undefined, 'v1.5.0');
    expect((await f.request('/api/health')).data).toMatchObject({
      apkAvailable: true,
      pcAvailable: true,
    });
    for (const file of ['van-tien-ky-android.apk', 'van-tien-ky-pc-windows.zip']) {
      const response = await fetch(f.base + '/downloads/' + file, { redirect: 'manual' });
      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toBe(
        'https://github.com/Kenz34a/TuTienChu/releases/download/v1.5.0/' + file,
      );
    }
    await expect(createApp({ appReleaseTag: 'https://evil.example' })).rejects.toThrow(
      'Invalid app release tag',
    );
  });
  it('shares authenticated world chat with canonical character names and titles, cooldown and realm gates', async () => {
    let time = Date.now();
    const f = await fixture(':memory:', () => time),
      a = await f.register('chat_sender'),
      b = await f.register('chat_reader');
    const s = initialState(time);
    s.name = 'Kiếm Tâm';
    s.stage = 8;
    s.titles = { owned: ['realm-golden'], equipped: 'realm-golden', effects: true };
    await f.request('/api/save', a.token, { revision: 0, state: s }, 'PUT');
    expect((await f.request('/api/chat', undefined, { body: 'hello', world: 'all' })).status).toBe(
      401,
    );
    expect((await f.request('/api/chat', b.token, { body: 'hello', world: 'all' })).status).toBe(
      409,
    );
    expect((await f.request('/api/chat', a.token, { body: 'hello', world: 'divine' })).status).toBe(
      403,
    );
    for (const body of ['', 'a'.repeat(201)])
      expect((await f.request('/api/chat', a.token, { body, world: 'all' })).status).toBe(400);
    const text = '<script>alert(1)</script> Đạo hữu 😀';
    expect(
      (
        await f.request('/api/chat', a.token, {
          body: text,
          world: 'all',
          name: 'Giả mạo',
          stage: 79,
        })
      ).status,
    ).toBe(201);
    expect((await f.request('/api/chat', a.token, { body: 'spam', world: 'all' })).status).toBe(
      429,
    );
    const feed = (await f.request('/api/chat?world=all', b.token)).data;
    expect(feed.messages).toHaveLength(1);
    expect(feed.messages[0]).toMatchObject({
      name: 'Kiếm Tâm',
      stage: 8,
      titleId: 'realm-golden',
      body: text,
      self: false,
    });
    expect(JSON.stringify(feed)).not.toMatch(/chat_sender|chat_reader|token|password/);
    expect((await f.request('/api/chat?world=earth')).data.messages).toHaveLength(0);
    expect((await f.request('/api/chat?world=not-a-world')).status).toBe(400);
    time += 3000;
    expect(
      (await f.request('/api/chat', a.token, { body: 'Lời chào Địa giới', world: 'earth' })).status,
    ).toBe(201);
    expect((await f.request('/api/chat?world=earth', a.token)).data.messages[0].self).toBe(true);
  });
  it('keeps recent chat in chronological order and expires old messages', async () => {
    let time = Date.now();
    const f = await fixture(':memory:', () => time),
      a = await f.register();
    await f.request('/api/save', a.token, { revision: 0, state: initialState(time) }, 'PUT');
    for (let i = 1; i <= 105; i++) {
      time += 3000;
      expect(
        (await f.request('/api/chat', a.token, { body: `Tin ${i}`, world: 'all' })).status,
      ).toBe(201);
    }
    const feed = (await f.request('/api/chat')).data;
    expect(feed.messages).toHaveLength(100);
    expect(feed.messages[0].body).toBe('Tin 6');
    expect(feed.messages.at(-1).body).toBe('Tin 105');
    time += 3 * 86400000 + 1;
    expect((await f.request('/api/chat')).data.messages).toHaveLength(0);
  });
  it('preserves chat messages and rate limits after restarting the server', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'van-tien-chat-restart-'));
    cleanups.unshift(async () => rmSync(dir, { recursive: true, force: true }));
    const path = join(dir, 'chat.sqlite'),
      time = Date.now();
    const f = await fixture(path, () => time),
      a = await f.register();
    await f.request('/api/save', a.token, { revision: 0, state: initialState(time) }, 'PUT');
    await f.request('/api/chat', a.token, { body: 'Truyền âm còn lưu', world: 'all' });
    await f.close();
    const restored = await fixture(path, () => time);
    expect((await restored.request('/api/chat', a.token)).data.messages[0].body).toBe(
      'Truyền âm còn lưu',
    );
    expect(
      (await restored.request('/api/chat', a.token, { body: 'spam', world: 'all' })).status,
    ).toBe(429);
  });
  it('ranks actual saved characters and expires online presence without exposing credentials', async () => {
    let time = Date.UTC(2026, 9, 7, 8);
    const f = await fixture(':memory:', () => time),
      a = await f.register('low_player'),
      b = await f.register('high_player');
    const low = initialState(time);
    low.name = 'Thanh Trúc';
    const high = initialState(time);
    high.name = 'Tinh Hà';
    high.stage = 36;
    high.titles.owned = ['realm-immortal'];
    high.titles.equipped = 'realm-immortal';
    await f.request('/api/save', a.token, { revision: 0, state: low }, 'PUT');
    await f.request('/api/save', b.token, { revision: 0, state: high }, 'PUT');
    let board = (await f.request('/api/community', a.token)).data;
    expect(board.ranking.map((p: any) => p.name)).toEqual(['Tinh Hà', 'Thanh Trúc']);
    expect(board.onlineCount).toBe(2);
    expect(board.topOnline[0].name).toBe('Tinh Hà');
    expect(board.topOnline[0].titleId).toBe('realm-immortal');
    expect(board.ranking[0].titleId).toBe('realm-immortal');
    expect(JSON.stringify(board)).not.toMatch(/password_hash|token_hash|high_player|low_player/);
    time += 121000;
    board = (await f.request('/api/community', a.token)).data;
    expect(board.onlineCount).toBe(1);
    expect(board.topOnline[0].name).toBe('Thanh Trúc');
    await f.request('/api/logout', a.token, {});
    expect((await f.request('/api/community')).data.onlineCount).toBe(0);
  });
  it('shares world boss HP, applies per-account cooldown, respawns, and awards each participant only once', async () => {
    let time = Date.UTC(2026, 9, 7, 8);
    const f = await fixture(':memory:', () => time),
      a = await f.register('boss_player'),
      b = await f.register('second_player');
    const s = initialState(time);
    s.stage = 79;
    s.name = 'Đạo Chủ';
    await f.request('/api/save', a.token, { revision: 0, state: s }, 'PUT');
    await f.request('/api/save', b.token, { revision: 0, state: s }, 'PUT');
    let boss = (await f.request('/api/community', a.token)).data.bosses[0];
    expect(boss.active).toBe(true);
    expect(
      (await f.request('/api/community/boss/world-earth/attack', undefined, { cycle: boss.cycle }))
        .status,
    ).toBe(401);
    expect(
      (
        await f.request('/api/community/boss/world-earth/attack', a.token, {
          cycle: boss.cycle + 1,
        })
      ).status,
    ).toBe(409);
    const hit = await f.request('/api/community/boss/world-earth/attack', a.token, {
      cycle: boss.cycle,
    });
    expect(hit.status).toBe(200);
    expect(hit.data.hp).toBeLessThan(boss.hp);
    expect(
      (await f.request('/api/community/boss/world-earth/attack', a.token, { cycle: boss.cycle }))
        .status,
    ).toBe(429);
    expect((await f.request('/api/community', b.token)).data.bosses[0].hp).toBe(hit.data.hp);
    await f.request('/api/community/boss/world-earth/attack', b.token, { cycle: boss.cycle });
    for (let i = 0; i < 25; i++) {
      time += 5000;
      const h = await f.request('/api/community/boss/world-earth/attack', a.token, {
        cycle: boss.cycle,
      });
      if (h.data.defeated) break;
    }
    expect((await f.request('/api/community', a.token)).data.bosses[0].hp).toBe(0);
    const before = (await f.request('/api/save', a.token)).data;
    expect(
      (
        await f.request('/api/community/boss/world-earth/claim', a.token, {
          cycle: boss.cycle,
          revision: 0,
        })
      ).status,
    ).toBe(409);
    const claim = await f.request('/api/community/boss/world-earth/claim', a.token, {
      cycle: boss.cycle,
      revision: before.revision,
    });
    expect(claim.status).toBe(200);
    expect(claim.data.revision).toBe(before.revision + 1);
    expect(claim.data.state.worldBossClaims).toBe(1);
    expect(claim.data.state.stones).toBeGreaterThan(before.state.stones);
    expect(
      (
        await f.request('/api/community/boss/world-earth/claim', a.token, {
          cycle: boss.cycle,
          revision: claim.data.revision,
        })
      ).status,
    ).toBe(409);
    time = Date.UTC(2026, 9, 7, 9);
    const next = (await f.request('/api/community', b.token)).data;
    expect(next.bosses[0].active).toBe(true);
    expect(next.bosses[0].hp).toBe(next.bosses[0].maxHp);
    expect(next.bosses[0].cycle).not.toBe(boss.cycle);
    expect(next.rewards).toHaveLength(1);
    expect(
      (
        await f.request('/api/community/boss/world-earth/claim', b.token, {
          cycle: boss.cycle,
          revision: 1,
        })
      ).status,
    ).toBe(200);
  });
  it('preserves shared boss HP and attack cooldown across server restarts', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'van-tien-boss-restart-'));
    cleanups.unshift(async () => rmSync(dir, { recursive: true, force: true }));
    const path = join(dir, 'boss.sqlite');
    const time = Date.UTC(2026, 9, 7, 8);
    const first = await fixture(path, () => time);
    const account = await first.register();
    await first.request(
      '/api/save',
      account.token,
      { revision: 0, state: initialState(time) },
      'PUT',
    );
    const boss = (await first.request('/api/community', account.token)).data.bosses[0];
    const hit = await first.request('/api/community/boss/world-earth/attack', account.token, {
      cycle: boss.cycle,
    });
    expect(hit.status).toBe(200);
    await first.close();
    const restarted = await fixture(path, () => time);
    const restored = (await restarted.request('/api/community', account.token)).data.bosses[0];
    expect(restored.hp).toBe(hit.data.hp);
    expect(
      (
        await restarted.request('/api/community/boss/world-earth/attack', account.token, {
          cycle: boss.cycle,
        })
      ).status,
    ).toBe(429);
  });
  it('serves the configured PC package and returns 404 when it is unavailable', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'van-tien-download-'));
    cleanups.unshift(async () => rmSync(dir, { recursive: true, force: true }));
    const path = join(dir, 'pc.zip'),
      bytes = Buffer.from('PK\u0003\u0004test-package');
    writeFileSync(path, bytes);
    const ready = await fixture(':memory:', undefined, path);
    expect((await ready.request('/api/health')).data.pcAvailable).toBe(true);
    const download = await fetch(ready.base + '/downloads/van-tien-ky-pc-windows.zip');
    expect(download.status).toBe(200);
    expect(download.headers.get('content-disposition')).toContain('van-tien-ky-pc-windows.zip');
    expect(Buffer.from(await download.arrayBuffer())).toEqual(bytes);
    const missing = await fixture();
    expect((await missing.request('/api/health')).data.pcAvailable).toBe(false);
    expect((await fetch(missing.base + '/downloads/van-tien-ky-pc-windows.zip')).status).toBe(404);
  });
  it('registers, logs in and loads a persistent character on another device', async () => {
    const f = await fixture();
    const a = await f.register();
    const state = initialState();
    state.metrics.meditations = 8;
    state.name = 'Tiên nhân';
    expect(
      (await f.request('/api/save', a.token, { revision: 0, state }, 'PUT')).data.revision,
    ).toBe(1);
    const login = await f.request('/api/auth/login', undefined, {
      username: 'TEST_PLAYER',
      password: 'test-password-123',
    });
    expect(login.status).toBe(200);
    expect(login.data.token).not.toBe(a.token);
    expect((await f.request('/api/save', login.data.token)).data.state.name).toBe('Tiên nhân');
    expect((await f.request('/api/auth/me', a.token)).data.user.username).toBe('test_player');
  });
  it('rejects stale writes and returns the newer save without overwriting it', async () => {
    const f = await fixture(),
      a = await f.register();
    const state = initialState();
    state.metrics.meditations = 2;
    await f.request('/api/save', a.token, { revision: 0, state }, 'PUT');
    state.metrics.meditations = 99;
    const stale = await f.request('/api/save', a.token, { revision: 0, state }, 'PUT');
    expect(stale.status).toBe(409);
    expect(stale.data.cloud.state.metrics.meditations).toBe(2);
    expect((await f.request('/api/save', a.token)).data.revision).toBe(1);
  });
  it('allows exactly one concurrent writer per revision', async () => {
    const f = await fixture(),
      a = await f.register();
    const results = await Promise.all(
      [1, 2, 3].map((n) =>
        f.request(
          '/api/save',
          a.token,
          { revision: 0, state: { ...initialState(), stones: n } },
          'PUT',
        ),
      ),
    );
    expect(results.map((r) => r.status).sort()).toEqual([200, 409, 409]);
  });
  it('isolates accounts and validates imported saves before storage', async () => {
    const f = await fixture(),
      a = await f.register('player_one'),
      b = await f.register('player_two');
    await f.request('/api/save', a.token, { revision: 0, state: initialState() }, 'PUT');
    expect((await f.request('/api/save', b.token)).data.state).toBeNull();
    for (const state of [{}, { ...initialState(), stage: 99 }, { ...initialState(), stones: -1 }])
      expect((await f.request('/api/save', b.token, { revision: 0, state }, 'PUT')).status).toBe(
        400,
      );
    expect((await f.request('/api/save', b.token)).data.revision).toBe(0);
  });
  it('rejects bad passwords, invalid usernames and duplicates', async () => {
    const f = await fixture();
    await f.register();
    expect(
      (
        await f.request('/api/auth/register', undefined, {
          username: 'test_player',
          password: 'test-password-123',
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await f.request('/api/auth/login', undefined, {
          username: 'test_player',
          password: 'wrong-password-123',
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await f.request('/api/auth/register', undefined, {
          username: 'bad name',
          password: 'test-password-123',
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await f.request('/api/auth/register', undefined, {
          username: 'player_three',
          password: 'short',
        })
      ).status,
    ).toBe(400);
  });
  it('revokes only the signed-out device and expires sessions', async () => {
    let now = Date.now();
    const f = await fixture(':memory:', () => now),
      a = await f.register();
    const b = (
      await f.request('/api/auth/login', undefined, {
        username: 'test_player',
        password: 'test-password-123',
      })
    ).data;
    expect((await f.request('/api/logout', a.token, {})).status).toBe(200);
    expect((await f.request('/api/save', a.token)).status).toBe(401);
    expect((await f.request('/api/save', b.token)).status).toBe(200);
    now += 31 * 86400000;
    expect((await f.request('/api/save', b.token)).status).toBe(401);
  });
  it('permits Android and PC origins and forbids unconfigured origins', async () => {
    const f = await fixture();
    const android = await f.request(
      '/api/save',
      undefined,
      undefined,
      'OPTIONS',
      'https://localhost',
    );
    const pc = await f.request('/api/save', undefined, undefined, 'OPTIONS', 'vantien://app');
    expect(pc.status).toBe(204);
    expect(pc.headers.get('access-control-allow-origin')).toBe('vantien://app');
    expect(android.status).toBe(204);
    expect(android.headers.get('access-control-allow-origin')).toBe('https://localhost');
    expect(
      (await f.request('/api/health', undefined, undefined, 'GET', 'https://evil.example')).status,
    ).toBe(403);
    expect((await f.request('/api/health')).headers.get('cache-control')).toBe('no-store');
  });
  it('survives restarts and stores neither passwords nor bearer tokens in plaintext', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'van-tien-sync-')),
      path = join(dir, 'game.sqlite');
    cleanups.unshift(async () => rmSync(dir, { recursive: true, force: true }));
    const f = await fixture(path),
      a = await f.register();
    await f.request('/api/save', a.token, { revision: 0, state: initialState() }, 'PUT');
    await f.close();
    const db = new DatabaseSync(path);
    const user = db.prepare('SELECT * FROM users').get()!,
      session = db.prepare('SELECT * FROM sessions').get()!;
    expect(user.password_hash).not.toBe('test-password-123');
    expect(session.token_hash).not.toBe(a.token);
    db.close();
    const restarted = await fixture(path);
    expect((await restarted.request('/api/save', a.token)).data.revision).toBe(1);
  });
});
