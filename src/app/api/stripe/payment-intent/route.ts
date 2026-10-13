import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { calcStripeFee } from "@/lib/pricing";
import { computeBookingQuote } from "@/lib/booking-quote";
import {
  toStripeAmount,
  STRIPE_CURRENCY,
  bookingIntentMetadata,
  bookingPaymentIntentMetadata,
  chargeIntentMetadata,
} from "@/lib/stripe-payment";
import { cardTotalFor, loadBookingForPayment, paymentLinkState, PAYMENT_LINK_MESSAGES } from "@/lib/booking-payment";
import { assertPropertyAvailable, AvailabilityConflictError } from "@/lib/availability";
import { assertBookingPolicy, assertInstantBooking, bookingPolicyRefusalBody } from "@/lib/booking-policy";
import { loadBookingRules } from "@/lib/booking-policy-db";

/**
 * Create a PaymentIntent for an amount the SERVER computes. The client only says what
 * it wants to pay for (a stay, an approved booking request by its payment-link token, or
 * an additional charge by token) — never how much, in
 * what currency, or with what metadata. The metadata stamped here is what
 * /api/bookings and /api/charges/[token]/pay later require to match before they
 * treat the payment as real.
 */
export async function POST(req: Request) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: "Stripe is not configured on this server." }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));

    let amount: number;
    let total: number;
    let metadata: Record<string, string>;

    if (body.kind === "additional_charge") {
      // ── Guest-paid additional charge ─────────────────────────────────────
      const token = typeof body.token === "string" ? body.token : "";
      if (!token) return NextResponse.json({ error: "Missing charge reference" }, { status: 400 });

      const charge = await prisma.additionalCharge.findUnique({
        where: { token },
        select: { id: true, amount: true, status: true },
      });
      if (!charge) return NextResponse.json({ error: "Charge not found" }, { status: 404 });
      if (charge.status === "paid") {
        return NextResponse.json({ error: "This charge has already been paid." }, { status: 409 });
      }
      if (charge.status === "cancelled") {
        return NextResponse.json({ error: "This charge is no longer active." }, { status: 409 });
      }

      const chargeAmount = Number(charge.amount);
      total = chargeAmount + calcStripeFee(chargeAmount);
      amount = toStripeAmount(total);
      metadata = chargeIntentMetadata({ chargeId: charge.id, token, amount });
    } else if (body.kind === "booking_payment") {
      // ── Approved booking request, paid through its payment link ──────────
      const token = typeof body.token === "string" ? body.token : "";
      const booking = token ? await loadBookingForPayment(token) : null;
      if (!booking) return NextResponse.json({ error: "This payment link was not found." }, { status: 404 });

      // Strict here: no card is charged on a link that has expired or already been used.
      const state = paymentLinkState(booking, new Date());
      if (state !== "payable") {
        return NextResponse.json({ error: PAYMENT_LINK_MESSAGES[state], code: "not_payable" }, { status: 409 });
      }

      // The request holds no dates, so they may be gone. Fail before the guest pays; the
      // authoritative check runs under the inventory lock in /api/bookings/pay/[token].
      try {
        await assertPropertyAvailable({
          propertyId: booking.propertyId,
          start: booking.checkIn,
          end: booking.checkOut,
          excludeBookingId: booking.id,
          syncPolicy: "booking",
        });
      } catch (err) {
        if (err instanceof AvailabilityConflictError) {
          return NextResponse.json({ error: err.message, code: "unavailable" }, { status: err.status });
        }
        throw err;
      }

      total = cardTotalFor(Number(booking.totalPrice)).total;
      amount = toStripeAmount(total);
      metadata = bookingPaymentIntentMetadata({ bookingId: booking.id, token, amount });
    } else {
      // ── Booking (default) ────────────────────────────────────────────────
      const { propertyId, checkIn, checkOut, guests, discountCode } = body;
      if (!propertyId || typeof checkIn !== "string" || typeof checkOut !== "string") {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }

      const result = await computeBookingQuote({
        propertyId,
        checkIn,
        checkOut,
        guests,
        discountCode,
        paymentMethod: "stripe",
      });
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
      const { quote } = result;

      // Advance notice — strict here, so a card is never charged for a check-in that has
      // already closed. The grace window exists only at final submission (/api/bookings).
      const rules = await loadBookingRules(quote.propertyId);
      const policyOutcome = assertBookingPolicy({
        checkIn: quote.checkInDate,
        policy: rules.policy,
        now: new Date(),
      });
      if (!policyOutcome.ok) {
        return NextResponse.json(bookingPolicyRefusalBody(policyOutcome), { status: 409 });
      }

      // Instant Booking off: no card is charged before the Owner approves the request.
      const instant = assertInstantBooking({ mode: rules.instantBookingMode });
      if (!instant.ok) {
        return NextResponse.json(bookingPolicyRefusalBody(instant), { status: 409 });
      }

      // Fail before the guest pays rather than after. The authoritative check (with the
      // fresh "booking" external-feed sync) still runs in /api/bookings.
      try {
        await assertPropertyAvailable({
          propertyId: quote.propertyId,
          start: quote.checkInDate,
          end: quote.checkOutDate,
          syncPolicy: "availability",
        });
      } catch (err) {
        if (err instanceof AvailabilityConflictError) {
          return NextResponse.json({ error: err.message }, { status: err.status });
        }
        throw err;
      }

      total = quote.total;
      amount = toStripeAmount(total);
      metadata = bookingIntentMetadata({
        propertyId: quote.propertyId,
        checkIn: quote.checkInDate,
        checkOut: quote.checkOutDate,
        guests: quote.guestCount,
        discountCode: quote.discountCode,
        amount,
      });
    }

    const stripe = new Stripe(secretKey);
    // Stripe amounts are in centavos (smallest currency unit)
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: STRIPE_CURRENCY,
      metadata,
      automatic_payment_methods: { enabled: true },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      // Return publishable key so client can init Stripe at runtime (bypasses build-time env baking)
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
      // What the card will actually be charged (server-authoritative), in PHP.
      total,
    });
  } catch (err) {
    console.error("Stripe PaymentIntent error:", err);
    return NextResponse.json({ error: "Failed to create payment intent" }, { status: 500 });
  }
}
