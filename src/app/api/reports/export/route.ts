import { route } from "@/lib/api";
import { reportEntries } from "@/lib/reports-query";
import { buildWorkbook, type XlsxRow } from "@/lib/xlsx";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  const { from, to, entries } = await reportEntries<XlsxRow>(req);
  const file = await buildWorkbook(entries);
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="timy-${from}_${to}.xlsx"`,
    },
  });
});
