import { describe, it, expect } from "vitest";
import {
  toUtcMidnight,
  utcDateKey,
  addUtcDays,
  nightsBetween,
  eachNightUtc,
  rangesOverlap,
  todayUtc,
  formatStayDate,
} from "@/lib/dates";

/**
 * Test 21 — UTC date handling must not shift dates for US or Philippine users.
 *
 * This whole file runs twice: once with TZ=America/Chicago (behind UTC) and once with
 * TZ=Asia/Manila (ahead of UTC), configured in vitest.config.ts. Any helper that leaked
 * local time — `setHours(0,0,0,0)`, `getDay()`, `getDate()` — would produce a different
 * calendar date in one project than the other and fail here.
 */

describe(`UTC calendar dates (running under TZ=${process.env.TZ})`, () => {
  it("anchors a YYYY-MM-DD string at UTC midnight", () => {
    expect(toUtcMidnight("2026-08-15").toISOString()).toBe("2026-08-15T00:00:00.000Z");
  });

  it("keeps the calendar date when given a Date carrying a time", () => {
    // A local-midnight Date in Manila is 16:00Z the previous day; reading UTC parts is what
    // keeps the intended calendar date intact.
    expect(toUtcMidnight(new Date("2026-08-15T23:30:00.000Z")).toISOString()).toBe(
      "2026-08-15T00:00:00.000Z"
    );
    expect(toUtcMidnight(new Date("2026-08-15T00:30:00.000Z")).toISOString()).toBe(
      "2026-08-15T00:00:00.000Z"
    );
  });

  it("round-trips through utcDateKey without drifting", () => {
    for (const key of ["2026-01-01", "2026-06-19", "2026-08-15", "2026-12-31"]) {
      expect(utcDateKey(toUtcMidnight(key))).toBe(key);
    }
  });

  it("does not shift the date across a US DST boundary", () => {
    // US DST starts 2026-03-08 and ends 2026-11-01. A local-time day iterator drifts here.
    expect(utcDateKey(addUtcDays(toUtcMidnight("2026-03-07"), 1))).toBe("2026-03-08");
    expect(utcDateKey(addUtcDays(toUtcMidnight("2026-03-08"), 1))).toBe("2026-03-09");
    expect(utcDateKey(addUtcDays(toUtcMidnight("2026-10-31"), 2))).toBe("2026-11-02");
    expect(nightsBetween(toUtcMidnight("2026-03-07"), toUtcMidnight("2026-03-10"))).toBe(3);
    expect(nightsBetween(toUtcMidnight("2026-10-31"), toUtcMidnight("2026-11-03"))).toBe(3);
  });

  it("counts nights, not days", () => {
    // Aug 15 → Aug 18 is three nights: the 15th, 16th and 17th.
    expect(nightsBetween(toUtcMidnight("2026-08-15"), toUtcMidnight("2026-08-18"))).toBe(3);
    expect(nightsBetween(toUtcMidnight("2026-08-15"), toUtcMidnight("2026-08-15"))).toBe(0);
  });

  it("enumerates occupied nights and excludes the check-out day", () => {
    const nights = eachNightUtc(toUtcMidnight("2026-08-15"), toUtcMidnight("2026-08-18")).map(
      utcDateKey
    );
    expect(nights).toEqual(["2026-08-15", "2026-08-16", "2026-08-17"]);
  });

  it("enumerates nothing for an empty or inverted range", () => {
    expect(eachNightUtc(toUtcMidnight("2026-08-15"), toUtcMidnight("2026-08-15"))).toEqual([]);
    expect(eachNightUtc(toUtcMidnight("2026-08-18"), toUtcMidnight("2026-08-15"))).toEqual([]);
  });

  it("crosses month and year boundaries correctly", () => {
    expect(utcDateKey(addUtcDays(toUtcMidnight("2026-08-31"), 1))).toBe("2026-09-01");
    expect(utcDateKey(addUtcDays(toUtcMidnight("2026-12-31"), 1))).toBe("2027-01-01");
    expect(utcDateKey(addUtcDays(toUtcMidnight("2028-02-28"), 1))).toBe("2028-02-29"); // leap year
  });

  it("todayUtc is exactly midnight UTC", () => {
    const today = todayUtc();
    expect(today.getUTCHours()).toBe(0);
    expect(today.getUTCMinutes()).toBe(0);
    expect(today.getUTCSeconds()).toBe(0);
    expect(today.getUTCMilliseconds()).toBe(0);
  });

  it("formatStayDate renders the true calendar date in any timezone", () => {
    // The original bug this guards: a viewer behind UTC seeing Jun 19 rendered as Jun 18.
    expect(
      formatStayDate("2026-06-19", { year: "numeric", month: "short", day: "numeric" })
    ).toContain("19");
    expect(
      formatStayDate(toUtcMidnight("2026-06-19"), {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    ).toContain("19");
  });
});

describe("half-open overlap", () => {
  const r = (s: string, e: string) => [toUtcMidnight(s), toUtcMidnight(e)] as const;

  it("treats ranges as [start, end)", () => {
    const [aS, aE] = r("2026-08-15", "2026-08-18");

    // Touching at the boundary is not an overlap — this is same-day turnover.
    expect(rangesOverlap(aS, aE, ...r("2026-08-18", "2026-08-20"))).toBe(false);
    expect(rangesOverlap(aS, aE, ...r("2026-08-12", "2026-08-15"))).toBe(false);

    // Sharing even one night is an overlap.
    expect(rangesOverlap(aS, aE, ...r("2026-08-17", "2026-08-19"))).toBe(true);
    expect(rangesOverlap(aS, aE, ...r("2026-08-14", "2026-08-16"))).toBe(true);
    expect(rangesOverlap(aS, aE, ...r("2026-08-15", "2026-08-18"))).toBe(true);
  });

  it("is symmetric", () => {
    const [aS, aE] = r("2026-08-15", "2026-08-18");
    const [bS, bE] = r("2026-08-17", "2026-08-19");
    expect(rangesOverlap(aS, aE, bS, bE)).toBe(rangesOverlap(bS, bE, aS, aE));
  });
});
