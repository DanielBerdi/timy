import { test } from "node:test";
import assert from "node:assert/strict";

// Use a throwaway file DB so transactions (separate connections) see the same data.
process.env.TURSO_DATABASE_URL = `file:${process.env.TMPDIR ?? "/tmp"}/timy-test-${process.pid}.db`;
const { db, tx, ENTRY_SELECT, getSetting, setSetting } = await import("../src/lib/db.ts");

test("project rate overrides customer rate; currency follows source", async () => {
  await db.run("INSERT INTO customers (name, currency, rate) VALUES ('Acme','ILS',400)");
  await db.run("INSERT INTO projects (customer_id, name) VALUES (1,'inherits')");
  await db.run("INSERT INTO projects (customer_id, name, rate, currency) VALUES (1,'override',100,'USD')");
  await db.run("INSERT INTO projects (customer_id, name, billable) VALUES (1,'free',0)");
  await db.run("INSERT INTO entries (project_id, date, duration_min) VALUES (1,'2026-10-01',90),(2,'2026-10-01',60),(3,'2026-10-01',60)");
  const rows = await db.all<{ currency: string; amount: number }>(`${ENTRY_SELECT} ORDER BY e.id`);
  assert.deepEqual(rows.map((r) => [r.currency, r.amount]), [["ILS", 600], ["USD", 100], ["ILS", 0]]);
});

test("named params, dedupe and foreign keys", async () => {
  const ins = "INSERT OR IGNORE INTO entries (project_id, date, gcal_event_id) VALUES (@p, @d, @g)";
  assert.equal((await db.run(ins, { p: 1, d: "2026-10-02", g: "evt1" })).changes, 1);
  assert.equal((await db.run(ins, { p: 1, d: "2026-10-02", g: "evt1" })).changes, 0);
  await assert.rejects(db.run("INSERT INTO entries (project_id, date) VALUES (999,'2026-10-02')"));
});

test("transactions roll back on error", async () => {
  await assert.rejects(tx(async (q) => { await q.run("INSERT INTO settings (key, value) VALUES ('x','1')"); throw new Error("boom"); }));
  assert.equal(await getSetting("x"), undefined);
  await setSetting("k", "v1"); await setSetting("k", "v2");
  assert.equal(await getSetting("k"), "v2");
});

import fs from "node:fs";
process.on("exit", () => { for (const s of ["", "-wal", "-shm", "-journal"]) fs.rmSync(process.env.TURSO_DATABASE_URL!.slice(5) + s, { force: true }); });
