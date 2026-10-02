import { HttpError, idOf, route, setClause } from "@/lib/api";
import { db } from "@/lib/db";
import { customerUpdate } from "@/lib/schemas";

export const PATCH = route<{ id: string }>(async (req, p) => {
  const id = idOf(p);
  const { sql, params } = setClause(customerUpdate.parse(await req.json()), ["name", "email", "notes", "currency", "rate", "archived", "color"]);
  if (!(await db.run(`UPDATE customers SET ${sql} WHERE id = @id`, { ...params, id } as never)).changes) throw new HttpError(404, "Not found");
  return db.get("SELECT * FROM customers WHERE id = ?", [id]);
});

export const DELETE = route<{ id: string }>(async (_req, p) => {
  const id = idOf(p);
  const used = await db.get<{ n: number }>("SELECT COUNT(*) n FROM entries e JOIN projects p ON p.id = e.project_id WHERE p.customer_id = ?", [id]);
  if (used?.n) throw new HttpError(409, `This customer has ${used.n} time entries. Archive it instead of deleting.`);
  await db.run("DELETE FROM customers WHERE id = ?", [id]);
});
