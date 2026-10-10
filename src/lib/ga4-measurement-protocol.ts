/**
 * Server-side GA4 Measurement Protocol send for `booking_confirmed` — proposed
 * fix for the client-side undercount found in the 2026-10-10 reconciliation
 * (see docs/HIL_COMPLETION_LOG.md and the Website spec's GA4 Analytics Events
 * section). A guest's browser only fires `booking_confirmed`
 * (src/components/booking/BookingForm.tsx) if it stays on the "done" screen
 * long enough for gtag's beacon to go out — a closed tab, an ad blocker, or a
 * GCash/BPI guest who never returns to the site after paying all mean the
 * booking is genuinely confirmed with no client-side hit.
 *
 * Off by default. Enabling requires both `GA4_MP_ENABLED=true` and
 * `GA4_MP_API_SECRET` (an Owner-created GA4 Measurement Protocol API secret) —
 * neither is set in any environment today. See DEC-021 for the client-side
 * gating this complements, not replaces.
 */
import { GA_MEASUREMENT_ID } from "@/lib/analytics-config";

const MP_ENDPOINT = "https://www.google-analytics.com/mp/collect";

export interface BookingConfirmedMpEvent {
  bookingId: number;
  propertySlug: string;
  /** Server-computed total (never client-supplied — same figure the booking was saved with). */
  total: number;
}

export function isGa4MpEnabled(): boolean {
  return process.env.GA4_MP_ENABLED === "true" && !!process.env.GA4_MP_API_SECRET;
}

/**
 * The same `transaction_id` format the browser's track() call uses
 * (`HIL-<bookingId>`), so a human reconciling the GA4 export can match or
 * de-duplicate a server-sent hit against a client-sent one by that field.
 * GA4 does not automatically merge hits from two different client_ids itself
 * — this is an analysis-time key, not a guarantee against double-counting.
 */
export function bookingTransactionId(bookingId: number): string {
  return `HIL-${bookingId}`;
}

/**
 * Best-effort; never throws. Call sites are the two places the server itself
 * decides a booking became confirmed: the Stripe auto-confirm branch of
 * `POST /api/bookings`, and the `becameConfirmed` transition in
 * `PUT /api/admin/bookings/[id]` (GCash/BPI admin verification).
 */
export async function sendBookingConfirmedMeasurementEvent(event: BookingConfirmedMpEvent): Promise<void> {
  if (!isGa4MpEnabled()) return;

  const apiSecret = process.env.GA4_MP_API_SECRET!;
  const url = `${MP_ENDPOINT}?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${encodeURIComponent(apiSecret)}`;

  // No real browser client_id exists on the server. A booking-derived pseudo
  // client_id satisfies GA4 MP's required field without impersonating any
  // real visitor's identity — this event is for conversion-count
  // reconciliation, not session attribution or audience building.
  const clientId = `server.booking.${event.bookingId}`;

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        events: [
          {
            name: "booking_confirmed",
            params: {
              property: event.propertySlug,
              value: Math.round(event.total),
              currency: "PHP",
              transaction_id: bookingTransactionId(event.bookingId),
              // Analyst-side filter only — not a GA4 built-in filter value like
              // "internal": this is a real guest conversion, just sent server-side.
              event_source: "measurement_protocol",
            },
          },
        ],
      }),
    });
  } catch (err) {
    console.error("[ga4-mp] booking_confirmed send failed:", err);
  }
}
