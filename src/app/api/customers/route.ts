import { route } from "@/lib/api";
import { db } from "@/lib/db";
import { customerCreate } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export const GET = route(() => db().prepare("SELECT * FROM customers ORDER BY archived, name COLLATE NOCASE").all());

export const POST = route(async (req) => {
  const d = customerCreate.parse(await req.json());
  const r = db().prepare("INSERT INTO customers (name, email, notes, currency, rate) VALUES (@name, @email, @notes, @currency, @rate)")
    .run({ ...d, email: d.email ?? null, notes: d.notes ?? null });
  return db().prepare("SELECT * FROM customers WHERE id = ?").get(r.lastInsertRowid);
});
