"use client";
import { useEffect, useMemo, useState } from "react";
import { api, type Entry, type Project, totalsByCurrency, useApi, useProjects } from "@/lib/client";
import { addDays, formatDate, formatDuration, money, parseDuration, startOfWeek, today } from "@/lib/time";

export default function Timesheet() {
  const [anchor, setAnchor] = useState(today());
  const from = startOfWeek(anchor);
  const to = addDays(from, 6);
  const { data: entries, error, reload } = useApi<Entry[]>(`/api/entries?from=${from}&to=${to}`);
  const { data: projects } = useProjects();
  const [err, setErr] = useState("");

  useEffect(() => { window.addEventListener("entries-changed", reload); return () => window.removeEventListener("entries-changed", reload); }, [reload]);

  const active = useMemo(() => projects?.filter((p) => !p.archived) ?? [], [projects]);
  async function run(fn: () => Promise<unknown>) {
    try { setErr(""); await fn(); await reload(); } catch (e) { setErr((e as Error).message); }
  }
  const patch = (id: number, body: object) => run(() => api(`/api/entries/${id}`, "PATCH", body));

  const list = entries ?? [];
  const totalMin = list.reduce((s, e) => s + e.duration_min, 0);
  const totals = totalsByCurrency(list);
  const perDay = (d: string) => list.filter((e) => e.date === d).reduce((s, e) => s + e.duration_min, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-4 text-xl font-semibold">Timesheet</h1>
        <button className="btn" onClick={() => setAnchor(addDays(from, -7))}>←</button>
        <button className="btn" onClick={() => setAnchor(today())}>This week</button>
        <button className="btn" onClick={() => setAnchor(addDays(from, 7))}>→</button>
        <span className="text-sm text-slate-600">{formatDate(from)} – {formatDate(to)}</span>
        <div className="ml-auto text-right text-sm">
          <span className="font-semibold">{formatDuration(totalMin)} h</span>
          {Object.entries(totals).map(([c, v]) => <span key={c} className="ml-3 text-slate-600">{money(v, c)}</span>)}
        </div>
      </div>
      {(error || err) && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error || err}</p>}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-xs text-slate-500">
            <tr><th className="p-2">Date</th><th className="p-2">Project</th><th className="p-2">Description</th><th className="p-2">Start</th><th className="p-2">Duration</th><th className="p-2">$</th><th className="p-2 text-right">Amount</th><th /></tr>
          </thead>
          <tbody>
            {Array.from({ length: 7 }, (_, i) => addDays(from, i)).map((d) => {
              const rows = list.filter((e) => e.date === d);
              if (!rows.length && d !== today()) return null;
              return (
                <DayGroup key={d} date={d} minutes={perDay(d)} empty={!rows.length}>
                  {rows.map((e) => (
                    <Row key={`${e.id}:${e.project_id}:${e.date}:${e.start_time}:${e.duration_min}:${e.description}:${e.billable}`}
                      e={e} projects={active} patch={patch} del={() => run(() => api(`/api/entries/${e.id}`, "DELETE"))} />
                  ))}
                </DayGroup>
              );
            })}
            {entries && !list.length && <tr><td colSpan={8} className="p-4 text-center text-slate-400">No entries this week.</td></tr>}
          </tbody>
          <tfoot><NewRow projects={active} defaultDate={anchor >= from && anchor <= to ? anchor : from} onAdd={(b) => run(() => api("/api/entries", "POST", b))} /></tfoot>
        </table>
      </div>
    </div>
  );
}

function DayGroup({ date, minutes, empty, children }: { date: string; minutes: number; empty: boolean; children: React.ReactNode }) {
  return (
    <>
      <tr className="bg-slate-50"><td colSpan={8} className="px-2 py-1 text-xs font-semibold text-slate-600">
        {formatDate(date, { weekday: "long", day: "numeric", month: "short" })} <span className="ml-2 font-normal">{empty ? "" : `${formatDuration(minutes)} h`}</span>
      </td></tr>
      {children}
    </>
  );
}

