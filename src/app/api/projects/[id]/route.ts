import { HttpError, idOf, route, setClause } from "@/lib/api";
import { db, PROJECT_SELECT } from "@/lib/db";
import { projectUpdate } from "@/lib/schemas";

export const PATCH = route<{ id: string }>(async (req, p) => {
  const id = idOf(p);
  const { sql, params } = setClause(projectUpdate.parse(await req.json()), ["name", "rate", "currency", "billable", "color", "archived"]);
  if (!db().prepare(`UPDATE projects SET ${sql} WHERE id = @id`).run({ ...params, id }).changes) throw new HttpError(404, "Not found");
  return db().prepare(`${PROJECT_SELECT} WHERE p.id = ?`).get(id);
});

export const DELETE = route<{ id: string }>((_req, p) => {
  const id = idOf(p);
  const used = db().prepare("SELECT COUNT(*) n FROM entries WHERE project_id = ?").get(id) as { n: number };
  if (used.n) throw new HttpError(409, `This project has ${used.n} time entries. Archive it instead of deleting.`);
  db().prepare("DELETE FROM projects WHERE id = ?").run(id);
});
