import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { createMailer, FROM_ADDRESS } from "@/lib/email";
import { sendGuestMessage } from "@/lib/guestMessages";
import { calcStripeFee, STRIPE_FEE_RATE } from "@/lib/pricing";
import { logAction, getIpFromRequest } from "@/lib/log";

const peso = (n: number) => `₱${Number(n).toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;
const ADMIN_EMAIL = "customerservice@haveninlipa.com";

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await req.json().catch(() => ({}));
  const paymentMethod = body.paymentMethod as "gcash" | "bpi" | "stripe" | undefined;

  if (!paymentMethod || !["gcash", "bpi", "stripe"].includes(paymentMethod)) {
    return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
  }

  const charge = await prisma.additionalCharge.findUnique({
    where: { token },
    include: { booking: { include: { property: { select: { name: true } } } } },
  });
  if (!charge) return NextResponse.json({ error: "Charge not found" }, { status: 404 });
  if (charge.status === "paid") {
    return NextResponse.json({ error: "This charge has already been paid." }, { status: 409 });
  }
  if (charge.status === "cancelled") {
    return NextResponse.json({ error: "This charge is no longer active." }, { status: 409 });
  }

  const amount = Number(charge.amount);
  const { booking } = charge;
  const propertyName = booking.property.name;

  // ── Card (Stripe): verify server-side, mark paid ──────────────────────────
  if (paymentMethod === "stripe") {
    const paymentIntentId = body.stripePaymentIntentId as string | undefined;
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) return NextResponse.json({ error: "Card payments are unavailable." }, { status: 503 });
    if (!paymentIntentId) return NextResponse.json({ error: "Missing payment reference" }, { status: 400 });

    const stripe = new Stripe(secretKey);
    let pi: Stripe.PaymentIntent;
    try {
      pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch {
      return NextResponse.json({ error: "Could not verify payment" }, { status: 400 });
    }
    if (pi.status !== "succeeded") {
      return NextResponse.json({ error: "Payment was not completed." }, { status: 400 });
    }

    const stripeFee = calcStripeFee(amount);
    const updated = await prisma.additionalCharge.update({
      where: { id: charge.id },
      data: {
        status: "paid",
        paymentMethod: "stripe",
        stripeFee,
        stripePaymentIntentId: paymentIntentId,
        paidAt: new Date(),
      },
    });

    // Guest receipt — threaded into Guest Messages
    try {
      await sendGuestMessage({
        bookingId: booking.id,
        quickReplyId: null,
        channel: "email",
        trigger: "manual",
        subject: `Payment received — ${charge.description}`,
        body: `Hi ${booking.guestName},\n\nWe've received your card payment. Thank you!\n\n${charge.description}: ${peso(amount)}\nCard fee (${(STRIPE_FEE_RATE * 100).toFixed(0)}%): ${peso(stripeFee)}\nTotal charged: ${peso(amount + stripeFee)}\n\n— Haven in Lipa`,
      });
    } catch (err) {
      console.error("Charge receipt email failed:", err);
    }
    // Admin notice — plain (not guest-facing)
    await notifyAdmin(
      `Charge paid (card) — ${propertyName}`,
      `Guest <strong>${booking.guestName}</strong> paid <strong>${peso(amount)}</strong> for "${charge.description}" by card.<br/>Card fee: ${peso(stripeFee)} · Total: ${peso(amount + stripeFee)}<br/>Booking #${booking.id} · Stripe: ${paymentIntentId}`,
    );

    await logAction({
      actor: booking.guestName,
      actorRole: "guest",
      action: `Paid charge #${charge.id} (₱${amount.toLocaleString()}) by card`,
      module: "bookings",
      target: `booking-${booking.id}`,
      ipAddress: getIpFromRequest(req),
      metadata: { chargeId: charge.id, paymentMethod, paymentIntentId },
    });

    return NextResponse.json({ success: true, status: updated.status });
  }

  // ── GCash / BPI: guest claims paid → awaiting admin verification ──────────
  const updated = await prisma.additionalCharge.update({
    where: { id: charge.id },
    data: { status: "awaiting_verification", paymentMethod },
  });

  await notifyAdmin(
    `Verify payment — ${propertyName}`,
    `Guest <strong>${booking.guestName}</strong> reports paying <strong>${peso(amount)}</strong> for "${charge.description}" via <strong>${paymentMethod.toUpperCase()}</strong>.<br/>Please verify receipt and mark the charge as paid on Booking #${booking.id}.`,
  );

  await logAction({
    actor: booking.guestName,
    actorRole: "guest",
    action: `Reported paying charge #${charge.id} (₱${amount.toLocaleString()}) via ${paymentMethod.toUpperCase()}`,
    module: "bookings",
    target: `booking-${booking.id}`,
    ipAddress: getIpFromRequest(req),
    metadata: { chargeId: charge.id, paymentMethod },
  });

  return NextResponse.json({ success: true, status: updated.status });
}

async function notifyAdmin(subject: string, inner: string) {
  // Awaited so the send completes before the serverless function returns.
  // Never let a mail failure break the guest's payment response.
  try {
    const mailer = createMailer();
    await mailer.sendMail({
      from: FROM_ADDRESS,
      to: ADMIN_EMAIL,
      subject,
      html: `
        <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#335238">
          <div style="background:#335238;padding:20px 32px;border-radius:8px 8px 0 0">
            <h1 style="color:#fff;margin:0;font-size:18px">${subject}</h1>
          </div>
          <div style="background:#fff;border:1px solid #e5e5e5;border-top:none;padding:24px 32px;border-radius:0 0 8px 8px;font-size:14px;line-height:1.7;color:#444">
            ${inner}
          </div>
        </div>`,
    });
  } catch (err) {
    console.error("Admin charge notice failed:", err);
  }
}
