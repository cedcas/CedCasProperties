/**
 * Paying an approved booking request through its payment link (/pay/booking/[token]).
 *
 * This is the moment a request starts holding dates, so it is the one place in the
 * request lifecycle that takes the inventory lock (src/lib/inventory-lock.ts, DEC-024):
 *
 *   GCash / BPI — the guest taps "I've Paid": approved → pending, under the lock, after
 *                 re-checking the dates. The Owner then verifies and confirms as usual.
 *   Card        — the PaymentIntent is verified exactly as for an instant booking
 *                 (DEC-020), then approved → confirmed under the lock.
 *
 * The amount is never taken from the browser: it is the total stored on the booking when
 * it was requested (or corrected), plus the card fee when the guest pays by card.
 *
 * Losing the race for the dates:
 *   Card        — already charged, so it is reported like any paid-but-unavailable card
 *                 (src/lib/paid-unavailable.ts): guest told, AdminLog, one admin alert.
 *   GCash / BPI — the guest may have sent money outside the site. Refused, guest told not
 *                 to pay again, AdminLog and one admin alert; the Owner refunds by hand
 *                 (Owner decision 2026-10-12).
 */

import Stripe from "stripe";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createMailer, FROM_ADDRESS } from "@/lib/email";
import { logAction } from "@/lib/log";
import { calcStripeFee } from "@/lib/pricing";
import { nightsBetween } from "@/lib/dates";
import { assertInventoryScopeAvailable, AvailabilityConflictError } from "@/lib/availability";
import { withInventoryLock } from "@/lib/inventory-lock";
import { reconcileSource } from "@/lib/inventory-groups";
import { bookingPaymentIntentMetadata, toStripeAmount, verifyPaymentIntent } from "@/lib/stripe-payment";
import {
  paidUnavailableGuestMessage,
  reportPaidButUnavailable,
  PAID_UNAVAILABLE_CODE,
  type PaidUnavailableCause,
} from "@/lib/paid-unavailable";
import { materializeScheduledMessagesForBooking, flushDueScheduledMessages } from "@/lib/scheduler";
import { sendBookingConfirmedMeasurementEvent } from "@/lib/ga4-measurement-protocol";
import {
  ADMIN_REQUEST_EMAIL_TO,
  bookingConfirmedAdminEmail,
  bookingConfirmedGuestEmail,
  paymentLinkUnavailableAdminEmail,
  paymentSubmittedAdminEmail,
  paymentSubmittedGuestEmail,
  type RequestEmailBooking,
} from "@/lib/booking-request-emails";

export type BookingPaymentMethod = "gcash" | "bpi" | "stripe";

/** Where a payment link stands, for the page and for every route behind it. */
export type PaymentLinkState = "payable" | "link_expired" | "pending" | "confirmed" | "closed";

export function paymentLinkState(
  booking: { status: string; paymentLinkExpiresAt: Date | null },
  now: Date
): PaymentLinkState {
  switch (booking.status) {
    case "approved":
      return booking.paymentLinkExpiresAt && booking.paymentLinkExpiresAt <= now ? "link_expired" : "payable";
    case "pending":
      return "pending";
    case "confirmed":
      return "confirmed";
    case "expired":
      return "link_expired";
    default:
      return "closed";
  }
}

export const PAYMENT_LINK_MESSAGES: Record<Exclude<PaymentLinkState, "payable">, string> = {
  link_expired: "This payment link has expired. If you would still like to stay with us, please send a new request on our website.",
  pending: "We have already recorded your payment for this booking and are verifying it. Please do not pay again.",
  confirmed: "This booking is already paid and confirmed. Please do not pay again.",
  closed: "This payment link is no longer active.",
};

/** The stored total plus the card fee — what a card is charged for an approved request. */
export function cardTotalFor(baseTotal: number): { fee: number; total: number } {
  const fee = calcStripeFee(baseTotal);
  return { fee, total: Math.round((baseTotal + fee) * 100) / 100 };
}

export class BookingPaymentError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code: "not_found" | "not_payable" | "unavailable" | "invalid" | typeof PAID_UNAVAILABLE_CODE,
    readonly paymentReference?: string
  ) {
    super(message);
    this.name = "BookingPaymentError";
  }
}

