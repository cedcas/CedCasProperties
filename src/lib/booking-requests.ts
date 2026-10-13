/**
 * Booking requests — the approval path for a listing with Instant Booking off.
 *
 *   requested → approved → (guest pays through the payment link) → pending / confirmed
 *   requested → declined | expired          approved → expired | cancelled
 *
 * Neither `requested` nor `approved` holds dates (src/lib/booking-status.ts), so nothing
 * here takes the inventory lock: approval only CHECKS that the dates are still free. The
 * dates are claimed, under the lock, when the guest pays. Every status change below is a
 * conditional update on the current status, so two admins — or an admin and the expiry
 * job — can never both act on the same request.
 *
 * Owner-approved rules (2026-10-12): a request waits 24 hours for a decision and a
 * payment link is valid for 24 hours, each ending sooner if the listing's booking deadline
 * for the check-in date comes first; a GCash/BPI payment still unverified after 24 hours
 * raises one admin alert and releases nothing.
 */

import { randomBytes } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createMailer, FROM_ADDRESS } from "@/lib/email";
import { logAction } from "@/lib/log";
import {
  formatConflictRange,
  getInventoryScopeConflicts,
  refreshExternalFeedForBooking,
  type Conflict,
} from "@/lib/availability";
import {
  assertBookingPolicy,
  bookingDeadlineFor,
  normalizeBookingPolicy,
  type BookingPolicy,
} from "@/lib/booking-policy";
import type { AdminActor } from "@/lib/admin-permissions";
import type { BookingQuote } from "@/lib/booking-quote";
import { OPEN_REQUEST_STATUSES } from "@/lib/booking-status";
import {
  ADMIN_REQUEST_EMAIL_TO,
  bookingPaymentUrl,
  requestApprovedGuestEmail,
  requestDeclinedGuestEmail,
  requestExpiredGuestEmail,
  requestReceivedAdminEmail,
  requestReceivedGuestEmail,
  unverifiedPaymentAdminEmail,
  type RequestEmailBooking,
} from "@/lib/booking-request-emails";

export const REQUEST_TTL_HOURS = 24;
export const PAYMENT_LINK_TTL_HOURS = 24;
export const UNVERIFIED_PAYMENT_ALERT_HOURS = 24;
export const DECISION_NOTE_MAX = 500;

const HOUR_MS = 60 * 60 * 1000;

/** `hours` from now, or the listing's booking deadline for that check-in if that is sooner. */
export function cappedExpiry(now: Date, hours: number, checkIn: Date, policy: BookingPolicy): Date {
  return new Date(Math.min(now.getTime() + hours * HOUR_MS, bookingDeadlineFor(checkIn, policy).getTime()));
}

export class BookingRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code: "not_found" | "not_requested" | "expired" | "conflict" | "invalid",
    readonly conflicts: { label: string; range: string; kind: Conflict["kind"] }[] = []
  ) {
    super(message);
    this.name = "BookingRequestError";
  }
}

export function parseDecisionNote(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "string") throw new BookingRequestError(400, "The note must be text.", "invalid");
  const note = raw.trim();
  if (note.length > DECISION_NOTE_MAX) {
    throw new BookingRequestError(400, `Keep the note under ${DECISION_NOTE_MAX} characters.`, "invalid");
  }
  return note || null;
}

const REQUEST_SELECT = {
  id: true,
  status: true,
  propertyId: true,
  guestName: true,
  guestEmail: true,
  guestPhone: true,
  checkIn: true,
  checkOut: true,
  guests: true,
  totalPrice: true,
  paymentMethod: true,
  requestExpiresAt: true,
  paymentLinkExpiresAt: true,
  paymentSubmittedAt: true,
  property: { select: { name: true, advanceNoticeDays: true, sameDayCutoffMinutes: true } },
} satisfies Prisma.BookingSelect;

type RequestRow = Prisma.BookingGetPayload<{ select: typeof REQUEST_SELECT }>;

function emailBooking(b: RequestRow): RequestEmailBooking {
  return {
    id: b.id,
    guestName: b.guestName,
    guestEmail: b.guestEmail,
    guestPhone: b.guestPhone,
    checkIn: b.checkIn,
    checkOut: b.checkOut,
    guests: b.guests,
    totalPrice: Number(b.totalPrice),
    propertyName: b.property.name,
  };
}

