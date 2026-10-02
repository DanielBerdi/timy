"use client";
import { useCallback, useEffect, useState } from "react";

export type Currency = "USD" | "ILS";
export type Customer = { id: number; name: string; email: string | null; notes: string | null; currency: Currency; rate: number | null; archived: number };
export type Project = {
  id: number; customer_id: number; customer_name: string; name: string; rate: number | null; currency: Currency | null;
  billable: number; color: string; archived: number; effective_rate: number | null; effective_currency: Currency;
};
export type Entry = {
  id: number; project_id: number; project_name: string; color: string; customer_id: number; customer_name: string;
  date: string; start_time: string | null; duration_min: number; description: string; billable: number;
  gcal_event_id: string | null; timer_started_at: string | null; rate: number; currency: Currency; amount: number;
};

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) { super(message); }
}

export async function api<T = unknown>(url: string, method = "GET", body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 401) { window.location.href = "/login"; throw new ApiError(401, "Unauthorized"); }
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, j.error ?? `Error ${res.status}`, j.code);
  return j as T;
}

/** Loads a list and exposes reload; errors are surfaced as a string. */
export function useApi<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    if (!url) return;
    try { setData(await api<T>(url)); setError(null); } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
  }, [url]);
  useEffect(() => { setLoading(true); reload(); }, [reload]);
  return { data, setData, error, loading, reload };
}

export function useCustomers() { return useApi<Customer[]>("/api/customers"); }
export function useProjects() { return useApi<Project[]>("/api/projects"); }

/** Sum amounts per currency. */
export function totalsByCurrency(entries: Entry[]): Record<string, number> {
  const t: Record<string, number> = {};
  for (const e of entries) if (e.amount) t[e.currency] = (t[e.currency] ?? 0) + e.amount;
  return t;
}
