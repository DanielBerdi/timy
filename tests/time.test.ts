import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDuration, formatDuration, startOfWeek, addDays, monthGrid, minToTime, rangeFromDrag, endTime, durationBetween, layoutOverlaps } from "../src/lib/time.ts";

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

test("endTime / durationBetween", () => {
  assert.equal(endTime("15:00", 45), "15:45");
  assert.equal(endTime("23:30", 60), "00:30");
  assert.equal(durationBetween("08:15", "15:30"), 435);
  assert.equal(durationBetween("10:00", "10:00"), null);
  assert.equal(durationBetween("10:00", "09:00"), null);
});

test("layoutOverlaps puts simultaneous meetings in columns", () => {
  const l = layoutOverlaps([
    { id: 1, start: 720, end: 780 }, { id: 2, start: 720, end: 750 }, { id: 3, start: 750, end: 810 }, // cluster of 2 cols
    { id: 4, start: 900, end: 960 },                                                                  // alone
  ]);
  assert.deepEqual(l.get(1), { col: 0, cols: 2 });
  assert.deepEqual(l.get(2), { col: 1, cols: 2 });
  assert.deepEqual(l.get(3), { col: 1, cols: 2 }); // reuses the column freed at 12:30
  assert.deepEqual(l.get(4), { col: 0, cols: 1 });
});
