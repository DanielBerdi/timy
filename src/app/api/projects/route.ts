import { HttpError, route } from "@/lib/api";
import { db, PROJECT_SELECT } from "@/lib/db";
import { projectCreate } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export const GET = route(() => db.all(`${PROJECT_SELECT} ORDER BY p.archived, c.name COLLATE NOCASE, p.name COLLATE NOCASE`));

export const POST = route(async (req) => {
  const d = projectCreate.parse(await req.json());
  if (!(await db.get("SELECT 1 FROM customers WHERE id = ?", [d.customer_id]))) throw new HttpError(400, "Unknown customer");
  const r = await db.run("INSERT INTO projects (customer_id, name, rate, currency, billable, color) VALUES (@customer_id, @name, @rate, @currency, @billable, @color)",
    { ...d, billable: d.billable ? 1 : 0 });
  return db.get(`${PROJECT_SELECT} WHERE p.id = ?`, [r.lastInsertRowid]);
});
