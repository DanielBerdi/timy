import { ENTRY_SELECT, type Q } from "./db";

/** Stops the running timer (if any), storing elapsed minutes (min 1). Returns the finished entry. */
export async function stopRunningTimer(q: Q) {
  const running = await q.get<{ id: number; timer_started_at: string }>("SELECT id, timer_started_at FROM entries WHERE timer_started_at IS NOT NULL");
  if (!running) return undefined;
  const minutes = Math.max(1, Math.round((Date.now() - Date.parse(running.timer_started_at)) / 60000));
  await q.run("UPDATE entries SET duration_min = ?, timer_started_at = NULL WHERE id = ?", [Math.min(minutes, 24 * 60), running.id]);
  return q.get(`${ENTRY_SELECT} WHERE e.id = ?`, [running.id]);
}
