import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import type { Server } from 'node:http';
import { createApp } from './app';
import { openDatabase, postgresOptions, postgresSQL } from './database.mjs';
import { initialState } from '../src/game/engine';

describe('PostgreSQL database configuration', () => {
  it('requires certificate verification for remote databases, rejects disabled TLS and preserves quoted SQL', () => {
    expect(
      postgresOptions('postgresql://user:password@ep-example.neon.tech/neondb?sslmode=require').ssl,
    ).toEqual({ rejectUnauthorized: true });
    expect(() => postgresOptions('postgresql://user:fixture-secret@[invalid/db')).toThrow(
      'DATABASE_URL must be a valid PostgreSQL connection string.',
    );
    expect(postgresOptions('postgresql://agent@127.0.0.1/postgres?sslmode=disable').ssl).toBe(
      false,
    );
    expect(() =>
      postgresOptions('postgresql://user:password@example.com/db?sslmode=disable'),
    ).toThrow();
    expect(() =>
      postgresOptions('postgresql://agent@localhost/postgres', 'public;DROP TABLE users'),
    ).toThrow();
    expect(postgresSQL("SELECT '?' AS label, ? AS value")).toBe("SELECT '?' AS label, $1 AS value");
  });
});

// A real PostgreSQL service is required; SQLite is covered by the existing suite.
// CI and the documented local test command provide this URL explicitly.
describe.skipIf(!process.env.TEST_DATABASE_URL)('PostgreSQL API and durable administration', () => {
  async function fixture(bootstrap = false) {
    const url = process.env.TEST_DATABASE_URL!,
      schema = 'test_' + randomUUID().replaceAll('-', '');
    const root = await openDatabase({ databaseURL: url });
    await root.exec(`CREATE SCHEMA ${schema}`);
    const options = {
      databaseURL: url,
      databaseSchema: schema,
      ...(bootstrap
        ? { bootstrapAdmin: { username: 'server_owner', password: 'fixture-password-123' } }
        : {}),
    };
    let service = await createApp(options),
      server = service.app.listen(0, '127.0.0.1');
    await new Promise<void>((r) => server.once('listening', r));
    let base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
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
    const auth = async (username: string, mode = 'register') => {
      const r = await request('/auth/' + mode, undefined, {
        username,
        password: 'fixture-password-123',
      });
      expect(r.status).toBe(mode === 'register' ? 201 : 200);
      if (mode === 'register')
        expect(
          (await request('/save', r.data.token, { revision: 0, state: initialState() }, 'PUT'))
            .status,
        ).toBe(200);
      return r.data;
    };
    const cli = (...args: string[]) =>
      spawnSync(process.execPath, ['scripts/admin.mjs', ...args], {
        env: { ...process.env, DATABASE_URL: url, DATABASE_SCHEMA: schema },
        encoding: 'utf8',
      });
    const stop = async () => {
      await new Promise<void>((r) => {
        server.close(() => r());
        server.closeAllConnections();
      });
      await service.close();
    };
    return {
      schema,
      url,
      request,
      auth,
      cli,
      restart: async () => {
        await stop();
        service = await createApp(options);
        server = service.app.listen(0, '127.0.0.1');
        await new Promise<void>((r) => server.once('listening', r));
        base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
      },
      close: async () => {
        await stop();
        await root.exec(`DROP SCHEMA ${schema} CASCADE`);
        await root.close();
      },
    };
  }
  it('survives restart, compares save revisions and uses current roles instead of claimed browser roles', async () => {
    const f = await fixture();
    try {
      const owner = await f.auth('server_owner'),
        player = await f.auth('ordinary_player');
      expect((await f.request('/health')).data.storage).toBe('postgres');
      expect(f.cli('grant', 'server_owner').status).toBe(0);
      expect((await f.request('/admin/overview', player.token)).status).toBe(403);
      const updated = { ...initialState(), stage: 10, stones: 9876 };
      const race = await Promise.all([
        f.request('/save', player.token, { revision: 1, state: updated }, 'PUT'),
        f.request('/save', player.token, { revision: 1, state: updated }, 'PUT'),
      ]);
      expect(race.map((r) => r.status).sort()).toEqual([200, 409]);
      await f.restart();
      expect((await f.request('/save', player.token)).data).toMatchObject({
        revision: 2,
        state: { stage: 10, stones: 9876 },
      });
      expect((await f.request('/community')).data.ranking[0].stage).toBe(10);
      expect((await f.request('/admin/overview', owner.token)).status).toBe(200);
    } finally {
      await f.close();
    }
  });
  it('grants the last gift slot once across independent server pools and keeps ledger, wallet and audit after restart', async () => {
    const f = await fixture();
    let other: Awaited<ReturnType<typeof createApp>> | undefined;
    let listener: Server | undefined;
    try {
      const owner = await f.auth('server_owner'),
        a = await f.auth('gift_player_a'),
        b = await f.auth('gift_player_b');
      expect(f.cli('grant', 'server_owner').status).toBe(0);
      expect(
        (
          await f.request('/admin/giftcodes', owner.token, {
            code: 'LAST_GIFT',
            label: 'Last slot',
            maxClaims: 1,
            reward: { stones: 500, immortal: 2, gear: { slot: 'ring', rank: 8, level: 3 } },
          })
        ).status,
      ).toBe(201);
      other = await createApp({ databaseURL: f.url, databaseSchema: f.schema });
      listener = other.app.listen(0, '127.0.0.1');
      await new Promise<void>((r) => listener!.once('listening', r));
      const base = `http://127.0.0.1:${(listener.address() as { port: number }).port}`;
      const race = await Promise.all([
        f.request('/giftcodes/redeem', a.token, { revision: 1, code: 'LAST_GIFT' }),
        fetch(base + '/api/giftcodes/redeem', {
          method: 'POST',
          headers: { Authorization: `Bearer ${b.token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ revision: 1, code: 'LAST_GIFT' }),
        }).then(async (r) => ({ status: r.status, data: await r.json() })),
      ]);
      expect(race.map((r) => r.status).sort()).toEqual([200, 410]);
      await new Promise<void>((r) => {
        listener!.close(() => r());
        listener!.closeAllConnections();
      });
      await other.close();
      other = undefined;
      listener = undefined;
      const winner = race[0].status === 200 ? a : b;
      expect(
        (await f.request('/giftcodes/redeem', winner.token, { revision: 2, code: 'LAST_GIFT' }))
          .status,
      ).toBe(409);
      await f.restart();
      expect((await f.request('/save', winner.token)).data.state).toMatchObject({
        stones: 680,
        wallet: { immortal: 2 },
      });
      expect((await f.request('/giftcodes/history', winner.token)).data.receipts).toHaveLength(1);
      expect((await f.request('/admin/giftcodes', owner.token)).data.codes[0].claims).toBe(1);
      const p = (await f.request('/admin/players/' + winner.user.id, owner.token)).data;
      expect(
        (
          await f.request('/admin/players/' + winner.user.id + '/grant', owner.token, {
            revision: p.cloud.revision,
            reward: { divine: 1 },
          })
        ).status,
      ).toBe(200);
      const audit = (await f.request('/admin/audit', owner.token)).data.entries.find(
        (e: { action: string }) => e.action === 'player-grant',
      );
      expect(audit.restorable).toBe(1);
      expect(
        (await f.request('/admin/audit/' + audit.id + '/restore', owner.token, { revision: 3 }))
          .status,
      ).toBe(200);
      expect((await f.request('/save', winner.token)).data.state.wallet.divine).toBe(0);
    } finally {
      if (listener)
        await new Promise<void>((r) => {
          listener!.close(() => r());
          listener!.closeAllConnections();
        });
      await other?.close();
      await f.close();
    }
  });
  it('persists Unicode chat, rate limits, maintenance and real shared boss contributions without duplicate rewards', async () => {
    const f = await fixture();
    try {
      const owner = await f.auth('server_owner'),
        player = await f.auth('ordinary_player');
      f.cli('grant', 'server_owner');
      expect(
        (
          await f.request('/chat', player.token, {
            world: 'all',
            body: 'Đạo hữu, cùng ngộ tiên lộ!',
          })
        ).status,
      ).toBe(201);
      expect(
        (await f.request('/chat', player.token, { world: 'all', body: 'quá nhanh' })).status,
      ).toBe(429);
      await f.restart();
      expect((await f.request('/chat?world=all')).data.messages[0].body).toBe(
        'Đạo hữu, cùng ngộ tiên lộ!',
      );
      const boss = (await f.request('/admin/bosses', owner.token)).data.bosses[0];
      const active = (
        await f.request('/admin/bosses/' + boss.id, owner.token, { action: 'respawn' })
      ).data;
      expect(
        (
          await f.request('/community/boss/' + boss.id + '/attack', player.token, {
            cycle: active.cycle,
          })
        ).status,
      ).toBe(200);
      expect(
        (
          await f.request('/community/boss/' + boss.id + '/attack', player.token, {
            cycle: active.cycle,
          })
        ).status,
      ).toBe(429);
      await f.request('/admin/bosses/' + boss.id, owner.token, { action: 'defeat' });
      const claims = await Promise.all([
        f.request('/community/boss/' + boss.id + '/claim', player.token, {
          cycle: active.cycle,
          revision: 1,
        }),
        f.request('/community/boss/' + boss.id + '/claim', player.token, {
          cycle: active.cycle,
          revision: 1,
        }),
      ]);
      expect(claims.map((r) => r.status).sort()).toEqual([200, 409]);
      expect(
        (
          await f.request(
            '/admin/server',
            owner.token,
            { revision: 0, maintenance: true, message: 'Bảo trì thần giới' },
            'PUT',
          )
        ).status,
      ).toBe(200);
      await f.restart();
      expect((await f.request('/server-status')).data).toMatchObject({
        maintenance: true,
        message: 'Bảo trì thần giới',
      });
      expect(
        (await f.request('/save', player.token, { revision: 2, state: initialState() }, 'PUT'))
          .status,
      ).toBe(503);
      const message = (await f.request('/admin/chat', owner.token)).data.messages[0];
      expect(
        (await f.request('/admin/chat/' + message.id + '/remove', owner.token, {})).status,
      ).toBe(200);
    } finally {
      await f.close();
    }
  });
  it('provisions the first admin privately once and never grants the revoked account again on restart', async () => {
    const f = await fixture(true);
    try {
      const owner = await f.auth('server_owner', 'login');
      expect(owner.user.admin).toBe(true);
      expect((await f.request('/admin/overview', owner.token)).status).toBe(200);
      const replacement = await f.auth('replacement_admin');
      expect(
        (
          await f.request('/admin/players/' + replacement.user.id + '/role', owner.token, {
            role: 'admin',
          })
        ).status,
      ).toBe(200);
      expect(
        (
          await f.request('/admin/players/' + owner.user.id + '/role', replacement.token, {
            role: 'player',
          })
        ).status,
      ).toBe(200);
      await f.restart();
      expect((await f.request('/admin/overview', owner.token)).status).toBe(403);
      expect(
        JSON.stringify((await f.request('/admin/audit', replacement.token)).data),
      ).not.toContain('fixture-password-123');
    } finally {
      await f.close();
    }
  });
  it('refuses bootstrap takeover of an existing account with a different password without changing its save or role', async () => {
    const f = await fixture();
    try {
      const player = await f.auth('ordinary_player');
      await expect(
        createApp({
          databaseURL: f.url,
          databaseSchema: f.schema,
          bootstrapAdmin: { username: 'ordinary_player', password: 'wrong-password-at-least-16' },
        }),
      ).rejects.toThrow('different account');
      expect((await f.request('/admin/overview', player.token)).status).toBe(403);
      expect((await f.request('/save', player.token)).data.revision).toBe(1);
      const initialized = await createApp({
        databaseURL: f.url,
        databaseSchema: f.schema,
        bootstrapAdmin: { username: 'ordinary_player', password: 'fixture-password-123' },
      });
      await initialized.close();
      expect((await f.request('/admin/overview', player.token)).status).toBe(200);
    } finally {
      await f.close();
    }
  });
});
