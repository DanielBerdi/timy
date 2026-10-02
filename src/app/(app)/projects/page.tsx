"use client";
import { useState } from "react";
import { api, type Currency, type Project, useCustomers, useProjects } from "@/lib/client";
import { money } from "@/lib/time";

export default function Projects() {
  const { data: customers } = useCustomers();
  const { data, error, reload } = useProjects();
  const [customerId, setCustomerId] = useState("");
  const [name, setName] = useState("");
  const [filter, setFilter] = useState("");
  const [err, setErr] = useState("");

  async function run(fn: () => Promise<unknown>) {
    try { setErr(""); await fn(); await reload(); window.dispatchEvent(new Event("projects-changed")); } catch (e) { setErr((e as Error).message); }
  }
  const patch = (id: number, body: object) => run(() => api(`/api/projects/${id}`, "PATCH", body));
  const add = () => run(async () => { await api("/api/projects", "POST", { customer_id: Number(customerId), name }); setName(""); });
  const active = customers?.filter((c) => !c.archived) ?? [];
  const rows = data?.filter((p) => !filter || String(p.customer_id) === filter) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">Projects</h1>
        <select className="input ml-auto w-48" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All customers</option>
          {customers?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      {(error || err) && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error || err}</p>}
      <form className="card flex flex-wrap items-end gap-3 p-3" onSubmit={(e) => { e.preventDefault(); if (name.trim() && customerId) add(); }}>
        <div className="w-56"><label className="label">Customer</label>
          <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}><option value="">Select…</option>{active.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div className="grow"><label className="label">New project</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" /></div>
        <button className="btn btn-primary" disabled={!name.trim() || !customerId}>Add</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-xs text-slate-500">
            <tr><th className="w-8 p-2" title="Favorites are listed first everywhere" /><th className="p-2">Customer</th><th className="p-2">Project</th><th className="p-2">Color</th><th className="p-2">Rate override</th><th className="p-2">Effective</th><th className="p-2">Billable</th><th className="p-2" /></tr>
          </thead>
          <tbody>{rows.map((p) => <Row key={p.id} p={p} patch={patch} del={() => run(() => api(`/api/projects/${p.id}`, "DELETE"))} />)}
            {rows.length === 0 && <tr><td colSpan={8} className="p-4 text-center text-slate-400">No projects.</td></tr>}</tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">Leave the override empty to use the customer&apos;s rate and currency. ★ Favorite projects are listed first in every dropdown.</p>
    </div>
  );
}

function Row({ p, patch, del }: { p: Project; patch: (id: number, b: object) => void; del: () => void }) {
  return (
    <tr className={`border-b border-slate-100 ${p.archived ? "opacity-50" : ""}`}>
      <td className="w-8 p-1 text-center">
        <button className={`text-lg leading-none ${p.favorite ? "text-amber-400" : "text-slate-300 hover:text-amber-400"}`} title={p.favorite ? "Remove from favorites" : "Add to favorites"} aria-pressed={!!p.favorite}
          onClick={() => patch(p.id, { favorite: !p.favorite })}>{p.favorite ? "★" : "☆"}</button>
      </td>
      <td className="p-2 text-slate-600">{p.customer_name}</td>
      <td className="p-1"><input className="cell" defaultValue={p.name} onBlur={(e) => { if (e.target.value.trim() && e.target.value !== p.name) patch(p.id, { name: e.target.value }); }} /></td>
      <td className="p-1"><input type="color" className="h-7 w-10 cursor-pointer" defaultValue={p.color} onBlur={(e) => e.target.value !== p.color && patch(p.id, { color: e.target.value })} /></td>
      <td className="p-1">
        <div className="flex gap-1">
          <input className="cell w-24" type="number" min="0" step="any" placeholder="—" defaultValue={p.rate ?? ""}
            onBlur={(e) => { const v = e.target.value === "" ? null : Number(e.target.value); if (v !== p.rate) patch(p.id, v === null ? { rate: null, currency: null } : { rate: v, currency: p.currency ?? p.effective_currency }); }} />
          {p.rate !== null && (
            <select className="cell w-20" value={p.currency ?? p.effective_currency} onChange={(e) => patch(p.id, { currency: e.target.value as Currency })}><option>USD</option><option>ILS</option></select>
          )}
        </div>
      </td>
      <td className="p-2 text-slate-600">{p.effective_rate != null ? `${money(p.effective_rate, p.effective_currency)}/h` : "no rate"}</td>
      <td className="p-2"><input type="checkbox" checked={!!p.billable} onChange={(e) => patch(p.id, { billable: e.target.checked })} /></td>
      <td className="whitespace-nowrap p-1 text-right">
        <button className="btn" onClick={() => patch(p.id, { archived: !p.archived })}>{p.archived ? "Restore" : "Archive"}</button>{" "}
        <button className="btn btn-danger" onClick={() => confirm(`Delete ${p.name}?`) && del()}>Delete</button>
      </td>
    </tr>
  );
}
