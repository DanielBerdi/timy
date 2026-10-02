import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

// Effective-rate rules live in SQL; exercise them against an in-memory DB.
process.env.DATABASE_PATH = ":memory:";
const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");
const src = (await import("node:fs")).readFileSync(new URL("../src/lib/db.ts", import.meta.url), "utf8");
const schema = /const SCHEMA = `([\s\S]*?)`;/.exec(src)![1];
const entrySelect = /export const ENTRY_SELECT = `([\s\S]*?)`;/.exec(src)![1];

test("project rate overrides customer rate; currency follows source", () => {
  const d = new Database(":memory:");
  d.exec(schema);
  d.exec(`INSERT INTO customers (name, currency, rate) VALUES ('Acme','ILS',400);
          INSERT INTO projects (customer_id, name) VALUES (1,'inherits');
          INSERT INTO projects (customer_id, name, rate, currency) VALUES (1,'override',100,'USD');
          INSERT INTO projects (customer_id, name, billable) VALUES (1,'free',0);
          INSERT INTO entries (project_id, date, duration_min) VALUES (1,'2026-10-01',90),(2,'2026-10-01',60),(3,'2026-10-01',60);`);
  const rows = d.prepare(`${entrySelect} ORDER BY e.id`).all();
  assert.deepEqual(rows.map((r: any) => [r.currency, r.amount]), [["ILS", 600], ["USD", 100], ["ILS", 0]]);
});
