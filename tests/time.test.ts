import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDuration, formatDuration, startOfWeek, addDays, monthGrid, minToTime, rangeFromDrag } from "../src/lib/time.ts";

test("parseDuration", () => {
  assert.equal(parseDuration("1:30"), 90);
  assert.equal(parseDuration("1.5"), 90);
  assert.equal(parseDuration("1,5h"), 90);
  assert.equal(parseDuration("2h"), 120);
  assert.equal(parseDuration("45m"), 45);
  assert.equal(parseDuration("1h30m"), 90);
  assert.equal(parseDuration("1h 15"), 75);
  assert.equal(parseDuration("abc"), null);
  assert.equal(parseDuration(""), null);
});

test("formatDuration", () => {
  assert.equal(formatDuration(90), "1:30");
  assert.equal(formatDuration(5), "0:05");
});

test("weeks start on Sunday", () => {
  assert.equal(startOfWeek("2026-10-02"), "2026-09-27"); // Friday -> Sunday
  assert.equal(startOfWeek("2026-09-27"), "2026-09-27");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
});

test("monthGrid covers the month in whole weeks", () => {
  const g = monthGrid("2026-10-15");
  assert.ok(g.every((w) => w.length === 7));
  assert.equal(g[0][0], "2026-09-27");
  assert.ok(g.flat().includes("2026-10-31"));
});

test("minToTime clamps", () => {
  assert.equal(minToTime(9 * 60 + 5), "09:05");
  assert.equal(minToTime(99999), "23:59");
});

test("rangeFromDrag snaps to 15 min, works both ways and clamps", () => {
  assert.deepEqual(rangeFromDrag(8 * 60 + 17, 15 * 60 + 25), { start: 8 * 60 + 15, duration: 7 * 60 + 15 });
  assert.deepEqual(rangeFromDrag(15 * 60 + 25, 8 * 60 + 17), { start: 8 * 60 + 15, duration: 7 * 60 + 15 });
  assert.deepEqual(rangeFromDrag(5 * 60, 7 * 60, 6 * 60, 22 * 60), { start: 6 * 60, duration: 60 });
  assert.deepEqual(rangeFromDrag(21 * 60, 23 * 60, 6 * 60, 22 * 60), { start: 21 * 60, duration: 60 });
});
