import { test } from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { buildWorkbook, type XlsxRow } from "../src/lib/xlsx.ts";

const row = (o: Partial<XlsxRow>): XlsxRow => ({
  project_name: "BA and Eng", customer_name: "Shortical", description: "x", date: "2026-09-24", start_time: "15:00",
  duration_min: 45, billable: 1, rate: 530, currency: "ILS", amount: 397.5, ...o,
});

async function load(rows: XlsxRow[]) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load((await buildWorkbook(rows)) as never);
  return wb;
}

test("xlsx matches the sheet layout", async () => {
  const wb = await load([
    row({}),
    row({ date: "2026-09-22", start_time: "11:45", duration_min: 600, amount: 5300, description: "later" }),
    row({ date: "2026-09-25", start_time: "23:30", duration_min: 60, amount: 530 }),
  ]);
  const ws = wb.getWorksheet("ILS")!;
  assert.deepEqual((ws.getRow(1).values as unknown[]).slice(1), [
    "Project", "Client", "Description", "Start Date", "Start Time", "End Date", "End Time", "Duration (h)", "Duration (decimal)", "Billable Rate (ILS)", "Billable Amount (ILS)",
  ]);
  // newest first
  assert.equal((ws.getRow(2).getCell(4).value as Date).toISOString().slice(0, 10), "2026-09-25");
  assert.equal((ws.getRow(4).getCell(4).value as Date).toISOString().slice(0, 10), "2026-09-22");
  // midnight rollover: 23:30 + 1h => 26/09 00:30
  assert.equal((ws.getRow(2).getCell(6).value as Date).toISOString().slice(0, 10), "2026-09-26");
  const timeMin = (v: unknown) => (v instanceof Date ? Math.round((v.getTime() - Date.UTC(1899, 11, 30)) / 60000) : Math.round((v as number) * 1440));
  assert.equal(timeMin(ws.getRow(2).getCell(7).value), 30);
  assert.equal(ws.getRow(3).getCell(9).value, 0.75);
  // totals row
  const t = ws.getRow(5);
  assert.equal((t.getCell(9).value as { result: number }).result, 0.75 + 10 + 1);
  assert.equal((t.getCell(11).value as { result: number }).result, 397.5 + 5300 + 530);
});

test("one sheet per currency, non-billable has zero rate", async () => {
  const wb = await load([row({}), row({ currency: "USD", rate: 100, amount: 75 }), row({ billable: 0, amount: 0 })]);
  assert.deepEqual(wb.worksheets.map((w) => w.name).sort(), ["ILS", "USD"]);
  assert.equal(wb.getWorksheet("ILS")!.getRow(3).getCell(10).value, 0);
  assert.equal(wb.getWorksheet("USD")!.getRow(1).getCell(10).value, "Billable Rate (USD)");
});
