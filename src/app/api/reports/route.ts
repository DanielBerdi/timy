import { HttpError, route } from "@/lib/api";
import { db, ENTRY_SELECT } from "@/lib/db";
import { summarize, type ReportRow } from "@/lib/reports";

export const dynamic = "force-dynamic";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const GET = route((req) => {
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
  const entries = db().prepare(`${ENTRY_SELECT} WHERE ${where.join(" AND ")} ORDER BY e.date, e.start_time IS NULL, e.start_time, e.id`).all(params) as (ReportRow & Record<string, unknown>)[];
  return { entries, ...summarize(entries) };
});
