import { createClient, type Client, type InValue, type Transaction } from "@libsql/client";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT,
  notes TEXT,
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD','ILS')),
  rate REAL,                       -- default hourly rate for the customer's projects
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rate REAL,                       -- NULL = inherit the customer's rate
  currency TEXT CHECK (currency IN ('USD','ILS')),  -- only used when rate is set; NULL = customer currency
  billable INTEGER NOT NULL DEFAULT 1,
  color TEXT NOT NULL DEFAULT '#6366f1',
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id),
  date TEXT NOT NULL,              -- YYYY-MM-DD (wall clock)
  start_time TEXT,                 -- HH:MM, optional
  duration_min INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  billable INTEGER NOT NULL DEFAULT 1,
  gcal_event_id TEXT UNIQUE,
  timer_started_at TEXT,           -- ISO UTC while a timer is running
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date);
CREATE INDEX IF NOT EXISTS idx_projects_customer ON projects(customer_id);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`;

type Args = Record<string, InValue> | InValue[];
type Row = Record<string, unknown>;

/** Query helpers shared by the client and transactions; rows come back as plain objects. */
export type Q = {
  all<T = Row>(sql: string, args?: Args): Promise<T[]>;
  get<T = Row>(sql: string, args?: Args): Promise<T | undefined>;
  run(sql: string, args?: Args): Promise<{ changes: number; lastInsertRowid: number }>;
};

function queries(x: Client | Transaction): Q {
  const exec = async (sql: string, args: Args = []) => x.execute({ sql, args });
  const all = async <T,>(sql: string, args?: Args) => {
    const rs = await exec(sql, args);
    return rs.rows.map((r) => Object.fromEntries(rs.columns.map((c, i) => [c, r[i]]))) as T[];
  };
  return {
    all,
    get: async <T,>(sql: string, args?: Args) => (await all<T>(sql, args))[0],
    run: async (sql, args) => {
      const rs = await exec(sql, args);
      return { changes: rs.rowsAffected, lastInsertRowid: Number(rs.lastInsertRowid ?? 0) };
    },
  };
}

const g = globalThis as unknown as { __db?: { client: Client; ready: Promise<void> } };

function conn() {
  if (!g.__db) {
    const url = process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL ?? "file:./data/timy.db";
    const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
    g.__db = { client, ready: client.executeMultiple(SCHEMA) };
  }
  return g.__db;
}

async function ready(): Promise<Client> {
  const { client, ready } = conn();
  await ready;
  return client;
}

export const db: Q = {
  all: async (sql, args) => queries(await ready()).all(sql, args),
  get: async (sql, args) => queries(await ready()).get(sql, args),
  run: async (sql, args) => queries(await ready()).run(sql, args),
};

/** Runs `fn` in a write transaction; commits on success, rolls back on error. */
export async function tx<T>(fn: (q: Q) => Promise<T>): Promise<T> {
  const t = await (await ready()).transaction("write");
  try {
    const r = await fn(queries(t));
    await t.commit();
    return r;
  } catch (e) {
    await t.rollback();
    throw e;
  } finally {
    t.close();
  }
}

export async function getSetting(key: string): Promise<string | undefined> {
  return (await db.get<{ value: string }>("SELECT value FROM settings WHERE key = ?", [key]))?.value;
}

export async function setSetting(key: string, value: string) {
  await db.run("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [key, value]);
}

/**
 * Entries joined with their project/customer and the effective rate:
 * a project rate overrides the customer rate; currency follows the level the rate came from.
 */
export const ENTRY_SELECT = `
SELECT e.id, e.project_id, p.name AS project_name, p.color, c.id AS customer_id, c.name AS customer_name,
       e.date, e.start_time, e.duration_min, e.description, e.billable, e.gcal_event_id, e.timer_started_at,
       COALESCE(p.rate, c.rate, 0) AS rate,
       CASE WHEN p.rate IS NOT NULL THEN COALESCE(p.currency, c.currency) ELSE c.currency END AS currency,
       CASE WHEN e.billable = 1 AND p.billable = 1 THEN ROUND(e.duration_min / 60.0 * COALESCE(p.rate, c.rate, 0), 2) ELSE 0 END AS amount
FROM entries e
JOIN projects p ON p.id = e.project_id
JOIN customers c ON c.id = p.customer_id
`;

export const PROJECT_SELECT = `
SELECT p.*, c.name AS customer_name,
       COALESCE(p.rate, c.rate) AS effective_rate,
       CASE WHEN p.rate IS NOT NULL THEN COALESCE(p.currency, c.currency) ELSE c.currency END AS effective_currency
FROM projects p JOIN customers c ON c.id = p.customer_id`;
