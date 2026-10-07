import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from './app';
import { initialState } from '../src/game/engine';
import { MAX_STAGE } from '../src/game/stages';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const fn of cleanups.splice(0).reverse()) await fn();
});
async function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'van-tien-admin-')),
    path = join(dir, 'van-tien-ky.sqlite');
  let time = Date.now(),
    service = await createApp({ databasePath: path, now: () => time });
  let server = service.app.listen(0, '127.0.0.1');
  await new Promise<void>((r) => server.once('listening', r));
  let base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const request = async (
    url: string,
    token?: string,
    body?: unknown,
    method = body === undefined ? 'GET' : 'POST',
  ) => {
    const r = await fetch(base + url, {
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
    const r = await request('/api/auth/register', undefined, {
      username,
      password: 'fixture-password-123',
    });
    expect(r.status).toBe(201);
    expect(
      (await request('/api/save', r.data.token, { revision: 0, state: initialState(time) }, 'PUT'))
        .status,
    ).toBe(200);
    return r.data;
  };
  const owner = await register('server_owner'),
    player = await register('ordinary_player');
  const cli = (...args: string[]) =>
    spawnSync(process.execPath, ['scripts/admin.mjs', ...args], {
      cwd: resolve('.'),
      env: { ...process.env, DATA_DIR: dir },
      encoding: 'utf8',
    });
  expect(cli('grant', 'server_owner').status).toBe(0);
  const restart = async () => {
    await new Promise<void>((r) => server.close(() => r()));
    await service.close();
    service = await createApp({ databasePath: path, now: () => time });
    server = service.app.listen(0, '127.0.0.1');
    await new Promise<void>((r) => server.once('listening', r));
    base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  };
  cleanups.push(async () => {
    await new Promise<void>((r) => server.close(() => r()));
    await service.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const create = async (code: string, extra: Record<string, unknown> = {}) => {
    const r = await request('/api/admin/giftcodes', owner.token, {
      code,
      label: 'Quà tiên lộ',
      reward: { stones: 500 },
      ...extra,
    });
    expect(r.status).toBe(201);
    return r.data;
  };
  return {
    path,
    request,
    register,
    owner,
    player,
    create,
    cli,
    restart,
    now: () => time,
    advance: (ms: number) => {
      time += ms;
    },
  };
}
describe('server administration and account giftcodes', () => {
  it('enforces administrator rights on every route, never trusts browser roles, and bootstraps only existing accounts via CLI', async () => {
    const f = await fixture();
    for (const route of [
      '/overview',
      '/players',
      '/giftcodes',
      '/chat',
      '/audit',
      '/bosses',
      '/redemptions',
    ]) {
      expect((await f.request('/api/admin' + route)).status).toBe(401);
      expect((await f.request('/api/admin' + route, f.player.token)).status).toBe(403);
    }
    expect(
      (
        await f.request('/api/admin/giftcodes', f.player.token, {
          admin: true,
          role: 'admin',
          code: 'STOLEN',
          label: 'fake',
          reward: { stones: 999999 },
        })
      ).status,
    ).toBe(403);
    expect(f.cli('grant', 'unknown_player').status).toBe(1);
    expect(f.cli('revoke', 'server_owner').status).toBe(1);
    expect(
      (
        await f.request('/api/admin/players/' + f.owner.user.id + '/role', f.owner.token, {
          role: 'player',
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await f.request('/api/admin/players/' + f.owner.user.id + '/control', f.owner.token, {
          banned: true,
          reason: 'test',
        })
      ).status,
    ).toBe(409);
    const login = await f.request('/api/auth/login', undefined, {
      username: 'server_owner',
      password: 'fixture-password-123',
    });
    expect(login.data.user.admin).toBe(true);
    const list = (await f.request('/api/admin/players', f.owner.token)).data;
    expect(JSON.stringify(list)).not.toMatch(/password|salt|token/);
    expect(
      (
        await f.request('/api/admin/players/' + f.player.user.id + '/role', f.owner.token, {
          role: 'admin',
        })
      ).status,
    ).toBe(200);
    expect((await f.request('/api/admin/overview', f.player.token)).status).toBe(200);
    expect(
      (
        await f.request('/api/admin/players/' + f.owner.user.id + '/role', f.player.token, {
          role: 'player',
        })
      ).status,
    ).toBe(200);
    expect((await f.request('/api/admin/overview', f.owner.token)).status).toBe(403);
  });
  it('counts only unbanned admins when protecting the last operator', async () => {
    const f = await fixture();
    expect(f.cli('grant', 'ordinary_player').status).toBe(0);
    expect(
      (
        await f.request('/api/admin/players/' + f.player.user.id + '/control', f.owner.token, {
          banned: true,
          reason: 'test',
        })
      ).status,
    ).toBe(200);
    expect((await f.request('/api/admin/overview', f.player.token)).status).toBe(401);
    expect(
      (
        await f.request('/api/admin/players/' + f.owner.user.id + '/control', f.owner.token, {
          banned: true,
          reason: 'test',
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await f.request('/api/admin/players/' + f.owner.user.id + '/role', f.owner.token, {
          role: 'player',
        })
      ).status,
    ).toBe(409);
    expect(f.cli('revoke', 'server_owner').status).toBe(1);
    expect(
      (
        await f.request('/api/admin/players/' + f.player.user.id + '/control', f.owner.token, {
          banned: true,
          reason: 'updated reason',
        })
      ).status,
    ).toBe(200);
  });
  it('credits canonical rewards once, survives duplicate requests/restart, and refuses stale saves after receiving a gift', async () => {
    const f = await fixture();
    await f.create('TAN_THU', {
      reward: {
        stones: 500,
        immortal: 2,
        divine: 1,
        lingqi: 30,
        items: { elixir: 3, key: 1 },
        gear: { slot: 'ring', rank: 8, level: 3 },
      },
    });
    expect(
      (await f.request('/api/giftcodes/redeem', f.player.token, { code: 'TAN_THU', revision: 0 }))
        .status,
    ).toBe(409);
    const attempts = await Promise.all([
      f.request('/api/giftcodes/redeem', f.player.token, {
        code: ' tan_thu ',
        revision: 1,
        reward: { stones: 999999 },
      }),
      f.request('/api/giftcodes/redeem', f.player.token, { code: 'TAN_THU', revision: 1 }),
    ]);
    expect(attempts.map((r) => r.status).sort()).toEqual([200, 409]);
    const saved = (await f.request('/api/save', f.player.token)).data;
    expect(saved.revision).toBe(2);
    expect(saved.state.stones).toBe(680);
    expect(saved.state.wallet).toEqual({ immortal: 2, divine: 1 });
    expect(saved.state.inventory.elixir).toBe(3);
    expect(saved.state.bag.at(-1)).toMatchObject({ uid: 'g4', slot: 'ring', rank: 8, level: 3 });
    expect(
      (await f.request('/api/save', f.player.token, { revision: 1, state: initialState() }, 'PUT'))
        .status,
    ).toBe(409);
    await f.restart();
    expect((await f.request('/api/admin/overview', f.owner.token)).status).toBe(200);
    expect((await f.request('/api/giftcodes/history', f.player.token)).data.receipts).toHaveLength(
      1,
    );
    expect(
      (await f.request('/api/giftcodes/redeem', f.player.token, { code: 'TAN_THU', revision: 2 }))
        .status,
    ).toBe(409);
    expect((await f.request('/api/admin/giftcodes', f.owner.token)).data.codes[0].claims).toBe(1);
  });
  it('allocates a final gift slot atomically across accounts and validates dates, caps, realms and reward definitions', async () => {
    const f = await fixture();
    await f.create('LAST_ONE', { maxClaims: 1 });
    const attempts = await Promise.all([
      f.request('/api/giftcodes/redeem', f.owner.token, { code: 'LAST_ONE', revision: 1 }),
      f.request('/api/giftcodes/redeem', f.player.token, { code: 'LAST_ONE', revision: 1 }),
    ]);
    expect(attempts.map((r) => r.status).sort()).toEqual([200, 410]);
    expect((await f.request('/api/admin/giftcodes', f.owner.token)).data.codes[0].claims).toBe(1);
    for (const reward of [
      { stones: -1 },
      { items: { made_up: 1 } },
      { gear: { slot: 'weapon', rank: 2, level: 0 } },
      { role: 'admin' },
      { stones: 0 },
    ])
      expect(
        (
          await f.request('/api/admin/giftcodes', f.owner.token, {
            code: 'BAD_REWARD',
            label: 'bad',
            reward,
          })
        ).status,
      ).toBe(400);
    await f.create('LATE', { startsAt: f.now() + 60000 });
    expect(
      (await f.request('/api/giftcodes/redeem', f.player.token, { code: 'LATE', revision: 1 }))
        .status,
    ).toBe(409);
    await f.create('HIGH', { minStage: MAX_STAGE });
    expect(
      (
        await f.request('/api/giftcodes/redeem', f.player.token, {
          code: 'HIGH',
          revision: (await f.request('/api/save', f.player.token)).data.revision,
        })
      ).status,
    ).toBe(403);
    const g = await f.create('EXPIRES', { expiresAt: f.now() + 1000 });
    f.advance(2000);
    expect(
      (await f.request('/api/giftcodes/redeem', f.player.token, { code: 'EXPIRES', revision: 1 }))
        .status,
    ).toBe(410);
    expect(
      (await f.request(`/api/admin/giftcodes/${g.id}/status`, f.owner.token, { enabled: false }))
        .status,
    ).toBe(200);
    expect(
      (
        await f.request('/api/admin/giftcodes', f.owner.token, {
          code: 'expires',
          label: 'reuse',
          reward: { stones: 1 },
        })
      ).status,
    ).toBe(409);
  });
  it('rolls back gift consumption when inventory or resource limits prevent a complete reward', async () => {
    const f = await fixture();
    const s = initialState();
    s.lingqi = 1e9;
    expect(
      (await f.request('/api/save', f.player.token, { revision: 1, state: s }, 'PUT')).status,
    ).toBe(200);
    const g = await f.create('QI_CAP', { reward: { stones: 100, lingqi: 1 } });
    expect(
      (await f.request('/api/giftcodes/redeem', f.player.token, { revision: 2, code: g.code }))
        .status,
    ).toBe(409);
    expect((await f.request('/api/save', f.player.token)).data.state.stones).toBe(180);
    expect((await f.request('/api/admin/giftcodes', f.owner.token)).data.codes[0].claims).toBe(0);
    expect((await f.request('/api/giftcodes/history', f.player.token)).data.receipts).toHaveLength(
      0,
    );
    s.lingqi = 0;
    s.bag = Array.from({ length: 114 }, (_, i) => ({
      uid: `g${i + 2}`,
      slot: 'ring',
      rank: 0,
      level: 0,
    }));
    s.nextUid = 116;
    await f.request('/api/save', f.player.token, { revision: 2, state: s }, 'PUT');
    await f.create('BAG_FULL', { reward: { gear: { slot: 'robe', rank: 2, level: 0 } } });
    expect(
      (await f.request('/api/giftcodes/redeem', f.player.token, { revision: 3, code: 'BAG_FULL' }))
        .status,
    ).toBe(409);
    expect((await f.request('/api/save', f.player.token)).data.revision).toBe(3);
  });
  it('adds money and equipment, validates complete character edits, updates rankings, and restores audited saves without overwriting newer progress', async () => {
    const f = await fixture(),
      id = f.player.user.id;
    expect(
      (
        await f.request(`/api/admin/players/${id}/grant`, f.owner.token, {
          revision: 1,
          reward: { stones: 1000, items: { essence: 5 } },
        })
      ).status,
    ).toBe(200);
    const p = (await f.request(`/api/admin/players/${id}`, f.owner.token)).data;
    expect(p.cloud.state.stones).toBe(1180);
    const edited = { ...p.cloud.state, stage: MAX_STAGE, name: 'Hồng Mông Chủ' };
    expect(
      (
        await f.request(
          `/api/admin/players/${id}/save`,
          f.owner.token,
          { revision: 1, state: edited },
          'PUT',
        )
      ).status,
    ).toBe(409);
    expect(
      (
        await f.request(
          `/api/admin/players/${id}/save`,
          f.owner.token,
          { revision: 2, state: { ...edited, stage: 80 } },
          'PUT',
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await f.request(
          `/api/admin/players/${id}/save`,
          f.owner.token,
          { revision: 2, state: edited },
          'PUT',
        )
      ).status,
    ).toBe(200);
    expect((await f.request('/api/community')).data.ranking[0]).toMatchObject({
      name: 'Hồng Mông Chủ',
      stage: MAX_STAGE,
    });
    const audit = (await f.request('/api/admin/audit', f.owner.token)).data.entries.find(
      (e: { action: string }) => e.action === 'player-save',
    );
    expect(audit.restorable).toBe(1);
    expect(
      (await f.request(`/api/admin/audit/${audit.id}/restore`, f.owner.token, { revision: 2 }))
        .status,
    ).toBe(409);
    expect(
      (await f.request(`/api/admin/audit/${audit.id}/restore`, f.owner.token, { revision: 3 }))
        .status,
    ).toBe(200);
    const restored = (await f.request('/api/save', f.player.token)).data;
    expect(restored.state.stage).toBe(0);
    expect(restored.state.stones).toBe(1180);
    expect(restored.revision).toBe(4);
    const undo = (await f.request('/api/admin/audit', f.owner.token)).data.entries.find(
      (e: { action: string }) => e.action === 'player-restore',
    );
    expect(undo.restorable).toBe(1);
    expect(
      (await f.request(`/api/admin/audit/${undo.id}/restore`, f.owner.token, { revision: 4 }))
        .status,
    ).toBe(200);
    expect((await f.request('/api/save', f.player.token)).data.state.stage).toBe(MAX_STAGE);
  });
  it('revokes sessions on bans and password resets, supports unbanning, and never logs passwords', async () => {
    const f = await fixture(),
      id = f.player.user.id,
      url = `/api/admin/players/${id}`;
    expect(
      (await f.request(url + '/control', f.owner.token, { banned: true, reason: 'Vi phạm chat' }))
        .status,
    ).toBe(200);
    expect((await f.request('/api/save', f.player.token)).status).toBe(401);
    expect(
      (
        await f.request('/api/auth/login', undefined, {
          username: 'ordinary_player',
          password: 'fixture-password-123',
        })
      ).status,
    ).toBe(403);
    await f.request(url + '/control', f.owner.token, { banned: false, reason: '' });
    const a = (
      await f.request('/api/auth/login', undefined, {
        username: 'ordinary_player',
        password: 'fixture-password-123',
      })
    ).data;
    expect(
      (await f.request(url + '/password', f.owner.token, { password: 'replacement-password-456' }))
        .status,
    ).toBe(200);
    expect((await f.request('/api/auth/me', a.token)).status).toBe(401);
    expect(
      (
        await f.request('/api/auth/login', undefined, {
          username: 'ordinary_player',
          password: 'fixture-password-123',
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await f.request('/api/auth/login', undefined, {
          username: 'ordinary_player',
          password: 'replacement-password-456',
        })
      ).status,
    ).toBe(200);
    expect(JSON.stringify((await f.request('/api/admin/audit', f.owner.token)).data)).not.toContain(
      'replacement-password-456',
    );
  });
  it('persists maintenance and announcements, controls real shared boss cycles and moderates chat with an audit trail', async () => {
    const f = await fixture();
    await f.request('/api/chat', f.player.token, {
      world: 'all',
      body: '<script>Vi phạm</script>',
    });
    const message = (await f.request('/api/admin/chat', f.owner.token)).data.messages[0];
    expect(
      (await f.request(`/api/admin/chat/${message.id}/remove`, f.owner.token, {})).status,
    ).toBe(200);
    expect((await f.request('/api/chat?world=all')).data.messages).toHaveLength(0);
    const boss = (await f.request('/api/admin/bosses', f.owner.token)).data.bosses[0];
    const respawn = (
      await f.request(`/api/admin/bosses/${boss.id}`, f.owner.token, { action: 'respawn' })
    ).data;
    expect(respawn.active).toBe(true);
    expect(respawn.cycle).not.toBe(boss.cycle);
    expect((await f.request('/api/community')).data.bosses[0].cycle).toBe(respawn.cycle);
    await f.request(`/api/admin/bosses/${boss.id}`, f.owner.token, { action: 'defeat' });
    expect((await f.request('/api/community')).data.bosses[0].hp).toBe(0);
    await f.request(`/api/admin/bosses/${boss.id}`, f.owner.token, { action: 'heal' });
    expect((await f.request('/api/community')).data.bosses[0].hp).toBe(respawn.maxHp);
    expect(
      (
        await f.request(
          '/api/admin/server',
          f.owner.token,
          { revision: 0, maintenance: true, message: 'Bảo trì tiên lộ' },
          'PUT',
        )
      ).status,
    ).toBe(200);
    expect(
      (await f.request('/api/save', f.player.token, { revision: 1, state: initialState() }, 'PUT'))
        .status,
    ).toBe(503);
    expect(
      (await f.request('/api/chat', f.player.token, { world: 'all', body: 'blocked' })).status,
    ).toBe(503);
    expect(
      (await f.request('/api/giftcodes/redeem', f.player.token, { revision: 1, code: 'BLOCKED' }))
        .status,
    ).toBe(503);
    await f.restart();
    expect((await f.request('/api/server-status')).data).toMatchObject({
      maintenance: true,
      message: 'Bảo trì tiên lộ',
      revision: 1,
    });
    expect((await f.request('/api/admin/overview', f.owner.token)).status).toBe(200);
    expect(
      (
        await f.request(
          '/api/admin/server',
          f.owner.token,
          { revision: 0, maintenance: false, message: '' },
          'PUT',
        )
      ).status,
    ).toBe(409);
    expect(
      (
        await f.request(
          '/api/admin/server',
          f.owner.token,
          { revision: 1, maintenance: false, message: '' },
          'PUT',
        )
      ).status,
    ).toBe(200);
  });
  it('migrates stored v1 profiles and chat only once, preserving realm, XP and currencies through server restarts', async () => {
    const f = await fixture();
    await f.request('/api/chat', f.player.token, { world: 'all', body: 'Lời từ Kim Đan' });
    const db = new DatabaseSync(f.path),
      old = { ...initialState(), version: 1, stage: 59, xp: 12345, stones: 54321 };
    db.prepare('UPDATE saves SET game_json=? WHERE user_id=?').run(
      JSON.stringify(old),
      f.player.user.id,
    );
    db.prepare('UPDATE chat_messages SET stage=6').run();
    db.prepare("DELETE FROM metadata WHERE key='four-phase-realms'").run();
    db.close();
    await f.restart();
    let saved = (await f.request('/api/save', f.player.token)).data;
    expect(saved.state).toMatchObject({ version: 2, stage: 79, xp: 12345, stones: 54321 });
    expect(saved.revision).toBe(2);
    expect((await f.request('/api/community')).data.ranking[0].stage).toBe(79);
    expect((await f.request('/api/chat?world=all')).data.messages[0].stage).toBe(8);
    await f.restart();
    saved = (await f.request('/api/save', f.player.token)).data;
    expect(saved.state.stage).toBe(79);
    expect(saved.revision).toBe(2);
    expect((await f.request('/api/chat?world=all')).data.messages[0].stage).toBe(8);
  });
});
