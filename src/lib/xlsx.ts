import ExcelJS from "exceljs";

export type XlsxRow = {
  project_name: string; customer_name: string; description: string; date: string; start_time: string | null;
  duration_min: number; billable: number; rate: number; currency: string; amount: number;
};

const BLUE = { argb: "FF0070C0" };

function utcDate(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

function addDaysIso(d: string, n: number) {
  const x = utcDate(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

/** One sheet per currency (never converted); newest entry first, totals row at the bottom. */
export async function buildWorkbook(rows: XlsxRow[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const byCur = new Map<string, XlsxRow[]>();
  for (const r of rows) byCur.set(r.currency, [...(byCur.get(r.currency) ?? []), r]);
  if (!byCur.size) byCur.set("ILS", []);

  for (const [cur, list] of byCur) {
    const ws = wb.addWorksheet(cur);
    ws.columns = [
      { header: "Project", width: 18 }, { header: "Client", width: 14 }, { header: "Description", width: 60 },
      { header: "Start Date", width: 12 }, { header: "Start Time", width: 11 }, { header: "End Date", width: 12 }, { header: "End Time", width: 10 },
      { header: "Duration (h)", width: 13 }, { header: "Duration (decimal)", width: 18 },
      { header: `Billable Rate (${cur})`, width: 20 }, { header: `Billable Amount (${cur})`, width: 22 },
    ];
    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: "frozen", ySplit: 1 }];

    const sorted = [...list].sort((a, b) => b.date.localeCompare(a.date) || (b.start_time ?? "").localeCompare(a.start_time ?? ""));
    let totalHours = 0, totalAmount = 0;
    for (const r of sorted) {
      const startMin = r.start_time ? Number(r.start_time.slice(0, 2)) * 60 + Number(r.start_time.slice(3)) : null;
      const endAbs = startMin === null ? null : startMin + r.duration_min;
      const row = ws.addRow([
        r.project_name, r.customer_name, r.description,
        utcDate(r.date), startMin === null ? null : startMin / 1440,
        endAbs === null ? utcDate(r.date) : addDaysIso(r.date, Math.floor(endAbs / 1440)), endAbs === null ? null : (endAbs % 1440) / 1440,
        r.duration_min / 1440, r.duration_min / 60,
        r.billable ? r.rate : 0, r.amount,
      ]);
      row.getCell(4).numFmt = "dd/mm/yyyy"; row.getCell(6).numFmt = "dd/mm/yyyy";
      row.getCell(5).numFmt = "hh:mm"; row.getCell(7).numFmt = "hh:mm";
      row.getCell(8).numFmt = "[h]:mm";
      row.getCell(9).numFmt = "General";
      row.getCell(10).numFmt = "General";
      row.getCell(11).numFmt = "#,##0.0";
      totalHours += r.duration_min / 60;
      totalAmount += r.amount;
    }
    if (sorted.length) {
      const n = sorted.length + 1;
      const t = ws.addRow([]);
      t.getCell(9).value = { formula: `SUM(I2:I${n})`, result: totalHours };
      t.getCell(11).value = { formula: `SUM(K2:K${n})`, result: totalAmount };
      t.getCell(9).numFmt = "0.0"; t.getCell(11).numFmt = "#,##0.0";
      for (const c of [9, 11]) t.getCell(c).font = { bold: true, color: BLUE, size: 9 };
    }
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}
