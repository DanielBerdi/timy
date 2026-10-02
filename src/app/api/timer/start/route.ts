import { HttpError, route } from "@/lib/api";
import { db, ENTRY_SELECT } from "@/lib/db";
import { localParts } from "@/lib/google";
import { timerStart } from "@/lib/schemas";
import { stopRunningTimer } from "@/lib/timer";

export const POST = route(async (req) => {
  const d = timerStart.parse(await req.json());
  if (!db().prepare("SELECT 1 FROM projects WHERE id = ?").get(d.project_id)) throw new HttpError(400, "Unknown project");
  const now = new Date().toISOString();
  const { date, time } = localParts(now);
  return db().transaction(() => {
    stopRunningTimer();
    const r = db().prepare("INSERT INTO entries (project_id, date, start_time, duration_min, description, timer_started_at) VALUES (?, ?, ?, 0, ?, ?)")
      .run(d.project_id, date, time, d.description, now);
    return db().prepare(`${ENTRY_SELECT} WHERE e.id = ?`).get(r.lastInsertRowid);
  })();
});
