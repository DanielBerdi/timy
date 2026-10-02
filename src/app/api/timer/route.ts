import { route } from "@/lib/api";
import { db, ENTRY_SELECT } from "@/lib/db";

export const dynamic = "force-dynamic";

export const GET = route(() => db().prepare(`${ENTRY_SELECT} WHERE e.timer_started_at IS NOT NULL LIMIT 1`).get() ?? null);
