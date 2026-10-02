import { route } from "@/lib/api";
import { tx } from "@/lib/db";
import { stopRunningTimer } from "@/lib/timer";

export const POST = route(async () => (await tx((q) => stopRunningTimer(q))) ?? null);
