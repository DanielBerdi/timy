// Pure date/time helpers. Dates are "YYYY-MM-DD" strings, times are "HH:MM"
// strings, durations are integer minutes. No timezone maths: the app treats
// everything as floating wall-clock time.

export function parseDuration(input: string): number | null {
  const s = input.trim().toLowerCase().replace(/,/g, ".");
  if (!s) return null;
  let m = s.match(/^(\d+):(\d{1,2})$/); // 1:30
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  m = s.match(/^(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hours?)?$/); // 1.5 | 2h  (bare number = hours)
  if (m) return Math.round(Number(m[1]) * 60);
  m = s.match(/^(\d+)\s*(?:m|min|mins|minutes?)$/); // 45m
  if (m) return Number(m[1]);
  m = s.match(/^(\d+)\s*h(?:r|rs|ours?)?\s*(\d+)\s*(?:m|min|mins|minutes?)?$/); // 1h30m, 1h 30
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  return null;
}

export function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}:${String(m).padStart(2, "0")}`;
}

export function hours(min: number): number {
  return Math.round((min / 60) * 100) / 100;
}

export function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function minToTime(min: number): string {
  const c = Math.max(0, Math.min(24 * 60 - 1, Math.round(min)));
  return `${String(Math.floor(c / 60)).padStart(2, "0")}:${String(c % 60).padStart(2, "0")}`;
}

function parts(d: string): [number, number, number] {
  const [y, m, day] = d.split("-").map(Number);
  return [y, m, day];
}

export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function today(): string {
  return toISODate(new Date());
}

export function addDays(d: string, n: number): string {
  const [y, m, day] = parts(d);
  return toISODate(new Date(y, m - 1, day + n));
}

export function addMonths(d: string, n: number): string {
  const [y, m] = parts(d);
  return toISODate(new Date(y, m - 1 + n, 1));
}

/** Weeks start on Sunday (Israel). */
export function startOfWeek(d: string): string {
  const [y, m, day] = parts(d);
  return addDays(d, -new Date(y, m - 1, day).getDay());
}

export function startOfMonth(d: string): string {
  const [y, m] = parts(d);
  return toISODate(new Date(y, m - 1, 1));
}

export function endOfMonth(d: string): string {
  const [y, m] = parts(d);
  return toISODate(new Date(y, m, 0));
}

export function weekDays(d: string): string[] {
  const s = startOfWeek(d);
  return Array.from({ length: 7 }, (_, i) => addDays(s, i));
}

/** Rows of 7 dates covering the month containing `d`. */
export function monthGrid(d: string): string[][] {
  const first = startOfMonth(d);
  const last = endOfMonth(d);
  const weeks: string[][] = [];
  for (let s = startOfWeek(first); s <= last; s = addDays(s, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(s, i)));
  }
  return weeks;
}

export function dow(d: string): number {
  const [y, m, day] = parts(d);
  return new Date(y, m - 1, day).getDay();
}

export function formatDate(d: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }): string {
  const [y, m, day] = parts(d);
  return new Intl.DateTimeFormat("en-GB", opts).format(new Date(y, m - 1, day));
}

export function money(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
}

/**
 * Turns a drag between two minute-of-day positions into a 15-minute-snapped range.
 * Works in either direction; the result is clamped to [lo, hi].
 */
export function rangeFromDrag(a: number, b: number, lo = 0, hi = 24 * 60, step = 15): { start: number; duration: number } {
  const clamp = (v: number) => Math.max(lo, Math.min(hi, v));
  const start = clamp(Math.floor(Math.min(a, b) / step) * step);
  const end = clamp(Math.ceil(Math.max(a, b) / step) * step);
  return { start, duration: Math.max(0, end - start) };
}
