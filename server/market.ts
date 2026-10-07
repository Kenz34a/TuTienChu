import type express from 'express';
import type { Database } from './database.mjs';
import { decodeSave } from '../src/game/storage';
import { ITEMS } from '../src/game/data';
import { MATERIALS, TALISMANS } from '../src/game/ascension';
import type { GameState, ItemId } from '../src/game/types';
import type { MarketAsset, MarketCurrency, MarketListing } from '../src/game/market';
type Row = {
  id: string;
  seller_id: string;
  buyer_id: string | null;
  recipient_id: string | null;
  seller_name: string;
  buyer_name: string | null;
  kind: string;
  asset_key: string;
  asset_json: string;
  quantity: number;
  price: number;
  currency: MarketCurrency;
  status: MarketListing['status'];
  created_at: number;
  expires_at: number;
};
class MarketError extends Error {
  constructor(
    public status: number,
    message: string,
    public cloud?: unknown,
  ) {
    super(message);
  }
}
const reject = (message: string, status = 400): never => {
  throw new MarketError(status, message);
};
const balance = (s: GameState, c: MarketCurrency) => (c === 'spirit' ? s.stones : s.wallet[c]);
const change = (s: GameState, c: MarketCurrency, n: number) => {
  if (c === 'spirit') s.stones += n;
  else s.wallet[c] += n;
};
function grant(s: GameState, a: MarketAsset, n: number) {
  if (a.kind === 'gear') {
    if (s.bag.length >= 114) reject('Ba lô đã đầy. Dọn chỗ rồi thử lại.', 409);
    s.bag.push({ ...a.gear, uid: `g${s.nextUid++}` });
  } else if (a.kind === 'item') s.inventory[a.id] = (s.inventory[a.id] || 0) + n;
  else {
    const store = a.kind === 'material' ? s.adventure.materials : s.adventure.talismans;
    store[a.id] = (store[a.id] || 0) + n;
  }
  try {
    decodeSave(JSON.stringify(s));
  } catch {
    reject('Tài nguyên vượt giới hạn lưu trữ. Giao dịch chưa thực hiện.', 409);
  }
}
export async function attachMarket(
  app: express.Express,
  db: Database,
  now: () => number,
  authenticate: express.RequestHandler,
  updateProfile: (id: string, s: GameState) => Promise<void>,
) {
  await db.exec(`CREATE TABLE IF NOT EXISTS market_listings(id TEXT PRIMARY KEY,seller_id TEXT NOT NULL REFERENCES users(id),buyer_id TEXT REFERENCES users(id),recipient_id TEXT REFERENCES users(id),seller_name TEXT NOT NULL,buyer_name TEXT,kind TEXT NOT NULL,asset_key TEXT NOT NULL,asset_json TEXT NOT NULL,quantity INTEGER NOT NULL,price INTEGER NOT NULL,currency TEXT NOT NULL,status TEXT NOT NULL,created_at INTEGER NOT NULL,expires_at INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS market_open ON market_listings(status,created_at);
 CREATE INDEX IF NOT EXISTS market_seller ON market_listings(seller_id,status);
 CREATE INDEX IF NOT EXISTS market_buyer ON market_listings(buyer_id);`);
  const cloud = async (id: string) => {
    const r = (await db
      .prepare('SELECT revision,game_json,updated_at FROM saves WHERE user_id=?')
      .get(id))!;
    return {
      revision: Number(r.revision),
      state: r.game_json ? decodeSave(String(r.game_json)) : null,
      updatedAt: Number(r.updated_at),
    };
  };
  const character = async (id: string, revision?: unknown) => {
    const c = await cloud(id);
    if (!c.state) reject('Đăng nhập và đồng bộ nhân vật trước khi giao dịch.', 409);
    if (revision !== undefined && (!Number.isSafeInteger(revision) || revision !== c.revision))
      throw new MarketError(409, 'Bản lưu đã thay đổi. Chọn bản trên tài khoản rồi thử lại.', c);
    if (c.state!.battle || c.state!.training.active)
      reject('Xuất định và kết thúc chiến đấu trước khi giao dịch.', 409);
    return c.state!;
  };
  const save = async (id: string, s: GameState) => {
    try {
      decodeSave(JSON.stringify(s));
    } catch {
      reject('Giao dịch vượt giới hạn tài nguyên hoặc bản lưu.', 409);
    }
    await db
      .prepare('UPDATE saves SET game_json=?,revision=revision+1,updated_at=? WHERE user_id=?')
      .run(JSON.stringify(s), now(), id);
    await updateProfile(id, s);
  };
  const display = (r: Row, uid: string): MarketListing => ({
    id: r.id,
    asset: JSON.parse(r.asset_json),
    quantity: r.quantity,
    price: r.price,
    currency: r.currency,
    sellerName: r.seller_name,
    buyerName: r.buyer_name,
    createdAt: r.created_at,
    expiresAt: r.expires_at,
    status: r.status,
    self: r.seller_id === uid,
    private: !!r.recipient_id,
    canBuy:
      r.status === 'open' &&
      r.expires_at > now() &&
      r.seller_id !== uid &&
      (!r.recipient_id || r.recipient_id === uid),
    fee: Math.floor(r.price * r.quantity * 0.02),
  });
  const mutation =
    (
      fn: (req: express.Request, res: express.Response) => Promise<unknown>,
    ): express.RequestHandler =>
    async (req, res) => {
      try {
        const result = await db.transaction(() => fn(req, res));
        res.json(result);
      } catch (e) {
        if (e instanceof MarketError)
          res.status(e.status).json({ message: e.message, ...(e.cloud ? { cloud: e.cloud } : {}) });
        else throw e;
      }
    };
  app.get('/api/market', authenticate, async (req, res) => {
    const tab = req.query.tab || 'all',
      page = Number(req.query.page || 1),
      uid = String(res.locals.user.id);
    if (
      !['all', 'mine', 'inbox', 'history'].includes(String(tab)) ||
      !Number.isInteger(page) ||
      page < 1 ||
      page > 1000000
    )
      return res.status(400).json({ message: 'Trang giao dịch không hợp lệ.' });
    const where =
      tab === 'mine'
        ? "seller_id=? AND status='open'"
        : tab === 'inbox'
          ? "recipient_id=? AND status='open'"
          : tab === 'history'
            ? "(seller_id=? OR buyer_id=?) AND status<>'open'"
            : "status='open' AND expires_at>? AND recipient_id IS NULL AND seller_id NOT IN (SELECT user_id FROM user_controls WHERE banned=1)";
    const args = tab === 'all' ? [now()] : tab === 'history' ? [uid, uid] : [uid];
    const rows = await db
      .prepare(
        `SELECT * FROM market_listings WHERE ${where} ORDER BY created_at DESC,id DESC LIMIT 30 OFFSET ?`,
      )
      .all(...args, (page - 1) * 30);
    const total = (await db
      .prepare(`SELECT COUNT(*) AS n FROM market_listings WHERE ${where}`)
      .get(...args))!.n;
    res.json({
      listings: (rows as unknown as Row[]).map((r) => display(r, uid)),
      total: Number(total),
      page,
      serverTime: now(),
    });
  });
  app.post(
    '/api/market/list',
    authenticate,
    mutation(async (req, res) => {
      const { requestId, kind, asset, quantity, price, currency, revision } = req.body || {},
        uid = String(res.locals.user.id);
      const recipient =
        typeof req.body?.recipient === 'string' ? req.body.recipient.trim().toLowerCase() : '';
      if (
        typeof requestId !== 'string' ||
        !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(requestId) ||
        !['item', 'gear', 'material', 'talisman'].includes(kind) ||
        typeof asset !== 'string' ||
        asset.length > 40 ||
        !Number.isSafeInteger(quantity) ||
        quantity < 1 ||
        quantity > 100000 ||
        !Number.isSafeInteger(price) ||
        price < 1 ||
        !Number.isSafeInteger(price * quantity) ||
        price * quantity > 1e9 ||
        !['spirit', 'immortal', 'divine'].includes(currency) ||
        !Number.isSafeInteger(revision)
      )
        reject('Vật phẩm, số lượng hoặc giá không hợp lệ.');
      let recipientId: string | null = null;
      if (recipient) {
        if (!/^[a-z0-9_]{3,24}$/.test(recipient)) reject('Tên tài khoản người nhận không hợp lệ.');
        const user = await db
          .prepare(
            'SELECT id FROM users WHERE username=? AND id NOT IN (SELECT user_id FROM user_controls WHERE banned=1)',
          )
          .get(recipient);
        if (!user || user.id === uid) reject('Người nhận chưa tồn tại, bị khóa hoặc là chính bạn.');
        recipientId = String(user!.id);
      }
      const old = (await db
        .prepare('SELECT * FROM market_listings WHERE id=?')
        .get(requestId)) as unknown as Row | undefined;
      if (old) {
        if (
          old.seller_id !== uid ||
          old.kind !== kind ||
          old.asset_key !== asset ||
          old.quantity !== quantity ||
          old.price !== price ||
          old.currency !== currency ||
          old.recipient_id !== recipientId
        )
          reject('Mã yêu cầu đã dùng cho một giao dịch khác.', 409);
        return { cloud: await cloud(uid), listing: display(old, uid) };
      }
      const s = await character(uid, revision);
      if ((currency === 'immortal' && s.stage < 36) || (currency === 'divine' && s.stage < 64))
        reject('Chưa mở khóa loại thạch này.', 403);
      const count = (await db
        .prepare("SELECT COUNT(*) AS n FROM market_listings WHERE seller_id=? AND status='open'")
        .get(uid))!;
      if (Number(count.n) >= 20)
        reject('Tối đa 20 đơn đang ký gửi. Hãy bán hoặc thu hồi đơn cũ.', 409);
      let goods: MarketAsset;
      if (kind === 'gear') {
        if (quantity !== 1) reject('Trang bị chỉ ký gửi từng món.');
        const gear = s.bag.find((g) => g.uid === asset);
        if (!gear) reject('Trang bị không nằm trong ba lô. Tháo trang bị đang dùng trước.');
        goods = { kind: 'gear', gear: { slot: gear!.slot, rank: gear!.rank, level: gear!.level } };
        s.bag = s.bag.filter((g) => g.uid !== asset);
      } else if (kind === 'item') {
        if (!Object.hasOwn(ITEMS, asset) || (s.inventory[asset as ItemId] || 0) < quantity)
          reject('Không đủ vật phẩm để ký gửi.');
        goods = { kind: 'item', id: asset as ItemId };
        s.inventory[asset as ItemId] = (s.inventory[asset as ItemId] || 0) - quantity;
      } else {
        const catalog = kind === 'material' ? MATERIALS : TALISMANS,
          store = kind === 'material' ? s.adventure.materials : s.adventure.talismans;
        if (!catalog.some((m) => m.id === asset) || (store[asset] || 0) < quantity)
          reject('Không đủ nguyên liệu hoặc phù lục để ký gửi.');
        if (kind === 'talisman' && s.stage < TALISMANS.find((t) => t.id === asset)!.minStage)
          reject('Chưa đủ tu vi giao dịch phù lục.');
        goods = { kind, id: asset };
        store[asset] -= quantity;
      }
      const time = now();
      await db
        .prepare(
          'INSERT INTO market_listings(id,seller_id,recipient_id,seller_name,kind,asset_key,asset_json,quantity,price,currency,status,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',
        )
        .run(
          requestId,
          uid,
          recipientId,
          s.name,
          kind,
          asset,
          JSON.stringify(goods),
          quantity,
          price,
          currency,
          'open',
          time,
          time + 7 * 86400000,
        );
      await save(uid, s);
      const row = (await db
        .prepare('SELECT * FROM market_listings WHERE id=?')
        .get(requestId)) as unknown as Row;
      return { cloud: await cloud(uid), listing: display(row, uid) };
    }),
  );
  app.post(
    '/api/market/:id/buy',
    authenticate,
    mutation(async (req, res) => {
      const uid = String(res.locals.user.id),
        r = (await db
          .prepare('SELECT * FROM market_listings WHERE id=?')
          .get(String(req.params.id))) as unknown as Row | undefined;
      if (!r) reject('Đơn giao dịch không tồn tại.', 404);
      if (r!.buyer_id === uid && r!.status === 'sold')
        return { cloud: await cloud(uid), listing: display(r!, uid) };
      if (r!.seller_id === uid) reject('Không thể mua đơn của chính mình.');
      if (r!.recipient_id && r!.recipient_id !== uid)
        reject('Đơn này dành riêng cho một đạo hữu khác.', 403);
      if (r!.status !== 'open' || r!.expires_at <= now())
        reject('Đơn đã bán, thu hồi hoặc hết hạn.', 409);
      if (
        (await db.prepare('SELECT banned FROM user_controls WHERE user_id=?').get(r!.seller_id))
          ?.banned
      )
        reject('Người bán đang bị khóa. Giao dịch tạm dừng.', 403);
      if (!Number.isSafeInteger(req.body?.revision)) reject('Cần phiên bản bản lưu hiện tại.');
      const buyer = await character(uid, req.body.revision);
      // The seller may be offline or training: currency credit uses their latest canonical save.
      const sellerCloud = await cloud(r!.seller_id);
      if (!sellerCloud.state) reject('Nhân vật người bán không còn khả dụng.', 409);
      const seller = sellerCloud.state!,
        total = r!.price * r!.quantity,
        fee = Math.floor(total * 0.02),
        asset = JSON.parse(r!.asset_json) as MarketAsset;
      if (
        (r!.currency === 'immortal' && buyer.stage < 36) ||
        (r!.currency === 'divine' && buyer.stage < 64)
      )
        reject('Chưa mở khóa loại thạch của đơn này.', 403);
      if (balance(buyer, r!.currency) < total) reject('Không đủ thạch để mua toàn bộ đơn.', 409);
      if (
        asset.kind === 'talisman' &&
        buyer.stage < TALISMANS.find((t) => t.id === asset.id)!.minStage
      )
        reject('Chưa đủ tu vi nhận phù lục.', 403);
      change(buyer, r!.currency, -total);
      grant(buyer, asset, r!.quantity);
      change(seller, r!.currency, total - fee);
      buyer.adventure.marketTrades++;
      seller.adventure.marketTrades++;
      const receipt = `Vạn Bảo Các: giao dịch ${r!.quantity} món · ${total} thạch · phí ${fee}.`;
      for (const state of [buyer, seller])
        state.events = [
          { id: (state.events[0]?.id || 0) + 1, text: receipt, type: 'gain' as const, time: now() },
          ...state.events,
        ].slice(0, 60);
      await save(uid, buyer);
      await save(r!.seller_id, seller);
      await db
        .prepare(
          "UPDATE market_listings SET status='sold',buyer_id=?,buyer_name=? WHERE id=? AND status='open'",
        )
        .run(uid, buyer.name, r!.id);
      const row = (await db
        .prepare('SELECT * FROM market_listings WHERE id=?')
        .get(r!.id)) as unknown as Row;
      return { cloud: await cloud(uid), listing: display(row, uid) };
    }),
  );
  app.post(
    '/api/market/:id/cancel',
    authenticate,
    mutation(async (req, res) => {
      const uid = String(res.locals.user.id),
        r = (await db
          .prepare('SELECT * FROM market_listings WHERE id=?')
          .get(String(req.params.id))) as unknown as Row | undefined;
      if (!r || r.seller_id !== uid) reject('Chỉ người ký gửi được thu hồi đơn.', 403);
      if (r!.status === 'cancelled') return { cloud: await cloud(uid), listing: display(r!, uid) };
      if (r!.status !== 'open') reject('Đơn đã được giao cho người mua.', 409);
      if (!Number.isSafeInteger(req.body?.revision)) reject('Cần phiên bản bản lưu hiện tại.');
      const s = await character(uid, req.body.revision);
      grant(s, JSON.parse(r!.asset_json), r!.quantity);
      await save(uid, s);
      await db.prepare("UPDATE market_listings SET status='cancelled' WHERE id=?").run(r!.id);
      const row = (await db
        .prepare('SELECT * FROM market_listings WHERE id=?')
        .get(r!.id)) as unknown as Row;
      return { cloud: await cloud(uid), listing: display(row, uid) };
    }),
  );
}
