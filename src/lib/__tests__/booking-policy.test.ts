/**
 * The guest advance-notice rule (src/lib/booking-policy.ts). Pure functions with an
 * injected clock, so every case names its own instant — nothing here reads the real time,
 * and the three vitest timezone projects must all agree.
 */
import { describe, it, expect } from "vitest";
import {
  assertBookingPolicy,
  bookingPolicyRefusalBody,
  earliestCheckIn,
  manilaMinutesOfDay,
  normalizeBookingPolicy,
  BOOKING_POLICY_GRACE_MINUTES,
  DEFAULT_BOOKING_POLICY,
  type BookingPolicy,
} from "@/lib/booking-policy";
import { manilaTodayKey, utcDateKey } from "@/lib/dates";

/** An instant given as Manila wall-clock time, e.g. manila("2026-10-12", "09:59"). */
const manila = (date: string, time: string) => new Date(`${date}T${time}:00+08:00`);
const day = (key: string) => new Date(`${key}T00:00:00Z`);
const earliestKey = (now: Date, policy: BookingPolicy) => utcDateKey(earliestCheckIn(now, policy));

const TEN_AM = 10 * 60;
const sameDayUntil10: BookingPolicy = { advanceNoticeDays: 0, sameDayCutoffMinutes: TEN_AM };
const notice = (days: number): BookingPolicy => ({ advanceNoticeDays: days, sameDayCutoffMinutes: null });

describe("Manila clock", () => {
  it("reads minutes of the day in Manila, not UTC or the runtime zone", () => {
    expect(manilaMinutesOfDay(new Date("2026-10-11T16:00:00Z"))).toBe(0); // Manila midnight
    expect(manilaMinutesOfDay(new Date("2026-10-11T15:59:00Z"))).toBe(23 * 60 + 59);
    expect(manilaMinutesOfDay(manila("2026-10-12", "10:00"))).toBe(TEN_AM);
  });

  it("gives the Manila date between 12:00 AM and 7:59 AM, when the UTC date is still yesterday", () => {
    const earlyMorning = manila("2026-10-12", "00:30");
    expect(earlyMorning.toISOString().slice(0, 10)).toBe("2026-10-11"); // what the pickers used to offer
    expect(manilaTodayKey(earlyMorning)).toBe("2026-10-12");
    expect(manilaTodayKey(manila("2026-10-12", "07:59"))).toBe("2026-10-12");
    expect(manilaTodayKey(manila("2026-10-12", "23:59"))).toBe("2026-10-12");
  });
});

describe("normalizeBookingPolicy", () => {
  it("defaults a missing row or missing columns to no notice and no cutoff", () => {
    expect(normalizeBookingPolicy(null)).toEqual(DEFAULT_BOOKING_POLICY);
    expect(normalizeBookingPolicy({})).toEqual(DEFAULT_BOOKING_POLICY);
  });

  it("drops out-of-range values rather than making a listing unbookable", () => {
    expect(normalizeBookingPolicy({ advanceNoticeDays: -1, sameDayCutoffMinutes: 1440 })).toEqual(DEFAULT_BOOKING_POLICY);
    expect(normalizeBookingPolicy({ advanceNoticeDays: 1.5, sameDayCutoffMinutes: -5 })).toEqual(DEFAULT_BOOKING_POLICY);
    expect(normalizeBookingPolicy({ advanceNoticeDays: 2, sameDayCutoffMinutes: 0 })).toEqual({
      advanceNoticeDays: 2,
      sameDayCutoffMinutes: 0,
    });
  });
});

describe("earliestCheckIn", () => {
  it("is today in Manila by default, on both sides of midnight", () => {
    expect(earliestKey(manila("2026-10-12", "23:59"), DEFAULT_BOOKING_POLICY)).toBe("2026-10-12");
    expect(earliestKey(manila("2026-10-13", "00:00"), DEFAULT_BOOKING_POLICY)).toBe("2026-10-13");
    // 00:30 Manila is 16:30 UTC the day before — the floor must not slip back to the UTC date.
    expect(earliestKey(new Date("2026-10-12T16:30:00Z"), DEFAULT_BOOKING_POLICY)).toBe("2026-10-13");
  });

  it("moves to tomorrow at the cutoff minute, not after it", () => {
    expect(earliestKey(manila("2026-10-12", "09:59"), sameDayUntil10)).toBe("2026-10-12");
    expect(earliestKey(manila("2026-10-12", "10:00"), sameDayUntil10)).toBe("2026-10-13");
    expect(earliestKey(manila("2026-10-12", "23:59"), sameDayUntil10)).toBe("2026-10-13");
    expect(earliestKey(manila("2026-10-13", "00:00"), sameDayUntil10)).toBe("2026-10-13");
  });

  it("adds the notice period to today in Manila", () => {
    const now = manila("2026-10-12", "06:00"); // still Oct 11 in UTC
    expect(earliestKey(now, notice(1))).toBe("2026-10-13");
    expect(earliestKey(now, notice(2))).toBe("2026-10-14");
    expect(earliestKey(now, notice(3))).toBe("2026-10-15");
    expect(earliestKey(now, notice(7))).toBe("2026-10-19");
  });

  it("ignores the cutoff when a notice period is set", () => {
    const policy: BookingPolicy = { advanceNoticeDays: 1, sameDayCutoffMinutes: TEN_AM };
    expect(earliestKey(manila("2026-10-12", "09:00"), policy)).toBe("2026-10-13");
    expect(earliestKey(manila("2026-10-12", "15:00"), policy)).toBe("2026-10-13");
  });

  it("crosses a month end", () => {
    expect(earliestKey(manila("2026-10-31", "12:00"), notice(2))).toBe("2026-11-02");
  });
});