/** Best-effort send: a mail failure never undoes a status change. Returns whether it went out. */
async function send(to: string, mail: { subject: string; html: string }, replyTo?: string): Promise<boolean> {
  try {
    await createMailer().sendMail({ from: FROM_ADDRESS, to, replyTo, subject: mail.subject, html: mail.html });
    return true;
  } catch (err) {
    console.error("[booking-requests] email failed:", mail.subject, err);
    return false;
  }
}

async function loadRequest(bookingId: number): Promise<RequestRow> {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, select: REQUEST_SELECT });
  if (!booking) throw new BookingRequestError(404, "Booking not found.", "not_found");
  return booking;
}

function assertAwaitingDecision(booking: RequestRow, now: Date): void {
  if (booking.status !== "requested") {
    throw new BookingRequestError(
      409,
      `This booking is ${booking.status}, not a request waiting for a decision.`,
      "not_requested"
    );
  }
  if (booking.requestExpiresAt && booking.requestExpiresAt <= now) {
    throw new BookingRequestError(409, "This request has expired. The guest needs to send a new one.", "expired");
  }
}

const adminLog = (actor: AdminActor, ipAddress: string | undefined) => ({
  actor: actor.name,
  actorRole: actor.role,
  actorId: actor.id,
  module: "bookings" as const,
  ipAddress,
});

// ── Guest: a new request ───────────────────────────────────────────────────

/**
 * Save a guest's request. No payment, no hold and no inventory lock: the caller has
 * already checked advance notice and that the dates are free right now.
 *
 * The stored total is the server quote WITHOUT a card fee — the guest has not chosen how
 * to pay yet; the payment link adds the fee if they pick Credit/Debit Card. A promo code
 * is stored but its usage is counted only when the booking is paid.
 *
 * Submitting the same stay twice returns the request already open instead of a second one.
 */
export async function createBookingRequest(input: {
  quote: BookingQuote;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  notes: string | null;
  policy: BookingPolicy;
  now?: Date;
}): Promise<{ id: number; total: number; propertySlug: string; requestExpiresAt: Date; duplicate: boolean }> {
  const now = input.now ?? new Date();
  const { quote } = input;
  const select = { id: true, totalPrice: true, requestExpiresAt: true, property: { select: { slug: true } } } as const;

  const existing = await prisma.booking.findFirst({
    where: {
      propertyId: quote.propertyId,
      guestEmail: input.guestEmail,
      checkIn: quote.checkInDate,
      checkOut: quote.checkOutDate,
      status: { in: [...OPEN_REQUEST_STATUSES] },
    },
    select,
  });
  const requestExpiresAt = cappedExpiry(now, REQUEST_TTL_HOURS, quote.checkInDate, input.policy);
  const row =
    existing ??
    (await prisma.booking.create({
      data: {
        propertyId: quote.propertyId,
        guestName: input.guestName,
        guestEmail: input.guestEmail,
        guestPhone: input.guestPhone,
        checkIn: quote.checkInDate,
        checkOut: quote.checkOutDate,
        guests: quote.guestCount,
        totalPrice: Math.round((quote.total - quote.stripeFee) * 100) / 100,
        nightlyTotal: quote.nightlyTotal,
        extraGuestFee: quote.extraGuestFee > 0 ? quote.extraGuestFee : null,
        stripeFee: null,
        discountCode: quote.discountCode || null,
        discountAmount: quote.discountAmount > 0 ? quote.discountAmount : null,
        paymentMethod: null,
        status: "requested",
        requestExpiresAt,
        notes: input.notes,
      },
      select,
    }));

  return {
    id: row.id,
    total: Number(row.totalPrice),
    propertySlug: row.property.slug,
    requestExpiresAt: row.requestExpiresAt ?? requestExpiresAt,
    duplicate: existing !== null,
  };
}

