import { route } from "@/lib/api";
import { summarize } from "@/lib/reports";
import { reportEntries } from "@/lib/reports-query";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  const { entries } = await reportEntries(req);
  return { entries, ...summarize(entries) };
});
