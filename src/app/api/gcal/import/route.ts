import { HttpError, route } from "@/lib/api";
import { db, ENTRY_SELECT } from "@/lib/db";
import { gcalImport } from "@/lib/schemas";

export const POST = route(async (req) => {
  const d = gcalImport.parse(await req.json());
  if (!db().prepare("SELECT 1 FROM projects WHERE id = ?").get(d.project_id)) throw new HttpError(400, "Unknown project");
  const ins = db().prepare("INSERT OR IGNORE INTO entries (project_id, date, start_time, duration_min, description, gcal_event_id) VALUES (?, ?, ?, ?, ?, ?)");
  const ids: number[] = [];
  db().transaction(() => {
    for (const e of d.events) {
      const r = ins.run(d.project_id, e.date, e.start_time, e.duration_min, e.title, e.id);
      if (r.changes) ids.push(Number(r.lastInsertRowid));
    }
  })();
  const rows = ids.length ? db().prepare(`${ENTRY_SELECT} WHERE e.id IN (${ids.map(() => "?").join(",")})`).all(...ids) : [];
  return { imported: rows.length, skipped: d.events.length - rows.length, entries: rows };
});
