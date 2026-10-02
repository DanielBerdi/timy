import { HttpError } from "./api";
import { db, ENTRY_SELECT } from "./db";
import type { ReportRow } from "./reports";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Entries for the report filters in the query string (finished timers only). */
export async function reportEntries<T = ReportRow & Record<string, unknown>>(req: Request): Promise<{ from: string; to: string; entries: T[] }> {
  const q = new URL(req.url).searchParams;
  const from = q.get("from") ?? "";
  const to = q.get("to") ?? "";
  if (!DATE.test(from) || !DATE.test(to)) throw new HttpError(400, "from/to required");
  const where = ["e.date >= @from", "e.date <= @to", "e.timer_started_at IS NULL"];
  const params: Record<string, string | number> = { from, to };
  if (q.get("customer_id")) { where.push("c.id = @customer_id"); params.customer_id = Number(q.get("customer_id")); }
  if (q.get("project_id")) { where.push("p.id = @project_id"); params.project_id = Number(q.get("project_id")); }
  if (q.get("billable") === "1") where.push("e.billable = 1 AND p.billable = 1");
  if (q.get("billable") === "0") where.push("(e.billable = 0 OR p.billable = 0)");
  const entries = await db.all<T>(`${ENTRY_SELECT} WHERE ${where.join(" AND ")} ORDER BY e.date, e.start_time IS NULL, e.start_time, e.id`, params);
  return { from, to, entries };
}
