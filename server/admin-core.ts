import type { DatabaseSync } from 'node:sqlite';

export function administration(db: DatabaseSync, now: () => number) {
  db.exec(`CREATE TABLE IF NOT EXISTS user_roles (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, role TEXT NOT NULL CHECK(role='admin'));
    CREATE TABLE IF NOT EXISTS user_controls (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, banned INTEGER NOT NULL DEFAULT 0, reason TEXT NOT NULL DEFAULT '');
    CREATE TABLE IF NOT EXISTS server_settings (id INTEGER PRIMARY KEY CHECK(id=1), maintenance INTEGER NOT NULL DEFAULT 0, message TEXT NOT NULL DEFAULT '', revision INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL DEFAULT 0);
    INSERT OR IGNORE INTO server_settings(id) VALUES(1);
    CREATE TABLE IF NOT EXISTS admin_audit (id INTEGER PRIMARY KEY AUTOINCREMENT, actor TEXT NOT NULL, action TEXT NOT NULL, target TEXT NOT NULL, details TEXT NOT NULL, before_json TEXT, after_json TEXT, created_at INTEGER NOT NULL);`);
  const isAdmin = (id: string) =>
    Boolean(db.prepare("SELECT 1 FROM user_roles WHERE user_id=? AND role='admin'").get(id));
  const ban = (id: string) =>
    db.prepare('SELECT banned,reason FROM user_controls WHERE user_id=?').get(id) as
      { banned: number; reason: string } | undefined;
  const status = () => {
    const r = db
      .prepare('SELECT maintenance,message,revision,updated_at FROM server_settings WHERE id=1')
      .get() as { maintenance: number; message: string; revision: number; updated_at: number };
    return {
      maintenance: !!r.maintenance,
      message: r.message,
      revision: r.revision,
      updatedAt: r.updated_at,
    };
  };
  const audit = (
    actor: string,
    action: string,
    target: string,
    details: string,
    before?: string,
    after?: string,
  ) =>
    db
      .prepare(
        'INSERT INTO admin_audit(actor,action,target,details,before_json,after_json,created_at) VALUES(?,?,?,?,?,?,?)',
      )
      .run(actor, action, target, details, before || null, after || null, now());
  return { isAdmin, ban, status, audit };
}
export type Administration = ReturnType<typeof administration>;
