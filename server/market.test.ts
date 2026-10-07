import { afterEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Server } from 'node:http';
import { createApp } from './app';
import { openDatabase } from './database.mjs';
import { initialState } from '../src/game/engine';
import type { GameState } from '../src/game/types';
const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const close of cleanups.splice(0).reverse()) await close();
});
for (const kind of ['sqlite', 'postgres'])
  describe.skipIf(kind === 'postgres' && !process.env.TEST_DATABASE_URL)(
    `${kind} player marketplace`,
    () => {
      async function fixture() {
        const dir = mkdtempSync(join(tmpdir(), 'dao-market-')),
          schema = 'market_' + randomUUID().replaceAll('-', '');
        const root =
          kind === 'postgres'
            ? await openDatabase({ databaseURL: process.env.TEST_DATABASE_URL })
            : null;
        if (root) await root.exec(`CREATE SCHEMA ${schema}`);
        const options = root
          ? { databaseURL: process.env.TEST_DATABASE_URL, databaseSchema: schema }
          : { databasePath: join(dir, 'market.sqlite') };
        let time = Date.now(),
          service = await createApp({ ...options, now: () => time }),
          server: Server = service.app.listen(0, '127.0.0.1');
        await new Promise<void>((r) => server.once('listening', r));
        let base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
        const stop = async () => {
          await new Promise<void>((r) => {
            server.close(() => r());
            server.closeAllConnections();
          });
          await service.close();
        };
        cleanups.push(async () => {
          await stop();
          if (root) {
            await root.exec(`DROP SCHEMA ${schema} CASCADE`);
            await root.close();
          }
          rmSync(dir, { recursive: true, force: true });
        });
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
        const auth = async (name: string, s = initialState(time)) => {
          const a = await request('/auth/register', undefined, {
            username: name,
            password: 'market-fixture-password-123',
          });
          expect(a.status).toBe(201);
          expect(
            (await request('/save', a.data.token, { revision: 0, state: s }, 'PUT')).status,
          ).toBe(200);
          return a.data.token as string;
        };
        const save = async (token: string) => (await request('/save', token)).data;
        const list = async (token: string, fields: Record<string, unknown> = {}) =>
          request('/market/list', token, {
            requestId: randomUUID(),
            kind: 'item',
            asset: 'herb',
            quantity: 3,
            price: 50,
            currency: 'spirit',
            revision: (await save(token)).revision,
            ...fields,
          });
        return {
          request,
          auth,
          save,
          list,
          ban: async (name: string) => {
            const control = await openDatabase({ ...options, schema: root ? schema : undefined });
            try {
              const user = await control.prepare('SELECT id FROM users WHERE username=?').get(name);
              await control
                .prepare('INSERT INTO user_controls VALUES(?,?,?)')
                .run(user!.id, 1, 'Market fixture ban');
            } finally {
              await control.close();
            }
          },
          replica: async () => {
            const peer = await createApp({ ...options, now: () => time });
            const host = peer.app.listen(0, '127.0.0.1');
            await new Promise<void>((r) => host.once('listening', r));
            cleanups.push(async () => {
              await new Promise<void>((r) => {
                host.close(() => r());
                host.closeAllConnections();
              });
              await peer.close();
            });
            const origin = `http://127.0.0.1:${(host.address() as { port: number }).port}`;
            return async (path: string, token: string, body: unknown) => {
              const response = await fetch(origin + '/api' + path, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
              });
              return { status: response.status, data: await response.json() };
            };
          },
          advance: (ms: number) => {
            time += ms;
          },
          restart: async () => {
            await stop();
            service = await createApp({ ...options, now: () => time });
            server = service.app.listen(0, '127.0.0.1');
            await new Promise<void>((r) => server.once('listening', r));
            base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
          },
        };
      }
      it('escrows items, transfers both saves atomically, applies fee and preserves the ledger after restart', async () => {
        const f = await fixture(),
          seller = await f.auth('market_seller'),
          buyer = await f.auth('market_buyer');
        const listing = await f.list(seller);
        expect(listing.status).toBe(200);
        expect(listing.data.cloud.state.inventory.herb).toBe(5);
        const id = listing.data.listing.id;
        const bought = await f.request(`/market/${id}/buy`, buyer, { revision: 1 });
        expect(bought.status).toBe(200);
        expect(bought.data.cloud.state).toMatchObject({
          stones: 30,
          inventory: { herb: 11 },
          adventure: { marketTrades: 1 },
        });
        expect((await f.save(seller)).state).toMatchObject({
          stones: 327,
          inventory: { herb: 5 },
          adventure: { marketTrades: 1 },
        });
        await f.restart();
        expect((await f.request('/market?tab=history', buyer)).data.listings[0]).toMatchObject({
          status: 'sold',
          fee: 3,
        });
        expect((await f.save(seller)).state.stones).toBe(327);
      });
      it('has one winner for concurrent buyers and idempotent purchase retries', async () => {
        const f = await fixture(),
          s = await f.auth('market_seller'),
          a = await f.auth('buyer_one'),
          b = await f.auth('buyer_two'),
          id = (await f.list(s)).data.listing.id;
        const results = await Promise.all([
          f.request(`/market/${id}/buy`, a, { revision: 1 }),
          f.request(`/market/${id}/buy`, b, { revision: 1 }),
        ]);
        expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
        const win = results[0].status === 200 ? a : b,
          lose = win === a ? b : a;
        expect((await f.request(`/market/${id}/buy`, win, { revision: 1 })).status).toBe(200);
        expect((await f.save(win)).state.stones).toBe(30);
        expect((await f.save(lose)).state.stones).toBe(180);
        expect((await f.save(s)).state.stones).toBe(327);
      });
      it('requires authentication, valid inventory, sufficient funds and current revisions', async () => {
        const f = await fixture(),
          s = await f.auth('market_seller'),
          b = await f.auth('market_buyer');
        expect((await f.request('/market')).status).toBe(401);
        for (const fields of [
          { quantity: 9 },
          { quantity: 0 },
          { price: -1 },
          { asset: '__proto__' },
          { kind: 'gear', asset: 'g1', quantity: 1 },
          { price: 1e9, quantity: 2 },
        ])
          expect((await f.list(s, fields)).status).toBe(400);
        const id = (await f.list(s, { price: 100 })).data.listing.id;
        expect((await f.request(`/market/${id}/buy`, b, { revision: 0 })).data.cloud.revision).toBe(
          1,
        );
        expect((await f.request(`/market/${id}/buy`, b, { revision: 1 })).status).toBe(409);
        expect((await f.save(b)).state.stones).toBe(180);
        expect((await f.save(s)).state.stones).toBe(180);
      });
      it('hides private orders, denies other recipients and forbids buying your own listing', async () => {
        const f = await fixture(),
          s = await f.auth('market_seller'),
          b = await f.auth('market_buyer'),
          x = await f.auth('uninvited_buyer');
        const id = (await f.list(s, { recipient: 'market_buyer' })).data.listing.id;
        expect((await f.request('/market', x)).data.total).toBe(0);
        expect((await f.request('/market?tab=inbox', x)).data.total).toBe(0);
        expect((await f.request('/market?tab=inbox', b)).data.total).toBe(1);
        expect((await f.request(`/market/${id}/buy`, s, { revision: 2 })).status).toBe(400);
        expect((await f.request(`/market/${id}/buy`, x, { revision: 1 })).status).toBe(403);
        expect((await f.request(`/market/${id}/buy`, b, { revision: 1 })).status).toBe(200);
      });
      it('returns escrow once after expiration and prevents duplicate listing submissions', async () => {
        const f = await fixture(),
          s = await f.auth('market_seller'),
          b = await f.auth('market_buyer'),
          requestId = randomUUID();
        const first = await f.list(s, { requestId });
        expect((await f.list(s, { requestId })).status).toBe(200);
        expect((await f.save(s)).state.inventory.herb).toBe(5);
        expect((await f.list(s, { requestId, price: 51 })).status).toBe(409);
        f.advance(8 * 86400000);
        const id = first.data.listing.id;
        expect((await f.request(`/market/${id}/buy`, b, { revision: 1 })).status).toBe(409);
        expect((await f.request(`/market/${id}/cancel`, b, { revision: 1 })).status).toBe(403);
        expect((await f.request(`/market/${id}/cancel`, s, { revision: 2 })).status).toBe(200);
        expect((await f.request(`/market/${id}/cancel`, s, { revision: 2 })).status).toBe(200);
        expect((await f.save(s)).state.inventory.herb).toBe(8);
      });
      it('rolls back full-bag purchases, then safely delivers uniquely identified gear', async () => {
        const f = await fixture(),
          full = initialState();
        full.bag = Array.from({ length: 114 }, (_, i) => ({
          uid: `g${i + 4}`,
          slot: 'ring' as const,
          rank: 0,
          level: 0,
        }));
        full.nextUid = 118;
        const s = await f.auth('market_seller'),
          b = await f.auth('market_buyer', full),
          id = (await f.list(s, { kind: 'gear', asset: 'g2', quantity: 1, price: 80 })).data.listing
            .id;
        expect((await f.request(`/market/${id}/buy`, b, { revision: 1 })).status).toBe(409);
        expect((await f.save(s)).state.stones).toBe(180);
        expect((await f.save(b)).state.stones).toBe(180);
        const c = await f.save(b);
        c.state.bag.pop();
        expect(
          (await f.request('/save', b, { revision: c.revision, state: c.state }, 'PUT')).status,
        ).toBe(200);
        const bought = await f.request(`/market/${id}/buy`, b, { revision: 2 });
        expect(bought.status).toBe(200);
        expect(bought.data.cloud.state.bag.at(-1)).toEqual({
          uid: 'g118',
          slot: 'ring',
          rank: 1,
          level: 0,
        });
      });
      it('halts orders from banned sellers without losing escrow, and rejects locked posting currencies', async () => {
        const f = await fixture(),
          seller = await f.auth('market_seller'),
          buyer = await f.auth('market_buyer');
        expect((await f.list(seller, { currency: 'immortal' })).status).toBe(403);
        expect((await f.list(seller, { currency: 'divine' })).status).toBe(403);
        const id = (await f.list(seller)).data.listing.id;
        await f.ban('market_seller');
        expect((await f.request('/market', buyer)).data.total).toBe(0);
        expect((await f.request(`/market/${id}/buy`, buyer, { revision: 1 })).status).toBe(403);
        expect((await f.save(buyer)).state.stones).toBe(180);
      });
      if (kind === 'postgres')
        it('serializes purchases across independent application pools during rolling deploys', async () => {
          const f = await fixture(),
            seller = await f.auth('market_seller'),
            one = await f.auth('buyer_one'),
            two = await f.auth('buyer_two');
          const peer = await f.replica(),
            id = (await f.list(seller)).data.listing.id;
          const results = await Promise.all([
            f.request(`/market/${id}/buy`, one, { revision: 1 }),
            peer(`/market/${id}/buy`, two, { revision: 1 }),
          ]);
          expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
          expect((await f.save(one)).state.stones + (await f.save(two)).state.stones).toBe(210);
          expect((await f.save(seller)).state.stones).toBe(327);
        });
      it('trades crafted talismans and harvested materials, and enforces higher-world currencies', async () => {
        const f = await fixture(),
          state = initialState();
        state.adventure.materials.moonleaf = 6;
        state.adventure.talismans.breath = 2;
        state.stage = 36;
        state.wallet.immortal = 10;
        const s = await f.auth('market_seller', state),
          b = await f.auth('market_buyer');
        const material = (
          await f.list(s, { kind: 'material', asset: 'moonleaf', quantity: 2, price: 10 })
        ).data.listing.id;
        expect(
          (await f.request(`/market/${material}/buy`, b, { revision: 1 })).data.cloud.state
            .adventure.materials.moonleaf,
        ).toBe(2);
        const charm = (
          await f.list(s, {
            kind: 'talisman',
            asset: 'breath',
            quantity: 1,
            price: 1,
            currency: 'immortal',
          })
        ).data.listing.id;
        expect((await f.request(`/market/${charm}/buy`, b, { revision: 2 })).status).toBe(403);
      });
    },
  );
