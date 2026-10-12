/**
 * Guest booking policy — how soon a DIRECT booking on haveninlipa.com may check in.
 *
 * Pure and clock-injected: no database, no `new Date()` of its own. The three guest routes
 * (/api/stripe/payment-intent, /api/checkout-attempts, /api/bookings) and the public
 * availability route call it; nothing else does.
 *
 * Deliberately NOT part of computeBookingQuote or src/lib/availability.ts. Those also back
 * admin amendments, reactivating a cancelled booking and the iCal export, and an admin
 * action must never be subject to guest advance notice.
 *
 * All times are Asia/Manila (UTC+8 all year, no DST) whatever the server or browser
 * timezone. Check-in dates are calendar dates anchored at UTC midnight — see dates.ts.
 */

import { addUtcDays, formatStayDate, todayInManila, toUtcMidnight, utcDateKey } from "@/lib/dates";

export interface BookingPolicy {
  /** 0 = same day allowed; otherwise the earliest check-in is today + N days. */
  advanceNoticeDays: number;
  /** Minutes after Manila midnight. Only applies when advanceNoticeDays is 0. null = no cutoff. */
  sameDayCutoffMinutes: number | null;
}

export const DEFAULT_BOOKING_POLICY: BookingPolicy = { advanceNoticeDays: 0, sameDayCutoffMinutes: null };

/** The notice periods the Owner can choose from. */
export const ADVANCE_NOTICE_DAY_CHOICES = [0, 1, 2, 3, 7] as const;

/**
 * How long after a deadline a guest who was ALREADY on the payment screen may still submit.
 * Applies to the same-day cutoff and the notice period — never to the today floor.
 */
export const BOOKING_POLICY_GRACE_MINUTES = 30;

const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
const MINUTES_PER_DAY = 24 * 60;

/** Minutes since midnight in Manila at `now` (0–1439). */
export function manilaMinutesOfDay(now: Date): number {
  const manila = new Date(now.getTime() + MANILA_OFFSET_MS);
  return manila.getUTCHours() * 60 + manila.getUTCMinutes();
}

/**
 * Coerce stored values into a usable policy. Anything out of range falls back to the
 * permissive default for that field, so a bad row can never make a listing unbookable.
 */
export function normalizeBookingPolicy(
  raw: { advanceNoticeDays?: number | null; sameDayCutoffMinutes?: number | null } | null | undefined
): BookingPolicy {
  const days = raw?.advanceNoticeDays;
  const cutoff = raw?.sameDayCutoffMinutes;
  return {
    advanceNoticeDays: typeof days === "number" && Number.isInteger(days) && days > 0 ? days : 0,
    sameDayCutoffMinutes:
      typeof cutoff === "number" && Number.isInteger(cutoff) && cutoff >= 0 && cutoff < MINUTES_PER_DAY ? cutoff : null,
  };
}

/** The earliest check-in date a guest can book at `now`, as a UTC-midnight calendar date. */
export function earliestCheckIn(now: Date, policy: BookingPolicy): Date {
  const today = todayInManila(now);
  if (policy.advanceNoticeDays > 0) return addUtcDays(today, policy.advanceNoticeDays);
  // The cutoff minute itself is already too late: a 10:00 cutoff closes tonight at 10:00.
  if (policy.sameDayCutoffMinutes !== null && manilaMinutesOfDay(now) >= policy.sameDayCutoffMinutes) {
    return addUtcDays(today, 1);
  }
  return today;
}

/**
 * `ok` or `too_soon` today. Instant Booking adds `requires_approval` here, so callers
 * should switch on `code` rather than assume a refusal is always `too_soon`.
 */
export type BookingPolicyOutcome =
  | { ok: true }
  | { ok: false; code: "too_soon"; earliestCheckIn: Date; message: string };

/** Plain guest-facing refusal that names the earliest check-in. */
export function tooSoonMessage(earliest: Date): string {
  return `That check-in date can no longer be booked online. The earliest available check-in is ${formatStayDate(earliest)}.`;
}

/**
 * Is this check-in allowed right now?
 *
 * `paymentStartedAt` is when the guest reached the payment screen (the verified
 * PaymentIntent's creation time, or the CheckoutAttempt's). Pass it only from the final
 * submission: a guest who got there before a deadline and submits within
 * {@link BOOKING_POLICY_GRACE_MINUTES} of it is let through, because refusing then would
 * strand a payment already made. A check-in before today in Manila is refused regardless.
 */
export function assertBookingPolicy(input: {
  checkIn: Date;
  policy: BookingPolicy;
  now: Date;
  paymentStartedAt?: Date | null;
}): BookingPolicyOutcome {
  const { policy, now, paymentStartedAt } = input;
  const checkIn = toUtcMidnight(input.checkIn);
  const earliest = earliestCheckIn(now, policy);
  if (checkIn >= earliest) return { ok: true };

  if (paymentStartedAt && !isNaN(paymentStartedAt.getTime()) && checkIn >= todayInManila(now)) {
    // Judge the rule as of when payment started, but never further back than the grace
    // window (and never in the future, should the two clocks disagree).
    const graceFloor = now.getTime() - BOOKING_POLICY_GRACE_MINUTES * 60_000;
    const asOf = new Date(Math.min(now.getTime(), Math.max(paymentStartedAt.getTime(), graceFloor)));
    if (checkIn >= earliestCheckIn(asOf, policy)) return { ok: true };
  }

  return { ok: false, code: "too_soon", earliestCheckIn: earliest, message: tooSoonMessage(earliest) };
}

/** JSON body the guest routes return for a refusal (HTTP 409). */
export function bookingPolicyRefusalBody(outcome: Extract<BookingPolicyOutcome, { ok: false }>) {
  return {
    error: outcome.message,
    code: outcome.code,
    earliestCheckIn: utcDateKey(outcome.earliestCheckIn),
  };
}
