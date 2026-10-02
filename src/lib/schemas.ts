import { z } from "zod";

export const currency = z.enum(["USD", "ILS"]);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const rate = z.number().min(0).max(100000).nullable();

export const customerCreate = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().max(200).nullish(),
  notes: z.string().max(5000).nullish(),
  currency: currency.default("USD"),
  rate: rate.default(null),
});
export const customerUpdate = customerCreate.partial().extend({ archived: z.boolean().optional() });

export const projectCreate = z.object({
  customer_id: z.number().int(),
  name: z.string().trim().min(1).max(200),
  rate: rate.default(null),
  currency: currency.nullable().default(null),
  billable: z.boolean().default(true),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#6366f1"),
});
export const projectUpdate = projectCreate.omit({ customer_id: true }).partial().extend({ archived: z.boolean().optional() });

export const entryCreate = z.object({
  project_id: z.number().int(),
  date,
  start_time: time.nullable().default(null),
  duration_min: z.number().int().min(0).max(24 * 60).default(0),
  description: z.string().max(2000).default(""),
  billable: z.boolean().default(true),
});
export const entryUpdate = entryCreate.partial();

export const timerStart = z.object({ project_id: z.number().int(), description: z.string().max(2000).default("") });

export const gcalImport = z.object({
  project_id: z.number().int(),
  events: z.array(z.object({
    id: z.string().min(1).max(500),
    title: z.string().max(2000),
    date,
    start_time: time,
    duration_min: z.number().int().min(1).max(24 * 60),
  })).min(1).max(500),
});
