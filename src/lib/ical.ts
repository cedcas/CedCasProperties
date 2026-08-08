/**
 * iCalendar (RFC 5545) parsing and generation — the single home for both directions.
 *
 * Replaces two copy-pasted inline parsers that previously lived in
 * `api/availability/[slug]/route.ts` and `api/bookings/route.ts`. Neither read `UID`,
 * so imported events had no stable identity and could not be reconciled across syncs.
 *
 * Stay dates are calendar dates anchored at UTC midnight, with ranges half-open
 * (DTSTART inclusive, DTEND exclusive) — the same convention Airbnb uses for
 * all-day blocking events and the same one `Booking.checkIn`/`checkOut` follow.
 */

import { toUtcMidnight, addUtcDays } from "@/lib/dates";

export interface ParsedIcsEvent {
  uid: string | null;
  summary: string | null;
  start: Date; // UTC midnight, inclusive
  end: Date; // UTC midnight, exclusive
}

/** A row destined for the exported feed. `uid` must be stable across requests. */
export interface IcsExportEvent {
  uid: string;
  start: Date; // inclusive
  end: Date; // exclusive
  summary: string;
  /** Drives DTSTAMP. Use the record's `updatedAt` so an unchanged feed is byte-identical. */
  stamp: Date;
}

// ── Parsing ────────────────────────────────────────────────────────────────

/**
 * Unfold per RFC 5545 §3.1: a CRLF followed by a single space or tab is a line
 * continuation, not a new line. The previous inline parsers trimmed every physical
 * line, which silently corrupted any folded value.
 */
function unfoldLines(icsText: string): string[] {
  const normalized = icsText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const out: string[] = [];
  for (const line of normalized.split("\n")) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && out.length > 0) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

/** Split `NAME;PARAM=VAL:value` into its name+params half and its value half. */
function splitProperty(line: string): { name: string; params: string; value: string } | null {
  const colon = line.indexOf(":");
  if (colon === -1) return null;
  const left = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const semi = left.indexOf(";");
  return semi === -1
    ? { name: left.toUpperCase(), params: "", value }
    : {
        name: left.slice(0, semi).toUpperCase(),
        params: left.slice(semi + 1).toUpperCase(),
        value,
      };
}

/**
 * Parse an iCal DATE or DATE-TIME to a UTC-midnight calendar date.
 *
 * All four forms collapse to the calendar date, because availability is reasoned
 * about in whole nights: `20260815`, `20260815T140000Z`, `20260815T140000`, and
 * `TZID`-qualified values. Taking the date parts directly (rather than parsing an
 * instant and reading it back) is what keeps a 14:00 Manila event on Aug 15 instead
 * of shifting it to Aug 14 on a UTC server.
 */
