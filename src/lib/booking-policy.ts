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

/** Same-day cutoffs the Owner can choose from: every half hour, 6:00 AM to 11:30 PM. */
export const SAME_DAY_CUTOFF_CHOICES: readonly number[] = Array.from({ length: 36 }, (_, i) => 6 * 60 + i * 30);

/** `690` → "11:30 AM". */
export function formatCutoffMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** "Same day", "1 day", "7 days". */
export function formatAdvanceNoticeDays(days: number): string {
  return days === 0 ? "Same day" : `${days} day${days === 1 ? "" : "s"}`;
}

/** One line for the audit log: "same day until 11:30 PM", "2 days' notice". */
export function describeBookingPolicy(policy: BookingPolicy): string {
  if (policy.advanceNoticeDays > 0) return `${formatAdvanceNoticeDays(policy.advanceNoticeDays)}' notice`;
  return policy.sameDayCutoffMinutes === null
    ? "same day, no cutoff"
    : `same day until ${formatCutoffMinutes(policy.sameDayCutoffMinutes)}`;
}

/**
 * Validate settings submitted from the admin form. Only the offered choices are accepted,
 * and a cutoff is dropped when a notice period is set, since it would never apply.
 */
export function parseBookingPolicyInput(input: {
  advanceNoticeDays?: unknown;
  sameDayCutoffMinutes?: unknown;
}): { ok: true; policy: BookingPolicy } | { ok: false; error: string } {
  const days = Number(input.advanceNoticeDays);
  if (!(ADVANCE_NOTICE_DAY_CHOICES as readonly number[]).includes(days)) {
    return { ok: false, error: "Advance notice must be same day, 1, 2, 3 or 7 days." };
  }
  const rawCutoff = input.sameDayCutoffMinutes;
  if (days > 0 || rawCutoff === null || rawCutoff === undefined || rawCutoff === "") {
    return { ok: true, policy: { advanceNoticeDays: days, sameDayCutoffMinutes: null } };
  }
  const cutoff = Number(rawCutoff);
  if (!SAME_DAY_CUTOFF_CHOICES.includes(cutoff)) {
    return { ok: false, error: "Same-day cutoff must be one of the listed times, or no cutoff." };
  }
  return { ok: true, policy: { advanceNoticeDays: days, sameDayCutoffMinutes: cutoff } };
}

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
 * Callers switch on `code`: `too_soon` names the earliest check-in; `requires_approval`
 * means the stay is allowed but this listing takes requests, not instant bookings.
 */
export type AdvanceNoticeOutcome =
  | { ok: true }
  | { ok: false; code: "too_soon"; earliestCheckIn: Date; message: string };

export type BookingPolicyOutcome = AdvanceNoticeOutcome | { ok: false; code: "requires_approval"; message: string };

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
}): AdvanceNoticeOutcome {
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
  if (outcome.code === "requires_approval") return { error: outcome.message, code: outcome.code };
  return {
    error: outcome.message,
    code: outcome.code,
    earliestCheckIn: utcDateKey(outcome.earliestCheckIn),
  };
}

/**
 * The last moment a guest can still book `checkIn` under the listing's advance notice:
 * the same-day cutoff on the check-in day, or the end of the last Manila day that still
 * gives enough notice. A request and its payment link never outlive it.
 */
export function bookingDeadlineFor(checkIn: Date, policy: BookingPolicy): Date {
  const manilaMidnightOfCheckIn = toUtcMidnight(checkIn).getTime() - MANILA_OFFSET_MS;
  if (policy.advanceNoticeDays > 0) {
    return new Date(manilaMidnightOfCheckIn - (policy.advanceNoticeDays - 1) * MINUTES_PER_DAY * 60_000);
  }
  return new Date(manilaMidnightOfCheckIn + (policy.sameDayCutoffMinutes ?? MINUTES_PER_DAY) * 60_000);
}

// ── Instant Booking ────────────────────────────────────────────────────────

/**
 * Per listing. `on` (default): a guest books and pays straight away, as the site always
 * has. `off`: every booking is a request the Owner approves before any payment. `auto`:
 * instant for trusted returning guests only — stored from the start, but not offered in
 * admin until guest verification exists (Step 3).
 */
export const INSTANT_BOOKING_MODES = ["off", "on", "auto"] as const;
export type InstantBookingMode = (typeof INSTANT_BOOKING_MODES)[number];

/** The modes the admin form offers today. */
export const INSTANT_BOOKING_MODE_CHOICES: readonly InstantBookingMode[] = ["on", "off"];

export const DEFAULT_INSTANT_BOOKING_MODE: InstantBookingMode = "on";

/** Anything unrecognised falls back to `on`, so a bad row can never turn a listing request-only. */
export function normalizeInstantBookingMode(raw: unknown): InstantBookingMode {
  return (INSTANT_BOOKING_MODES as readonly unknown[]).includes(raw) ? (raw as InstantBookingMode) : DEFAULT_INSTANT_BOOKING_MODE;
}

/** Validate the mode submitted from the admin form — only the offered choices are accepted. */
export function parseInstantBookingModeInput(raw: unknown): { ok: true; mode: InstantBookingMode } | { ok: false; error: string } {
  return INSTANT_BOOKING_MODE_CHOICES.includes(raw as InstantBookingMode)
    ? { ok: true, mode: raw as InstantBookingMode }
    : { ok: false, error: "Instant Booking must be On or Off." };
}

export function describeInstantBookingMode(mode: InstantBookingMode): string {
  return mode === "on" ? "Instant Booking on" : mode === "off" ? "Instant Booking off (approval required)" : "Instant Booking auto";
}

export const REQUIRES_APPROVAL_MESSAGE =
  "This listing takes booking requests. Send your request and we will reply by email. No payment is needed until it is approved.";

/**
 * May this guest book and pay straight away? Never loosens anything else: availability,
 * advance notice, capacity, pricing and payment checks all still apply.
 */
export function assertInstantBooking(input: { mode: InstantBookingMode; trustedGuest?: boolean }): BookingPolicyOutcome {
  if (input.mode === "on" || (input.mode === "auto" && input.trustedGuest === true)) return { ok: true };
  return { ok: false, code: "requires_approval", message: REQUIRES_APPROVAL_MESSAGE };
}
