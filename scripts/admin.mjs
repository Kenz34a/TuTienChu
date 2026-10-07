// Run on the trusted game server; never exposed as a public bootstrap API.
import { openDatabase } from '../server/database.mjs';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
const [action, value] = process.argv.slice(2);
const username = value?.trim().toLowerCase();
if (
  !['grant', 'revoke', 'list'].includes(action) ||
  (action !== 'list' && !/^[a-z0-9_]{3,24}$/.test(username || ''))
) {
  console.error('Usage: npm run admin -- grant|revoke username; npm run admin -- list');
  process.exit(1);
}
const path = resolve(process.env.DATA_DIR || 'var', 'van-tien-ky.sqlite');
if (!process.env.DATABASE_URL && !existsSync(path)) {
  console.error(
    'Start the server and register your account in the game first. DATA_DIR must match the running server.',
  );
  process.exit(1);
}
const db = await openDatabase({
  databasePath: path,
  databaseURL: process.env.DATABASE_URL,
  schema: process.env.DATABASE_SCHEMA,
});
try {
  await db.transaction(async () => {
    await db.exec(
      "PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS user_roles(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,role TEXT NOT NULL CHECK(role='admin'));",
    );
    if (action === 'list') {
      console.log(
        (
          await db
            .prepare(
              "SELECT username FROM users JOIN user_roles ON users.id=user_roles.user_id WHERE role='admin' ORDER BY username",
            )
            .all()
        )
          .map((r) => r.username)
          .join('\n') || 'No administrators yet.',
      );
    } else {
      const user = await db.prepare('SELECT id FROM users WHERE username=?').get(username);
      if (!user) throw new Error('Account does not exist. Register it in the game first.');
      await db.exec('BEGIN IMMEDIATE');
      try {
        if (action === 'grant') {
          if (
            await db
              .prepare('SELECT 1 FROM user_controls WHERE user_id=? AND banned=1')
              .get(user.id)
          )
            throw new Error('Unban this account before granting administrator access.');
          await db.prepare("INSERT OR IGNORE INTO user_roles VALUES(?,'admin')").run(user.id);
        } else {
          const count = (
            await db
              .prepare(
                'SELECT COUNT(*) AS n FROM user_roles r LEFT JOIN user_controls c ON c.user_id=r.user_id WHERE COALESCE(c.banned,0)=0',
              )
              .get()
          ).n;
          if (
            count <= 1 &&
            !(await db
              .prepare('SELECT 1 FROM user_controls WHERE user_id=? AND banned=1')
              .get(user.id)) &&
            (await db.prepare('SELECT 1 FROM user_roles WHERE user_id=?').get(user.id))
          )
            throw new Error('Cannot revoke the last administrator. Grant a replacement first.');
          await db.prepare('DELETE FROM user_roles WHERE user_id=?').run(user.id);
        }
        await db
          .prepare(
            'INSERT INTO admin_audit(actor,action,target,details,created_at) VALUES(?,?,?,?,?)',
          )
          .run('server-cli', 'role', user.id, `${action}: ${username}`, Date.now());
        await db.exec('COMMIT');
      } catch (e) {
        await db.exec('ROLLBACK');
        throw e;
      }
      console.log(
        `${action === 'grant' ? 'Granted' : 'Revoked'} administrator access: ${username}. Open /admin and sign in.`,
      );
    }
  });
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await db.close();
}
