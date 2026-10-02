import { HttpError, route } from "@/lib/api";
import { db, ENTRY_SELECT } from "@/lib/db";
import { entryCreate } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export const GET = route((req) => {
  const q = new URL(req.url).searchParams;
  const where: string[] = [];
  const params: Record<string, string | number> = {};
  if (q.get("from")) { where.push("e.date >= @from"); params.from = q.get("from")!; }
  if (q.get("to")) { where.push("e.date <= @to"); params.to = q.get("to")!; }
  if (q.get("project_id")) { where.push("e.project_id = @project_id"); params.project_id = Number(q.get("project_id")); }
  if (q.get("customer_id")) { where.push("c.id = @customer_id"); params.customer_id = Number(q.get("customer_id")); }
  return db.all(`${ENTRY_SELECT} ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY e.date, e.start_time IS NULL, e.start_time, e.id`, params);
});

export const POST = route(async (req) => {
  const d = entryCreate.parse(await req.json());
  if (!(await db.get("SELECT 1 FROM projects WHERE id = ?", [d.project_id]))) throw new HttpError(400, "Unknown project");
  const r = await db.run("INSERT INTO entries (project_id, date, start_time, duration_min, description, billable) VALUES (@project_id, @date, @start_time, @duration_min, @description, @billable)",
    { ...d, billable: d.billable ? 1 : 0 });
  return db.get(`${ENTRY_SELECT} WHERE e.id = ?`, [r.lastInsertRowid]);
});
