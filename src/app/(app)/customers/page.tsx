"use client";
import { useState } from "react";
import { api, type Customer, type Currency, useCustomers } from "@/lib/client";

export default function Customers() {
  const { data, error, reload } = useCustomers();
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [rate, setRate] = useState("");
  const [err, setErr] = useState("");

  async function run(fn: () => Promise<unknown>) {
    try { setErr(""); await fn(); await reload(); } catch (e) { setErr((e as Error).message); }
  }
  const add = () => run(async () => {
    await api("/api/customers", "POST", { name, currency, rate: rate === "" ? null : Number(rate) });
    setName(""); setRate("");
  });
  const patch = (id: number, body: object) => run(() => api(`/api/customers/${id}`, "PATCH", body));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Customers</h1>
      {(error || err) && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error || err}</p>}
      <form className="card flex flex-wrap items-end gap-3 p-3" onSubmit={(e) => { e.preventDefault(); if (name.trim()) add(); }}>
        <div className="grow"><label className="label">New customer</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" /></div>
        <div><label className="label">Currency</label><select className="input" value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}><option>USD</option><option>ILS</option></select></div>
        <div className="w-28"><label className="label">Hourly rate</label><input className="input" type="number" min="0" step="any" value={rate} onChange={(e) => setRate(e.target.value)} /></div>
        <button className="btn btn-primary" disabled={!name.trim()}>Add</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="rtable w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-xs text-slate-500">
            <tr><th className="w-12 p-2">Color</th><th className="p-2">Name</th><th className="p-2">Email</th><th className="p-2">Currency</th><th className="p-2">Rate / hr</th><th className="p-2">Notes</th><th className="p-2" /></tr>
          </thead>
          <tbody>
            {data?.map((c) => <Row key={c.id} c={c} patch={patch} del={(id) => run(() => api(`/api/customers/${id}`, "DELETE"))} />)}
            {data?.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-slate-400">No customers yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ c, patch, del }: { c: Customer; patch: (id: number, b: object) => void; del: (id: number) => void }) {
  const text = (k: "name" | "email" | "notes") => (
    <input className="cell" defaultValue={c[k] ?? ""} onBlur={(e) => { if (e.target.value !== (c[k] ?? "") && (k !== "name" || e.target.value.trim())) patch(c.id, { [k]: e.target.value }); }} />
  );
  return (
    <tr className={`rrow border-b border-slate-100 ${c.archived ? "opacity-50" : ""}`}>
      <td data-label="Color" className="p-1"><input type="color" className="h-7 w-10 cursor-pointer rounded" title="Color used for this customer everywhere" defaultValue={c.color} onBlur={(e) => e.target.value !== c.color && patch(c.id, { color: e.target.value })} /></td>
      <td data-label="Name" data-span="2" className="p-1">{text("name")}</td>
      <td data-label="Email" data-span="2" className="p-1">{text("email")}</td>
      <td data-label="Currency" className="p-1"><select className="cell" value={c.currency} onChange={(e) => patch(c.id, { currency: e.target.value })}><option>USD</option><option>ILS</option></select></td>
      <td data-label="Rate / hr" className="w-28 p-1"><input className="cell" type="number" min="0" step="any" defaultValue={c.rate ?? ""} onBlur={(e) => { const v = e.target.value === "" ? null : Number(e.target.value); if (v !== c.rate) patch(c.id, { rate: v }); }} /></td>
      <td data-label="Notes" data-span="2" className="p-1">{text("notes")}</td>
      <td data-span="2" className="whitespace-nowrap p-1 text-right">
        <button className="btn" onClick={() => patch(c.id, { archived: !c.archived })}>{c.archived ? "Restore" : "Archive"}</button>{" "}
        <button className="btn btn-danger" onClick={() => confirm(`Delete ${c.name}?`) && del(c.id)}>Delete</button>
      </td>
    </tr>
  );
}
