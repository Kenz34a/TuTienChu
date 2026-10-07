import type express from 'express';
import type { Database } from './database.mjs';
import { randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';
import { decodeSave } from '../src/game/storage';
import { grantReward, type GiftReward } from '../src/game/gifts';
import { ITEMS, SLOTS } from '../src/game/data';
import { MAX_STAGE } from '../src/game/stages';
import type { GameState } from '../src/game/types';
import type { Administration } from './admin-core';
class RequestError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
function fail(status: number, message: string): never {
  throw new RequestError(status, message);
}
const integer = (v: unknown, max = 1e6) =>
  Number.isSafeInteger(v) && Number(v) >= 0 && Number(v) <= max;
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const codeText = (v: unknown) => (typeof v === 'string' ? v.trim().toUpperCase() : '');
function reward(value: unknown): GiftReward {
  if (
    !object(value) ||
    Object.keys(value).some(
      (k) => !['stones', 'immortal', 'divine', 'lingqi', 'items', 'gear'].includes(k),
    )
  )
    fail(400, 'Phần thưởng không hợp lệ.');
  const r: GiftReward = {};
  for (const key of ['stones', 'immortal', 'divine', 'lingqi'] as const) {
    if (value[key] !== undefined && !integer(value[key]))
      fail(400, 'Số lượng thạch/linh khí từ 0 đến 1.000.000.');
    if (Number(value[key]) > 0) r[key] = Number(value[key]);
  }
  if (value.items !== undefined) {
    if (
      !object(value.items) ||
      Object.entries(value.items).some(([k, v]) => !Object.hasOwn(ITEMS, k) || !integer(v, 10000))
    )
      fail(400, 'Vật phẩm hoặc số lượng không hợp lệ.');
    r.items = Object.fromEntries(Object.entries(value.items).filter(([, v]) => Number(v) > 0));
  }
  if (value.gear !== undefined) {
    const g = value.gear;
    if (
      !object(g) ||
      Object.keys(g).some((k) => !['slot', 'rank', 'level'].includes(k)) ||
      !SLOTS.some((s) => s.id === g.slot) ||
      !integer(g.rank, 8) ||
      !integer(g.level, 10)
    )
      fail(400, 'Trang bị không hợp lệ.');
    r.gear = g as unknown as GiftReward['gear'];
  }
  if (
    !r.gear &&
    !Object.values(r).some((v) => (typeof v === 'number' ? v > 0 : Object.keys(v).length > 0))
  )
    fail(400, 'Cần ít nhất một phần thưởng.');
  return r;
}
export async function attachAdmin(
  app: express.Express,
  db: Database,
  now: () => number,
  authenticate: express.RequestHandler,
  core: Administration,
  updateProfile: (id: string, s: GameState) => Promise<void>,
  bosses: {
    list: () => Promise<unknown[]>;
    control: (id: string, action: string) => Promise<unknown>;
  },
  throttle: (key: string, limit: number) => boolean,
  presence: Map<
    string,
    {
      userId: string;
      seenAt: number;
    }
  >,
) {
  await db.exec(`CREATE TABLE IF NOT EXISTS gift_codes(id INTEGER PRIMARY KEY AUTOINCREMENT,code TEXT NOT NULL UNIQUE,label TEXT NOT NULL,reward_json TEXT NOT NULL,min_stage INTEGER NOT NULL,max_claims INTEGER,claims INTEGER NOT NULL DEFAULT 0,starts_at INTEGER NOT NULL,expires_at INTEGER,enabled INTEGER NOT NULL DEFAULT 1,created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS gift_redemptions(code_id INTEGER NOT NULL REFERENCES gift_codes(id),user_id TEXT NOT NULL REFERENCES users(id),redeemed_at INTEGER NOT NULL,PRIMARY KEY(code_id,user_id));
    CREATE INDEX IF NOT EXISTS gift_receipts_user ON gift_redemptions(user_id,redeemed_at DESC);`);
  const transaction = <T>(fn: () => T | Promise<T>): Promise<T> => db.transaction(fn);
  const revokeSessions = async (id: string) => {
    await db.prepare('DELETE FROM sessions WHERE user_id=?').run(id);
    for (const [token, p] of presence) if (p.userId === id) presence.delete(token);
  };
  const safe =
    (fn: express.RequestHandler): express.RequestHandler =>
    (req, res, next) => {
      Promise.resolve()
        .then(() => fn(req, res, next))
        .catch((e) =>
          e instanceof RequestError ? res.status(e.status).json({ message: e.message }) : next(e),
        );
    };
  const paged = (req: express.Request) => {
    const page = Number(req.query.page || 1);
    if (!integer(page, 100000) || page < 1) fail(400, 'Trang không hợp lệ.');
    return { page, offset: (page - 1) * 25 };
  };
  const gift = (r: Record<string, unknown>) => ({
    id: r.id,
    code: r.code,
    label: r.label,
    reward: JSON.parse(String(r.reward_json)),
    minStage: r.min_stage,
    maxClaims: r.max_claims,
    claims: r.claims,
    startsAt: r.starts_at,
    expiresAt: r.expires_at,
    enabled: !!r.enabled,
    createdAt: r.created_at,
  });
  const user = async (id: string) => {
    const u = (await db.prepare('SELECT id,username FROM users WHERE id=?').get(id)) as
      | {
          id: string;
          username: string;
        }
      | undefined;
    if (!u) fail(404, 'Không tìm thấy tài khoản.');
    return u;
  };
  const saved = async (id: string) => {
    const r = (await db
      .prepare('SELECT revision,game_json,updated_at FROM saves WHERE user_id=?')
      .get(id)) as {
      revision: number;
      game_json: string | null;
      updated_at: number;
    };
    return {
      revision: r.revision,
      state: r.game_json ? decodeSave(r.game_json) : null,
      updatedAt: r.updated_at,
    };
  };
  const updateSave = async (
    id: string,
    revision: unknown,
    value: unknown,
    actor: string,
    action: string,
  ) =>
    await transaction(async () => {
      const before = await saved(id);
      if (!integer(revision, 1e12) || revision !== before.revision)
        fail(409, 'Nhân vật đã thay đổi. Tải lại trước khi sửa.');
      let state: GameState;
      try {
        state = decodeSave(JSON.stringify(value));
      } catch {
        return fail(400, 'Bản lưu không hợp lệ. Chưa thay đổi nhân vật.');
      }
      const encoded = JSON.stringify(state),
        time = now();
      await db
        .prepare(
          'UPDATE saves SET revision=revision+1,game_json=?,updated_at=? WHERE user_id=? AND revision=?',
        )
        .run(encoded, time, id, revision as number);
      await updateProfile(id, state);
      await core.audit(
        actor,
        action,
        id,
        'Cập nhật nhân vật',
        before.state ? JSON.stringify(before.state) : undefined,
        encoded,
      );
      return { revision: before.revision + 1, state, updatedAt: time };
    });
  app.get('/api/server-status', async (_req, res) => res.json(await core.status()));
  app.get('/api/giftcodes/history', authenticate, async (_req, res) =>
    res.json({
      receipts: (
        await db
          .prepare(
            'SELECT g.code,g.label,g.reward_json,r.redeemed_at FROM gift_redemptions r JOIN gift_codes g ON g.id=r.code_id WHERE r.user_id=? ORDER BY r.redeemed_at DESC LIMIT 100',
          )
          .all(res.locals.user.id)
      ).map((r) => ({
        code: r.code,
        label: r.label,
        reward: JSON.parse(String(r.reward_json)),
        time: r.redeemed_at,
      })),
    }),
  );
  app.post(
    '/api/giftcodes/redeem',
    authenticate,
    safe(async (req, res) => {
      const id = res.locals.user.id,
        code = codeText(req.body?.code);
      if (!throttle(`gift:${id}`, 40)) fail(429, 'Thử giftcode quá nhiều lần. Hãy đợi 15 phút.');
      if (!/^[A-Z0-9_-]{3,40}$/.test(code))
        fail(400, 'Giftcode gồm 3–40 chữ không dấu, số, _ hoặc -.');
      const result = await transaction(async () => {
        const g = await db.prepare('SELECT * FROM gift_codes WHERE code=?').get(code);
        if (!g) fail(404, 'Giftcode không tồn tại.');
        if (
          await db
            .prepare('SELECT 1 FROM gift_redemptions WHERE code_id=? AND user_id=?')
            .get(g.id as number, id)
        )
          fail(409, 'Tài khoản đã nhận giftcode này.');
        const time = now();
        if (!g.enabled || time < Number(g.starts_at)) fail(409, 'Giftcode chưa mở hoặc đã bị tắt.');
        if (g.expires_at !== null && time >= Number(g.expires_at))
          fail(410, 'Giftcode đã hết hạn.');
        if (g.max_claims !== null && Number(g.claims) >= Number(g.max_claims))
          fail(410, 'Giftcode đã hết lượt nhận.');
        const old = await saved(id);
        if (!old.state) fail(409, 'Đồng bộ nhân vật trước khi nhận giftcode.');
        if (!integer(req.body?.revision, 1e12) || req.body.revision !== old.revision)
          fail(409, 'Tiến trình đã thay đổi. Đồng bộ rồi nhận lại.');
        if (old.state.stage < Number(g.min_stage)) fail(403, 'Chưa đủ tu vi để nhận mã này.');
        const r = reward(JSON.parse(String(g.reward_json)));
        try {
          grantReward(old.state, r);
        } catch (e) {
          fail(409, e instanceof Error ? e.message : 'Không đủ chỗ nhận quà.');
        }
        old.state.events = [
          {
            id: (old.state.events[0]?.id || 0) + 1,
            text: `Nhận giftcode ${code}: ${String(g.label)}.`,
            type: 'gain' as const,
            time,
          },
          ...old.state.events,
        ].slice(0, 60);
        let state: GameState;
        try {
          state = decodeSave(JSON.stringify(old.state));
        } catch {
          return fail(409, 'Tài nguyên đã đạt giới hạn. Hãy dùng bớt rồi nhận lại.');
        }
        await db
          .prepare('UPDATE saves SET revision=revision+1,game_json=?,updated_at=? WHERE user_id=?')
          .run(JSON.stringify(state), time, id);
        await db
          .prepare('INSERT INTO gift_redemptions VALUES(?,?,?)')
          .run(g.id as number, id, time);
        await db.prepare('UPDATE gift_codes SET claims=claims+1 WHERE id=?').run(g.id as number);
        await updateProfile(id, state);
        return {
          cloud: { revision: old.revision + 1, state, updatedAt: time },
          receipt: { code, label: g.label, reward: r, time },
        };
      });
      res.json(result);
    }),
  );
  app.use('/api/admin', authenticate, async (_req, res, next) =>
    (await core.isAdmin(res.locals.user.id))
      ? next()
      : res.status(403).json({ message: 'Tài khoản không có quyền quản trị máy chủ.' }),
  );
  app.get('/api/admin/overview', async (_req, res) => {
    const count = async (table: string) =>
      Number((await db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get())!.n);
    res.json({
      user: res.locals.user,
      accounts: await count('users'),
      characters: await count('profiles'),
      codes: await count('gift_codes'),
      claims: await count('gift_redemptions'),
      banned: Number(
        (await db.prepare('SELECT COUNT(*) AS n FROM user_controls WHERE banned=1').get())!.n,
      ),
      server: await core.status(),
    });
  });
  app.get(
    '/api/admin/giftcodes',
    safe(async (req, res) => {
      const p = paged(req);
      res.json({
        page: p.page,
        total: (await db.prepare('SELECT COUNT(*) AS n FROM gift_codes').get())!.n,
        codes: (
          await db
            .prepare('SELECT * FROM gift_codes ORDER BY id DESC LIMIT 25 OFFSET ?')
            .all(p.offset)
        ).map(gift),
      });
    }),
  );
  app.post(
    '/api/admin/giftcodes',
    safe(async (req, res) => {
      const code =
        req.body?.code === undefined || req.body.code === ''
          ? `VAN-${randomBytes(5).toString('hex').toUpperCase()}`
          : codeText(req.body.code);
      const b = req.body,
        label = typeof b?.label === 'string' ? b.label.trim() : '';
      if (!/^[A-Z0-9_-]{3,40}$/.test(code) || !label || label.length > 80)
        fail(400, 'Mã 3–40 ký tự; tên quà 1–80 ký tự.');
      const r = reward(b.reward),
        starts = b.startsAt ?? now(),
        expires = b.expiresAt ?? null,
        max = b.maxClaims ?? null,
        min = b.minStage ?? 0;
      if (
        !integer(starts, 1e15) ||
        !integer(min, MAX_STAGE) ||
        (expires !== null && (!integer(expires, 1e15) || expires <= Math.max(starts, now()))) ||
        (max !== null && (!integer(max) || max < 1))
      )
        fail(400, 'Thời hạn, tu vi hoặc giới hạn lượt nhận không hợp lệ.');
      const g = await transaction(async () => {
        if (await db.prepare('SELECT 1 FROM gift_codes WHERE code=?').get(code))
          fail(409, 'Giftcode đã tồn tại; không thể tái dùng mã cũ.');
        const row = (await db
          .prepare(
            'INSERT INTO gift_codes(code,label,reward_json,min_stage,max_claims,starts_at,expires_at,created_at) VALUES(?,?,?,?,?,?,?,?) RETURNING *',
          )
          .get(code, label, JSON.stringify(r), min, max, starts, expires, now()))!;
        await core.audit(res.locals.user.username, 'gift-create', String(row.id), code);
        return gift(row);
      });
      res.status(201).json(g);
    }),
  );
  app.post(
    '/api/admin/giftcodes/:id/status',
    safe(async (req, res) => {
      if (typeof req.body?.enabled !== 'boolean') fail(400, 'Trạng thái không hợp lệ.');
      const row = await transaction(async () => {
        const g = await db
          .prepare('UPDATE gift_codes SET enabled=? WHERE id=? RETURNING *')
          .get(Number(req.body.enabled), String(req.params.id));
        if (!g) fail(404, 'Không tìm thấy mã.');
        await core.audit(
          res.locals.user.username,
          'gift-status',
          String(g.id),
          req.body.enabled ? 'Mở mã' : 'Tắt mã',
        );
        return gift(g);
      });
      res.json(row);
    }),
  );
  app.get(
    '/api/admin/redemptions',
    safe(async (req, res) => {
      const p = paged(req);
      res.json({
        page: p.page,
        total: (await db.prepare('SELECT COUNT(*) AS n FROM gift_redemptions').get())!.n,
        receipts: await db
          .prepare(
            'SELECT g.code,g.label,u.username,r.redeemed_at AS time FROM gift_redemptions r JOIN gift_codes g ON g.id=r.code_id JOIN users u ON u.id=r.user_id ORDER BY r.redeemed_at DESC,r.code_id DESC LIMIT 25 OFFSET ?',
          )
          .all(p.offset),
      });
    }),
  );
  app.get(
    '/api/admin/players',
    safe(async (req, res) => {
      const p = paged(req),
        raw = typeof req.query.search === 'string' ? req.query.search : '';
      if (raw.length > 80) fail(400, 'Tìm kiếm quá dài.');
      const search = '%' + raw.replace(/[\\%_]/g, '\\$&') + '%',
        where = "WHERE u.username LIKE ? ESCAPE '\\' OR p.name LIKE ? ESCAPE '\\'";
      res.json({
        page: p.page,
        total: (await db
          .prepare(
            `SELECT COUNT(*) AS n FROM users u LEFT JOIN profiles p ON p.user_id=u.id ${where}`,
          )
          .get(search, search))!.n,
        players: await db
          .prepare(
            `SELECT u.id,u.username,p.name,p.stage,s.updated_at AS updatedAt,COALESCE(c.banned,0) AS banned,COALESCE(c.reason,'') AS reason,COALESCE(r.role,'player') AS role FROM users u LEFT JOIN profiles p ON p.user_id=u.id LEFT JOIN saves s ON s.user_id=u.id LEFT JOIN user_controls c ON c.user_id=u.id LEFT JOIN user_roles r ON r.user_id=u.id ${where} ORDER BY u.created_at DESC,u.id LIMIT 25 OFFSET ?`,
          )
          .all(search, search, p.offset),
      });
    }),
  );
  app.get(
    '/api/admin/players/:id',
    safe(async (req, res) => {
      const u = await user(String(req.params.id));
      res.json({
        user: {
          ...u,
          role: (await core.isAdmin(u.id)) ? 'admin' : 'player',
          ...(await core.ban(u.id)),
        },
        cloud: await saved(u.id),
      });
    }),
  );
  app.put(
    '/api/admin/players/:id/save',
    safe(async (req, res) => {
      const u = await user(String(req.params.id));
      res.json(
        await updateSave(
          u.id,
          req.body?.revision,
          req.body?.state,
          res.locals.user.username,
          'player-save',
        ),
      );
    }),
  );
  app.post(
    '/api/admin/players/:id/grant',
    safe(async (req, res) => {
      const u = await user(String(req.params.id)),
        before = await saved(u.id);
      if (!before.state) fail(409, 'Người chơi chưa đồng bộ nhân vật.');
      const r = reward(req.body?.reward),
        state = structuredClone(before.state);
      try {
        grantReward(state, r);
      } catch (e) {
        return fail(409, e instanceof Error ? e.message : 'Không đủ chỗ nhận quà.');
      }
      if (req.body?.xp !== undefined) {
        if (!integer(req.body.xp, 1e12)) fail(400, 'Tu vi không hợp lệ.');
        state.xp += req.body.xp;
      }
      res.json(
        await updateSave(u.id, req.body?.revision, state, res.locals.user.username, 'player-grant'),
      );
    }),
  );
  app.post(
    '/api/admin/players/:id/control',
    safe(async (req, res) => {
      const u = await user(String(req.params.id)),
        b = req.body;
      if (typeof b?.banned !== 'boolean' || typeof b.reason !== 'string' || b.reason.length > 200)
        fail(400, 'Trạng thái khóa hoặc lý do không hợp lệ.');
      await transaction(async () => {
        if (
          b.banned &&
          (await core.isAdmin(u.id)) &&
          !(await core.ban(u.id))?.banned &&
          Number(
            (await db
              .prepare(
                'SELECT COUNT(*) AS n FROM user_roles r LEFT JOIN user_controls c ON c.user_id=r.user_id WHERE COALESCE(c.banned,0)=0',
              )
              .get())!.n,
          ) <= 1
        )
          fail(409, 'Không thể khóa admin cuối cùng.');
        await db
          .prepare(
            'INSERT INTO user_controls VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET banned=excluded.banned,reason=excluded.reason',
          )
          .run(u.id, Number(b.banned), b.reason.trim());
        if (b.banned) await revokeSessions(u.id);
        await core.audit(
          res.locals.user.username,
          'player-ban',
          u.id,
          b.banned ? `Khóa: ${b.reason}` : 'Mở khóa',
        );
      });
      res.json({ ok: true });
    }),
  );
  app.post(
    '/api/admin/players/:id/role',
    safe(async (req, res) => {
      const u = await user(String(req.params.id)),
        role = req.body?.role;
      if (!['admin', 'player'].includes(role)) fail(400, 'Quyền không hợp lệ.');
      await transaction(async () => {
        if (role === 'admin' && (await core.ban(u.id))?.banned)
          fail(409, 'Mở khóa tài khoản trước khi cấp quyền.');
        if (
          role === 'player' &&
          (await core.isAdmin(u.id)) &&
          !(await core.ban(u.id))?.banned &&
          Number(
            (await db
              .prepare(
                'SELECT COUNT(*) AS n FROM user_roles r LEFT JOIN user_controls c ON c.user_id=r.user_id WHERE COALESCE(c.banned,0)=0',
              )
              .get())!.n,
          ) <= 1
        )
          fail(409, 'Không thể gỡ admin cuối cùng.');
        if (role === 'admin')
          await db.prepare("INSERT OR IGNORE INTO user_roles VALUES(?,'admin')").run(u.id);
        else await db.prepare('DELETE FROM user_roles WHERE user_id=?').run(u.id);
        await core.audit(res.locals.user.username, 'player-role', u.id, role);
      });
      res.json({ ok: true });
    }),
  );
  app.post(
    '/api/admin/players/:id/sessions',
    safe(async (req, res) => {
      const u = await user(String(req.params.id));
      await transaction(async () => {
        await revokeSessions(u.id);
        await core.audit(
          res.locals.user.username,
          'player-sessions',
          u.id,
          'Thu hồi mọi phiên đăng nhập',
        );
      });
      res.json({ ok: true });
    }),
  );
  app.post(
    '/api/admin/players/:id/password',
    safe(async (req, res) => {
      const u = await user(String(req.params.id)),
        password = req.body?.password;
      if (typeof password !== 'string' || password.length < 10 || password.length > 128)
        fail(400, 'Mật khẩu mới cần 10–128 ký tự.');
      const salt = randomBytes(16).toString('hex'),
        hash = (await promisify(scrypt)(password, salt, 64)) as Buffer;
      if (!(await core.isAdmin(res.locals.user.id)) || (await core.ban(res.locals.user.id))?.banned)
        fail(403, 'Quyền quản trị đã thay đổi.');
      await transaction(async () => {
        await db
          .prepare('UPDATE users SET salt=?,password_hash=? WHERE id=?')
          .run(salt, hash.toString('hex'), u.id);
        await revokeSessions(u.id);
        await core.audit(
          res.locals.user.username,
          'player-password',
          u.id,
          'Đổi mật khẩu và thu hồi phiên; không ghi mật khẩu vào nhật ký.',
        );
      });
      res.json({ ok: true });
    }),
  );
  app.put(
    '/api/admin/server',
    safe(async (req, res) => {
      if (
        typeof req.body?.maintenance !== 'boolean' ||
        typeof req.body.message !== 'string' ||
        req.body.message.length > 500 ||
        !integer(req.body.revision, 1e12)
      )
        fail(400, 'Cấu hình không hợp lệ.');
      await transaction(async () => {
        const before = await core.status();
        if (before.revision !== req.body.revision)
          fail(409, 'Cấu hình đã đổi. Tải lại trước khi lưu.');
        await db
          .prepare(
            'UPDATE server_settings SET maintenance=?,message=?,revision=revision+1,updated_at=? WHERE id=1',
          )
          .run(Number(req.body.maintenance), req.body.message.trim(), now());
        await core.audit(
          res.locals.user.username,
          'server-settings',
          'server',
          req.body.maintenance ? 'Bật bảo trì' : 'Cập nhật thông báo',
          JSON.stringify(before),
          JSON.stringify(await core.status()),
        );
      });
      res.json(await core.status());
    }),
  );
  app.get('/api/admin/bosses', async (_req, res) => res.json({ bosses: await bosses.list() }));
  app.post(
    '/api/admin/bosses/:id',
    safe(async (req, res) => {
      const action = req.body?.action;
      if (!['respawn', 'defeat', 'heal'].includes(action)) fail(400, 'Lệnh boss không hợp lệ.');
      const result = await transaction(async () => {
        const b = await bosses.control(String(req.params.id), action);
        if (!b) fail(404, 'Boss không tồn tại.');
        await core.audit(res.locals.user.username, 'boss-control', String(req.params.id), action);
        return b;
      });
      res.json(result);
    }),
  );
  app.get('/api/admin/chat', async (_req, res) =>
    res.json({
      messages: await db
        .prepare(
          'SELECT c.id,u.username,c.name,c.world,c.body,c.created_at AS time FROM chat_messages c JOIN users u ON u.id=c.user_id ORDER BY c.id DESC LIMIT 100',
        )
        .all(),
    }),
  );
  app.post(
    '/api/admin/chat/:id/remove',
    safe(async (req, res) => {
      await transaction(async () => {
        const row = await db
          .prepare('SELECT id,body FROM chat_messages WHERE id=?')
          .get(String(req.params.id));
        if (!row) fail(404, 'Tin nhắn đã được gỡ.');
        await db.prepare('DELETE FROM chat_messages WHERE id=?').run(row.id as number);
        await core.audit(res.locals.user.username, 'chat-remove', String(row.id), String(row.body));
      });
      res.json({ ok: true });
    }),
  );
  app.get(
    '/api/admin/audit',
    safe(async (req, res) => {
      const p = paged(req);
      res.json({
        page: p.page,
        total: (await db.prepare('SELECT COUNT(*) AS n FROM admin_audit').get())!.n,
        entries: await db
          .prepare(
            "SELECT id,actor,action,target,details,created_at AS time,(before_json IS NOT NULL AND action IN ('player-save','player-grant','player-restore')) AS restorable FROM admin_audit ORDER BY id DESC LIMIT 25 OFFSET ?",
          )
          .all(p.offset),
      });
    }),
  );
  app.post(
    '/api/admin/audit/:id/restore',
    safe(async (req, res) => {
      const row = await db
        .prepare(
          "SELECT target,before_json FROM admin_audit WHERE id=? AND action IN ('player-save','player-grant','player-restore')",
        )
        .get(String(req.params.id));
      if (!row?.before_json) fail(404, 'Mục này không có bản lưu nhân vật để khôi phục.');
      await user(String(row.target));
      res.json(
        await updateSave(
          String(row.target),
          req.body?.revision,
          JSON.parse(String(row.before_json)),
          res.locals.user.username,
          'player-restore',
        ),
      );
    }),
  );
}
