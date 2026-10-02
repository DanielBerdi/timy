import { test } from "node:test";
import assert from "node:assert/strict";
import { summarize, toCsv, type ReportRow } from "../src/lib/reports.ts";

const row = (o: Partial<ReportRow>): ReportRow => ({
  customer_id: 1, customer_name: "Acme", project_id: 1, project_name: "Web", date: "2026-10-01",
  duration_min: 60, billable: 1, currency: "USD", amount: 100, ...o,
});

test("summarize keeps currencies separate", () => {
  const s = summarize([row({}), row({ duration_min: 30, amount: 50 }), row({ customer_id: 2, customer_name: "Beta", project_id: 2, currency: "ILS", amount: 300, date: "2026-10-02" }), row({ billable: 0, amount: 0, duration_min: 15 })]);
  assert.equal(s.total.minutes, 165);
  assert.equal(s.total.billable_minutes, 150);
  assert.deepEqual(s.total.amounts, { USD: 150, ILS: 300 });
  assert.equal(s.byCustomer.length, 2);
  assert.deepEqual(s.byDay.map((d) => d.key), ["2026-10-01", "2026-10-02"]);
});

test("summarize of nothing is zero", () => {
  assert.equal(summarize([]).total.minutes, 0);
});

test("toCsv escapes", () => {
  assert.equal(toCsv([["a", 'b"c', "d,e"]]), 'a,"b""c","d,e"');
});
