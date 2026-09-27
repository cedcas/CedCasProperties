/**
 * Pure Stripe PaymentIntent helpers — no Prisma, no Stripe client, no network.
 *
 * The server must never take the browser's word for what was paid: a PaymentIntent id
 * alone proves nothing (it could be unpaid, for a different amount, or for a different
 * booking). Routes retrieve the intent with the secret key and run it through
 * `verifyPaymentIntent` against the amount/metadata they computed themselves.
 * Kept Prisma-free so the checks can be unit-tested directly.
 */

import { utcDateKey } from "@/lib/dates";

/** Every HIL PaymentIntent is in Philippine pesos. */
export const STRIPE_CURRENCY = "php";

/** Stripe amounts are integers in the smallest currency unit (centavos). */
export function toStripeAmount(total: number): number {
  return Math.round(total * 100);
}

/** The subset of Stripe.PaymentIntent the verifier reads (keeps tests free of the SDK types). */
export interface PaymentIntentLike {
  status: string;
  currency: string;
  amount: number;
  amount_received: number;
  metadata: Record<string, string> | null | undefined;
}

export type PaymentVerification = { ok: true } | { ok: false; status: number; error: string };

/**
 * Check a retrieved PaymentIntent against server-computed expectations.
 *
 * `expected.metadata` lists the keys the intent must carry with exactly these values —
 * this is what binds an intent to the booking/charge it was created for, so an intent
 * paid for one stay can't be replayed to confirm another.
 */
export function verifyPaymentIntent(
  pi: PaymentIntentLike,
  expected: { amount: number; metadata: Record<string, string> }
): PaymentVerification {
  if (pi.status !== "succeeded") {
    // Automatic capture: anything short of "succeeded" (processing, requires_action,
    // requires_payment_method, canceled…) means the money isn't ours yet.
    return {
      ok: false,
      status: 402,
      error: pi.status === "processing"
        ? "Your card payment is still processing. Please wait a moment and contact us if it doesn't go through."
        : "Your card payment was not completed. Please try again.",
    };
  }
  if (pi.currency?.toLowerCase() !== STRIPE_CURRENCY) {
    return { ok: false, status: 400, error: "This payment was made in the wrong currency. Please contact us." };
  }
  if (pi.amount !== expected.amount || pi.amount_received !== expected.amount) {
    return {
      ok: false,
      status: 400,
      error: "The amount paid doesn't match the current total. Please contact us so we can sort it out.",
    };
  }
  const metadata = pi.metadata ?? {};
  for (const [key, value] of Object.entries(expected.metadata)) {
    if (metadata[key] !== value) {
      return {
        ok: false,
        status: 400,
        error: "This payment doesn't match these details. Please contact us so we can sort it out.",
      };
    }
  }
  return { ok: true };
}

/**
 * Metadata stamped on a booking PaymentIntent at creation and required verbatim at
 * booking time. Built by one function for both sides so the two can't drift.
 */
export function bookingIntentMetadata(b: {
  propertyId: number;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  discountCode: string | null;
  amount: number; // centavos
}): Record<string, string> {
  return {
    kind: "booking",
    propertyId: String(b.propertyId),
    checkIn: utcDateKey(b.checkIn),
    checkOut: utcDateKey(b.checkOut),
    guests: String(b.guests),
    discountCode: b.discountCode ?? "",
    amount: String(b.amount),
  };
}

/** Same idea for a guest-paid AdditionalCharge. */
export function chargeIntentMetadata(c: { chargeId: number; token: string; amount: number }): Record<string, string> {
  return {
    kind: "additional_charge",
    chargeId: String(c.chargeId),
    token: c.token,
    amount: String(c.amount),
  };
}
