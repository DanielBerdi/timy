"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import TimeInput from "@/components/TimeInput";
import { api, ApiError, lastProject, projectLabel, rememberProject, type Entry, type Project, useApi, useProjects } from "@/lib/client";
import { addDays, addMonths, dow, durationBetween, endTime, endOfMonth, formatDate, formatDuration, layoutOverlaps, minToTime, monthGrid, parseDuration, rangeFromDrag, startOfMonth, startOfWeek, timeToMin, today, weekDays } from "@/lib/time";

const H0 = 0, H1 = 24, HOUR_PX = 48, FOCUS_HOUR = 9.5; // full day; initial scroll puts ~10:00–20:00 in view
type Draft = { id?: number; date: string; start: string; end: string; duration: string; project: string; description: string; billable: boolean };
type GEvent = { id: string; title: string; date: string; start_time: string; duration_min: number; imported: boolean };

export default function Calendar() {
  const [view, setView] = useState<"day" | "week" | "month">("week");
  useEffect(() => { if (window.matchMedia("(max-width: 767px)").matches) setView("day"); }, []);
  const [anchor, setAnchor] = useState(today());
  const days = view === "day" ? [anchor] : view === "week" ? weekDays(anchor) : monthGrid(anchor).flat();
  const from = days[0], to = days[days.length - 1];
  const { data: allEntries, reload } = useApi<Entry[]>(`/api/entries?from=${from}&to=${to}`);
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const entries = useMemo(() => (allEntries ?? []).filter((e) => !hidden.has(e.customer_id)), [allEntries, hidden]);
  const legend = useMemo(() => {
    const m = new Map<number, { id: number; name: string; color: string; minutes: number }>();
    for (const e of allEntries ?? []) {
      const x = m.get(e.customer_id) ?? { id: e.customer_id, name: e.customer_name, color: e.color, minutes: 0 };
      x.minutes += e.duration_min;
      m.set(e.customer_id, x);
    }
    return [...m.values()].sort((a, b) => b.minutes - a.minutes);
  }, [allEntries]);
  const { data: projects } = useProjects();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [importing, setImporting] = useState(false);
  const active = useMemo(() => projects?.filter((p) => !p.archived) ?? [], [projects]);

  useEffect(() => { window.addEventListener("entries-changed", reload); return () => window.removeEventListener("entries-changed", reload); }, [reload]);

  const step = (n: number) => setAnchor(view === "day" ? addDays(anchor, n) : view === "week" ? addDays(anchor, 7 * n) : addMonths(anchor, n));
  const title = view === "day" ? formatDate(anchor, { weekday: "long", day: "numeric", month: "short" }) : view === "week" ? `${formatDate(from)} – ${formatDate(to)}` : formatDate(startOfMonth(anchor), { month: "long", year: "numeric" });
  const newDraft = (date: string, start = "09:00"): Draft => ({ date, start, end: endTime(start, 60), duration: "1:00", project: active.some((p) => String(p.id) === lastProject()) ? lastProject() : "", description: "", billable: true });
  const editDraft = (e: Entry): Draft => ({ id: e.id, date: e.date, start: e.start_time ?? "", end: e.start_time ? endTime(e.start_time, e.duration_min) : "", duration: formatDuration(e.duration_min), project: String(e.project_id), description: e.description, billable: !!e.billable });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-4 text-xl font-semibold">Calendar</h1>
        <button className="btn" onClick={() => step(-1)}>←</button>
        <button className="btn" onClick={() => setAnchor(today())}>Today</button>
        <button className="btn" onClick={() => step(1)}>→</button>
        <span className="text-sm font-medium text-slate-700">{title}</span>
        <div className="flex flex-wrap gap-2 md:ml-auto">
          <div className="inline-flex overflow-hidden rounded-md border border-slate-300">
            {(["day", "week", "month"] as const).map((v) => <button key={v} className={`px-3 py-1.5 text-sm capitalize ${view === v ? "bg-indigo-600 text-[#fff]" : "bg-white hover:bg-slate-100"}`} onClick={() => setView(v)}>{v}</button>)}
          </div>
          <button className="btn" onClick={() => setDraft(newDraft(today()))}>+ Add work</button>
          <button className="btn btn-primary" onClick={() => setImporting(true)}>Import from Google</button>
        </div>
      </div>

      {legend.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm" aria-label="Customer legend">
          <span className="text-xs text-slate-500">Customers (click to hide / show):</span>
          {legend.map((c) => {
            const off = hidden.has(c.id);
            return (
              <button key={c.id} onClick={() => setHidden((h) => { const n = new Set(h); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; })}
                className={`inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1 hover:bg-slate-100 ${off ? "opacity-40 line-through" : ""}`}>
                <span className="h-3 w-3 rounded-full" style={{ background: c.color }} />
                <span className="font-medium">{c.name}</span>
                <span className="text-xs text-slate-500">{formatDuration(c.minutes)} h</span>
              </button>
            );
          })}
        </div>
      )}

      {view !== "month"
        ? <WeekGrid days={days} entries={entries} onSlot={(d, t) => setDraft(newDraft(d, t))} onRange={(d, t, mins) => setDraft({ ...newDraft(d, t), end: endTime(t, mins), duration: formatDuration(mins) })} onEntry={(e) => setDraft(editDraft(e))} />
        : <MonthGrid anchor={anchor} entries={entries} onDay={(d) => setDraft(newDraft(d))} onEntry={(e) => setDraft(editDraft(e))} />}

      {draft && <EntryModal draft={draft} projects={active} onClose={() => setDraft(null)} onSaved={() => { setDraft(null); reload(); }} />}
      {importing && <ImportPanel from={from} to={to} projects={active} onClose={() => setImporting(false)} onImported={reload} />}
    </div>
  );
}

