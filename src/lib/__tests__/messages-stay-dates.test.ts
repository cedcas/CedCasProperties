import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { formatStayRangeShort } from "@/lib/dates";

/**
 * DEF — Admin Messages showed booking dates one day early (a Sep 25–27 stay read 9/24–9/26
 * for a viewer in America/Chicago).
 *
 * `GuestMessageThreads` (thread list) and `ThreadDetail` (thread header) formatted
 * `checkIn`/`checkOut` with `new Date(d).toLocaleDateString(...)` and no timeZone. The
 * Messages APIs return Prisma `DateTime` values through `NextResponse.json`, i.e. UTC-midnight
 * ISO strings — calendar dates, not instants — so local-time formatting shifts them for anyone
 * behind UTC. See "Calendar-date rendering" in the Website Technical Specification.
 *
 * Runs under TZ=America/Chicago, Asia/Manila and UTC (vitest.config.ts).
 */

const TZ = process.env.TZ;

/** Exactly what `/api/admin/guest-messages/*` puts on the wire for a Prisma DateTime. */
function apiBooking(checkIn: string, checkOut: string): { checkIn: string; checkOut: string } {
  return JSON.parse(JSON.stringify({ checkIn: new Date(checkIn), checkOut: new Date(checkOut) }));
}

// [description, checkIn, checkOut, expected label]
const CASES: Array<[string, string, string, string]> = [
  ["plain September stay", "2026-09-25", "2026-09-27", "9/25–9/27"],
  ["month boundary", "2026-09-30", "2026-10-02", "9/30–10/2"],
  ["year boundary", "2026-12-30", "2027-01-02", "12/30–1/2"],
  ["end of February", "2027-02-27", "2027-03-01", "2/27–3/1"],
  ["Chicago DST starts (2026-03-08)", "2026-03-07", "2026-03-09", "3/7–3/9"],
  ["Chicago DST ends (2026-11-01)", "2026-10-31", "2026-11-02", "10/31–11/2"],
];

describe(`thread title stay range (running under TZ=${TZ})`, () => {
  it.each(CASES)("%s → API ISO strings render as the stored calendar dates", (_d, ci, co, expected) => {
    const b = apiBooking(ci, co);
    expect(b.checkIn).toMatch(/T00:00:00\.000Z$/); // the API's real representation
    expect(formatStayRangeShort(b.checkIn, b.checkOut)).toBe(expected);
  });

  it.each(CASES)("%s → Date objects render the same as the API strings", (_d, ci, co, expected) => {
    expect(formatStayRangeShort(new Date(ci), new Date(co))).toBe(expected);
  });

  it("control: the legacy local-time formatter is what shifts the date (proves this TZ is exercised)", () => {
    const b = apiBooking("2026-09-25", "2026-09-27");
    const legacy = (d: string) => new Date(d).toLocaleDateString("en-PH", { month: "numeric", day: "numeric" });
    const legacyLabel = `${legacy(b.checkIn)}–${legacy(b.checkOut)}`;
    expect(legacyLabel).toBe(TZ === "America/Chicago" ? "9/24–9/26" : "9/25–9/27");
    expect(formatStayRangeShort(b.checkIn, b.checkOut)).toBe("9/25–9/27");
  });
});

// ── Wiring: both affected views must route booking dates through the helper ─────────────
// The components are client components that fetch on mount, so they can't be rendered in this
// node-only, DB-free suite. These assertions pin the source of the two render paths instead.

const read = (rel: string) => readFileSync(path.resolve(__dirname, "../../components/admin", rel), "utf8");
const threadList = read("GuestMessageThreads.tsx");
const threadDetail = read("ThreadDetail.tsx");

/** Body of a top-level `function name(...) { ... }` in a source string (single-level, as these are). */
function fnSource(src: string, name: string): string {
  const m = src.match(new RegExp(`function ${name}\\([^)]*\\)[^{]*\\{[\\s\\S]*?\\n\\}`));
  if (!m) throw new Error(`function ${name} not found`);
  return m[0];
}

describe("Guest Messages views route stay dates through formatStayRangeShort", () => {
  it("thread list title uses the helper on t.checkIn / t.checkOut", () => {
    expect(threadList).toContain("formatStayRangeShort(t.checkIn, t.checkOut)");
  });

  it("thread header uses the helper on booking.checkIn / booking.checkOut", () => {
    expect(threadDetail).toContain("formatStayRangeShort(booking.checkIn, booking.checkOut)");
  });

  it("neither view still formats a stay date with a timezone-less toLocaleDateString", () => {
    for (const src of [threadList, threadDetail]) {
      expect(src).not.toMatch(/function (shortDate|fmtShortDate)/);
      expect(src).not.toMatch(/toLocaleDateString\("en-PH", \{ month: "numeric", day: "numeric" \}\)/);
    }
  });
});

describe("message timestamps are instants and keep local-time formatting", () => {
  it("relTime (thread list lastSentAt) is unchanged", () => {
    const body = fnSource(threadList, "relTime");
    expect(body).toContain('return new Date(d).toLocaleDateString("en-PH", { month: "short", day: "numeric" });');
    expect(body).not.toContain("UTC");
    expect(threadList).toContain("relTime(t.lastSentAt)");
  });

  it("fmtTime (thread detail sentAt) is unchanged", () => {
    const body = fnSource(threadDetail, "fmtTime");
    expect(body).toContain('new Date(d).toLocaleString("en-PH", {');
    expect(body).toContain('month: "short"');
    expect(body).toContain('hour: "numeric"');
    expect(body).not.toContain("UTC");
    expect(threadDetail).toContain("fmtTime(m.sentAt)");
  });
});
