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
  opts: Intl.DateTimeFormatOptions = { weekday: "short", year: "numeric", month: "long", day: "numeric" }
): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-PH", { timeZone: "UTC", ...opts });
}
