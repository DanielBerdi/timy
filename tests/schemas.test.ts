import { test } from "node:test";
import assert from "node:assert/strict";
import { customerUpdate, entryUpdate, projectUpdate, entryCreate } from "../src/lib/schemas.ts";

test("partial updates only contain the fields that were sent", () => {
  assert.deepEqual(entryUpdate.parse({ description: "x" }), { description: "x" });
  assert.deepEqual(customerUpdate.parse({ name: "Acme" }), { name: "Acme" });
  assert.deepEqual(projectUpdate.parse({ name: "P" }), { name: "P" });
  assert.deepEqual(entryUpdate.parse({ start_time: null }), { start_time: null });
});

test("create still applies defaults", () => {
  const e = entryCreate.parse({ project_id: 1, date: "2026-10-01" });
  assert.deepEqual([e.start_time, e.duration_min, e.description, e.billable], [null, 0, "", true]);
});
