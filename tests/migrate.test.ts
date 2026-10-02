import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createClient } from "@libsql/client";

// A database created before the `favorite` column existed must be upgraded in place.
const file = `${process.env.TMPDIR ?? "/tmp"}/timy-migrate-${process.pid}.db`;
process.env.TURSO_DATABASE_URL = `file:${file}`;
const old = createClient({ url: `file:${file}` });
await old.executeMultiple(`
  CREATE TABLE customers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT, notes TEXT, currency TEXT NOT NULL DEFAULT 'USD', rate REAL, archived INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE TABLE projects (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER NOT NULL, name TEXT NOT NULL, rate REAL, currency TEXT, billable INTEGER NOT NULL DEFAULT 1, color TEXT NOT NULL DEFAULT '#6366f1', archived INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')));
  INSERT INTO customers (name) VALUES ('Acme');
  INSERT INTO projects (customer_id, name) VALUES (1, 'Old project');
`);
old.close();

test("favorite column is added to an existing database", async () => {
  const { db, PROJECT_SELECT } = await import("../src/lib/db.ts");
  const row = await db.get<{ favorite: number }>(`${PROJECT_SELECT} WHERE p.name = 'Old project'`);
  assert.equal(row?.favorite, 0);
  await db.run("UPDATE projects SET favorite = 1 WHERE name = 'Old project'");
  assert.equal((await db.get<{ favorite: number }>("SELECT favorite FROM projects"))?.favorite, 1);
});

process.on("exit", () => { for (const s of ["", "-wal", "-shm"]) fs.rmSync(file + s, { force: true }); });