function WeekGrid({ days, entries, onSlot, onRange, onEntry }: { days: string[]; entries: Entry[]; onSlot: (d: string, t: string) => void; onRange: (d: string, t: string, mins: number) => void; onEntry: (e: Entry) => void }) {
  const [drag, setDrag] = useState<{ date: string; a: number; b: number } | null>(null);
  const minuteAt = (ev: React.PointerEvent<HTMLDivElement>) => {
    const y = ev.clientY - ev.currentTarget.getBoundingClientRect().top;
    return Math.max(H0 * 60, Math.min(H1 * 60, H0 * 60 + (y / HOUR_PX) * 60));
  };
  useEffect(() => {
    if (!drag) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setDrag(null);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [drag]);
  const hours = Array.from({ length: H1 - H0 }, (_, i) => H0 + i);
  const untimed = entries.filter((e) => !e.start_time);
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => { if (scroller.current) scroller.current.scrollTop = (FOCUS_HOUR - H0) * HOUR_PX; }, [days[0]]);
  return (
    <div ref={scroller} className="card h-[calc(100dvh-340px)] min-h-[360px] overflow-auto md:h-[calc(100vh-180px)] md:min-h-[420px]">
      <div className={`grid ${days.length > 1 ? "min-w-[800px]" : ""}`} style={{ gridTemplateColumns: `48px repeat(${days.length}, minmax(0, 1fr))` }}>
        <div className="sticky top-0 z-20 bg-white" />
        {days.map((d) => (
          <div key={d} className={`sticky top-0 z-20 border-l border-slate-200 bg-white p-1 text-center text-xs font-medium ${d === today() ? "text-indigo-600" : "text-slate-600"}`}>
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
          <div key={d} className="relative select-none border-l border-t border-slate-200" style={{ height: (H1 - H0) * HOUR_PX }}
            onPointerDown={(ev) => {
              if (ev.pointerType === "touch" || ev.button !== 0) return;
              ev.currentTarget.setPointerCapture(ev.pointerId);
              const m = minuteAt(ev);
              setDrag({ date: d, a: m, b: m });
            }}
            onPointerMove={(ev) => {
              if (drag?.date !== d) return;
              // auto-scroll while dragging near the top/bottom edge of the scroll area
              const sc = scroller.current;
              if (sc) {
                const r = sc.getBoundingClientRect();
                if (ev.clientY > r.bottom - 40) sc.scrollTop += 14;
                else if (ev.clientY < r.top + 70) sc.scrollTop -= 14;
              }
              setDrag({ ...drag, b: minuteAt(ev) });
            }}
            onPointerCancel={() => setDrag(null)}
            onPointerUp={(ev) => {
              if (drag?.date !== d) return;
              const b = minuteAt(ev);
              setDrag(null);
              if (Math.abs(b - drag.a) < 15) onSlot(d, minToTime(Math.floor(drag.a / 15) * 15));
              else { const r = rangeFromDrag(drag.a, b, H0 * 60, H1 * 60); if (r.duration) onRange(d, minToTime(r.start), r.duration); }
            }}
            onClick={(ev) => {
              // touch taps (no pointer drag): open the quick-add at the tapped slot
              if ((ev.nativeEvent as PointerEvent).pointerType !== "touch") return;
              const y = ev.clientY - ev.currentTarget.getBoundingClientRect().top;
              onSlot(d, minToTime(Math.floor((H0 * 60 + (y / HOUR_PX) * 60) / 15) * 15));
            }}>
            {hours.map((h) => <div key={h} className="border-b border-slate-100" style={{ height: HOUR_PX }} />)}
            {(() => {
              const timed = entries.filter((e) => e.date === d && e.start_time).map((e) => {
                const start = timeToMin(e.start_time!);
                return { e, id: e.id, start, end: Math.min(1440, start + e.duration_min), shown: Math.min(1440, start + Math.max(e.duration_min, 25)) };
              });
              const lay = layoutOverlaps(timed.map((t) => ({ id: t.id, start: t.start, end: t.shown })));
              return timed.map(({ e, start, end }) => {
                const { col, cols } = lay.get(e.id)!;
                const h = Math.max(20, ((end - start) / 60) * HOUR_PX);
                return (
                  <button key={e.id} className="absolute overflow-hidden rounded border border-black/40 px-1 text-left text-[11px] leading-tight text-[#fff] shadow-sm ring-1 ring-white/30 hover:z-10 hover:brightness-110"
                    style={{
                      top: (start / 60) * HOUR_PX + 1, height: h - 2,
                      left: `calc(${(col / cols) * 100}% + 2px)`, width: `calc(${100 / cols}% - 4px)`,
                      background: e.color, opacity: e.billable ? 1 : 0.65,
                    }}
                    onPointerDown={(ev) => ev.stopPropagation()} onClick={(ev) => { ev.stopPropagation(); onEntry(e); }}
                    title={`${e.customer_name} / ${e.project_name}\n${e.start_time}–${endTime(e.start_time!, e.duration_min)}\n${e.description}`}>
                    <div className="truncate font-semibold">{e.customer_name}{h < 34 ? ` · ${e.description || e.project_name}` : ""}</div>
                    {h >= 34 && <div className="truncate opacity-95">{e.project_name}</div>}
                    {h >= 52 && e.description && <div className="truncate opacity-80">{e.description}</div>}
                  </button>
                );
              });
            })()}
            {drag?.date === d && Math.abs(drag.b - drag.a) >= 1 && (() => {
              const r = rangeFromDrag(drag.a, drag.b, H0 * 60, H1 * 60);
              return (
                <div className="pointer-events-none absolute left-0.5 right-0.5 rounded border border-indigo-500 bg-indigo-400/30 px-1 text-[11px] font-medium text-indigo-900"
                  style={{ top: ((r.start - H0 * 60) / 60) * HOUR_PX, height: Math.max(4, (r.duration / 60) * HOUR_PX) }}>
                  {minToTime(r.start)}–{minToTime(r.start + r.duration)} · {formatDuration(r.duration)}
                </div>
              );
            })()}
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
      <span className="truncate">{formatDuration(e.duration_min)} {e.customer_name} · {e.description || e.project_name}</span>
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
            <div key={d} className={`min-h-[max(7rem,calc((100vh-250px)/6))] cursor-pointer border-l border-t border-slate-200 p-1 ${d.startsWith(month) ? "" : "bg-slate-50 text-slate-400"} ${dow(d) === 6 ? "bg-slate-50/60" : ""}`} onClick={() => onDay(d)}>
              <div className="flex justify-between"><span className={d === today() ? "rounded-full bg-indigo-600 px-1.5 text-[#fff]" : ""}>{Number(d.slice(8))}</span>{total > 0 && <span className="text-slate-500">{formatDuration(total)}</span>}</div>
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
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="card max-h-[90vh] w-full max-w-lg overflow-y-auto p-4" onClick={(e) => e.stopPropagation()}>
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
    try { rememberProject(d.project); await (d.id ? api(`/api/entries/${d.id}`, "PATCH", body) : api("/api/entries", "POST", body)); onSaved(); } catch (e) { setErr((e as Error).message); }
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
            {projects.map((p) => <option key={p.id} value={p.id}>{projectLabel(p)}</option>)}
          </select></div>
        <div><label className="label">Description</label><input className="input" value={d.description} onChange={(e) => set("description", e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div><label className="label">Date</label><input className="input" type="date" value={d.date} onChange={(e) => set("date", e.target.value)} /></div>
          <div><label className="label">From</label><TimeInput className="input" value={d.start}
            onCommit={(v) => setD((x) => ({ ...x, start: v, end: v && minutes !== null ? endTime(v, minutes) : x.end }))} /></div>
          <div><label className="label">To</label><TimeInput className="input" value={d.end}
            onCommit={(v) => { const m = d.start && v ? durationBetween(d.start, v) : null; if (v && m === null) return false; setD((x) => ({ ...x, end: v, duration: m !== null ? formatDuration(m) : x.duration })); }} /></div>
          <div><label className="label">Duration</label><input className="input font-mono" value={d.duration}
            onChange={(e) => { const v = e.target.value; setD((x) => { const m = parseDuration(v); return { ...x, duration: v, end: x.start && m !== null && m <= 1440 ? endTime(x.start, m) : x.end }; }); }} /></div>
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
            <select className="input" value={project} onChange={(e) => setProject(e.target.value)}><option value="">Select…</option>{projects.map((p) => <option key={p.id} value={p.id}>{projectLabel(p)}</option>)}</select></div>
          {msg && <p className="text-sm text-green-700">{msg}</p>}
          <button className="btn btn-primary" disabled={!project || !picked.size} onClick={doImport}>Import {picked.size} event{picked.size === 1 ? "" : "s"}</button>
        </div>
      )}
    </Modal>
  );
}
