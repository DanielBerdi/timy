import { HttpError, route } from "@/lib/api";
import { db, ENTRY_SELECT, tx } from "@/lib/db";
import { localParts } from "@/lib/google";
import { timerStart } from "@/lib/schemas";
import { stopRunningTimer } from "@/lib/timer";

export const POST = route(async (req) => {
  const d = timerStart.parse(await req.json());
  if (!(await db.get("SELECT 1 FROM projects WHERE id = ?", [d.project_id]))) throw new HttpError(400, "Unknown project");
  const now = new Date().toISOString();
  const { date, time } = localParts(now);
  return tx(async (q) => {
    await stopRunningTimer(q);
    const r = await q.run("INSERT INTO entries (project_id, date, start_time, duration_min, description, timer_started_at) VALUES (?, ?, ?, 0, ?, ?)",
      [d.project_id, date, time, d.description, now]);
    return q.get(`${ENTRY_SELECT} WHERE e.id = ?`, [r.lastInsertRowid]);
  });
});
