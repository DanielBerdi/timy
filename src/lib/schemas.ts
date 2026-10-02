import { z } from "zod";

export const currency = z.enum(["USD", "ILS"]);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const rate = z.number().min(0).max(100000).nullable();

// Update schemas are built from default-free shapes: a partial update must only touch the
// fields that were sent (Zod would otherwise fill in each field's default and overwrite data).
const customerShape = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().max(200).nullish(),
  notes: z.string().max(5000).nullish(),
  currency,
  rate,
});
export const customerCreate = customerShape.extend({ currency: currency.default("USD"), rate: rate.default(null) });
export const customerUpdate = customerShape.partial().extend({ archived: z.boolean().optional() });

const projectShape = z.object({
  customer_id: z.number().int(),
  name: z.string().trim().min(1).max(200),
  rate,
  currency: currency.nullable(),
  billable: z.boolean(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});
export const projectCreate = projectShape.extend({
  rate: rate.default(null),
  currency: currency.nullable().default(null),
  billable: z.boolean().default(true),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#6366f1"),
});
export const projectUpdate = projectShape.omit({ customer_id: true }).partial().extend({ archived: z.boolean().optional() });

const entryShape = z.object({
  project_id: z.number().int(),
  date,
  start_time: time.nullable(),
  duration_min: z.number().int().min(0).max(24 * 60),
  description: z.string().max(2000),
  billable: z.boolean(),
});
export const entryCreate = entryShape.extend({
  start_time: time.nullable().default(null),
  duration_min: z.number().int().min(0).max(24 * 60).default(0),
  description: z.string().max(2000).default(""),
  billable: z.boolean().default(true),
});
export const entryUpdate = entryShape.partial();

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
