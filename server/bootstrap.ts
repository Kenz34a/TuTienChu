import type { Database } from './database.mjs';
import type { Administration } from './admin-core';
import { randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

// Free Render instances have no shell. Credentials supplied privately in the
// hosting dashboard provision the first admin before the public server starts.
export async function bootstrapAdmin(
  db: Database,
  core: Administration,
  credentials: { username: string; password: string } | undefined,
  now: () => number,
) {
  await db.exec('CREATE TABLE IF NOT EXISTS metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL)');
  if (!credentials) return;
  const username = credentials.username.trim().toLowerCase(),
    password = credentials.password;
  if (!/^[a-z0-9_]{3,24}$/.test(username) || password.length < 16 || password.length > 128)
    throw new Error(
      'Admin bootstrap requires a valid username and a password of 16–128 characters.',
    );
  if (await db.prepare("SELECT 1 FROM metadata WHERE key='admin-bootstrap-complete'").get()) return;
  if (Number((await db.prepare('SELECT COUNT(*) AS n FROM user_roles').get())!.n) > 0) {
    await db
      .prepare("INSERT INTO metadata VALUES('admin-bootstrap-complete','existing-admin')")
      .run();
    return;
  }
  const existing = await db
    .prepare('SELECT id,salt,password_hash FROM users WHERE username=?')
    .get(username);
  const salt = existing ? String(existing.salt) : randomBytes(16).toString('hex');
  const hash = (await promisify(scrypt)(password, salt, 64)) as Buffer;
  if (existing && !timingSafeEqual(hash, Buffer.from(String(existing.password_hash), 'hex')))
    throw new Error(
      'Bootstrap username already belongs to a different account. Use its correct password or choose another username.',
    );
  const id = existing ? String(existing.id) : randomUUID();
  if ((await core.ban(id))?.banned) throw new Error('Cannot bootstrap a controlled account.');
  if (!existing) {
    await db
      .prepare('INSERT INTO users VALUES(?,?,?,?,?)')
      .run(id, username, salt, hash.toString('hex'), now());
    await db.prepare('INSERT INTO saves(user_id,updated_at) VALUES(?,?)').run(id, now());
  }
  await db.prepare("INSERT INTO user_roles VALUES(?,'admin')").run(id);
  await core.audit(
    'deployment-bootstrap',
    'role',
    id,
    'Provision first administrator from private hosting configuration.',
  );
  await db.prepare("INSERT INTO metadata VALUES('admin-bootstrap-complete',?)").run(username);
}
