"use client";
import { useEffect, useMemo, useState } from "react";
import { api, ApiError, type Entry, type Project, useApi, useProjects } from "@/lib/client";
import { addDays, addMonths, dow, endOfMonth, formatDate, formatDuration, minToTime, monthGrid, parseDuration, startOfMonth, startOfWeek, timeToMin, today, weekDays } from "@/lib/time";

const H0 = 6, H1 = 22, HOUR_PX = 48;
type Draft = { id?: number; date: string; start: string; duration: string; project: string; description: string; billable: boolean };
type GEvent = { id: string; title: string; date: string; start_time: string; duration_min: number; imported: boolean };

export default function Calendar() {
  const [view, setView] = useState<"week" | "month">("week");
  const [anchor, setAnchor] = useState(today());
  const days = view === "week" ? weekDays(anchor) : monthGrid(anchor).flat();
  const from = days[0], to = days[days.length - 1];
  const { data: entries, reload } = useApi<Entry[]>(`/api/entries?from=${from}&to=${to}`);
  const { data: projects } = useProjects();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [importing, setImporting] = useState(false);
  const active = useMemo(() => projects?.filter((p) => !p.archived) ?? [], [projects]);

  useEffect(() => { window.addEventListener("entries-changed", reload); return () => window.removeEventListener("entries-changed", reload); }, [reload]);

  const step = (n: number) => setAnchor(view === "week" ? addDays(anchor, 7 * n) : addMonths(anchor, n));
  const title = view === "week" ? `${formatDate(from)} – ${formatDate(to)}` : formatDate(startOfMonth(anchor), { month: "long", year: "numeric" });
  const newDraft = (date: string, start = "09:00"): Draft => ({ date, start, duration: "1:00", project: "", description: "", billable: true });
  const editDraft = (e: Entry): Draft => ({ id: e.id, date: e.date, start: e.start_time ?? "", duration: formatDuration(e.duration_min), project: String(e.project_id), description: e.description, billable: !!e.billable });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-4 text-xl font-semibold">Calendar</h1>
        <button className="btn" onClick={() => step(-1)}>←</button>
        <button className="btn" onClick={() => setAnchor(today())}>Today</button>
        <button className="btn" onClick={() => step(1)}>→</button>
        <span className="text-sm font-medium text-slate-700">{title}</span>
        <div className="ml-auto flex gap-2">
          <div className="inline-flex overflow-hidden rounded-md border border-slate-300">
            {(["week", "month"] as const).map((v) => <button key={v} className={`px-3 py-1.5 text-sm capitalize ${view === v ? "bg-indigo-600 text-white" : "bg-white hover:bg-slate-100"}`} onClick={() => setView(v)}>{v}</button>)}
          </div>
          <button className="btn" onClick={() => setDraft(newDraft(today()))}>+ Add work</button>
          <button className="btn btn-primary" onClick={() => setImporting(true)}>Import from Google</button>
        </div>
      </div>

      {view === "week"
        ? <WeekGrid days={days} entries={entries ?? []} onSlot={(d, t) => setDraft(newDraft(d, t))} onEntry={(e) => setDraft(editDraft(e))} />
        : <MonthGrid anchor={anchor} entries={entries ?? []} onDay={(d) => setDraft(newDraft(d))} onEntry={(e) => setDraft(editDraft(e))} />}

      {draft && <EntryModal draft={draft} projects={active} onClose={() => setDraft(null)} onSaved={() => { setDraft(null); reload(); }} />}
      {importing && <ImportPanel from={from} to={to} projects={active} onClose={() => setImporting(false)} onImported={reload} />}
    </div>
  );
}

