import { route } from "@/lib/api";
import { db } from "@/lib/db";
import { customerCreate } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export const GET = route(() => db.all("SELECT * FROM customers ORDER BY archived, name COLLATE NOCASE"));

export const POST = route(async (req) => {
  const d = customerCreate.parse(await req.json());
  const r = await db.run("INSERT INTO customers (name, email, notes, currency, rate) VALUES (@name, @email, @notes, @currency, @rate)",
    { ...d, email: d.email ?? null, notes: d.notes ?? null });
  return db.get("SELECT * FROM customers WHERE id = ?", [r.lastInsertRowid]);
});