/** "Request received" to the guest and "new request" to the admin. Called after the row exists. */
export async function sendRequestReceivedEmails(bookingId: number, notes: string | null): Promise<void> {
  // Never throws: the request is already saved, and a mail problem must not fail it.
  try {
    const booking = await loadRequest(bookingId);
    if (!booking.requestExpiresAt) return;
    const b = emailBooking(booking);
    await send(b.guestEmail, requestReceivedGuestEmail(b, booking.requestExpiresAt));
    await send(ADMIN_REQUEST_EMAIL_TO, requestReceivedAdminEmail(b, { expiresAt: booking.requestExpiresAt, notes }), b.guestEmail);
  } catch (err) {
    console.error("[booking-requests] request-received emails failed for booking", bookingId, err);
  }
}

// ── Admin: approve / decline ───────────────────────────────────────────────

export interface DecisionResult {
  status: "approved" | "declined";
  emailSent: boolean;
  paymentLinkExpiresAt?: string;
}

/**
 * Approve a request: permission to pay, not a hold. Refused when the dates are no longer
 * free or the check-in can no longer be booked; otherwise the guest is emailed a payment
 * link that expires.
 */
export async function approveBookingRequest(input: {
  bookingId: number;
  actor: AdminActor;
  note?: unknown;
  ipAddress?: string;
  now?: Date;
}): Promise<DecisionResult> {
  const now = input.now ?? new Date();
  const note = parseDecisionNote(input.note);
  const booking = await loadRequest(input.bookingId);
  assertAwaitingDecision(booking, now);

  const policy = normalizeBookingPolicy(booking.property);
  if (!assertBookingPolicy({ checkIn: booking.checkIn, policy, now }).ok) {
    throw new BookingRequestError(
      409,
      "This check-in date can no longer be booked online, so the request cannot be approved.",
      "expired"
    );
  }

  await refreshExternalFeedForBooking(booking.propertyId);
  const conflicts = await getInventoryScopeConflicts({
    propertyId: booking.propertyId,
    start: booking.checkIn,
    end: booking.checkOut,
    excludeBookingId: booking.id,
  });
  if (conflicts.length > 0) {
    const summary = conflicts.map((c) => ({ label: c.label, range: formatConflictRange(c), kind: c.kind }));
    await logAction({
      ...adminLog(input.actor, input.ipAddress),
      action: `Refused to approve booking request #${booking.id} — its dates are no longer available`,
      target: `booking-${booking.id}`,
      metadata: { bookingId: booking.id, conflicts: summary.map(({ label, range }) => ({ label, range })) },
    });
    throw new BookingRequestError(
      409,
      "These dates are no longer available, so the request cannot be approved.",
      "conflict",
      summary
    );
  }

  const paymentToken = randomBytes(24).toString("base64url");
  const paymentLinkExpiresAt = cappedExpiry(now, PAYMENT_LINK_TTL_HOURS, booking.checkIn, policy);
  const updated = await prisma.booking.updateMany({
    where: { id: booking.id, status: "requested" },
    data: {
      status: "approved",
      paymentToken,
      paymentLinkExpiresAt,
      decidedAt: now,
      decidedById: input.actor.id,
      decisionNote: note,
    },
  });
  if (updated.count === 0) {
    throw new BookingRequestError(409, "This request was already decided or has expired.", "not_requested");
  }

  await logAction({
    ...adminLog(input.actor, input.ipAddress),
    action: `Approved booking request #${booking.id}`,
    target: `booking-${booking.id}`,
    metadata: {
      bookingId: booking.id,
      before: { status: "requested" },
      after: { status: "approved", paymentLinkExpiresAt: paymentLinkExpiresAt.toISOString() },
      total: Number(booking.totalPrice),
      note,
    },
  });

  const b = emailBooking(booking);
  const emailSent = await send(
    b.guestEmail,
    requestApprovedGuestEmail(b, { paymentUrl: bookingPaymentUrl(paymentToken), expiresAt: paymentLinkExpiresAt })
  );
  return { status: "approved", emailSent, paymentLinkExpiresAt: paymentLinkExpiresAt.toISOString() };
}

