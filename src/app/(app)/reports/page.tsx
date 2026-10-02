"use client";
import { useState } from "react";
import EntryRow from "@/components/EntryRow";
import { api, type Entry, useApi, useCustomers, useProjects } from "@/lib/client";
import { type Bucket, toCsv } from "@/lib/reports";
import { addDays, addMonths, endOfMonth, formatDate, formatDuration, hours, money, startOfMonth, startOfWeek, today } from "@/lib/time";

type Report = { entries: Entry[]; total: Bucket; byCustomer: Bucket[]; byProject: Bucket[]; byDay: Bucket[] };

export default function Reports() {
  const [from, setFrom] = useState(startOfMonth(today()));
  const [to, setTo] = useState(endOfMonth(today()));
  const [customer, setCustomer] = useState("");
  const [project, setProject] = useState("");
  const [billable, setBillable] = useState("");
  const [view, setView] = useState<"summary" | "detailed">("summary");
  const [err, setErr] = useState("");
  const { data: customers } = useCustomers();
  const { data: projects } = useProjects();
  const qs = new URLSearchParams({ from, to, ...(customer && { customer_id: customer }), ...(project && { project_id: project }), ...(billable && { billable }) });
  const { data, error, loading, reload } = useApi<Report>(from && to ? `/api/reports?${qs}` : null);

  const allProjects = (projects ?? []).filter((p) => !p.archived);
  async function save(fn: () => Promise<unknown>) {
    try { setErr(""); await fn(); await reload(); } catch (e) { setErr((e as Error).message); }
  }
  const preset = (f: string, t: string) => { setFrom(f); setTo(t); };
  const m = today();
  const lastMonth = addMonths(m, -1);

  function exportCsv() {
    if (!data) return;
    const csv = toCsv([
      ["Date", "Customer", "Project", "Description", "Start", "Hours", "Billable", "Rate", "Currency", "Amount"],
      ...data.entries.map((e) => [e.date, e.customer_name, e.project_name, e.description, e.start_time ?? "", hours(e.duration_min), e.billable ? "yes" : "no", e.rate, e.currency, e.amount]),
    ]);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    a.download = `timy-${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3"><h1 className="text-xl font-semibold">Reports</h1>
        <button className="btn ml-auto" disabled={!data?.entries.length} onClick={exportCsv}>Export CSV</button>
        <a className={`btn btn-primary ${data?.entries.length ? "" : "pointer-events-none opacity-50"}`} href={`/api/reports/export?${qs}`} download>Export Excel</a></div>
      <div className="card flex flex-wrap items-end gap-3 p-3">
        <div><label className="label">From</label><input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><label className="label">To</label><input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <div className="flex gap-1">
          <button className="btn" onClick={() => preset(startOfWeek(m), addDays(startOfWeek(m), 6))}>This week</button>
          <button className="btn" onClick={() => preset(startOfMonth(m), endOfMonth(m))}>This month</button>
          <button className="btn" onClick={() => preset(startOfMonth(lastMonth), endOfMonth(lastMonth))}>Last month</button>
        </div>
        <div><label className="label">Customer</label>
          <select className="input" value={customer} onChange={(e) => { setCustomer(e.target.value); setProject(""); }}><option value="">All</option>{customers?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div><label className="label">Project</label>
          <select className="input" value={project} onChange={(e) => setProject(e.target.value)}><option value="">All</option>{projects?.filter((p) => !customer || String(p.customer_id) === customer).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
        <div><label className="label">Billing</label>
          <select className="input" value={billable} onChange={(e) => setBillable(e.target.value)}><option value="">All</option><option value="1">Billable</option><option value="0">Non-billable</option></select></div>
      </div>
      {(error || err) && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error || err}</p>}
      {loading && !data && <p className="text-sm text-slate-500">Loading…</p>}
      {data && <>
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Total hours" value={`${formatDuration(data.total.minutes)} h`} />
          <Stat label="Billable hours" value={`${formatDuration(data.total.billable_minutes)} h`} />
          <Stat label="Revenue" value={Object.keys(data.total.amounts).length ? Object.entries(data.total.amounts).map(([c, v]) => money(v, c)).join(" + ") : "—"} />
        </div>
        <div className="inline-flex overflow-hidden rounded-md border border-slate-300">
          {(["summary", "detailed"] as const).map((v) => (
            <button key={v} className={`px-3 py-1.5 text-sm capitalize ${view === v ? "bg-indigo-600 text-[#fff]" : "bg-white hover:bg-slate-100"}`} onClick={() => setView(v)}>{v}</button>
          ))}
        </div>
        {view === "summary" ? <>
          <Breakdown title="By customer" rows={data.byCustomer} />
          <Breakdown title="By project" rows={data.byProject} />
          <Breakdown title="By day" rows={data.byDay} fmt={(k) => formatDate(k, { weekday: "short", day: "numeric", month: "short" })} />
        </> : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 text-left text-xs text-slate-500">
                <tr><th className="p-2">Date</th><th className="p-2">Customer</th><th className="p-2">Project</th><th className="p-2">Description</th><th className="p-2">Start</th><th className="p-2">End</th><th className="p-2">Duration</th><th className="p-2">$</th><th className="p-2 text-right">Rate</th><th className="p-2 text-right">Amount</th><th /></tr>
              </thead>
              <tbody>
                {data.entries.map((e) => (
                  <EntryRow key={`${e.id}:${e.project_id}:${e.date}:${e.start_time}:${e.duration_min}:${e.description}:${e.billable}`} e={e} detailed projects={allProjects}
                    onError={setErr}
                    patch={(id, body) => save(() => api(`/api/entries/${id}`, "PATCH", body))}
                    del={() => confirm("Delete this entry?") && save(() => api(`/api/entries/${e.id}`, "DELETE"))} />
                ))}
                {!data.entries.length && <tr><td colSpan={11} className="p-4 text-center text-slate-400">No entries in this range.</td></tr>}
              </tbody>
              {data.entries.length > 0 && (
                <tfoot><tr className="border-t border-slate-200 font-semibold">
                  <td className="p-2" colSpan={6}>Total</td><td className="p-2 font-mono">{formatDuration(data.total.minutes)}</td><td />
                  <td /><td className="p-2 text-right tabular-nums">{Object.entries(data.total.amounts).map(([c, v]) => money(v, c)).join(" + ") || "—"}</td><td />
                </tr></tfoot>
              )}
            </table>
          </div>
        )}
      </>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="card p-4"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 text-xl font-semibold tabular-nums">{value}</div></div>;
}

function Breakdown({ title, rows, fmt }: { title: string; rows: Bucket[]; fmt?: (k: string) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.minutes));
  return (
    <div className="card overflow-x-auto">
      <h2 className="border-b border-slate-200 p-3 text-sm font-semibold">{title}</h2>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-b border-slate-100">
              <td className="p-2">{fmt ? fmt(r.key) : r.label}</td>
              <td className="w-1/3 p-2"><div className="h-2 rounded bg-indigo-500" style={{ width: `${(r.minutes / max) * 100}%` }} /></td>
              <td className="p-2 text-right tabular-nums">{formatDuration(r.minutes)} h</td>
              <td className="p-2 text-right tabular-nums text-slate-600">{Object.entries(r.amounts).map(([c, v]) => money(v, c)).join(" + ") || "—"}</td>
            </tr>
          ))}
          {!rows.length && <tr><td className="p-4 text-center text-slate-400">No data in this range.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