const PAYMENT_SELECT = {
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
  discountCode: true,
  paymentToken: true,
  paymentLinkExpiresAt: true,
  stripePaymentIntentId: true,
  property: { select: { name: true, slug: true } },
} satisfies Prisma.BookingSelect;

export type PayableBooking = Prisma.BookingGetPayload<{ select: typeof PAYMENT_SELECT }>;

/** The booking behind a payment link, or null. The token is the only credential. */
export async function loadBookingForPayment(token: string): Promise<PayableBooking | null> {
  if (!token || token.length > 191) return null;
  return prisma.booking.findUnique({ where: { paymentToken: token }, select: PAYMENT_SELECT });
}

function emailBooking(b: PayableBooking, totalPrice = Number(b.totalPrice)): RequestEmailBooking {
  return {
    id: b.id,
    guestName: b.guestName,
    guestEmail: b.guestEmail,
    guestPhone: b.guestPhone,
    checkIn: b.checkIn,
    checkOut: b.checkOut,
    guests: b.guests,
    totalPrice,
    propertyName: b.property.name,
  };
}

async function send(to: string, mail: { subject: string; html: string }, replyTo?: string): Promise<void> {
  try {
    await createMailer().sendMail({ from: FROM_ADDRESS, to, replyTo, subject: mail.subject, html: mail.html });
  } catch (err) {
    console.error("[booking-payment] email failed:", mail.subject, err);
  }
}

/** Thrown inside the lock when the booking is no longer `approved` — rolls the claim back. */
class NotApproved extends Error {
  constructor(readonly current: { status: string; stripePaymentIntentId: string | null }) {
    super("not approved");
  }
}

/**
 * approved → `to`, atomically with the availability re-check and the sibling blocks.
 * Database-only: a deadlock retry may run it more than once.
 */
async function claimDates(
  booking: PayableBooking,
  to: "pending" | "confirmed",
  data: Prisma.BookingUncheckedUpdateInput
): Promise<void> {
  await withInventoryLock([booking.propertyId], async (tx) => {
    await tx.$queryRaw`SELECT id FROM \`Booking\` WHERE id = ${booking.id} FOR UPDATE`;
    const current = await tx.booking.findUniqueOrThrow({
      where: { id: booking.id },
      select: { status: true, stripePaymentIntentId: true },
    });
    if (current.status !== "approved") throw new NotApproved(current);

    await assertInventoryScopeAvailable({
      propertyId: booking.propertyId,
      start: booking.checkIn,
      end: booking.checkOut,
      excludeBookingId: booking.id,
      db: tx,
    });
    await tx.booking.update({ where: { id: booking.id }, data: { ...data, status: to } });
    await reconcileSource(
      { kind: "booking", id: booking.id, propertyId: booking.propertyId, start: booking.checkIn, end: booking.checkOut, isActive: true },
      { db: tx }
    );
  });
}

/** A promo code's use is counted when the request is paid, never when it is only requested. */
async function countPromoUse(booking: PayableBooking): Promise<void> {
  if (!booking.discountCode) return;
  try {
    await prisma.discountCode.update({ where: { code: booking.discountCode }, data: { usageCount: { increment: 1 } } });
  } catch (err) {
    console.error("[booking-payment] promo usage count failed:", err);
  }
}

export const paymentLinkUnavailableTarget = (bookingId: number) => `booking-payment-unavailable-${bookingId}`;

export function paymentLinkUnavailableGuestMessage(bookingId: number): string {
  return (
    "These dates were booked by another guest before your payment was recorded, so we could not hold them. " +
    "Please do not send a payment. If you have already sent one, do not pay again. We have been notified — " +
    `contact us at customerservice@haveninlipa.com and quote booking request #${bookingId}.`
  );
}

