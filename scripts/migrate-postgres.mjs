import { DatabaseSync } from 'node:sqlite';
import { existsSync } from 'node:fs';
import { openDatabase } from '../server/database.mjs';
import { createApp } from '../server-build/app.mjs';

const tables = [
  'users',
  'saves',
  'sessions',
  'user_roles',
  'user_controls',
  'server_settings',
  'admin_audit',
  'gift_codes',
  'gift_redemptions',
  'profiles',
  'world_bosses',
  'boss_contributions',
  'boss_overrides',
  'chat_messages',
  'chat_rate',
  'metadata',
];
const sourcePath = process.argv[2];
if (!sourcePath || !existsSync(sourcePath) || !process.env.DATABASE_URL) {
  console.error(
    'Usage: set DATABASE_URL privately, then npm run migrate:postgres -- path/to/van-tien-ky.sqlite. Stop the destination server first.',
  );
  process.exit(1);
}
let source, target;
try {
  const initialized = await createApp({
    databaseURL: process.env.DATABASE_URL,
    databaseSchema: process.env.DATABASE_SCHEMA,
  });
  await initialized.close();
  source = new DatabaseSync(sourcePath, { readOnly: true });
  source.exec('BEGIN');
  target = await openDatabase({
    databaseURL: process.env.DATABASE_URL,
    schema: process.env.DATABASE_SCHEMA,
  });
  const counts = await target.transaction(async () => {
    for (const table of ['users', 'gift_codes', 'admin_audit', 'chat_messages']) {
      if (Number((await target.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get()).n))
        throw new Error(
          'Destination already contains game data; import refused. Use a new empty database.',
        );
    }
    if (
      Number(
        (await target.prepare('SELECT revision FROM server_settings WHERE id=1').get()).revision,
      ) > 0
    )
      throw new Error('Destination has configured server settings; use a new empty database.');
    for (const table of [...tables].reverse()) await target.exec(`DELETE FROM ${table}`);
    const result = {};
    for (const table of tables) {
      if (!source.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table))
        continue;
      const columns = source
        .prepare(`PRAGMA table_info(${table})`)
        .all()
        .map((c) => c.name);
      if (columns.some((c) => !/^[a-z_]+$/.test(c))) throw new Error('Unexpected source columns.');
      const rows = source.prepare(`SELECT * FROM ${table}`).all();
      for (const row of rows) {
        await target
          .prepare(
            `INSERT INTO ${table}(${columns.join(',')}) VALUES(${columns.map(() => '?').join(',')})`,
          )
          .run(...columns.map((c) => row[c]));
      }
      result[table] = rows.length;
    }
    if (!result.server_settings) await target.exec('INSERT INTO server_settings(id) VALUES(1)');
    for (const table of ['gift_codes', 'admin_audit', 'chat_messages']) {
      await target
        .prepare(
          `SELECT setval(pg_get_serial_sequence(?, 'id'), COALESCE(MAX(id),1), MAX(id) IS NOT NULL) FROM ${table}`,
        )
        .get(table);
    }
    return result;
  });
  source.exec('COMMIT');
  console.log('Imported atomically into PostgreSQL; source SQLite was opened read-only.');
  console.log(JSON.stringify(counts));
} catch {
  // Database errors may contain connection details or row data: do not print them.
  console.error(
    'Import failed; no destination game data was partially imported. Check that the target is empty and the source is a supported game database.',
  );
  process.exitCode = 1;
} finally {
  source?.close();
  await target?.close();
}
