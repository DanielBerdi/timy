"use client";
import { useEffect, useMemo, useState } from "react";
import EntryRow from "@/components/EntryRow";
import { api, type Entry, type Project, totalsByCurrency, useApi, useProjects } from "@/lib/client";
import { durationBetween, addDays, addMonths, endOfMonth, formatDate, formatDuration, money, parseDuration, startOfMonth, startOfWeek, today } from "@/lib/time";

type Mode = "week" | "month" | "custom";

function dayDiff(a: string, b: string) { return Math.round((Date.parse(b) - Date.parse(a)) / 86400000); }

export default function Timesheet() {
  const [mode, setModeState] = useState<Mode>("week");
  const [anchor, setAnchor] = useState(today());
  const [customFrom, setCustomFrom] = useState(startOfMonth(today()));
  const [customTo, setCustomTo] = useState(today());
  useEffect(() => { try { const m = localStorage.getItem("timesheet-mode"); if (m === "week" || m === "month" || m === "custom") setModeState(m); } catch {} }, []);
  const setMode = (m: Mode) => { setModeState(m); try { localStorage.setItem("timesheet-mode", m); } catch {} };

  const from = mode === "week" ? startOfWeek(anchor) : mode === "month" ? startOfMonth(anchor) : customFrom;
  const to = mode === "week" ? addDays(from, 6) : mode === "month" ? endOfMonth(anchor) : customTo;
  const validRange = !!from && !!to && from <= to && dayDiff(from, to) <= 400;
  const { data: entries, error, reload } = useApi<Entry[]>(validRange ? `/api/entries?from=${from}&to=${to}` : null);
  const step = (n: number) => {
    if (mode === "week") setAnchor(addDays(from, 7 * n));
    else if (mode === "month") setAnchor(addMonths(anchor, n));
    else if (validRange) { const len = dayDiff(from, to) + 1; setCustomFrom(addDays(from, len * n)); setCustomTo(addDays(to, len * n)); }
  };
  const goToday = () => { setAnchor(today()); if (mode === "custom") { setCustomFrom(startOfMonth(today())); setCustomTo(today()); } };
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
        <div className="inline-flex overflow-hidden rounded-md border border-slate-300">
          {(["week", "month", "custom"] as const).map((m) => (
            <button key={m} className={`px-3 py-1.5 text-sm capitalize ${mode === m ? "bg-indigo-600 text-[#fff]" : "bg-white hover:bg-slate-100"}`} onClick={() => setMode(m)}>{m}</button>
          ))}
        </div>
        <button className="btn" onClick={() => step(-1)}>←</button>
        <button className="btn" onClick={goToday}>{mode === "month" ? "This month" : mode === "week" ? "This week" : "Reset"}</button>
        <button className="btn" onClick={() => step(1)}>→</button>
        {mode === "custom" ? (
          <>
            <input className="input w-36" type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            <span className="text-slate-400">–</span>
            <input className="input w-36" type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
          </>
        ) : (
          <span className="text-sm text-slate-600">{mode === "month" ? formatDate(from, { month: "long", year: "numeric" }) : `${formatDate(from)} – ${formatDate(to)}`}</span>
        )}
        <div className="ml-auto text-right text-sm">
          <span className="font-semibold">{formatDuration(totalMin)} h</span>
          {Object.entries(totals).map(([c, v]) => <span key={c} className="ml-3 text-slate-600">{money(v, c)}</span>)}
        </div>
      </div>
      {!validRange && <p className="rounded bg-amber-50 p-2 text-sm text-amber-800">Choose a valid range (start before end, up to 400 days).</p>}
      {(error || err) && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error || err}</p>}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-xs text-slate-500">
            <tr><th className="p-2">Date</th><th className="p-2">Project</th><th className="p-2">Description</th><th className="p-2">Start</th><th className="p-2">End</th><th className="p-2">Duration</th><th className="p-2">$</th><th className="p-2 text-right">Amount</th><th /></tr>
          </thead>
          <tbody>
            {Array.from({ length: validRange ? dayDiff(from, to) + 1 : 0 }, (_, i) => addDays(from, i)).map((d) => {
              const rows = list.filter((e) => e.date === d);
              if (!rows.length && d !== today()) return null;
              return (
                <DayGroup key={d} date={d} minutes={perDay(d)} empty={!rows.length}>
                  {rows.map((e) => (
                    <EntryRow key={`${e.id}:${e.project_id}:${e.date}:${e.start_time}:${e.duration_min}:${e.description}:${e.billable}`}
                      e={e} projects={active} patch={patch} onError={setErr} del={() => run(() => api(`/api/entries/${e.id}`, "DELETE"))} />
                  ))}
                </DayGroup>
              );
            })}
            {entries && !list.length && <tr><td colSpan={9} className="p-4 text-center text-slate-400">No entries in this range.</td></tr>}
          </tbody>
          <tfoot><NewRow projects={active} defaultDate={validRange ? (anchor >= from && anchor <= to ? anchor : from) : today()} onAdd={(b) => run(() => api("/api/entries", "POST", b))} /></tfoot>
        </table>
      </div>
    </div>
  );
}

function DayGroup({ date, minutes, empty, children }: { date: string; minutes: number; empty: boolean; children: React.ReactNode }) {
  return (
    <>
      <tr className="bg-slate-50"><td colSpan={9} className="px-2 py-1 text-xs font-semibold text-slate-600">
        {formatDate(date, { weekday: "long", day: "numeric", month: "short" })} <span className="ml-2 font-normal">{empty ? "" : `${formatDuration(minutes)} h`}</span>
      </td></tr>
      {children}
    </>
  );
}

function NewRow({ projects, defaultDate, onAdd }: { projects: Project[]; defaultDate: string; onAdd: (b: object) => void }) {
  const [date, setDate] = useState(defaultDate);
  const [project, setProject] = useState("");
  const [desc, setDesc] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [dur, setDur] = useState("");
  useEffect(() => setDate(defaultDate), [defaultDate]);
  const fromTo = start && end ? durationBetween(start, end) : null;
  const minutes = dur.trim() ? parseDuration(dur) : fromTo;
  const valid = !!project && minutes !== null && minutes <= 1440;
  function submit() {
    if (!valid) return;
    onAdd({ project_id: Number(project), date, start_time: start || null, duration_min: minutes, description: desc });
    setDesc(""); setDur(""); setStart(""); setEnd("");
  }
  const key = (e: React.KeyboardEvent) => e.key === "Enter" && submit();
  return (
    <tr className="bg-indigo-50/40">
      <td className="p-1"><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} onKeyDown={key} /></td>
      <td className="p-1"><select className="input" value={project} onChange={(e) => setProject(e.target.value)}><option value="">Project…</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.customer_name} / {p.name}</option>)}</select></td>
      <td className="p-1"><input className="input" placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)} onKeyDown={key} /></td>
      <td className="p-1"><input className="input" type="time" value={start} onChange={(e) => setStart(e.target.value)} onKeyDown={key} /></td>
      <td className="p-1"><input className="input" type="time" value={end} onChange={(e) => setEnd(e.target.value)} onKeyDown={key} /></td>
      <td className="p-1"><input className="input font-mono" placeholder={fromTo ? formatDuration(fromTo) : "1:30 / 1.5"} value={dur} onChange={(e) => setDur(e.target.value)} onKeyDown={key} /></td>
      <td colSpan={3} className="p-1"><button className="btn btn-primary" disabled={!valid} onClick={submit}>Add</button></td>
    </tr>
  );
}
