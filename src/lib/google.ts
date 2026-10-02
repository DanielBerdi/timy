import { getSetting } from "./db";
import { HttpError } from "./api";

const TZ = process.env.APP_TIMEZONE ?? "Asia/Jerusalem";
let cached: { token: string; exp: number } | null = null;

async function accessToken(): Promise<string> {
  if (cached && cached.exp > Date.now() + 30_000) return cached.token;
  const refresh = await getSetting("google_refresh_token");
  if (!refresh) throw new HttpError(412, "Google Calendar is not connected. Sign out and sign in again.", "not_connected");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.AUTH_GOOGLE_ID ?? "",
      client_secret: process.env.AUTH_GOOGLE_SECRET ?? "",
      refresh_token: refresh,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new HttpError(412, "Google rejected the stored token. Sign out and sign in again.", "not_connected");
  const j = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: j.access_token, exp: Date.now() + j.expires_in * 1000 };
  return cached.token;
}

export type GCalEvent = { id: string; title: string; date: string; start_time: string; duration_min: number };

/** Wall-clock date/time of an instant in the app timezone. */
export function localParts(iso: string, tz = TZ): { date: string; time: string } {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date(iso)).map((x) => [x.type, x.value]),
  );
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

/** Timed (non all-day, non-cancelled) events of the primary calendar between two local dates, inclusive. */
export async function listEvents(from: string, to: string): Promise<GCalEvent[]> {
  const pad = 36 * 3600 * 1000; // generous margin so timezone offsets never cut events off
  const timeMin = new Date(new Date(`${from}T00:00:00Z`).getTime() - pad).toISOString();
  const timeMax = new Date(new Date(`${to}T00:00:00Z`).getTime() + 24 * 3600 * 1000 + pad).toISOString();
  const token = await accessToken();
  const out: GCalEvent[] = [];
  let pageToken: string | undefined;
  do {
    const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    url.search = new URLSearchParams({ singleEvents: "true", orderBy: "startTime", maxResults: "250", timeMin, timeMax, ...(pageToken ? { pageToken } : {}) }).toString();
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401 || res.status === 403) {
      cached = null;
      throw new HttpError(412, "Google Calendar access was not granted. Sign out and sign in again, and allow calendar access.", "not_connected");
    }
    if (!res.ok) throw new HttpError(502, `Google Calendar error (${res.status})`);
    const j = (await res.json()) as {
      nextPageToken?: string;
      items?: { id: string; status?: string; summary?: string; start?: { dateTime?: string }; end?: { dateTime?: string }; attendees?: { self?: boolean; responseStatus?: string }[] }[];
    };
    for (const e of j.items ?? []) {
      if (e.status === "cancelled" || !e.start?.dateTime || !e.end?.dateTime) continue;
      if (e.attendees?.some((a) => a.self && a.responseStatus === "declined")) continue;
      const s = localParts(e.start.dateTime);
      if (s.date < from || s.date > to) continue;
      const minutes = Math.max(1, Math.round((Date.parse(e.end.dateTime) - Date.parse(e.start.dateTime)) / 60000));
      out.push({ id: e.id, title: e.summary ?? "(no title)", date: s.date, start_time: s.time, duration_min: Math.min(minutes, 24 * 60) });
    }
    pageToken = j.nextPageToken;
  } while (pageToken);
  return out;
}