function WeekGrid({ days, entries, onSlot, onEntry }: { days: string[]; entries: Entry[]; onSlot: (d: string, t: string) => void; onEntry: (e: Entry) => void }) {
  const hours = Array.from({ length: H1 - H0 }, (_, i) => H0 + i);
  const untimed = entries.filter((e) => !e.start_time);
  return (
    <div className="card overflow-x-auto">
      <div className="grid min-w-[800px]" style={{ gridTemplateColumns: "48px repeat(7, 1fr)" }}>
        <div />
        {days.map((d) => (
          <div key={d} className={`border-l border-slate-200 p-1 text-center text-xs font-medium ${d === today() ? "text-indigo-600" : "text-slate-600"}`}>
            {formatDate(d, { weekday: "short", day: "numeric" })}
            <span className="ml-1 text-slate-400">{formatDuration(entries.filter((e) => e.date === d).reduce((s, e) => s + e.duration_min, 0))}</span>
          </div>
        ))}
        {untimed.length > 0 && <>
          <div className="p-1 text-[10px] text-slate-400">no time</div>
          {days.map((d) => (
            <div key={d} className="space-y-0.5 border-l border-t border-slate-200 p-0.5">
              {untimed.filter((e) => e.date === d).map((e) => <Chip key={e.id} e={e} onClick={() => onEntry(e)} />)}
            </div>
          ))}
        </>}
        <div className="border-t border-slate-200">{hours.map((h) => <div key={h} className="pr-1 text-right text-[10px] text-slate-400" style={{ height: HOUR_PX }}>{String(h).padStart(2, "0")}:00</div>)}</div>
        {days.map((d) => (
          <div key={d} className="relative border-l border-t border-slate-200" style={{ height: (H1 - H0) * HOUR_PX }}
            onClick={(ev) => {
              const y = ev.clientY - ev.currentTarget.getBoundingClientRect().top;
              onSlot(d, minToTime(Math.floor((H0 * 60 + (y / HOUR_PX) * 60) / 15) * 15));
            }}>
            {hours.map((h) => <div key={h} className="border-b border-slate-100" style={{ height: HOUR_PX }} />)}
            {entries.filter((e) => e.date === d && e.start_time).map((e) => {
              const top = ((timeToMin(e.start_time!) - H0 * 60) / 60) * HOUR_PX;
              const h = Math.max(18, (e.duration_min / 60) * HOUR_PX);
              if (top + h < 0 || top > (H1 - H0) * HOUR_PX) return null;
              return (
                <button key={e.id} className="absolute left-0.5 right-0.5 overflow-hidden rounded px-1 text-left text-[11px] leading-tight text-white shadow-sm"
                  style={{ top: Math.max(0, top), height: h, background: e.color, opacity: e.billable ? 1 : 0.65 }}
                  onClick={(ev) => { ev.stopPropagation(); onEntry(e); }} title={`${e.customer_name} / ${e.project_name}\n${e.description}`}>
                  <div className="truncate font-medium">{e.project_name}</div>
                  <div className="truncate opacity-90">{e.description}</div>
                </button>
              );
            })}
            {d === today() && <NowLine />}
          </div>
        ))}
      </div>
    </div>
  );
}

function NowLine() {
  const n = new Date();
  const top = ((n.getHours() * 60 + n.getMinutes() - H0 * 60) / 60) * HOUR_PX;
  if (top < 0 || top > (H1 - H0) * HOUR_PX) return null;
  return <div className="pointer-events-none absolute left-0 right-0 border-t-2 border-red-500" style={{ top }} />;
}

function Chip({ e, onClick }: { e: Entry; onClick: () => void }) {
  return (
    <button className="flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[11px] hover:bg-slate-100" onClick={(ev) => { ev.stopPropagation(); onClick(); }}>
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: e.color }} />
      <span className="truncate">{formatDuration(e.duration_min)} {e.project_name}{e.description ? ` – ${e.description}` : ""}</span>
    </button>
  );
}