function Row({ e, projects, patch, del }: { e: Entry; projects: Project[]; patch: (id: number, b: object) => void; del: () => void }) {
  const running = !!e.timer_started_at;
  const inList = projects.some((p) => p.id === e.project_id);
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/60">
      <td className="w-36 p-1"><input className="cell" type="date" defaultValue={e.date} onBlur={(ev) => ev.target.value && ev.target.value !== e.date && patch(e.id, { date: ev.target.value })} /></td>
      <td className="w-64 p-1">
        <select className="cell" value={e.project_id} onChange={(ev) => patch(e.id, { project_id: Number(ev.target.value) })} style={{ borderLeft: `3px solid ${e.color}` }}>
          {!inList && <option value={e.project_id}>{e.customer_name} / {e.project_name}</option>}
          {projects.map((p) => <option key={p.id} value={p.id}>{p.customer_name} / {p.name}</option>)}
        </select>
      </td>
      <td className="p-1"><input className="cell" defaultValue={e.description} placeholder="Description" onBlur={(ev) => ev.target.value !== e.description && patch(e.id, { description: ev.target.value })} /></td>
      <td className="w-24 p-1"><input className="cell" type="time" defaultValue={e.start_time ?? ""} onBlur={(ev) => (ev.target.value || null) !== e.start_time && patch(e.id, { start_time: ev.target.value || null })} /></td>
      <td className="w-24 p-1">
        {running ? <span className="px-1.5 text-indigo-600">running…</span> : (
          <input className="cell font-mono tabular-nums" defaultValue={formatDuration(e.duration_min)}
            onKeyDown={(ev) => ev.key === "Enter" && (ev.target as HTMLInputElement).blur()}
            onBlur={(ev) => {
              const m = parseDuration(ev.target.value);
              if (m === null || m > 1440) ev.target.value = formatDuration(e.duration_min);
              else if (m !== e.duration_min) patch(e.id, { duration_min: m });
              else ev.target.value = formatDuration(m);
            }} />
        )}
      </td>
      <td className="w-8 p-1 text-center"><input type="checkbox" checked={!!e.billable} onChange={(ev) => patch(e.id, { billable: ev.target.checked })} title="Billable" /></td>
      <td className="w-28 p-2 text-right tabular-nums text-slate-600">{e.amount ? money(e.amount, e.currency) : "—"}</td>
      <td className="w-8 p-1"><button className="text-slate-400 hover:text-red-600" title="Delete" onClick={del}>✕</button></td>
    </tr>
  );
}

function NewRow({ projects, defaultDate, onAdd }: { projects: Project[]; defaultDate: string; onAdd: (b: object) => void }) {
  const [date, setDate] = useState(defaultDate);
  const [project, setProject] = useState("");
  const [desc, setDesc] = useState("");
  const [start, setStart] = useState("");
  const [dur, setDur] = useState("");
  useEffect(() => setDate(defaultDate), [defaultDate]);
  const minutes = parseDuration(dur);
  const valid = !!project && minutes !== null && minutes <= 1440;
  function submit() {
    if (!valid) return;
    onAdd({ project_id: Number(project), date, start_time: start || null, duration_min: minutes, description: desc });
    setDesc(""); setDur(""); setStart("");
  }
  const key = (e: React.KeyboardEvent) => e.key === "Enter" && submit();
  return (
    <tr className="bg-indigo-50/40">
      <td className="p-1"><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} onKeyDown={key} /></td>
      <td className="p-1"><select className="input" value={project} onChange={(e) => setProject(e.target.value)}><option value="">Project…</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.customer_name} / {p.name}</option>)}</select></td>
      <td className="p-1"><input className="input" placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)} onKeyDown={key} /></td>
      <td className="p-1"><input className="input" type="time" value={start} onChange={(e) => setStart(e.target.value)} onKeyDown={key} /></td>
      <td className="p-1"><input className="input font-mono" placeholder="1:30 / 1.5 / 45m" value={dur} onChange={(e) => setDur(e.target.value)} onKeyDown={key} /></td>
      <td colSpan={3} className="p-1"><button className="btn btn-primary" disabled={!valid} onClick={submit}>Add</button></td>
    </tr>
  );
}
