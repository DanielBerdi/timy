"use client";
import TimeInput from "@/components/TimeInput";
import { projectLabel, type Entry, type Project } from "@/lib/client";
import { durationBetween, endTime, formatDuration, money, parseDuration } from "@/lib/time";

type Props = {
  e: Entry;
  projects: Project[];
  patch: (id: number, body: object) => void;
  del: () => void;
  /** Reports layout: separate Customer column and a Rate column. */
  detailed?: boolean;
  onError?: (msg: string) => void;
};

/** One time entry as a table row; every cell edits inline and saves on blur / change. */
export default function EntryRow({ e, projects, patch, del, detailed, onError }: Props) {
  const running = !!e.timer_started_at;
  const inList = projects.some((p) => p.id === e.project_id);
  const customers = [...new Map(projects.map((p) => [p.customer_id, p.customer_name])).entries()];

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/60">
      <td className="w-36 p-1"><input key={e.date} className="cell" type="date" defaultValue={e.date} onBlur={(ev) => ev.target.value && ev.target.value !== e.date && patch(e.id, { date: ev.target.value })} /></td>
      {detailed && <td className="w-36 p-2 text-slate-600">{e.customer_name}</td>}
      <td className={detailed ? "w-48 p-1" : "w-64 p-1"}>
        <select className="cell" value={e.project_id} onChange={(ev) => patch(e.id, { project_id: Number(ev.target.value) })} style={{ borderLeft: `3px solid ${e.color}` }}>
          {!inList && <option value={e.project_id}>{detailed ? e.project_name : `${e.customer_name} / ${e.project_name}`}</option>}
          {detailed
            ? customers.map(([cid, cname]) => (
                <optgroup key={cid} label={cname}>{projects.filter((p) => p.customer_id === cid).map((p) => <option key={p.id} value={p.id}>{p.favorite ? "★ " : ""}{p.name}</option>)}</optgroup>
              ))
            : projects.map((p) => <option key={p.id} value={p.id}>{projectLabel(p)}</option>)}
        </select>
      </td>
      <td className="min-w-64 p-1"><input key={e.description} className="cell" defaultValue={e.description} placeholder="Description" onBlur={(ev) => ev.target.value !== e.description && patch(e.id, { description: ev.target.value })} /></td>
      <td className="w-20 p-1"><TimeInput value={e.start_time ?? ""} onCommit={(v) => patch(e.id, { start_time: v || null })} /></td>
      <td className="w-20 p-1">
        {running || !e.start_time ? <span className="px-1.5 text-slate-300">—</span> : (
          <TimeInput value={endTime(e.start_time, e.duration_min)} onCommit={(v) => {
            if (!v) return false;
            const m = durationBetween(e.start_time!, v);
            if (m === null) { onError?.("End time must be after the start time."); return false; }
            patch(e.id, { duration_min: m });
          }} />
        )}
      </td>
      <td className="w-20 p-1">
        {running ? <span className="px-1.5 text-indigo-600">running…</span> : (
          <input key={e.duration_min} className="cell font-mono tabular-nums" defaultValue={formatDuration(e.duration_min)}
            onKeyDown={(ev) => ev.key === "Enter" && (ev.target as HTMLInputElement).blur()}
            onBlur={(ev) => {
              const m = parseDuration(ev.target.value);
              if (m === null || m > 1440) ev.target.value = formatDuration(e.duration_min);
              else if (m !== e.duration_min) patch(e.id, { duration_min: m });
              else ev.target.value = formatDuration(m);
            }} />
        )}
      </td>
      <td className="w-10 p-1 text-center"><input type="checkbox" checked={!!e.billable} onChange={(ev) => patch(e.id, { billable: ev.target.checked })} title="Billable" /></td>
      {detailed && <td className="w-24 p-2 text-right tabular-nums text-slate-600">{e.rate ? money(e.rate, e.currency) : "—"}</td>}
      <td className="w-28 p-2 text-right tabular-nums text-slate-600">{e.amount ? money(e.amount, e.currency) : "—"}</td>
      <td className="w-8 p-1"><button className="text-slate-400 hover:text-red-600" title="Delete" onClick={del}>✕</button></td>
    </tr>
  );
}
