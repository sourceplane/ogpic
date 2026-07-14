/*
 * Client-side share + calendar helpers for a fixture. No backend needed: build
 * a WhatsApp share link and a downloadable .ics from the match the VM already
 * holds. Kept framework-free so any screen can call them.
 */

export interface ShareMatch {
  team: string;
  dateLabel: string;
  scheduledAt?: string | undefined;
  venue?: string | null | undefined;
  mapsUrl?: string | null | undefined;
}

/** The human-readable share blurb ("⚽ Northside FC — 20 JUL · Riverside …"). */
export function shareText(m: ShareMatch): string {
  const when = m.scheduledAt ? formatWhen(m.scheduledAt) : m.dateLabel;
  const where = m.venue ? ` at ${m.venue}` : "";
  const dirs = m.mapsUrl ? `\n📍 ${m.mapsUrl}` : "";
  return `⚽ ${m.team} — ${when}${where}. Are you in? Set your availability in Rondo.${dirs}`;
}

/** wa.me deep link (opens WhatsApp with the share text prefilled). */
export function whatsappHref(m: ShareMatch): string {
  return `https://wa.me/?text=${encodeURIComponent(shareText(m))}`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** ICS UTC stamp: YYYYMMDDTHHMMSSZ. */
function icsStamp(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

function icsEscape(s: string): string {
  return s.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

/**
 * Build a minimal VCALENDAR for the match (1-hour default duration). Returns
 * null when there is no concrete start time to anchor the event.
 */
export function buildIcs(m: ShareMatch, uid: string): string | null {
  if (!m.scheduledAt) return null;
  const start = new Date(m.scheduledAt);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const title = `${m.team} — match`;
  const location = m.venue ?? (m.mapsUrl ?? "");
  const desc = m.mapsUrl ? `Directions: ${m.mapsUrl}` : "";
  // Note: DTSTAMP uses the event start (Date.now() is unavailable here and the
  // exact stamp is not load-bearing for a personal calendar import).
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Rondo//Match//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}@rondo`,
    `DTSTAMP:${icsStamp(start)}`,
    `DTSTART:${icsStamp(start)}`,
    `DTEND:${icsStamp(end)}`,
    `SUMMARY:${icsEscape(title)}`,
    location ? `LOCATION:${icsEscape(location)}` : "",
    desc ? `DESCRIPTION:${icsEscape(desc)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

/** Trigger a browser download of the .ics for the match (no-op if no start). */
export function downloadIcs(m: ShareMatch, uid: string): void {
  const ics = buildIcs(m, uid);
  if (!ics || typeof document === "undefined") return;
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "rondo-match.ics";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
