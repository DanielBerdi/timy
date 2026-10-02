import { route } from "@/lib/api";
import { stopRunningTimer } from "@/lib/timer";

export const POST = route(() => stopRunningTimer() ?? null);
