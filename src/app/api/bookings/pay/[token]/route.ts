import { NextRequest, NextResponse } from "next/server";
import { getIpFromRequest } from "@/lib/log";
import { BookingPaymentError, submitBookingPayment } from "@/lib/booking-payment";

export const dynamic = "force-dynamic";
// Holds the inventory lock across the availability re-check, the status change and the
// sibling-block write; give it room on a slow database round-trip.
export const maxDuration = 60;

// POST /api/bookings/pay/[token] — pay an approved booking request through its link.
//
//   { paymentMethod: "gcash" | "bpi" }                       → pending (dates held, awaiting verification)
//   { paymentMethod: "stripe", stripePaymentIntentId }       → confirmed, after the payment is verified
//
// PUBLIC route: the token in the URL is the only credential. The amount is never read
// from the request — see src/lib/booking-payment.ts.
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const result = await submitBookingPayment({
      token,
      paymentMethod: body?.paymentMethod,
      stripePaymentIntentId: body?.stripePaymentIntentId,
      ipAddress: getIpFromRequest(req),
    });
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    if (err instanceof BookingPaymentError) {
      return NextResponse.json(
        { error: err.message, code: err.code, ...(err.paymentReference ? { paymentReference: err.paymentReference } : {}) },
        { status: err.status }
      );
    }
    console.error("[booking-payment] payment failed:", err);
    return NextResponse.json(
      { error: "We could not record your payment. Please do not pay again. Contact us at customerservice@haveninlipa.com." },
      { status: 500 }
    );
  }
}
