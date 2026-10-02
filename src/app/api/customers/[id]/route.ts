import { HttpError, idOf, route, setClause } from "@/lib/api";
import { db } from "@/lib/db";
import { customerUpdate } from "@/lib/schemas";

export const PATCH = route<{ id: string }>(async (req, p) => {
  const id = idOf(p);
  const { sql, params } = setClause(customerUpdate.parse(await req.json()), ["name", "email", "notes", "currency", "rate", "archived"]);
  if (!db().prepare(`UPDATE customers SET ${sql} WHERE id = @id`).run({ ...params, id }).changes) throw new HttpError(404, "Not found");
  return db().prepare("SELECT * FROM customers WHERE id = ?").get(id);
});

export const DELETE = route<{ id: string }>((_req, p) => {
  const id = idOf(p);
  const used = db().prepare("SELECT COUNT(*) n FROM entries e JOIN projects p ON p.id = e.project_id WHERE p.customer_id = ?").get(id) as { n: number };
  if (used.n) throw new HttpError(409, `This customer has ${used.n} time entries. Archive it instead of deleting.`);
  db().prepare("DELETE FROM customers WHERE id = ?").run(id);
});
