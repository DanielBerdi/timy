import { HttpError, idOf, route, setClause } from "@/lib/api";
import { db, ENTRY_SELECT } from "@/lib/db";
import { entryUpdate } from "@/lib/schemas";

export const PATCH = route<{ id: string }>(async (req, p) => {
  const id = idOf(p);
  const { sql, params } = setClause(entryUpdate.parse(await req.json()), ["project_id", "date", "start_time", "duration_min", "description", "billable"]);
  if ("project_id" in params && !(await db.get("SELECT 1 FROM projects WHERE id = ?", [params.project_id as number]))) throw new HttpError(400, "Unknown project");
  if (!(await db.run(`UPDATE entries SET ${sql} WHERE id = @id`, { ...params, id } as never)).changes) throw new HttpError(404, "Not found");
  return db.get(`${ENTRY_SELECT} WHERE e.id = ?`, [id]);
});

export const DELETE = route<{ id: string }>(async (_req, p) => {
  await db.run("DELETE FROM entries WHERE id = ?", [idOf(p)]);
});
