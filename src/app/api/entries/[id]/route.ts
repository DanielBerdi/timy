import { HttpError, idOf, route, setClause } from "@/lib/api";
import { db, ENTRY_SELECT } from "@/lib/db";
import { entryUpdate } from "@/lib/schemas";

export const PATCH = route<{ id: string }>(async (req, p) => {
  const id = idOf(p);
  const { sql, params } = setClause(entryUpdate.parse(await req.json()), ["project_id", "date", "start_time", "duration_min", "description", "billable"]);
  if ("project_id" in params && !db().prepare("SELECT 1 FROM projects WHERE id = ?").get(params.project_id)) throw new HttpError(400, "Unknown project");
  if (!db().prepare(`UPDATE entries SET ${sql} WHERE id = @id`).run({ ...params, id }).changes) throw new HttpError(404, "Not found");
  return db().prepare(`${ENTRY_SELECT} WHERE e.id = ?`).get(id);
});

export const DELETE = route<{ id: string }>((_req, p) => {
  db().prepare("DELETE FROM entries WHERE id = ?").run(idOf(p));
});
