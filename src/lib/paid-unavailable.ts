/**
 * "Paid but unavailable" — a card payment succeeded, then the booking could not be saved
 * because the dates were taken in between.
 *
 * The card is charged in the browser BEFORE /api/bookings runs, so this can always
 * happen: the availability check at payment-intent time and the one at booking time are
 * minutes apart. What this module does is make it visible and traceable. It does NOT
 * refund, re-charge or rebook — those need an Owner policy that does not exist yet.
 *
 *  - Guest: told plainly that the payment went through, no booking was made, not to pay
 *    again, and given the payment reference.
 *  - Admin: one alert email plus one AdminLog entry per payment, carrying the Stripe
 *    PaymentIntent id, the amount, the guest's contact details and the stay.
 */

import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { createMailer, FROM_ADDRESS } from "@/lib/email";
import { ADMIN_ALERT_TO } from "@/lib/checkout-abandonment";
import { formatStayDate, utcDateKey } from "@/lib/dates";
import { STRIPE_CURRENCY } from "@/lib/stripe-payment";

export const PAID_UNAVAILABLE_CODE = "paid_unavailable";

/** AdminLog target for a payment — also the once-per-payment key for the alert. */
export const paidUnavailableTarget = (intentId: string) => `stripe-${intentId}`;

export function paidUnavailableGuestMessage(intentId: string): string {
  return (
    "Your card payment went through, but these dates were taken just before your booking could be saved, " +
    "so no booking was made. Please do not pay again. We have been notified — contact us at " +
    `customerservice@haveninlipa.com and quote payment reference ${intentId}.`
  );
}

export interface PaidUnavailableStay {
  propertyId: number;
  propertyName: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
}

/**
 * Is this PaymentIntent a SUCCEEDED card payment for exactly this stay? The id comes from
 * the browser, so anything else (unpaid, another currency, another stay) is not treated
 * as a paid booking — which also stops the id being used to trigger alert emails.
 */
export function isPaidIntentForStay(
  pi: Pick<Stripe.PaymentIntent, "status" | "currency" | "metadata">,
  stay: Pick<PaidUnavailableStay, "propertyId" | "checkIn" | "checkOut">
): boolean {
  return (
    pi.status === "succeeded" &&
    pi.currency?.toLowerCase() === STRIPE_CURRENCY &&
    pi.metadata?.kind === "booking" &&
    pi.metadata?.propertyId === String(stay.propertyId) &&
    pi.metadata?.checkIn === utcDateKey(stay.checkIn) &&
    pi.metadata?.checkOut === utcDateKey(stay.checkOut)
  );
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function buildPaidUnavailableAlert(a: PaidUnavailableStay & { intentId: string; amount: number }): {
  subject: string;
  html: string;
} {
  const stay = (d: Date) => formatStayDate(d, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  const row = (k: string, v: string) =>
    `<tr><td style="padding:6px 0;color:#666;width:150px;vertical-align:top">${k}</td><td>${v}</td></tr>`;
  return {
    subject: `⚠️ Card charged, booking NOT saved – ${a.guestName} – ${a.propertyName}`,
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#335238">
        <div style="background:#9b2c2c;padding:20px 28px;border-radius:8px 8px 0 0">
          <h1 style="color:#fff;margin:0;font-size:19px">Card charged — no booking was made</h1>
          <p style="color:rgba(255,255,255,.85);margin:6px 0 0;font-size:13px">The dates were taken before the booking could be saved</p>
        </div>
        <div style="background:#fff;border:1px solid #e5e5e5;border-top:none;padding:24px 28px;border-radius:0 0 8px 8px;font-size:14px">
          <table style="width:100%;border-collapse:collapse">
            ${row("Stripe payment", `<strong style="font-family:monospace">${esc(a.intentId)}</strong>`)}
            ${row("Amount charged", `<strong>₱${a.amount.toLocaleString()}</strong>`)}
            ${row("Guest", `<strong>${esc(a.guestName)}</strong>`)}
            ${row("Email", `<a href="mailto:${esc(a.guestEmail)}">${esc(a.guestEmail)}</a>`)}
            ${row("Phone", esc(a.guestPhone))}
            ${row("Property", esc(a.propertyName))}
            ${row("Stay requested", `${stay(a.checkIn)} → ${stay(a.checkOut)}`)}
            ${row("Guests", String(a.guests))}
          </table>
          <div style="margin-top:18px;padding:12px 14px;background:#FFF5F5;border-left:3px solid #9b2c2c;border-radius:4px;font-size:13px;color:#555;line-height:1.6">
            <strong>No booking exists and nothing has been refunded.</strong> The site does not refund automatically.
            The guest was told not to pay again and to contact us with the payment reference above.
            Find the payment in Stripe by that reference.
          </div>
        </div>
      </div>
    `,
  };
}

/**
 * Record and alert, at most once per payment. Never throws — it runs on an error path
 * and must not turn a clear 409 into a 500.
 */
export async function reportPaidButUnavailable(
  input: PaidUnavailableStay & { intentId: string; amount: number; ipAddress?: string }
): Promise<void> {
  const target = paidUnavailableTarget(input.intentId);
  try {
    // A retried request for the same payment must not send a second alert.
    const already = await prisma.adminLog.findFirst({ where: { target }, select: { id: true } });
    if (already) return;

    await prisma.adminLog.create({
      data: {
        actor: input.guestName,
        actorRole: "guest",
        action: `Card payment ${input.intentId} succeeded but the dates were taken before the booking was saved — no booking, not refunded`,
        module: "booking_flow",
        target,
        ipAddress: input.ipAddress ?? null,
        metadata: JSON.stringify({
          stripePaymentIntentId: input.intentId,
          amount: input.amount,
          propertyId: input.propertyId,
          checkIn: utcDateKey(input.checkIn),
          checkOut: utcDateKey(input.checkOut),
          guests: input.guests,
          guestEmail: input.guestEmail,
          guestPhone: input.guestPhone,
        }),
      },
    });
  } catch (err) {
    console.error("[paid-unavailable] could not record", input.intentId, err);
  }

  try {
    const { subject, html } = buildPaidUnavailableAlert(input);
    await createMailer().sendMail({ from: FROM_ADDRESS, to: ADMIN_ALERT_TO, replyTo: input.guestEmail, subject, html });
  } catch (err) {
    console.error("[paid-unavailable] alert email failed for", input.intentId, err);
  }
}
