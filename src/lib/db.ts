import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

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

const g = globalThis as unknown as { __db?: Database.Database };

export function db(): Database.Database {
  if (!g.__db) {
    const file = process.env.DATABASE_PATH ?? "./data/timy.db";
    if (file !== ":memory:") fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
    const d = new Database(file);
    d.pragma("journal_mode = WAL");
    d.pragma("foreign_keys = ON");
    d.exec(SCHEMA);
    g.__db = d;
  }
  return g.__db;
}

export function getSetting(key: string): string | undefined {
  return (db().prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined)?.value;
}

export function setSetting(key: string, value: string) {
  db().prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, value);
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
