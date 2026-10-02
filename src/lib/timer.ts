import { db, ENTRY_SELECT } from "./db";

/** Stops the running timer (if any), storing elapsed minutes (min 1). Returns the finished entry. */
export function stopRunningTimer() {
  const running = db().prepare("SELECT id, timer_started_at FROM entries WHERE timer_started_at IS NOT NULL").get() as { id: number; timer_started_at: string } | undefined;
  if (!running) return undefined;
  const minutes = Math.max(1, Math.round((Date.now() - Date.parse(running.timer_started_at)) / 60000));
  db().prepare("UPDATE entries SET duration_min = ?, timer_started_at = NULL WHERE id = ?").run(Math.min(minutes, 24 * 60), running.id);
  return db().prepare(`${ENTRY_SELECT} WHERE e.id = ?`).get(running.id);
}
