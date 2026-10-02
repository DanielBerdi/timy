// Pure aggregation for reports. Money is never converted between currencies:
// every total is kept per currency.

export type ReportRow = {
  customer_id: number; customer_name: string; project_id: number; project_name: string;
  date: string; duration_min: number; billable: number; currency: string; amount: number;
};

export type Bucket = { key: string; label: string; minutes: number; billable_minutes: number; amounts: Record<string, number> };

function add(map: Map<string, Bucket>, key: string, label: string, r: ReportRow) {
  let b = map.get(key);
  if (!b) map.set(key, (b = { key, label, minutes: 0, billable_minutes: 0, amounts: {} }));
  b.minutes += r.duration_min;
  if (r.billable) b.billable_minutes += r.duration_min;
  if (r.amount) b.amounts[r.currency] = Math.round(((b.amounts[r.currency] ?? 0) + r.amount) * 100) / 100;
}

export function summarize(rows: ReportRow[]) {
  const customers = new Map<string, Bucket>();
  const projects = new Map<string, Bucket>();
  const days = new Map<string, Bucket>();
  const total = new Map<string, Bucket>();
  for (const r of rows) {
    add(customers, String(r.customer_id), r.customer_name, r);
    add(projects, String(r.project_id), `${r.customer_name} / ${r.project_name}`, r);
    add(days, r.date, r.date, r);
    add(total, "all", "Total", r);
  }
  const sorted = (m: Map<string, Bucket>, by: "label" | "key") => [...m.values()].sort((a, b) => a[by].localeCompare(b[by]));
  return {
    total: total.get("all") ?? { key: "all", label: "Total", minutes: 0, billable_minutes: 0, amounts: {} },
    byCustomer: sorted(customers, "label"),
    byProject: sorted(projects, "label"),
    byDay: sorted(days, "key"),
  };
}

export function toCsv(rows: (string | number)[][]): string {
  return rows.map((r) => r.map((v) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(",")).join("\n");
}
