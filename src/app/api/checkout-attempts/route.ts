import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";
import { computeBookingQuote } from "@/lib/booking-quote";

/**
 * Record (or refresh) a guest's arrival on the payment screen — see
 * src/lib/checkout-abandonment.ts. Called by BookingForm each time the payment step is
 * shown or its method changes. The first call returns a token; later calls from the same
 * page pass it back to update that row instead of creating another.
 *
 * Best-effort from the client's point of view: a failure here must never block payment,
 * so errors are plain JSON and the form ignores them.
 */

const METHODS = new Set(["gcash", "bpi", "stripe"]);
const MAX_TEXT = 191; // MySQL VARCHAR default for Prisma String

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { token, propertyId, guestName, guestEmail, guestPhone, checkIn, checkOut, guests, discountCode, paymentMethod } = body;

  if (
    typeof guestName !== "string" || !guestName.trim() || guestName.length > MAX_TEXT ||
    typeof guestEmail !== "string" || !/^[^\s@]+@[^\s@]+$/.test(guestEmail) || guestEmail.length > MAX_TEXT ||
    typeof guestPhone !== "string" ||
    typeof checkIn !== "string" || typeof checkOut !== "string" ||
    typeof paymentMethod !== "string" || !METHODS.has(paymentMethod)
  ) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const phone = normalizePhone(guestPhone);
  if (!phone) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  // Same server quote /api/bookings uses — also validates property, dates and guests.
  const quoteResult = await computeBookingQuote({
    propertyId,
    checkIn,
    checkOut,
    guests,
    discountCode: typeof discountCode === "string" ? discountCode : null,
    paymentMethod,
  });
  if (!quoteResult.ok) return NextResponse.json({ error: quoteResult.error }, { status: quoteResult.status });
  const q = quoteResult.quote;

  const data = {
    propertyId: q.propertyId,
    guestName: guestName.trim(),
    guestEmail: guestEmail.trim(),
    guestPhone: phone.e164,
    checkIn: q.checkInDate,
    checkOut: q.checkOutDate,
    guests: q.guestCount,
    paymentMethod,
    discountCode: q.discountCode,
    total: q.total,
  };

  // Refresh an existing, still-open attempt. A completed or already-alerted one is left
  // alone and a fresh attempt is started instead.
  if (typeof token === "string" && token) {
    const updated = await prisma.checkoutAttempt.updateMany({
      where: { token, bookingId: null, alertedAt: null },
      data,
    });
    if (updated.count === 1) return NextResponse.json({ token });
  }

  const newToken = randomBytes(18).toString("base64url");
  await prisma.checkoutAttempt.create({ data: { ...data, token: newToken } });
  return NextResponse.json({ token: newToken });
}
