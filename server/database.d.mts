import type express from 'express';
type Row = Record<string, string | number | null>;
type Value = string | number | null;
export interface Database {
  kind: 'postgres' | 'sqlite';
  prepare(sql: string): {
    get(...args: Value[]): Promise<Row | undefined>;
    all(...args: Value[]): Promise<Row[]>;
    run(...args: Value[]): Promise<{ changes: number | bigint; lastInsertRowid: number | bigint }>;
  };
  exec(sql: string): Promise<unknown>;
  transaction<T>(fn: () => Promise<T> | T): Promise<T>;
  close(): Promise<void>;
}
export function openDatabase(options?: {
  databasePath?: string;
  databaseURL?: string;
  schema?: string;
}): Promise<Database>;
export function postgresSQL(sql: string): string;
export function postgresOptions(connectionString: string, schema?: string): Record<string, unknown>;
export function databaseRequests(db: Database): express.RequestHandler;