export function parseIcsDate(raw: string): Date | null {
  const s = raw.trim();
  const m = /^(\d{4})(\d{2})(\d{2})/.exec(s);
  if (!m) return null;
  const [, y, mo, d] = m;
  const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Parse an RFC 5545 DURATION (e.g. `P3D`, `PT24H`, `P1DT12H`) into whole days,
 * rounding any partial day up so a sub-day event still occupies one night.
 * Used only when a VEVENT has DTSTART but no DTEND — previously such events were
 * dropped entirely.
 */
export function parseIcsDuration(raw: string): number | null {
  const m = /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(
    raw.trim().toUpperCase()
  );
  if (!m) return null;
  const [, sign, w, d, h, mi, sec] = m;
  const totalHours =
    (Number(w ?? 0) * 7 + Number(d ?? 0)) * 24 +
    Number(h ?? 0) +
    Number(mi ?? 0) / 60 +
    Number(sec ?? 0) / 3600;
  if (totalHours <= 0) return null;
  return (sign === "-" ? -1 : 1) * Math.max(1, Math.ceil(totalHours / 24));
}

/**
 * Extract every VEVENT with a usable date range.
 *
 * Cancelled events (`STATUS:CANCELLED`) are skipped — they are tombstones, not blocks.
 * An event whose range is empty or inverted is skipped rather than trusted.
 */
export function parseIcsEvents(icsText: string): ParsedIcsEvent[] {
  const events: ParsedIcsEvent[] = [];
  let inEvent = false;
  let uid: string | null = null;
  let summary: string | null = null;
  let start: Date | null = null;
  let end: Date | null = null;
  let durationDays: number | null = null;
  let cancelled = false;

  for (const line of unfoldLines(icsText)) {
    const trimmed = line.trim();

    if (trimmed === "BEGIN:VEVENT") {
      inEvent = true;
      uid = summary = null;
      start = end = null;
      durationDays = null;
      cancelled = false;
      continue;
    }

    if (trimmed === "END:VEVENT") {
      if (inEvent && !cancelled && start) {
        const resolvedEnd = end ?? (durationDays !== null ? addUtcDays(start, durationDays) : null);
        // Some feeds emit a zero-length all-day event for a single night.
        const finalEnd = resolvedEnd && resolvedEnd > start ? resolvedEnd : addUtcDays(start, 1);
        events.push({ uid, summary, start, end: finalEnd });
      }
      inEvent = false;
      continue;
    }

    if (!inEvent) continue;

    const prop = splitProperty(trimmed);
    if (!prop) continue;

    switch (prop.name) {
      case "UID":
        uid = prop.value.trim() || null;
        break;
      case "SUMMARY":
        summary = unescapeIcsText(prop.value).trim() || null;
        break;
      case "DTSTART":
        start = parseIcsDate(prop.value);
        break;
      case "DTEND":
        end = parseIcsDate(prop.value);
        break;
      case "DURATION":
        durationDays = parseIcsDuration(prop.value);
        break;
      case "STATUS":
        if (prop.value.trim().toUpperCase() === "CANCELLED") cancelled = true;
        break;
    }
  }

  return events;
}

/** True when the payload is plausibly a calendar. Guards against HTML error pages. */
export function looksLikeVCalendar(text: string): boolean {
  return /BEGIN:VCALENDAR/i.test(text);
}

// ── Generation ─────────────────────────────────────────────────────────────

/** `YYYYMMDD` for a DATE-valued property. */
export function toIcsDateOnly(date: Date): string {
  return date.toISOString().split("T")[0].replace(/-/g, "");
}

/** `YYYYMMDDTHHMMSSZ` for DTSTAMP. */
export function toIcsStamp(date: Date): string {
  return date.toISOString().replace(/[-:.]/g, "").slice(0, 15) + "Z";
}

/** Escape per RFC 5545 §3.3.11. Backslash first, or it double-escapes. */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function unescapeIcsText(value: string): string {
  return value.replace(/\\n/gi, "\n").replace(/\\([;,\\])/g, "$1");
}

/** Fold a content line to 75 octets per RFC 5545 §3.1, continuing with a leading space. */
export function foldIcsLine(line: string): string {
  if (Buffer.byteLength(line, "utf8") <= 75) return line;
  const chunks: string[] = [];
  let current = "";
  let currentBytes = 0;
  for (const char of line) {
    const size = Buffer.byteLength(char, "utf8");
    // Continuation lines carry a leading space, so their budget is one octet smaller.
    const limit = chunks.length === 0 ? 75 : 74;
    if (currentBytes + size > limit) {
      chunks.push(current);
      current = char;
      currentBytes = size;
    } else {
      current += char;
      currentBytes += size;
    }
  }
  if (current) chunks.push(current);
  return chunks.map((c, i) => (i === 0 ? c : ` ${c}`)).join("\r\n");
}

/**
 * Build a complete VCALENDAR of all-day blocking events with CRLF line endings.
 *
 * Every UID is supplied by the caller and derived from a database id, so a feed
 * fetched twice with no underlying change is byte-for-byte identical — which is what
 * lets Airbnb and other consumers detect real changes instead of constant churn.
 */
export function buildVCalendar({
  calendarName,
  events,
}: {
  calendarName: string;
  events: IcsExportEvent[];
}): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//HavenInLipa//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
    "X-WR-TIMEZONE:Asia/Manila",
  ];

  for (const event of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.uid}`,
      `DTSTAMP:${toIcsStamp(event.stamp)}`,
      `DTSTART;VALUE=DATE:${toIcsDateOnly(toUtcMidnight(event.start))}`,
      `DTEND;VALUE=DATE:${toIcsDateOnly(toUtcMidnight(event.end))}`,
      `SUMMARY:${escapeIcsText(event.summary)}`,
      "STATUS:CONFIRMED",
      "TRANSP:OPAQUE",
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return lines.map(foldIcsLine).join("\r\n") + "\r\n";
}
