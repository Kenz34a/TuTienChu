import { describe, expect, it } from 'vitest';
import { randomUUID, createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, readFileSync, rmSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Server } from 'node:http';
import { createApp } from './app';
import { openDatabase } from './database.mjs';
import { initialState } from '../src/game/engine';

describe.skipIf(!process.env.TEST_DATABASE_URL)('SQLite to PostgreSQL import', () => {
  it('imports accounts, hashes, roles, saves, chat, gifts and boss ledgers atomically, resets sequences and refuses overwrites', async () => {
    const url = process.env.TEST_DATABASE_URL!,
      schema = 'test_' + randomUUID().replaceAll('-', '');
    const root = await openDatabase({ databaseURL: url });
    await root.exec(`CREATE SCHEMA ${schema}`);
    const dir = mkdtempSync(join(tmpdir(), 'van-tien-import-'));
    const path = join(dir, 'source.sqlite');
    let service = await createApp({
      databasePath: path,
      now: () => Date.now() - 10000,
      bootstrapAdmin: { username: 'server_owner', password: 'fixture-password-123' },
    });
    let server: Server | undefined;
    const listen = async () => {
      server = service.app.listen(0, '127.0.0.1');
      await new Promise<void>((r) => server!.once('listening', r));
      const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
      return async (
        route: string,
        token?: string,
        body?: unknown,
        method = body === undefined ? 'GET' : 'POST',
      ) => {
        const r = await fetch(base + '/api' + route, {
          method,
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        return { status: r.status, data: await r.json() };
      };
    };
    let stopped = false;
    const stop = async () => {
      if (stopped) return;
      stopped = true;
      if (server)
        await new Promise<void>((r) => {
          server!.close(() => r());
          server!.closeAllConnections();
        });
      await service.close();
    };
    const migrate = (file: string) =>
      spawnSync(process.execPath, ['scripts/migrate-postgres.mjs', file], {
        env: { ...process.env, DATABASE_URL: url, DATABASE_SCHEMA: schema },
        encoding: 'utf8',
        timeout: 30000,
      });
    try {
      let request = await listen();
      const owner = (
        await request('/auth/login', undefined, {
          username: 'server_owner',
          password: 'fixture-password-123',
        })
      ).data;
      expect(owner.user.admin).toBe(true);
      expect(
        (await request('/save', owner.token, { revision: 0, state: initialState() }, 'PUT')).status,
      ).toBe(200);
      expect(
        (
          await request('/admin/giftcodes', owner.token, {
            code: 'OLD_GIFT',
            label: 'Quà từ máy cũ',
            reward: { stones: 321 },
          })
        ).status,
      ).toBe(201);
      expect(
        (await request('/giftcodes/redeem', owner.token, { code: 'OLD_GIFT', revision: 1 })).status,
      ).toBe(200);
      expect(
        (await request('/chat', owner.token, { world: 'all', body: 'Truyền thừa từ SQLite' }))
          .status,
      ).toBe(201);
      const boss = (await request('/admin/bosses', owner.token)).data.bosses[0];
      const active = (await request('/admin/bosses/' + boss.id, owner.token, { action: 'respawn' }))
        .data;
      expect(
        (
          await request('/community/boss/' + boss.id + '/attack', owner.token, {
            cycle: active.cycle,
          })
        ).status,
      ).toBe(200);
      await request('/admin/bosses/' + boss.id, owner.token, { action: 'defeat' });
      expect(
        (
          await request('/community/boss/' + boss.id + '/claim', owner.token, {
            cycle: active.cycle,
            revision: 2,
          })
        ).status,
      ).toBe(200);
      expect(
        (
          await request(
            '/admin/server',
            owner.token,
            { revision: 0, message: 'Máy chủ đã chuyển giới', maintenance: false },
            'PUT',
          )
        ).status,
      ).toBe(200);
      const before = (await request('/save', owner.token)).data;
      await stop();
      const source = new DatabaseSync(path);
      source.exec('PRAGMA wal_checkpoint(TRUNCATE)');
      source.close();
      const hash = () => createHash('sha256').update(readFileSync(path)).digest('hex');
      const sourceHash = hash();
      const invalidPath = join(dir, 'invalid.sqlite');
      copyFileSync(path, invalidPath);
      const invalid = new DatabaseSync(invalidPath);
      invalid.exec(
        "PRAGMA foreign_keys=OFF; INSERT INTO profiles VALUES('missing-user','invalid',0,0,0,'none',0)",
      );
      invalid.close();
      expect(migrate(invalidPath).status).toBe(1);
      const inspect = await openDatabase({ databaseURL: url, schema });
      try {
        expect((await inspect.prepare('SELECT COUNT(*) AS n FROM users').get())!.n).toBe(0);
        const imported = migrate(path);
        expect(imported.status, imported.stderr).toBe(0);
        expect(hash()).toBe(sourceHash);
        expect(migrate(path).status).toBe(1);
        expect((await inspect.prepare('SELECT COUNT(*) AS n FROM users').get())!.n).toBe(1);
      } finally {
        await inspect.close();
      }
      service = await createApp({ databaseURL: url, databaseSchema: schema });
      stopped = false;
      request = await listen();
      const login = await request('/auth/login', undefined, {
        username: 'server_owner',
        password: 'fixture-password-123',
      });
      expect(login.status).toBe(200);
      expect(login.data.user.admin).toBe(true);
      expect((await request('/save', owner.token)).data).toEqual(before);
      expect((await request('/chat?world=all')).data.messages[0].body).toBe(
        'Truyền thừa từ SQLite',
      );
      expect((await request('/giftcodes/history', owner.token)).data.receipts).toHaveLength(1);
      expect(
        (await request('/giftcodes/redeem', owner.token, { code: 'OLD_GIFT', revision: 3 })).status,
      ).toBe(409);
      expect(
        (
          await request('/community/boss/' + boss.id + '/claim', owner.token, {
            cycle: active.cycle,
            revision: 3,
          })
        ).status,
      ).toBe(409);
      expect((await request('/server-status')).data.message).toBe('Máy chủ đã chuyển giới');
      expect(
        (
          await request('/admin/giftcodes', owner.token, {
            code: 'NEW_GIFT',
            label: 'Quà mới',
            reward: { stones: 1 },
          })
        ).status,
      ).toBe(201);
      const codes = (await request('/admin/giftcodes', owner.token)).data.codes;
      expect(codes.find((c: { code: string }) => c.code === 'NEW_GIFT').id).toBeGreaterThan(
        codes.find((c: { code: string }) => c.code === 'OLD_GIFT').id,
      );
      expect(
        (await request('/chat', owner.token, { world: 'all', body: 'Tiếp tục sau chuyển dữ liệu' }))
          .status,
      ).toBe(201);
      expect((await request('/admin/audit', owner.token)).data.entries.length).toBeGreaterThan(3);
    } finally {
      await stop();
      await root.exec(`DROP SCHEMA ${schema} CASCADE`);
      await root.close();
      rmSync(dir, { recursive: true, force: true });
    }
  }, 30000);
});
