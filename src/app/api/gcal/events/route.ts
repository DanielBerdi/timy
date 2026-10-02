import { HttpError, route } from "@/lib/api";
import { db } from "@/lib/db";
import { listEvents } from "@/lib/google";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  const q = new URL(req.url).searchParams;
  const from = q.get("from") ?? "";
  const to = q.get("to") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) throw new HttpError(400, "from/to required");
  const events = await listEvents(from, to);
  const imported = new Set((db().prepare("SELECT gcal_event_id FROM entries WHERE gcal_event_id IS NOT NULL AND date BETWEEN ? AND ?").all(from, to) as { gcal_event_id: string }[]).map((r) => r.gcal_event_id));
  return events.map((e) => ({ ...e, imported: imported.has(e.id) }));
});
