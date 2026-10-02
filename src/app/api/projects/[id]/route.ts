import { HttpError, idOf, route, setClause } from "@/lib/api";
import { db, PROJECT_SELECT } from "@/lib/db";
import { projectUpdate } from "@/lib/schemas";

export const PATCH = route<{ id: string }>(async (req, p) => {
  const id = idOf(p);
  const { sql, params } = setClause(projectUpdate.parse(await req.json()), ["name", "rate", "currency", "billable", "color", "archived", "favorite"]);
  if (!(await db.run(`UPDATE projects SET ${sql} WHERE id = @id`, { ...params, id } as never)).changes) throw new HttpError(404, "Not found");
  return db.get(`${PROJECT_SELECT} WHERE p.id = ?`, [id]);
});

export const DELETE = route<{ id: string }>(async (_req, p) => {
  const id = idOf(p);
  const used = await db.get<{ n: number }>("SELECT COUNT(*) n FROM entries WHERE project_id = ?", [id]);
  if (used?.n) throw new HttpError(409, `This project has ${used.n} time entries. Archive it instead of deleting.`);
  await db.run("DELETE FROM projects WHERE id = ?", [id]);
});
