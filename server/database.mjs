import { DatabaseSync } from 'node:sqlite';
import { AsyncLocalStorage } from 'node:async_hooks';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import pg from 'pg';

// Keep the established SQLite schema/queries and API values on both backends.
export function postgresSQL(input) {
  let sql = input
    .replace(/PRAGMA[^;]*;/gi, '')
    .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'BIGSERIAL PRIMARY KEY')
    .replace(/\bINTEGER\b/gi, 'BIGINT')
    .replace(/\bREAL\b/gi, 'DOUBLE PRECISION')
    .replace(
      /json_extract\(game_json,\s*'\$\.titles\.equipped'\)/g,
      "(game_json::jsonb #>> '{titles,equipped}')",
    )
    .replace(
      /sqlite_master WHERE name=/g,
      'information_schema.tables WHERE table_schema=current_schema() AND table_name=',
    );
  sql = sql.replace(
    /INSERT OR IGNORE INTO ([^;]+)(;|$)/gi,
    'INSERT INTO $1 ON CONFLICT DO NOTHING$2',
  );
  let parameter = 0;
  // Do not interpret question marks inside SQL string literals as parameters.
  sql = sql.replace(/'(?:''|[^'])*'|\?/g, (token) => (token === '?' ? `$${++parameter}` : token));
  return sql;
}

export function postgresOptions(connectionString, schema) {
  const url = new URL(connectionString);
  if (!['postgres:', 'postgresql:'].includes(url.protocol))
    throw new Error('DATABASE_URL must use PostgreSQL.');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.searchParams.get('sslmode') === 'disable' && !local)
    throw new Error('Remote PostgreSQL requires verified TLS.');
  if (schema && !/^[a-z][a-z0-9_]{0,62}$/.test(schema)) throw new Error('Invalid database schema.');
  // pg's sslmode=require can turn certificate verification off; explicitly
  // configure verified TLS after removing URL SSL settings that override it.
  for (const key of ['ssl', 'sslmode', 'sslrootcert', 'sslcert', 'sslkey', 'sslpassword'])
    url.searchParams.delete(key);
  return {
    connectionString: url.toString(),
    ssl: local ? false : { rejectUnauthorized: true },
    enableChannelBinding: true,
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
    query_timeout: 15000,
    ...(schema ? { options: `-c search_path=${schema}` } : {}),
    types: {
      getTypeParser(oid, format) {
        if (oid === 20)
          return (value) => {
            const n = Number(value);
            if (!Number.isSafeInteger(n))
              throw new Error('Database integer exceeds the safe range.');
            return n;
          };
        return pg.types.getTypeParser(oid, format);
      },
    },
  };
}

export async function openDatabase({ databasePath = ':memory:', databaseURL, schema } = {}) {
  const db = new Database(
    databaseURL ? new pg.Pool(postgresOptions(databaseURL, schema)) : null,
    databasePath,
  );
  try {
    await db.prepare('SELECT 1 AS ready').get();
    return db;
  } catch {
    await db.close();
    throw new Error(
      'Cannot connect to the configured database. Check DATABASE_URL and network access.',
    );
  }
}