/** GCash/BPI lost the race: record and alert at most once per request. Never throws. */
async function reportPaymentLinkUnavailable(
  booking: PayableBooking,
  paymentMethod: "gcash" | "bpi",
  ipAddress: string | undefined
): Promise<void> {
  const target = paymentLinkUnavailableTarget(booking.id);
  try {
    const already = await prisma.adminLog.findFirst({ where: { target }, select: { id: true } });
    if (already) return;
    await prisma.adminLog.create({
      data: {
        actor: booking.guestName,
        actorRole: "guest",
        action: `Guest reported paying booking request #${booking.id} by ${paymentMethod.toUpperCase()} but the dates were already taken — no booking, refund by hand if a payment arrived`,
        module: "booking_flow",
        target,
        ipAddress: ipAddress ?? null,
        metadata: JSON.stringify({ bookingId: booking.id, paymentMethod, total: Number(booking.totalPrice) }),
      },
    });
  } catch (err) {
    console.error("[booking-payment] could not record unavailable payment for booking", booking.id, err);
  }
  await send(ADMIN_REQUEST_EMAIL_TO, paymentLinkUnavailableAdminEmail(emailBooking(booking), paymentMethod), booking.guestEmail);
}

export interface BookingPaymentResult {
  status: "pending" | "confirmed";
  bookingId: number;
  /** What the guest paid (card: fee included) — for the GA4 conversion. */
  total: number;
  propertySlug: string;
  propertyName: string;
  nights: number;
}

function result(booking: PayableBooking, status: "pending" | "confirmed", total: number): BookingPaymentResult {
  return {
    status,
    bookingId: booking.id,
    total,
    propertySlug: booking.property.slug,
    propertyName: booking.property.name,
    nights: nightsBetween(booking.checkIn, booking.checkOut),
  };
}

function notPayable(state: Exclude<PaymentLinkState, "payable">): BookingPaymentError {
  return new BookingPaymentError(409, PAYMENT_LINK_MESSAGES[state], "not_payable");
}

