import type express from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { decodeSave } from '../src/game/storage';
import { stats } from '../src/game/engine';
import { sectInfo } from '../src/game/data';
import { WORLD_BOSSES, bossCycle, dungeonClears, currencyReward } from '../src/game/expansion';
import type { GameState } from '../src/game/types';
import { stagePower } from '../src/game/stages';

export function attachCommunity(
  app: express.Express,
  db: DatabaseSync,
  now: () => number,
  authenticate: express.RequestHandler,
  presence: Map<string, { userId: string; seenAt: number }>,
) {
  db.exec(`CREATE TABLE IF NOT EXISTS profiles (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, stage INTEGER NOT NULL, xp REAL NOT NULL, power INTEGER NOT NULL, sect TEXT NOT NULL, clears INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS world_bosses (id TEXT NOT NULL, cycle INTEGER NOT NULL, hp INTEGER NOT NULL, max_hp INTEGER NOT NULL, PRIMARY KEY (id, cycle));
    CREATE TABLE IF NOT EXISTS boss_contributions (boss_id TEXT NOT NULL, cycle INTEGER NOT NULL, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, damage INTEGER NOT NULL DEFAULT 0, last_hit INTEGER NOT NULL DEFAULT 0, claimed INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (boss_id, cycle, user_id));
    CREATE INDEX IF NOT EXISTS profile_ranking ON profiles(stage DESC, xp DESC, power DESC);
    CREATE INDEX IF NOT EXISTS contribution_rewards ON boss_contributions(user_id, claimed);`);
  db.exec(
    'CREATE TABLE IF NOT EXISTS boss_overrides(id TEXT PRIMARY KEY,cycle INTEGER NOT NULL,until_at INTEGER NOT NULL)',
  );
  const updateProfile = (id: string, s: GameState) => {
    const st = stats(s);
    db.prepare(
      'INSERT INTO profiles VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET name=excluded.name, stage=excluded.stage, xp=excluded.xp, power=excluded.power, sect=excluded.sect, clears=excluded.clears',
    ).run(
      id,
      s.name,
      s.stage,
      s.xp,
      st.maxHp + st.attack * 5 + st.defense * 3,
      sectInfo(s)?.name || 'Tán tu',
      dungeonClears(s),
    );
  };
  for (const row of db
    .prepare(
      'SELECT user_id, game_json FROM saves WHERE game_json IS NOT NULL AND user_id NOT IN (SELECT user_id FROM profiles)',
    )
    .all() as { user_id: string; game_json: string }[]) {
    try {
      updateProfile(row.user_id, decodeSave(row.game_json));
    } catch {
      /* A legacy invalid save is excluded from public rankings. */
    }
  }
  type BossRow = { hp: number; max_hp: number };
  const getBoss = (boss: (typeof WORLD_BOSSES)[number], time: number) => {
    const override = db
      .prepare('SELECT cycle,until_at FROM boss_overrides WHERE id=? AND until_at>?')
      .get(boss.id, time) as { cycle: number; until_at: number } | undefined;
    const cycle = override?.cycle ?? bossCycle(time, boss.offset);
    const maxHp = Math.round(1200 * 1.15 ** stagePower(boss.stage));
    db.prepare('INSERT OR IGNORE INTO world_bosses VALUES (?, ?, ?, ?)').run(
      boss.id,
      cycle,
      maxHp,
      maxHp,
    );
    const row = db
      .prepare('SELECT hp, max_hp FROM world_bosses WHERE id=? AND cycle=?')
      .get(boss.id, cycle) as BossRow;
    return {
      ...boss,
      cycle,
      hp: row.hp,
      maxHp: row.max_hp,
      endsAt: cycle + 15 * 60000,
      respawnsAt: override?.until_at ?? cycle + 3600000,
      active: time < cycle + 15 * 60000 && row.hp > 0,
    };
  };
  const optionalAuth: express.RequestHandler = (req, res, next) =>
    req.get('authorization') ? authenticate(req, res, next) : next();
  app.get('/api/community', optionalAuth, (_req, res) => {
    const time = now();
    for (const [key, p] of presence) if (p.seenAt < time - 120000) presence.delete(key);
    const online = new Set([...presence.values()].map((p) => p.userId));
    const rows = db
      .prepare(
        `SELECT user_id, name, stage, power, sect, clears, (SELECT json_extract(game_json, '$.titles.equipped') FROM saves WHERE user_id=profiles.user_id) AS title_id FROM profiles ORDER BY stage DESC, xp DESC, power DESC, user_id LIMIT 100`,
      )
      .all() as {
      user_id: string;
      name: string;
      stage: number;
      power: number;
      sect: string;
      clears: number;
      title_id: string | null;
    }[];
    const ranking = rows.map((p, i) => ({
      rank: i + 1,
      id: p.user_id,
      name: p.name,
      titleId: p.title_id,
      stage: p.stage,
      power: p.power,
      sect: p.sect,
      clears: p.clears,
      online: online.has(p.user_id),
      self: p.user_id === res.locals.user?.id,
    }));
    const onlineRows = db
      .prepare(
        `SELECT user_id, name, stage, power, sect, clears, (SELECT json_extract(game_json, '$.titles.equipped') FROM saves WHERE user_id=profiles.user_id) AS title_id FROM profiles ORDER BY stage DESC, xp DESC, power DESC, user_id`,
      )
      .all() as typeof rows;
    const topOnline = onlineRows
      .filter((p) => online.has(p.user_id))
      .slice(0, 10)
      .map((p, i) => ({
        rank: i + 1,
        id: p.user_id,
        name: p.name,
        titleId: p.title_id,
        stage: p.stage,
        power: p.power,
        sect: p.sect,
        clears: p.clears,
        online: true,
        self: p.user_id === res.locals.user?.id,
      }));
    const bosses = WORLD_BOSSES.map((b) => {
      const boss = getBoss(b, time);
      const contribution = res.locals.user
        ? (db
            .prepare(
              'SELECT damage, last_hit, claimed FROM boss_contributions WHERE boss_id=? AND cycle=? AND user_id=?',
            )
            .get(b.id, boss.cycle, res.locals.user.id) as
            { damage: number; last_hit: number; claimed: number } | undefined)
        : undefined;
      const participants = db
        .prepare(
          'SELECT COUNT(*) AS n FROM boss_contributions WHERE boss_id=? AND cycle=? AND damage>0',
        )
        .get(b.id, boss.cycle) as { n: number };
      return {
        ...boss,
        participants: participants.n,
        damage: contribution?.damage || 0,
        nextHitAt: contribution ? contribution.last_hit + 5000 : 0,
      };
    });
    const rewards = res.locals.user
      ? (
          db
            .prepare(
              'SELECT c.boss_id, c.cycle FROM boss_contributions c JOIN world_bosses b ON b.id=c.boss_id AND b.cycle=c.cycle WHERE c.user_id=? AND c.damage>0 AND c.claimed=0 AND b.hp=0 AND c.cycle>=?',
            )
            .all(res.locals.user.id, time - 7 * 86400000) as { boss_id: string; cycle: number }[]
        ).map((r) => ({
          bossId: r.boss_id,
          cycle: r.cycle,
          name: WORLD_BOSSES.find((b) => b.id === r.boss_id)!.name,
        }))
      : [];
    res.json({ serverTime: time, onlineCount: online.size, ranking, topOnline, bosses, rewards });
  });
  app.post('/api/community/boss/:id/attack', authenticate, (req, res) => {
    const boss = WORLD_BOSSES.find((b) => b.id === req.params.id);
    if (!boss) return res.status(404).json({ message: 'Boss không tồn tại.' });
    const time = now(),
      current = getBoss(boss, time);
    if (req.body?.cycle !== current.cycle)
      return res.status(409).json({ message: 'Boss đã chuyển lượt hồi sinh. Hãy làm mới.' });
    if (!current.active)
      return res.status(409).json({ message: 'Boss đã bị hạ hoặc đã rời khỏi thế giới.' });
    const saved = db
      .prepare('SELECT game_json FROM saves WHERE user_id=?')
      .get(res.locals.user.id) as { game_json: string | null };
    if (!saved.game_json)
      return res.status(409).json({ message: 'Hãy đồng bộ nhân vật trước khi tham chiến.' });
    const s = decodeSave(saved.game_json);
    if (s.stage < boss.minStage)
      return res.status(403).json({ message: 'Chưa đủ tu vi để tham chiến ở giới này.' });
    const old = db
      .prepare('SELECT last_hit FROM boss_contributions WHERE boss_id=? AND cycle=? AND user_id=?')
      .get(boss.id, current.cycle, res.locals.user.id) as { last_hit: number } | undefined;
    if (old && time < old.last_hit + 5000)
      return res.status(429).json({ message: 'Mỗi đòn công kích cách nhau 5 giây.' });
    const damage = Math.min(
      current.hp,
      Math.max(1, Math.min(Math.round(stats(s).attack * 3), Math.round(current.maxHp * 0.05))),
    );
    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare('UPDATE world_bosses SET hp=hp-? WHERE id=? AND cycle=?').run(
        damage,
        boss.id,
        current.cycle,
      );
      db.prepare(
        'INSERT INTO boss_contributions (boss_id, cycle, user_id, damage, last_hit) VALUES (?, ?, ?, ?, ?) ON CONFLICT(boss_id, cycle, user_id) DO UPDATE SET damage=damage+excluded.damage, last_hit=excluded.last_hit',
      ).run(boss.id, current.cycle, res.locals.user.id, damage, time);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    res.json({ damage, hp: current.hp - damage, defeated: current.hp === damage });
  });
  app.post('/api/community/boss/:id/claim', authenticate, (req, res) => {
    const boss = WORLD_BOSSES.find((b) => b.id === req.params.id);
    if (
      !boss ||
      !Number.isSafeInteger(req.body?.cycle) ||
      !Number.isSafeInteger(req.body?.revision)
    )
      return res.status(400).json({ message: 'Yêu cầu nhận thưởng không hợp lệ.' });
    const cycle = req.body.cycle;
    if (cycle < now() - 7 * 86400000)
      return res.status(410).json({ message: 'Phần thưởng đã hết hạn sau 7 ngày.' });
    const defeated = db
      .prepare('SELECT hp FROM world_bosses WHERE id=? AND cycle=?')
      .get(boss.id, cycle) as BossRow | undefined;
    const c = db
      .prepare(
        'SELECT damage, claimed FROM boss_contributions WHERE boss_id=? AND cycle=? AND user_id=?',
      )
      .get(boss.id, cycle, res.locals.user.id) as { damage: number; claimed: number } | undefined;
    if (!defeated || defeated.hp !== 0 || !c || c.damage <= 0 || c.claimed)
      return res.status(409).json({ message: 'Chưa đủ điều kiện hoặc phần thưởng đã được nhận.' });
    const saved = db
      .prepare('SELECT revision, game_json FROM saves WHERE user_id=?')
      .get(res.locals.user.id) as { revision: number; game_json: string };
    if (saved.revision !== req.body.revision)
      return res.status(409).json({ message: 'Tiến trình đã thay đổi. Hãy đồng bộ rồi nhận lại.' });
    const s = decodeSave(saved.game_json);
    s.stones += Math.round(300 * 1.14 ** stagePower(boss.stage));
    s.lingqi = Math.min(1e9, s.lingqi + 50 + stagePower(boss.stage) * 5);
    s.inventory.essence = (s.inventory.essence || 0) + 3;
    s.worldBossClaims++;
    currencyReward(s, boss.stage, 5);
    s.events = [
      {
        id: (s.events[0]?.id || 0) + 1,
        text: `Nhận chiến lợi phẩm ${boss.name}: linh thạch, linh khí và 3 tinh hoa.`,
        type: 'battle' as const,
        time: now(),
      },
      ...s.events,
    ].slice(0, 60);
    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare(
        'UPDATE saves SET revision=revision+1, game_json=?, updated_at=? WHERE user_id=?',
      ).run(JSON.stringify(s), now(), res.locals.user.id);
      db.prepare(
        'UPDATE boss_contributions SET claimed=1 WHERE boss_id=? AND cycle=? AND user_id=?',
      ).run(boss.id, cycle, res.locals.user.id);
      updateProfile(res.locals.user.id, s);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    res.json({ revision: saved.revision + 1, state: s, updatedAt: now() });
  });
  const listBosses = () => WORLD_BOSSES.map((b) => getBoss(b, now()));
  const controlBoss = (id: string, action: string) => {
    const boss = WORLD_BOSSES.find((b) => b.id === id);
    if (!boss) return null;
    let current = getBoss(boss, now());
    if (action === 'respawn') {
      let cycle = now();
      while (db.prepare('SELECT 1 FROM world_bosses WHERE id=? AND cycle=?').get(id, cycle))
        cycle++;
      db.prepare('INSERT INTO world_bosses VALUES(?,?,?,?)').run(
        id,
        cycle,
        current.maxHp,
        current.maxHp,
      );
      db.prepare(
        'INSERT INTO boss_overrides VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET cycle=excluded.cycle,until_at=excluded.until_at',
      ).run(id, cycle, bossCycle(now(), boss.offset) + 3600000);
    } else
      db.prepare('UPDATE world_bosses SET hp=? WHERE id=? AND cycle=?').run(
        action === 'defeat' ? 0 : current.maxHp,
        id,
        current.cycle,
      );
    return getBoss(boss, now());
  };
  return { updateProfile, listBosses, controlBoss };
}