/** Decline a request. Final: a guest who still wants the stay sends a new request. */
export async function declineBookingRequest(input: {
  bookingId: number;
  actor: AdminActor;
  note?: unknown;
  ipAddress?: string;
  now?: Date;
}): Promise<DecisionResult> {
  const now = input.now ?? new Date();
  const note = parseDecisionNote(input.note);
  const booking = await loadRequest(input.bookingId);
  if (booking.status !== "requested") {
    throw new BookingRequestError(
      409,
      `This booking is ${booking.status}, not a request waiting for a decision.`,
      "not_requested"
    );
  }

  const updated = await prisma.booking.updateMany({
    where: { id: booking.id, status: "requested" },
    data: { status: "declined", decidedAt: now, decidedById: input.actor.id, decisionNote: note },
  });
  if (updated.count === 0) {
    throw new BookingRequestError(409, "This request was already decided or has expired.", "not_requested");
  }

  await logAction({
    ...adminLog(input.actor, input.ipAddress),
    action: `Declined booking request #${booking.id}`,
    target: `booking-${booking.id}`,
    metadata: { bookingId: booking.id, before: { status: "requested" }, after: { status: "declined" }, note },
  });

  const b = emailBooking(booking);
  const emailSent = await send(b.guestEmail, requestDeclinedGuestEmail(b, note));
  return { status: "declined", emailSent };
}

// ── Cron: expiry and the unverified-payment alert ──────────────────────────

export interface RequestRunResult {
  expiredRequests: number;
  expiredPaymentLinks: number;
  paymentAlerts: number;
  failed: number;
}

/**
 * One cron pass. Safe to run concurrently: each row is claimed by a conditional update
 * before any email goes out.
 */
export async function processBookingRequests(now: Date = new Date()): Promise<RequestRunResult> {
  const result: RequestRunResult = { expiredRequests: 0, expiredPaymentLinks: 0, paymentAlerts: 0, failed: 0 };

  const expire = async (
    stage: "request" | "payment_link",
    where: Prisma.BookingWhereInput,
    from: "requested" | "approved"
  ): Promise<number> => {
    let count = 0;
    const rows = await prisma.booking.findMany({ where, select: REQUEST_SELECT });
    for (const row of rows) {
      const claimed = await prisma.booking.updateMany({ where: { ...where, id: row.id }, data: { status: "expired" } });
      if (claimed.count === 0) continue;
      count++;
      await logAction({
        actor: "System",
        actorRole: "admin",
        action:
          stage === "request"
            ? `Booking request #${row.id} expired without a decision`
            : `Payment link for booking #${row.id} expired unpaid`,
        module: "bookings",
        target: `booking-${row.id}`,
        metadata: { bookingId: row.id, before: { status: from }, after: { status: "expired" } },
      });
      if (!(await send(row.guestEmail, requestExpiredGuestEmail(emailBooking(row), stage)))) result.failed++;
    }
    return count;
  };

  result.expiredRequests = await expire("request", { status: "requested", requestExpiresAt: { lte: now } }, "requested");
  result.expiredPaymentLinks = await expire(
    "payment_link",
    { status: "approved", paymentLinkExpiresAt: { lte: now } },
    "approved"
  );

  // A GCash/BPI payment the Owner has not verified. Alert once; the dates stay held.
  // Card bookings are confirmed on payment, so only a `pending` row can match.
  const overdue = {
    status: "pending",
    holdAlertedAt: null,
    paymentSubmittedAt: { lte: new Date(now.getTime() - UNVERIFIED_PAYMENT_ALERT_HOURS * HOUR_MS) },
  } satisfies Prisma.BookingWhereInput;
  const unverified = await prisma.booking.findMany({ where: overdue, select: REQUEST_SELECT });
  for (const row of unverified) {
    const claimed = await prisma.booking.updateMany({ where: { ...overdue, id: row.id }, data: { holdAlertedAt: now } });
    if (claimed.count === 0 || !row.paymentSubmittedAt) continue;
    const sent = await send(
      ADMIN_REQUEST_EMAIL_TO,
      unverifiedPaymentAdminEmail(emailBooking(row), {
        paymentMethod: row.paymentMethod,
        submittedAt: row.paymentSubmittedAt,
        hours: UNVERIFIED_PAYMENT_ALERT_HOURS,
      }),
      row.guestEmail
    );
    if (sent) {
      result.paymentAlerts++;
    } else {
      // Release the claim so the next pass tries again.
      result.failed++;
      await prisma.booking.updateMany({ where: { id: row.id, holdAlertedAt: now }, data: { holdAlertedAt: null } });
    }
  }

  return result;
}
