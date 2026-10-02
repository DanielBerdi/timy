import { HttpError, route } from "@/lib/api";
import { db, ENTRY_SELECT, tx } from "@/lib/db";
import { gcalImport } from "@/lib/schemas";

export const POST = route(async (req) => {
  const d = gcalImport.parse(await req.json());
  if (!(await db.get("SELECT 1 FROM projects WHERE id = ?", [d.project_id]))) throw new HttpError(400, "Unknown project");
  const ids = await tx(async (q) => {
    const out: number[] = [];
    for (const e of d.events) {
      const r = await q.run("INSERT OR IGNORE INTO entries (project_id, date, start_time, duration_min, description, gcal_event_id) VALUES (?, ?, ?, ?, ?, ?)",
        [d.project_id, e.date, e.start_time, e.duration_min, e.title, e.id]);
      if (r.changes) out.push(r.lastInsertRowid);
    }
    return out;
  });
  const rows = ids.length ? await db.all(`${ENTRY_SELECT} WHERE e.id IN (${ids.map(() => "?").join(",")})`, ids) : [];
  return { imported: rows.length, skipped: d.events.length - rows.length, entries: rows };
});
