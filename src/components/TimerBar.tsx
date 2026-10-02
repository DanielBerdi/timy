"use client";
import { useEffect, useState } from "react";
import { api, type Entry, useProjects } from "@/lib/client";

function elapsed(since: string) {
  const s = Math.max(0, Math.floor((Date.now() - Date.parse(since)) / 1000));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${Math.floor(s / 3600)}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}`;
}

export default function TimerBar() {
  const { data: projects } = useProjects();
  const [running, setRunning] = useState<Entry | null>(null);
  const [projectId, setProjectId] = useState("");
  const [desc, setDesc] = useState("");
  const [, tick] = useState(0);
  const [err, setErr] = useState("");

  useEffect(() => { api<Entry | null>("/api/timer").then(setRunning).catch(() => {}); }, []);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(t); }, []);

  async function start() {
    try {
      setErr("");
      setRunning(await api<Entry>("/api/timer/start", "POST", { project_id: Number(projectId), description: desc }));
      setDesc("");
    } catch (e) { setErr((e as Error).message); }
  }
  async function stop() {
    await api("/api/timer/stop", "POST");
    setRunning(null);
    window.dispatchEvent(new Event("entries-changed"));
  }

  if (running?.timer_started_at) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: running.color }} />
        <span className="max-w-40 truncate">{running.customer_name} / {running.project_name}</span>
        <span className="font-mono tabular-nums">{elapsed(running.timer_started_at)}</span>
        <button className="btn btn-danger" onClick={stop}>Stop</button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2" title={err}>
      <input className="input w-40" placeholder="What are you doing?" value={desc} onChange={(e) => setDesc(e.target.value)} />
      <select className="input w-48" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
        <option value="">Project…</option>
        {projects?.filter((p) => !p.archived).map((p) => <option key={p.id} value={p.id}>{p.customer_name} / {p.name}</option>)}
      </select>
      <button className="btn btn-primary" disabled={!projectId} onClick={start}>Start</button>
    </div>
  );
}
