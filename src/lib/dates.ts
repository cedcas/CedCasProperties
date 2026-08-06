/**
 * Format a calendar date WITHOUT timezone conversion.
 *
 * Stay dates (check-in / check-out and the nightly-breakdown rows) are *calendar
 * dates*, not instants — "Jun 19" means the night of the 19th wherever the viewer
 * sits. They are stored / serialized anchored at UTC midnight (`new Date("2026-06-19")`
 * → `2026-06-19T00:00:00Z`), so we render them back in UTC to get the true calendar
 * date regardless of the runtime's local timezone — a US browser, a Vercel UTC server,
 * etc. Without the explicit `timeZone: "UTC"`, a viewer behind UTC sees the date shifted
 * one day earlier (e.g. Jun 19 rendered as Jun 18).
 *
 * Accepts either a `YYYY-MM-DD` string or a Date already anchored at UTC midnight.
 */
export function formatStayDate(
  d: string | Date,
  opts: Intl.DateTimeFormatOptions = {
    weekday: "short",
    year: "numeric",
    month: "long",
    day: "numeric",
  }
): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-PH", { timeZone: "UTC", ...opts });
}

/**
 * ── UTC calendar-date helpers ──────────────────────────────────────────────
 *
 * Everything below treats a date as a *calendar date* anchored at UTC midnight,
 * matching how `Booking.checkIn` / `checkOut` and `AvailabilityBlock.startDate` /
 * `endDate` are stored. Date ranges are half-open — start INCLUSIVE, end EXCLUSIVE —
 * so a stay may check in on the day another range ends (same-day turnover).
 *
 * Use these instead of `new Date(str)` + `setHours(0,0,0,0)` / `getDay()` / `setDate()`.
 * The local-time variants silently shift the calendar date by a day for anyone
 * behind UTC (a US admin, a Manila guest on a UTC server, …).
 */

/** Normalize any date-ish value to UTC midnight on the same calendar date. */
export function toUtcMidnight(d: string | Date): Date {
  if (typeof d === "string") {
    // Bare YYYY-MM-DD already parses as UTC midnight; anything longer may carry a
    // time or offset, so re-anchor from the UTC calendar parts.
    const bare = /^\d{4}-\d{2}-\d{2}$/.test(d.trim());
    const parsed = new Date(bare ? `${d.trim()}T00:00:00Z` : d);
    if (isNaN(parsed.getTime())) return parsed; // caller validates with isNaN
    return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
  }
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** `YYYY-MM-DD` key for a calendar date. Stable regardless of runtime timezone. */
export function utcDateKey(d: Date): string {
  return d.toISOString().split("T")[0];
}

/** Today's calendar date at UTC midnight. */
export function todayUtc(): Date {
  return toUtcMidnight(new Date());
}

/** Shift a UTC-midnight date by whole days. Negative `n` goes backwards. */
export function addUtcDays(d: Date, n: number): Date {
  const out = new Date(d.getTime());
  out.setUTCDate(out.getUTCDate() + n);
  return out;
}

/** Nights between two UTC-midnight dates — i.e. the number of billable nights. */
export function nightsBetween(start: Date, end: Date): number {
  return Math.round((toUtcMidnight(end).getTime() - toUtcMidnight(start).getTime()) / 86_400_000);
}

/**
 * Every occupied night in a half-open range, as UTC-midnight dates.
 * `eachNightUtc(Aug 15, Aug 18)` → [Aug 15, Aug 16, Aug 17] — the check-out day is
 * NOT occupied, which is what makes same-day turnover work.
 */
export function eachNightUtc(start: Date, end: Date): Date[] {
  const nights: Date[] = [];
  const cursor = toUtcMidnight(start);
  const stop = toUtcMidnight(end);
  while (cursor < stop) {
    nights.push(new Date(cursor.getTime()));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return nights;
}

/**
 * Half-open overlap test: do [aStart, aEnd) and [bStart, bEnd) share a night?
 * The single definition of "conflict" for the whole availability system — it is
 * deliberately identical to the comparison the booking flow has always used, so
 * check-out dates stay reusable.
 */
export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart;
}
