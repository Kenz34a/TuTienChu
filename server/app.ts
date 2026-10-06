import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { decodeSave } from '../src/game/storage';
import { attachCommunity } from './community';
import { attachChat } from './chat';

const derive = promisify(scrypt);
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000;
type SaveRow = { revision: number; game_json: string | null; updated_at: number };

export function createApp(options: {
  databasePath: string;
  staticDir?: string;
  apkPath?: string;
  pcPath?: string;
  allowedOrigins?: string[];
  now?: () => number;
}) {
  const now = options.now || Date.now;
  if (options.databasePath !== ':memory:')
    mkdirSync(dirname(resolve(options.databasePath)), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(options.databasePath);
  db.exec(`PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, salt TEXT NOT NULL, password_hash TEXT NOT NULL, created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS saves (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, revision INTEGER NOT NULL DEFAULT 0, game_json TEXT, updated_at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);`);
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  const origins = new Set([
    'https://localhost',
    'http://localhost',
    'capacitor://localhost',
    'vantien://app',
    ...(options.allowedOrigins || []),
  ]);
  app.use((req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'same-origin',
      'X-Frame-Options': 'DENY',
    });
    if (!req.path.startsWith('/api/'))
      res.set(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
      );
    next();
  });
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    const origin = req.get('origin');
    if (origin && !origins.has(origin) && origin !== `${req.protocol}://${req.get('host')}`)
      return res
        .status(403)
        .json({ error: 'ORIGIN_DENIED', message: 'Địa chỉ web này chưa được cho phép kết nối.' });
    if (origin)
      res.set({
        'Access-Control-Allow-Origin': origin,
        Vary: 'Origin',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      });
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });
  app.use(express.json({ limit: '300kb' }));
  const buckets = new Map<string, { count: number; until: number }>();
  const presence = new Map<string, { userId: string; seenAt: number }>();
  function throttle(key: string, limit: number) {
    const time = now(),
      old = buckets.get(key);
    if (buckets.size > 10000)
      for (const [id, bucket] of buckets) if (bucket.until <= time) buckets.delete(id);
    const bucket = old && old.until > time ? old : { count: 0, until: time + 15 * 60000 };
    bucket.count++;
    buckets.set(key, bucket);
    return bucket.count <= limit;
  }
  const cloudSave = (userId: string) => {
    const row = db
      .prepare('SELECT revision, game_json, updated_at FROM saves WHERE user_id = ?')
      .get(userId) as SaveRow;
    return {
      revision: row.revision,
      state: row.game_json ? JSON.parse(row.game_json) : null,
      updatedAt: row.updated_at,
    };
  };
  const session = (userId: string, username: string) => {
    const token = randomBytes(32).toString('base64url');
    db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now());
    db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(
      digest(token),
      userId,
      now() + SESSION_DURATION,
    );
    presence.set(digest(token), { userId, seenAt: now() });
    return { token, user: { id: userId, username }, cloud: cloudSave(userId) };
  };
  const authenticate: express.RequestHandler = (req, res, next) => {
    const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.get('authorization') || '');
    const row = match
      ? db
          .prepare(
            'SELECT users.id, users.username FROM sessions JOIN users ON users.id = sessions.user_id WHERE token_hash = ? AND expires_at > ?',
          )
          .get(digest(match[1]), now())
      : undefined;
    if (!row)
      return res.status(401).json({
        error: 'UNAUTHENTICATED',
        message: 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.',
      });
    res.locals.user = row;
    res.locals.tokenHash = digest(match![1]);
    presence.set(res.locals.tokenHash, { userId: (row as { id: string }).id, seenAt: now() });
    next();
  };
  const community = attachCommunity(app, db, now, authenticate, presence);
  attachChat(app, db, now, authenticate);
  app.get('/api/health', (_req, res) =>
    res.json({
      service: 'van-tien-ky',
      ready: true,
      accounts: true,
      apkAvailable: Boolean(options.apkPath && existsSync(options.apkPath)),
      pcAvailable: Boolean(options.pcPath && existsSync(options.pcPath)),
    }),
  );
  app.post('/api/auth/:mode', async (req, res) => {
    const mode = req.params.mode;
    if (mode !== 'register' && mode !== 'login')
      return res.status(404).json({ error: 'NOT_FOUND' });
    const username =
      typeof req.body?.username === 'string' ? req.body.username.trim().toLowerCase() : '';
    const password = req.body?.password;
    if (
      !/^[a-z0-9_]{3,24}$/.test(username) ||
      typeof password !== 'string' ||
      password.length < 10 ||
      password.length > 128
    )
      return res.status(400).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Tên tài khoản: 3–24 chữ không dấu, số hoặc _. Mật khẩu: 10–128 ký tự.',
      });
    if (!throttle(`ip:${req.ip}`, 40) || !throttle(`account:${username}`, 20))
      return res.status(429).json({
        error: 'RATE_LIMIT',
        message: 'Thử đăng nhập quá nhiều lần. Hãy thử lại sau 15 phút.',
      });
    try {
      const existing = db
        .prepare('SELECT id, username, salt, password_hash FROM users WHERE username = ?')
        .get(username) as
        { id: string; username: string; salt: string; password_hash: string } | undefined;
      if (mode === 'register') {
        if (existing)
          return res
            .status(409)
            .json({ error: 'USERNAME_TAKEN', message: 'Tên tài khoản đã được sử dụng.' });
        const salt = randomBytes(16).toString('hex'),
          hash = (await derive(password, salt, 64)) as Buffer,
          id = randomUUID();
        // Recheck after asynchronous password hashing; uniqueness still protects racing requests.
        if (db.prepare('SELECT id FROM users WHERE username = ?').get(username))
          return res
            .status(409)
            .json({ error: 'USERNAME_TAKEN', message: 'Tên tài khoản đã được sử dụng.' });
        db.exec('BEGIN');
        try {
          db.prepare('INSERT INTO users VALUES (?, ?, ?, ?, ?)').run(
            id,
            username,
            salt,
            hash.toString('hex'),
            now(),
          );
          db.prepare('INSERT INTO saves (user_id, updated_at) VALUES (?, ?)').run(id, now());
          db.exec('COMMIT');
        } catch (error) {
          db.exec('ROLLBACK');
          throw error;
        }
        return res.status(201).json(session(id, username));
      }
      const derived = (await derive(
        password,
        existing?.salt || '00000000000000000000000000000000',
        64,
      )) as Buffer;
      if (!existing || !timingSafeEqual(derived, Buffer.from(existing.password_hash, 'hex')))
        return res
          .status(401)
          .json({ error: 'LOGIN_FAILED', message: 'Tên tài khoản hoặc mật khẩu không đúng.' });
      return res.json(session(existing.id, existing.username));
    } catch {
      return res
        .status(500)
        .json({ error: 'SERVER_ERROR', message: 'Máy chủ chưa xử lý được yêu cầu. Hãy thử lại.' });
    }
  });
  app.get('/api/auth/me', authenticate, (_req, res) => res.json({ user: res.locals.user }));
  app.post('/api/logout', authenticate, (_req, res) => {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(res.locals.tokenHash);
    presence.delete(res.locals.tokenHash);
    res.json({ ok: true });
  });
  app.get('/api/save', authenticate, (_req, res) => res.json(cloudSave(res.locals.user.id)));
  app.put('/api/save', authenticate, (req, res) => {
    if (!Number.isSafeInteger(req.body?.revision) || req.body.revision < 0)
      return res
        .status(400)
        .json({ error: 'INVALID_REVISION', message: 'Phiên bản bản lưu không hợp lệ.' });
    let encoded: string;
    try {
      encoded = JSON.stringify(decodeSave(JSON.stringify(req.body.state)));
    } catch {
      return res.status(400).json({
        error: 'INVALID_SAVE',
        message: 'Tiến trình không hợp lệ, chưa ghi lên tài khoản.',
      });
    }
    const row = db
      .prepare(
        'UPDATE saves SET revision = revision + 1, game_json = ?, updated_at = ? WHERE user_id = ? AND revision = ? RETURNING revision, updated_at',
      )
      .get(encoded, now(), res.locals.user.id, req.body.revision) as
      { revision: number; updated_at: number } | undefined;
    if (!row)
      return res.status(409).json({
        error: 'SAVE_CONFLICT',
        message: 'Thiết bị khác đã có tiến trình mới hơn.',
        cloud: cloudSave(res.locals.user.id),
      });
    community.updateProfile(res.locals.user.id, JSON.parse(encoded));
    return res.json({ revision: row.revision, updatedAt: row.updated_at });
  });
  app.use('/api', (_req, res) =>
    res.status(404).json({ error: 'NOT_FOUND', message: 'Không tìm thấy chức năng máy chủ.' }),
  );
  app.get('/downloads/van-tien-ky-android.apk', (_req, res) => {
    if (!options.apkPath || !existsSync(options.apkPath))
      return res.status(404).send('Bản Android chưa được đặt trên máy chủ này.');
    return res.download(resolve(options.apkPath), 'van-tien-ky-android.apk');
  });
  app.get('/downloads/van-tien-ky-pc-windows.zip', (_req, res) => {
    if (!options.pcPath || !existsSync(options.pcPath))
      return res.status(404).send('Bản PC chưa được đặt trên máy chủ này.');
    return res.download(resolve(options.pcPath), 'van-tien-ky-pc-windows.zip');
  });
  if (options.staticDir) {
    const directory = resolve(options.staticDir);
    app.use(express.static(directory, { index: 'index.html' }));
    app.use((req, res, next) =>
      req.method === 'GET' && req.accepts('html') && existsSync(resolve(directory, 'index.html'))
        ? res.sendFile(resolve(directory, 'index.html'))
        : next(),
    );
  }
  const errorHandler: express.ErrorRequestHandler = (error, _req, res, _next) =>
    res
      .status(
        error.type === 'entity.too.large' ? 413 : error.type === 'entity.parse.failed' ? 400 : 500,
      )
      .json({ error: 'INVALID_REQUEST', message: 'Yêu cầu không hợp lệ hoặc quá lớn.' });
  app.use(errorHandler);
  return { app, close: () => db.close() };
}
