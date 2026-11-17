import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendGuestMessage } from "@/lib/guestMessages";
import { logAction, getIpFromRequest } from "@/lib/log";
import { chargeUrl, buildChargeSms, buildChargeEmail } from "@/lib/charge-message";
import { hourlyFeeRateFor, buildHourlyFeeDescription, isHourlyFeeType, isValidHours } from "@/lib/hourly-fee";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const bookingId = Number(body.bookingId);
  if (!bookingId || Number.isNaN(bookingId)) {
    return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, guestName: true, property: { select: { slug: true } } },
  });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  // Early Check-In / Late Checkout: a specialized creation mode of the same
  // AdditionalCharge flow. The rate and total are always computed here on the
  // server — an hours count from the client is trusted, a total never is.
  let description: string;
  let amount: number;
  if (body.feeType !== undefined) {
    if (!isHourlyFeeType(body.feeType)) {
      return NextResponse.json({ error: "Unsupported fee type" }, { status: 400 });
    }
    const hours = Number(body.hours);
    if (!isValidHours(hours)) {
      return NextResponse.json(
        { error: "Hours must be a whole number greater than 0" },
        { status: 400 }
      );
    }
    // The hourly rate depends on which listing the booking is for (DEC-036) — never a
    // flat default — so it's resolved from the booking's own property.
    const rate = hourlyFeeRateFor(booking.property.slug);
    if (rate === null) {
      return NextResponse.json({ error: "This listing has no published hourly rate" }, { status: 400 });
    }
    description = buildHourlyFeeDescription(body.feeType, hours, rate);
    amount = hours * rate;
  } else {
    description = typeof body.description === "string" ? body.description.trim() : "";
    amount = Number(body.amount);
    if (!description) {
      return NextResponse.json({ error: "Description is required" }, { status: 400 });
    }
    if (!amount || Number.isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
    }
  }

  const charge = await prisma.additionalCharge.create({
    data: {
      bookingId,
      description,
      amount,
      token: crypto.randomUUID(),
    },
  });

  const url = chargeUrl(charge.token);

  // Notify the guest (threaded into Guest Messages). Don't fail the request if
  // the email bounces — the charge exists and the admin can resend.
  let notified = false;
  try {
    const email = buildChargeEmail({ guestName: booking.guestName, amount, description, url });
    await sendGuestMessage({
      bookingId,
      quickReplyId: null,
      channel: "email",
      trigger: "manual",
      subject: email.subject,
      body: email.body,
    });
    notified = true;
    await prisma.additionalCharge.update({
      where: { id: charge.id },
      data: { notifiedAt: new Date() },
    });
  } catch (err) {
    console.error("Charge guest email failed:", err);
  }

  await logAction({
    actor: session.user.name ?? "Admin",
    actorRole: (session.user.role ?? "admin") as "admin" | "manager",
    actorId: parseInt(session.user.id),
    action: `Created ₱${amount.toLocaleString()} charge "${description}" on booking #${bookingId}`,
    module: "bookings",
    target: `booking-${bookingId}`,
    ipAddress: getIpFromRequest(req),
    metadata: { chargeId: charge.id, amount, description, notified },
  });

  return NextResponse.json({
    charge: { ...charge, notifiedAt: notified ? new Date() : charge.notifiedAt },
    url,
    sms: buildChargeSms({ guestName: booking.guestName, amount, description, url }),
    notified,
  });
}