describe("assertBookingPolicy", () => {
  it("refuses a check-in before today in Manila and names today", () => {
    const outcome = assertBookingPolicy({
      checkIn: day("2026-10-11"),
      policy: DEFAULT_BOOKING_POLICY,
      now: manila("2026-10-12", "00:30"),
    });
    expect(outcome).toMatchObject({ ok: false, code: "too_soon" });
    if (outcome.ok) throw new Error("expected a refusal");
    expect(utcDateKey(outcome.earliestCheckIn)).toBe("2026-10-12");
    expect(outcome.message).toContain("October 12, 2026");
    expect(bookingPolicyRefusalBody(outcome)).toEqual({
      error: outcome.message,
      code: "too_soon",
      earliestCheckIn: "2026-10-12",
    });
  });

  it("with defaults, allows tonight right up to midnight and any later date", () => {
    const now = manila("2026-10-12", "23:59");
    expect(assertBookingPolicy({ checkIn: day("2026-10-12"), policy: DEFAULT_BOOKING_POLICY, now })).toEqual({ ok: true });
    expect(assertBookingPolicy({ checkIn: day("2027-03-01"), policy: DEFAULT_BOOKING_POLICY, now })).toEqual({ ok: true });
  });

  it("allows tonight before the cutoff and refuses it from the cutoff on", () => {
    const tonight = day("2026-10-12");
    expect(assertBookingPolicy({ checkIn: tonight, policy: sameDayUntil10, now: manila("2026-10-12", "09:59") }).ok).toBe(true);
    const late = assertBookingPolicy({ checkIn: tonight, policy: sameDayUntil10, now: manila("2026-10-12", "10:00") });
    expect(late).toMatchObject({ ok: false, code: "too_soon" });
    if (late.ok) throw new Error("expected a refusal");
    expect(utcDateKey(late.earliestCheckIn)).toBe("2026-10-13");
    // Tomorrow is unaffected by today's cutoff.
    expect(assertBookingPolicy({ checkIn: day("2026-10-13"), policy: sameDayUntil10, now: manila("2026-10-12", "22:00") }).ok).toBe(true);
  });

  it.each([1, 2, 3, 7])("refuses an arrival inside %i day(s) of notice", (days) => {
    const now = manila("2026-10-12", "12:00");
    const first = new Date(day("2026-10-12").getTime() + days * 86_400_000);
    const tooEarly = new Date(first.getTime() - 86_400_000);
    expect(assertBookingPolicy({ checkIn: first, policy: notice(days), now }).ok).toBe(true);
    expect(assertBookingPolicy({ checkIn: tooEarly, policy: notice(days), now }).ok).toBe(false);
  });

  describe("grace at final submission", () => {
    const tonight = day("2026-10-12");
    const submit = (startedAt: Date | null, now: Date, policy = sameDayUntil10, checkIn = tonight) =>
      assertBookingPolicy({ checkIn, policy, now, paymentStartedAt: startedAt }).ok;

    it("lets through a guest who reached payment before the cutoff and submits within the window", () => {
      expect(submit(manila("2026-10-12", "09:50"), manila("2026-10-12", "10:05"))).toBe(true);
      expect(submit(manila("2026-10-12", "09:59"), manila("2026-10-12", "10:29"))).toBe(true);
    });

    it("ends exactly at the window's length", () => {
      expect(BOOKING_POLICY_GRACE_MINUTES).toBe(30);
      expect(submit(manila("2026-10-12", "09:50"), manila("2026-10-12", "10:30"))).toBe(false);
    });

    it("gives nothing to a guest who reached payment after the cutoff", () => {
      expect(submit(manila("2026-10-12", "10:01"), manila("2026-10-12", "10:05"))).toBe(false);
    });

    it("gives nothing without a payment start, or with an unusable one", () => {
      expect(submit(null, manila("2026-10-12", "10:05"))).toBe(false);
      expect(submit(new Date("nonsense"), manila("2026-10-12", "10:05"))).toBe(false);
    });

    it("cannot be stretched by a payment start far in the past", () => {
      expect(submit(manila("2026-10-10", "09:00"), manila("2026-10-12", "15:00"))).toBe(false);
    });

    it("does not trust a payment start that lies in the future", () => {
      expect(submit(manila("2026-10-13", "09:00"), manila("2026-10-12", "15:00"))).toBe(false);
    });

    it("never applies to the today floor: paying just after midnight for last night is refused", () => {
      const lastNight = day("2026-10-12");
      expect(submit(manila("2026-10-12", "23:55"), manila("2026-10-13", "00:03"), DEFAULT_BOOKING_POLICY, lastNight)).toBe(false);
      expect(submit(manila("2026-10-12", "23:55"), manila("2026-10-13", "00:03"), sameDayUntil10, lastNight)).toBe(false);
    });

    it("covers a notice period that rolls over at midnight", () => {
      // 1 day's notice: at 23:55 on the 12th the 13th is bookable; at 00:03 on the 13th it is not.
      const checkIn = day("2026-10-13");
      expect(submit(manila("2026-10-12", "23:55"), manila("2026-10-13", "00:03"), notice(1), checkIn)).toBe(true);
      expect(submit(manila("2026-10-12", "23:55"), manila("2026-10-13", "00:40"), notice(1), checkIn)).toBe(false);
      expect(submit(null, manila("2026-10-13", "00:03"), notice(1), checkIn)).toBe(false);
    });
  });
});
