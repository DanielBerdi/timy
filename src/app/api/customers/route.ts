import { route } from "@/lib/api";
import { db } from "@/lib/db";
import { paletteColor } from "@/lib/palette";
import { customerCreate } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export const GET = route(() => db.all("SELECT * FROM customers ORDER BY archived, name COLLATE NOCASE"));

export const POST = route(async (req) => {
  const d = customerCreate.parse(await req.json());
  const count = ((await db.get<{ n: number }>("SELECT COUNT(*) n FROM customers"))?.n) ?? 0;
  const r = await db.run("INSERT INTO customers (name, email, notes, currency, rate, color) VALUES (@name, @email, @notes, @currency, @rate, @color)",
    { ...d, email: d.email ?? null, notes: d.notes ?? null, color: d.color ?? paletteColor(count) });
  return db.get("SELECT * FROM customers WHERE id = ?", [r.lastInsertRowid]);
});
