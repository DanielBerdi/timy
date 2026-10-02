import { HttpError, route } from "@/lib/api";
import { db, PROJECT_SELECT } from "@/lib/db";
import { projectCreate } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export const GET = route(() => db().prepare(`${PROJECT_SELECT} ORDER BY p.archived, c.name COLLATE NOCASE, p.name COLLATE NOCASE`).all());

export const POST = route(async (req) => {
  const d = projectCreate.parse(await req.json());
  if (!db().prepare("SELECT 1 FROM customers WHERE id = ?").get(d.customer_id)) throw new HttpError(400, "Unknown customer");
  const r = db().prepare("INSERT INTO projects (customer_id, name, rate, currency, billable, color) VALUES (@customer_id, @name, @rate, @currency, @billable, @color)")
    .run({ ...d, billable: d.billable ? 1 : 0 });
  return db().prepare(`${PROJECT_SELECT} WHERE p.id = ?`).get(r.lastInsertRowid);
});
