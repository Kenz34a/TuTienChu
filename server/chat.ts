import type express from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { decodeSave } from '../src/game/storage';

const worlds = ['all', 'earth', 'immortal', 'divine'];
export function attachChat(
  app: express.Express,
  db: DatabaseSync,
  now: () => number,
  authenticate: express.RequestHandler,
) {
  db.exec(`CREATE TABLE IF NOT EXISTS chat_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, stage INTEGER NOT NULL, title_id TEXT, world TEXT NOT NULL, body TEXT NOT NULL, created_at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS chat_world_time ON chat_messages(world, id DESC);
    CREATE TABLE IF NOT EXISTS chat_rate (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, last_sent INTEGER NOT NULL);`);
  const cooldown = (id?: string) =>
    id
      ? (
          db.prepare('SELECT last_sent FROM chat_rate WHERE user_id=?').get(id) as
            { last_sent: number } | undefined
        )?.last_sent
      : undefined;
  const optionalAuth: express.RequestHandler = (req, res, next) =>
    req.get('authorization') ? authenticate(req, res, next) : next();
  app.get('/api/chat', optionalAuth, (req, res) => {
    const world = req.query.world || 'all';
    if (typeof world !== 'string' || !worlds.includes(world))
      return res.status(400).json({ message: 'Kênh chat không hợp lệ.' });
    const rows = db
      .prepare(
        'SELECT id, user_id, name, stage, title_id, world, body, created_at FROM chat_messages WHERE world=? AND created_at>=? ORDER BY id DESC LIMIT 100',
      )
      .all(world, now() - 3 * 86400000) as {
      id: number;
      user_id: string;
      name: string;
      stage: number;
      title_id: string | null;
      world: string;
      body: string;
      created_at: number;
    }[];
    const last = cooldown(res.locals.user?.id);
    res.json({
      serverTime: now(),
      nextSendAt: last === undefined ? 0 : last + 3000,
      messages: rows.reverse().map((m) => ({
        id: m.id,
        name: m.name,
        stage: m.stage,
        titleId: m.title_id,
        world: m.world,
        body: m.body,
        time: m.created_at,
        self: m.user_id === res.locals.user?.id,
      })),
    });
  });
  app.post('/api/chat', authenticate, (req, res) => {
    const world = req.body?.world || 'all',
      raw = req.body?.body;
    if (typeof world !== 'string' || !worlds.includes(world) || typeof raw !== 'string')
      return res.status(400).json({ message: 'Tin nhắn không hợp lệ.' });
    const body = raw.replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
    if (!body || [...body].length > 200)
      return res.status(400).json({ message: 'Tin nhắn cần từ 1 đến 200 ký tự.' });
    const time = now(),
      last = cooldown(res.locals.user.id);
    if (last !== undefined && time < last + 3000)
      return res.status(429).json({ message: 'Mỗi tin nhắn cách nhau ít nhất 3 giây.' });
    const saved = db
      .prepare('SELECT game_json FROM saves WHERE user_id=?')
      .get(res.locals.user.id) as { game_json: string | null };
    if (!saved?.game_json)
      return res.status(409).json({ message: 'Hãy đồng bộ nhân vật trước khi gửi tin nhắn.' });
    const s = decodeSave(saved.game_json);
    if ((world === 'immortal' && s.stage < 27) || (world === 'divine' && s.stage < 48))
      return res.status(403).json({ message: 'Chưa đủ tu vi để gửi tin ở giới này.' });
    db.exec('BEGIN IMMEDIATE');
    try {
      const result = db
        .prepare(
          'INSERT INTO chat_messages (user_id,name,stage,title_id,world,body,created_at) VALUES (?,?,?,?,?,?,?)',
        )
        .run(res.locals.user.id, s.name, s.stage, s.titles.equipped, world, body, time);
      db.prepare(
        'INSERT INTO chat_rate VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET last_sent=excluded.last_sent',
      ).run(res.locals.user.id, time);
      db.prepare(
        'DELETE FROM chat_messages WHERE created_at<? OR id NOT IN (SELECT id FROM chat_messages ORDER BY id DESC LIMIT 2000)',
      ).run(time - 3 * 86400000);
      db.exec('COMMIT');
      res.status(201).json({ id: Number(result.lastInsertRowid), nextSendAt: time + 3000 });
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  });
}