class Database {
  #pool;
  #sqlite;
  #scope = new AsyncLocalStorage();
  #tail = Promise.resolve();
  #nextSavepoint = 0;
  constructor(pool, path) {
    this.kind = pool ? 'postgres' : 'sqlite';
    this.#pool = pool;
    if (!pool) {
      if (path !== ':memory:') mkdirSync(dirname(resolve(path)), { recursive: true, mode: 0o700 });
      this.#sqlite = new DatabaseSync(path);
      this.#sqlite.exec(
        'PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000',
      );
    }
    // Never dump pg's connection object or errors containing server credentials.
    pool?.on('error', () =>
      console.error('An idle PostgreSQL connection closed; the next request will reconnect.'),
    );
  }
  async #query(sql, args = [], mode = 'all') {
    const context = this.#scope.getStore();
    if (context?.released) throw new Error('Database transaction has already ended.');
    if (!this.#pool) {
      const statement = this.#sqlite.prepare(sql);
      return statement[mode](...args);
    }
    sql = postgresSQL(sql);
    if (
      mode === 'run' &&
      /^\s*INSERT\s+INTO\s+(chat_messages|gift_codes|admin_audit)\b/i.test(sql) &&
      !/\bRETURNING\b/i.test(sql)
    )
      sql += ' RETURNING id';
    const result = await (context?.client || this.#pool).query(sql, args);
    const rows = result.rows.map((row) =>
      Object.fromEntries(
        Object.entries(row).map(([k, v]) => [k, typeof v === 'boolean' ? Number(v) : v]),
      ),
    );
    return mode === 'get'
      ? rows[0]
      : mode === 'run'
        ? { changes: result.rowCount || 0, lastInsertRowid: rows[0]?.id || 0 }
        : rows;
  }
  prepare(sql) {
    return {
      get: (...args) => this.#query(sql, args, 'get'),
      all: (...args) => this.#query(sql, args),
      run: (...args) => this.#query(sql, args, 'run'),
    };
  }
  async exec(sql) {
    const context = this.#scope.getStore();
    if (context?.released) throw new Error('Database transaction has already ended.');
    const command = sql.trim().toUpperCase();
    // Legacy inner BEGIN blocks become savepoints inside the request/startup
    // transaction, so their rollback never aborts unrelated requests.
    if (/^BEGIN(?: IMMEDIATE)?$/.test(command)) {
      if (!context) throw new Error('Use database.transaction for an outer transaction.');
      const name = `legacy_${++this.#nextSavepoint}`;
      context.savepoints.push(name);
      return this.exec(`SAVEPOINT ${name}`);
    }
    if (command === 'COMMIT' || command === 'ROLLBACK') {
      const name = context?.savepoints.pop();
      if (!name) throw new Error('No inner transaction to finish.');
      if (command === 'ROLLBACK') await this.exec(`ROLLBACK TO SAVEPOINT ${name}`);
      return this.exec(`RELEASE SAVEPOINT ${name}`);
    }
    if (!this.#pool) return this.#sqlite.exec(sql.replace(/PRAGMA[^;]*;/gi, ''));
    return (context?.client || this.#pool).query(postgresSQL(sql));
  }
  async transaction(fn) {
    const previous = this.#scope.getStore();
    if (previous && !previous.released) {
      await this.exec('BEGIN');
      try {
        const value = await fn();
        await this.exec('COMMIT');
        return value;
      } catch (e) {
        await this.exec('ROLLBACK');
        throw e;
      }
    }
    let unlock;
    const turn = this.#tail;
    this.#tail = new Promise((r) => {
      unlock = r;
    });
    await turn;
    let client;
    const context = { client: null, savepoints: [], released: false };
    try {
      client = this.#pool ? await this.#pool.connect() : null;
      context.client = client;
      if (client) {
        await client.query('BEGIN');
        // Also serialize writes during rolling deploys or commands run on a
        // second machine, not just requests handled by this Node process.
        await client.query('SELECT pg_advisory_xact_lock(hashtext(current_schema()), 1198826062)');
      } else this.#sqlite.exec('BEGIN IMMEDIATE');
      const value = await this.#scope.run(context, fn);
      if (client) {
        const result = await client.query('COMMIT');
        if (result.command !== 'COMMIT') throw new Error('Database transaction did not commit.');
      } else this.#sqlite.exec('COMMIT');
      return value;
    } catch (e) {
      try {
        if (client) await client.query('ROLLBACK');
        else this.#sqlite?.exec('ROLLBACK');
      } catch {
        /* Preserve original error. */
      }
      throw e;
    } finally {
      context.released = true;
      client?.release();
      unlock();
    }
  }
  async close() {
    if (this.#pool) await this.#pool.end();
    else this.#sqlite.close();
  }
}

// Preserve atomic request behavior while queries await the network. A JSON
// success is sent only after COMMIT, including giftcode and boss rewards.
export function databaseRequests(db) {
  return (req, res, next) => {
    const json = res.json.bind(res);
    const requestFailed = Symbol('request failed');
    let response;
    let completed = false;
    let complete;
    const done = new Promise((r) => {
      complete = r;
    });
    res.json = (body) => {
      if (!completed) {
        completed = true;
        response = body;
        complete();
      }
      return res;
    };
    void db
      .transaction(async () => {
        next();
        await done;
        if (res.statusCode >= 500) throw requestFailed;
      })
      .then(() => {
        if (!res.destroyed && !res.writableEnded) json(response);
      })
      .catch((error) => {
        if (res.destroyed || res.writableEnded) return;
        if (error === requestFailed && res.statusCode === 503) return json(response);
        res.status(503);
        json({
          error: 'DATABASE_UNAVAILABLE',
          message:
            'Máy chủ chưa kết nối được dữ liệu. Tiến trình trên thiết bị vẫn được giữ; hãy thử lại.',
        });
      });
  };
}