/** The guest pays, or says they have paid, through the payment link. */
export async function submitBookingPayment(input: {
  token: string;
  paymentMethod: unknown;
  stripePaymentIntentId?: unknown;
  ipAddress?: string;
  now?: Date;
}): Promise<BookingPaymentResult> {
  const now = input.now ?? new Date();
  const { paymentMethod } = input;
  if (paymentMethod !== "gcash" && paymentMethod !== "bpi" && paymentMethod !== "stripe") {
    throw new BookingPaymentError(400, "Invalid payment method", "invalid");
  }
  const booking = await loadBookingForPayment(input.token);
  if (!booking) throw new BookingPaymentError(404, "This payment link was not found.", "not_found");

  const base = Number(booking.totalPrice);
  const state = paymentLinkState(booking, now);

  // ── GCash / BPI: the guest says they have paid → hold the dates, await verification ──
  if (paymentMethod !== "stripe") {
    if (state !== "payable") throw notPayable(state);
    try {
      await claimDates(booking, "pending", { paymentMethod, paymentSubmittedAt: now });
    } catch (err) {
      if (err instanceof NotApproved) {
        throw notPayable(paymentLinkState({ status: err.current.status, paymentLinkExpiresAt: null }, now) as Exclude<PaymentLinkState, "payable">);
      }
      if (err instanceof AvailabilityConflictError) {
        await reportPaymentLinkUnavailable(booking, paymentMethod, input.ipAddress);
        throw new BookingPaymentError(409, paymentLinkUnavailableGuestMessage(booking.id), "unavailable");
      }
      throw err;
    }
    await countPromoUse(booking);
    await send(booking.guestEmail, paymentSubmittedGuestEmail(emailBooking(booking), paymentMethod));
    await send(ADMIN_REQUEST_EMAIL_TO, paymentSubmittedAdminEmail(emailBooking(booking), paymentMethod), booking.guestEmail);
    await logAction({
      actor: booking.guestName,
      actorRole: "guest",
      action: `Reported paying approved booking request #${booking.id} via ${paymentMethod.toUpperCase()} — dates now held, awaiting verification`,
      module: "booking_flow",
      target: `booking-${booking.id}`,
      ipAddress: input.ipAddress,
      metadata: { bookingId: booking.id, paymentMethod, before: { status: "approved" }, after: { status: "pending" } },
    });
    return result(booking, "pending", base);
  }

  // ── Card: verify the payment, then confirm ───────────────────────────────────
  const intentId = typeof input.stripePaymentIntentId === "string" ? input.stripePaymentIntentId : "";
  if (!intentId) throw new BookingPaymentError(400, "Missing payment reference", "invalid");
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new BookingPaymentError(503, "Card payments are unavailable.", "invalid");

  const { fee, total } = cardTotalFor(base);

  // A retry after success (a double submit, or a lost response): same payment, same booking.
  if (booking.status === "confirmed" && booking.stripePaymentIntentId === intentId) {
    return result(booking, "confirmed", base);
  }

  let pi: Stripe.PaymentIntent;
  try {
    pi = await new Stripe(secretKey).paymentIntents.retrieve(intentId);
  } catch {
    throw new BookingPaymentError(400, "Could not verify payment", "invalid");
  }
  const expectedAmount = toStripeAmount(total);
  const verification = verifyPaymentIntent(pi, {
    amount: expectedAmount,
    metadata: bookingPaymentIntentMetadata({ bookingId: booking.id, token: input.token, amount: expectedAmount }),
  });
  if (!verification.ok) {
    console.error("[booking-payment] Stripe verification failed:", pi.id, verification.error);
    throw new BookingPaymentError(verification.status, verification.error, "invalid");
  }

  // From here the card HAS been charged for this booking. Every failure below is a paid
  // guest without a booking, so it is reported, never just refused.
  const paidButNoBooking = async (cause: PaidUnavailableCause) => {
    console.error("[booking-payment] card paid but booking not confirmed:", pi.id, cause);
    await reportPaidButUnavailable({
      propertyId: booking.propertyId,
      propertyName: booking.property.name,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      guests: booking.guests,
      guestName: booking.guestName,
      guestEmail: booking.guestEmail,
      guestPhone: booking.guestPhone,
      intentId: pi.id,
      amount: (pi.amount_received ?? pi.amount) / 100,
      ipAddress: input.ipAddress,
      cause,
    });
    return new BookingPaymentError(409, paidUnavailableGuestMessage(pi.id, cause), PAID_UNAVAILABLE_CODE, pi.id);
  };

  // The link's own expiry is not re-checked for a verified payment: while the booking is
  // still `approved` and its dates are free, a card charged a moment late is honoured.
  if (booking.status !== "approved") {
    if (state === "pending" || state === "confirmed") throw notPayable(state);
    throw await paidButNoBooking("booking_closed");
  }

  try {
    await claimDates(booking, "confirmed", {
      paymentMethod: "stripe",
      stripeFee: fee,
      totalPrice: total,
      stripePaymentIntentId: pi.id,
    });
  } catch (err) {
    if (err instanceof NotApproved) {
      if (err.current.status === "confirmed" && err.current.stripePaymentIntentId === pi.id) {
        return result(booking, "confirmed", total);
      }
      throw await paidButNoBooking("booking_closed");
    }
    if (err instanceof AvailabilityConflictError) throw await paidButNoBooking("dates_taken");
    // One PaymentIntent pays for one booking (unique index on stripePaymentIntentId).
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new BookingPaymentError(409, "This payment has already been used for a booking.", "invalid");
    }
    throw err;
  }

  await countPromoUse(booking);

  // Same follow-ups as any booking that becomes confirmed.
  try {
    await materializeScheduledMessagesForBooking(booking.id);
    await flushDueScheduledMessages({ bookingId: booking.id });
  } catch (err) {
    console.error("[booking-payment] Scheduled message materialize/flush failed:", err);
  }
  const nights = nightsBetween(booking.checkIn, booking.checkOut);
  await sendBookingConfirmedMeasurementEvent({
    bookingId: booking.id,
    propertySlug: booking.property.slug,
    total,
    propertyName: booking.property.name,
    nights,
  });

  const paid = emailBooking(booking, total);
  await send(booking.guestEmail, bookingConfirmedGuestEmail(paid, fee));
  await send(ADMIN_REQUEST_EMAIL_TO, bookingConfirmedAdminEmail(paid, { cardFee: fee, paymentReference: pi.id }), booking.guestEmail);
  await logAction({
    actor: booking.guestName,
    actorRole: "guest",
    action: `Paid approved booking request #${booking.id} by card — confirmed`,
    module: "booking_flow",
    target: `booking-${booking.id}`,
    ipAddress: input.ipAddress,
    metadata: {
      bookingId: booking.id,
      paymentMethod: "stripe",
      paymentIntentId: pi.id,
      before: { status: "approved", totalPrice: base },
      after: { status: "confirmed", totalPrice: total, stripeFee: fee },
    },
  });
  return result(booking, "confirmed", total);
}
