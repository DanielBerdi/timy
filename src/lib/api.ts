import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { isAuthed } from "@/auth";

export class HttpError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

type Ctx<P> = { params: Promise<P> };

/** Wraps a route handler: enforces auth and maps errors to JSON responses. */
export function route<P = Record<string, never>>(fn: (req: Request, params: P) => Promise<unknown> | unknown) {
  return async (req: Request, ctx: Ctx<P>) => {
    try {
      if (!(await isAuthed())) throw new HttpError(401, "Unauthorized");
      const result = await fn(req, await ctx.params);
      return result instanceof Response ? result : NextResponse.json(result ?? { ok: true });
    } catch (e) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
      if (e instanceof ZodError) return NextResponse.json({ error: e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") }, { status: 400 });
      if (e instanceof SyntaxError) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
      console.error(e);
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
  };
}

export function idOf(p: { id: string }): number {
  const n = Number(p.id);
  if (!Number.isInteger(n)) throw new HttpError(400, "Bad id");
  return n;
}

/** Build "SET a = @a, b = @b" for only the provided keys of a partial update. */
export function setClause(data: Record<string, unknown>, allowed: string[]) {
  const keys = allowed.filter((k) => k in data);
  if (!keys.length) throw new HttpError(400, "Nothing to update");
  const params: Record<string, unknown> = {};
  for (const k of keys) {
    const v = data[k];
    params[k] = typeof v === "boolean" ? (v ? 1 : 0) : v;
  }
  return { sql: keys.map((k) => `${k} = @${k}`).join(", "), params };
}