function MonthGrid({ anchor, entries, onDay, onEntry }: { anchor: string; entries: Entry[]; onDay: (d: string) => void; onEntry: (e: Entry) => void }) {
  const month = startOfMonth(anchor).slice(0, 7);
  return (
    <div className="card overflow-x-auto">
      <div className="grid min-w-[700px] grid-cols-7 text-xs">
        {monthGrid(anchor)[0].map((d) => <div key={d} className="p-1 text-center font-medium text-slate-500">{formatDate(d, { weekday: "short" })}</div>)}
        {monthGrid(anchor).flat().map((d) => {
          const es = entries.filter((e) => e.date === d);
          const total = es.reduce((s, e) => s + e.duration_min, 0);
          return (
            <div key={d} className={`min-h-28 cursor-pointer border-l border-t border-slate-200 p-1 ${d.startsWith(month) ? "" : "bg-slate-50 text-slate-400"} ${dow(d) === 6 ? "bg-slate-50/60" : ""}`} onClick={() => onDay(d)}>
              <div className="flex justify-between"><span className={d === today() ? "rounded-full bg-indigo-600 px-1.5 text-white" : ""}>{Number(d.slice(8))}</span>{total > 0 && <span className="text-slate-500">{formatDuration(total)}</span>}</div>
              <div className="mt-1 space-y-0.5">{es.slice(0, 4).map((e) => <Chip key={e.id} e={e} onClick={() => onEntry(e)} />)}{es.length > 4 && <div className="px-1 text-slate-400">+{es.length - 4} more</div>}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/30 p-4" onClick={onClose}>
      <div className="card max-h-[90vh] w-full max-w-md overflow-y-auto p-4" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">{title}</h2><button className="text-slate-400 hover:text-slate-700" onClick={onClose}>✕</button></div>
        {children}
      </div>
    </div>
  );
}

function EntryModal({ draft, projects, onClose, onSaved }: { draft: Draft; projects: Project[]; onClose: () => void; onSaved: () => void }) {
  const [d, setD] = useState(draft);
  const [err, setErr] = useState("");
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const minutes = parseDuration(d.duration);
  async function save() {
    if (!d.project || minutes === null || minutes > 1440) return setErr("Choose a project and a valid duration (e.g. 1:30, 1.5, 45m).");
    const body = { project_id: Number(d.project), date: d.date, start_time: d.start || null, duration_min: minutes, description: d.description, billable: d.billable };
    try { await (d.id ? api(`/api/entries/${d.id}`, "PATCH", body) : api("/api/entries", "POST", body)); onSaved(); } catch (e) { setErr((e as Error).message); }
  }
  async function del() {
    if (!confirm("Delete this entry?")) return;
    try { await api(`/api/entries/${d.id}`, "DELETE"); onSaved(); } catch (e) { setErr((e as Error).message); }
  }
  return (
    <Modal title={d.id ? "Edit work" : "Add work"} onClose={onClose}>
      <div className="space-y-3">
        <div><label className="label">Project</label>
          <select className="input" value={d.project} onChange={(e) => set("project", e.target.value)}>
            <option value="">Select…</option>
            {d.project && !projects.some((p) => String(p.id) === d.project) && <option value={d.project}>(archived project)</option>}
            {projects.map((p) => <option key={p.id} value={p.id}>{p.customer_name} / {p.name}</option>)}
          </select></div>
        <div><label className="label">Description</label><input className="input" value={d.description} onChange={(e) => set("description", e.target.value)} /></div>
        <div className="grid grid-cols-3 gap-2">
          <div><label className="label">Date</label><input className="input" type="date" value={d.date} onChange={(e) => set("date", e.target.value)} /></div>
          <div><label className="label">Start</label><input className="input" type="time" value={d.start} onChange={(e) => set("start", e.target.value)} /></div>
          <div><label className="label">Duration</label><input className="input font-mono" value={d.duration} onChange={(e) => set("duration", e.target.value)} /></div>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={d.billable} onChange={(e) => set("billable", e.target.checked)} /> Billable</label>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={save}>Save</button>
          <button className="btn" onClick={onClose}>Cancel</button>
          {d.id && <button className="btn btn-danger ml-auto" onClick={del}>Delete</button>}
        </div>
      </div>
    </Modal>
  );
}

function ImportPanel({ from, to, projects, onClose, onImported }: { from: string; to: string; projects: Project[]; onClose: () => void; onImported: () => void }) {
  const [events, setEvents] = useState<GEvent[] | null>(null);
  const [err, setErr] = useState("");
  const [notConnected, setNotConnected] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [project, setProject] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api<GEvent[]>(`/api/gcal/events?from=${from}&to=${to}`)
      .then((ev) => { setEvents(ev); setPicked(new Set(ev.filter((e) => !e.imported).map((e) => e.id))); })
      .catch((e: ApiError) => { setErr(e.message); setNotConnected(e.code === "not_connected"); });
  }, [from, to]);

  async function doImport() {
    const chosen = events!.filter((e) => picked.has(e.id) && !e.imported);
    try {
      const r = await api<{ imported: number; skipped: number }>("/api/gcal/import", "POST", {
        project_id: Number(project), events: chosen.map(({ id, title, date, start_time, duration_min }) => ({ id, title, date, start_time, duration_min })),
      });
      setMsg(`Imported ${r.imported}${r.skipped ? `, skipped ${r.skipped}` : ""}.`);
      setEvents((evs) => evs!.map((e) => (picked.has(e.id) ? { ...e, imported: true } : e)));
      setPicked(new Set());
      onImported();
    } catch (e) { setErr((e as Error).message); }
  }
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <Modal title={`Google Calendar · ${formatDate(from)} – ${formatDate(to)}`} onClose={onClose}>
      {err && <p className="mb-2 rounded bg-red-50 p-2 text-sm text-red-700">{err}{notConnected && <> <a className="underline" href="/login">Sign in again</a></>}</p>}
      {!events && !err && <p className="text-sm text-slate-500">Loading…</p>}
      {events && (
        <div className="space-y-3">
          <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto rounded border border-slate-200">
            {events.map((e) => (
              <label key={e.id} className={`flex items-start gap-2 p-2 text-sm ${e.imported ? "opacity-50" : "cursor-pointer hover:bg-slate-50"}`}>
                <input type="checkbox" className="mt-1" disabled={e.imported} checked={picked.has(e.id)} onChange={() => toggle(e.id)} />
                <span className="grow"><span className="block">{e.title}</span><span className="text-xs text-slate-500">{formatDate(e.date)} {e.start_time} · {formatDuration(e.duration_min)}{e.imported && " · already imported"}</span></span>
              </label>
            ))}
            {!events.length && <p className="p-3 text-sm text-slate-400">No timed events in this range.</p>}
          </div>
          <div><label className="label">Add selected events to project</label>
            <select className="input" value={project} onChange={(e) => setProject(e.target.value)}><option value="">Select…</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.customer_name} / {p.name}</option>)}</select></div>
          {msg && <p className="text-sm text-green-700">{msg}</p>}
          <button className="btn btn-primary" disabled={!project || !picked.size} onClick={doImport}>Import {picked.size} event{picked.size === 1 ? "" : "s"}</button>
        </div>
      )}
    </Modal>
  );
}
