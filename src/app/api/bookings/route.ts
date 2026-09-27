import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createMailer, FROM_ADDRESS } from "@/lib/email";
import Stripe from "stripe";
import { STRIPE_FEE_RATE } from "@/lib/pricing";
import { computeBookingQuote } from "@/lib/booking-quote";
import { toStripeAmount, verifyPaymentIntent, bookingIntentMetadata } from "@/lib/stripe-payment";
import { logAction, getIpFromRequest } from "@/lib/log";
import { normalizePhone } from "@/lib/phone";
import { promoteContactMessagesForEmail } from "@/lib/emailReply";
import { formatStayDate } from "@/lib/dates";
import { assertPropertyAvailable, AvailabilityConflictError } from "@/lib/availability";
import { reconcileBookingDerivedBlocks } from "@/lib/inventory-groups";
import { materializeScheduledMessagesForBooking, flushDueScheduledMessages } from "@/lib/scheduler";

export async function POST(req: NextRequest) {
  // Client-sent totalPrice / nightlyTotal / discountAmount are deliberately NOT read:
  // every peso is recomputed by computeBookingQuote below.
  const {
    propertyId,
    guestName,
    guestEmail,
    guestPhone,
    checkIn,
    checkOut,
    guests,
    paymentMethod,
    stripePaymentIntentId: rawStripePaymentIntentId,
    discountCode: rawDiscountCode,
    notes,
  } = await req.json();

  if (!propertyId || !guestName || !guestEmail || !guestPhone || !checkIn || !checkOut) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const normalizedPhone = normalizePhone(guestPhone);
  if (!normalizedPhone) {
    return NextResponse.json({ error: "Phone number is invalid. Use a Philippine number like 09171234567 or international with + prefix." }, { status: 400 });
  }
  const guestPhoneE164 = normalizedPhone.e164;

  // ── Server-side quote ─────────────────────────────────────────────────────
  // Date validation, property lookup, capacity/pricing guards, promo and every fee
  // live in src/lib/booking-quote.ts — the same computation that priced the Stripe
  // PaymentIntent, so the two can be compared exactly.
  const quoteResult = await computeBookingQuote({
    propertyId,
    checkIn,
    checkOut,
    guests,
    discountCode: rawDiscountCode,
    paymentMethod,
  });
  if (!quoteResult.ok) {
    return NextResponse.json({ error: quoteResult.error }, { status: quoteResult.status });
  }
  const {
    property,
    checkInDate,
    checkOutDate,
    guestCount,
    dailyRates,
    nightlyTotal: serverNightlyTotal,
    extraGuestFee,
    discountCode,
    discountAmount,
    stripeFee,
    total: computedTotal,
  } = quoteResult.quote;

  // ── Availability enforcement ─────────────────────────────────────────────
  // Single source of truth (src/lib/availability.ts): HIL bookings in a blocking status,
  // manual blocks, shared-inventory sibling blocks, and persisted external calendar
  // events. Replaces an inline overlap loop plus a duplicated inline iCal parser.
  //
  // `syncPolicy: "booking"` forces a refresh of the external feed if it is more than a
  // couple of minutes stale, preserving the live-check-at-booking-time guarantee this
  // route has always had — and no longer depending on a scheduler to have run.
  //
  // Server-side enforcement is required: the client disables unavailable dates, but this
  // endpoint is publicly callable.
  try {
    await assertPropertyAvailable({
      propertyId: Number(propertyId),
      start: checkInDate,
      end: checkOutDate,
      syncPolicy: "booking",
    });
  } catch (err) {
    if (err instanceof AvailabilityConflictError) {
      // Guest-safe message: never reveals *why* (owner use, sibling listing, …).
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  // ── Stripe payment verification ──────────────────────────────────────────
  // A card booking is auto-confirmed, so the PaymentIntent id from the browser is only
  // a claim: retrieve it with the secret key and require that it succeeded, in PHP, for
  // exactly the server-computed total, and that it was created for THIS stay.
  // GCash/BPI never get here — they stay "pending" for manual admin verification, and
  // any intent id they send is dropped so it can't be stored against the booking.
  const isStripe = paymentMethod === "stripe";
  let stripePaymentIntentId: string | null = null;

  if (isStripe) {
    if (typeof rawStripePaymentIntentId !== "string" || !rawStripePaymentIntentId) {
      return NextResponse.json({ error: "Missing payment reference" }, { status: 400 });
    }
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: "Card payments are unavailable." }, { status: 503 });
    }

    let pi: Stripe.PaymentIntent;
    try {
      pi = await new Stripe(secretKey).paymentIntents.retrieve(rawStripePaymentIntentId);
    } catch {
      return NextResponse.json({ error: "Could not verify payment" }, { status: 400 });
    }

    const expectedAmount = toStripeAmount(computedTotal);
    const verification = verifyPaymentIntent(pi, {
      amount: expectedAmount,
      metadata: bookingIntentMetadata({
        propertyId: Number(propertyId),
        checkIn: checkInDate,
        checkOut: checkOutDate,
        guests: guestCount,
        discountCode,
        amount: expectedAmount,
      }),
    });
    if (!verification.ok) {
      console.error("[bookings] Stripe verification failed:", pi.id, verification.error);
      return NextResponse.json({ error: verification.error }, { status: verification.status });
    }

    // Reuse protection: one PaymentIntent pays for one booking. Residual race: two
    // concurrent requests carrying the same intent can both pass this check before
    // either inserts — only a unique constraint on Booking.stripePaymentIntentId can
    // close that fully (schema follow-up, intentionally not part of this change).
    const existing = await prisma.booking.findFirst({
      where: { stripePaymentIntentId: pi.id },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ error: "This payment has already been used for a booking." }, { status: 409 });
    }

    stripePaymentIntentId = pi.id;
  }

  // ── Save booking ──────────────────────────────────────────────────────────
  // Only a verified Stripe payment is auto-confirmed.
  const isStripeConfirmed = isStripe && stripePaymentIntentId !== null;

  const booking = await prisma.booking.create({
    data: {
      propertyId: Number(propertyId),
      guestName,
      guestEmail,
      guestPhone: guestPhoneE164,
      checkIn:   checkInDate,
      checkOut:  checkOutDate,
      guests:    guestCount,
      totalPrice: computedTotal,
      nightlyTotal: serverNightlyTotal,
      extraGuestFee: extraGuestFee > 0 ? extraGuestFee : null,
      stripeFee:  stripeFee > 0 ? stripeFee : null,
      discountCode: discountCode || null,
      discountAmount: discountAmount > 0 ? discountAmount : null,
      paymentMethod: paymentMethod || null,
      stripePaymentIntentId,
      status:    isStripeConfirmed ? "confirmed" : "pending",
      notes:     notes || null,
    },
    include: { property: true },
  });

  // Increment discount code usage
  if (discountCode) {
    await prisma.discountCode.update({
      where: { code: discountCode },
      data: { usageCount: { increment: 1 } },
    });
  }

  // Shared inventory: if this property is in an active inventory group, block the same
  // nights on every sibling listing. No-op for a property that is ungrouped or whose
  // group is inactive. Best-effort — a reconciliation failure must not fail a paid
  // booking, and the next sync or status change converges.
  try {
    await reconcileBookingDerivedBlocks(booking.id);
  } catch (err) {
    console.error("[bookings] inventory-group propagation failed:", err);
  }

  // Promote any pre-booking Contact Us inquiries from this email into the new
  // booking's GuestMessage thread. Idempotent and best-effort — failure does not
  // block booking creation.
  try {
    await promoteContactMessagesForEmail({
      bookingId: booking.id,
      email: guestEmail,
      bookingCreatedAt: booking.createdAt,
    });
  } catch (err) {
    console.error("[bookings] promoteContactMessagesForEmail failed:", err);
  }

  // Guest Messaging: Stripe bookings are created already-confirmed, so they never pass
  // through the admin PUT route's pending→confirmed transition that normally materializes
  // auto QuickReplies. Do it here instead (mirrors src/app/api/admin/bookings/[id]/route.ts).
  if (isStripeConfirmed) {
    try {
      await materializeScheduledMessagesForBooking(booking.id);
      await flushDueScheduledMessages({ bookingId: booking.id });
    } catch (err) {
      console.error("[bookings] Scheduled message materialize/flush failed:", err);
    }
  }

  const nights = dailyRates.length;
  const fmtDate = (d: string) => formatStayDate(d, { weekday: "short", year: "numeric", month: "long", day: "numeric" });

  // Build itemized nightly rates HTML table rows
  const hasVariedRates = dailyRates.some((r) => r.rate !== dailyRates[0].rate);
  const nightlyBreakdownRows = hasVariedRates
    ? dailyRates
        .map((r) => `<tr><td style="padding:4px 0;color:#888;font-size:13px">${formatStayDate(r.date,{weekday:"short",month:"short",day:"numeric"})}</td><td style="text-align:right;font-size:13px">₱${r.rate.toLocaleString()}</td></tr>`)
        .join("")
    : `<tr><td style="padding:4px 0;color:#888;font-size:13px">${nights} night${nights!==1?"s":""} × ₱${dailyRates[0].rate.toLocaleString()}</td><td style="text-align:right;font-size:13px">₱${serverNightlyTotal.toLocaleString()}</td></tr>`;

  const extraGuests = Math.max(0, guestCount - property.includedGuests);
  const extraGuestFeeRow = extraGuestFee > 0
    ? `<tr><td style="padding:4px 0;color:#888;font-size:13px">Extra guest fee (${extraGuests} guest${extraGuests !== 1 ? "s" : ""} × ₱${Number(property.extraGuestFeePerNight).toLocaleString()} × ${nights} night${nights !== 1 ? "s" : ""})</td><td style="text-align:right;font-size:13px">₱${extraGuestFee.toLocaleString()}</td></tr>`
    : "";

  const discountRow = discountAmount > 0
    ? `<tr><td style="padding:4px 0;color:#2a7a2a;font-size:13px">Promo code (${discountCode})</td><td style="text-align:right;font-size:13px;color:#2a7a2a">−₱${discountAmount.toLocaleString()}</td></tr>`
    : "";

  const stripeFeeRow = stripeFee > 0
    ? `<tr><td style="padding:4px 0;color:#888;font-size:13px">Stripe transaction fee (${(STRIPE_FEE_RATE * 100).toFixed(0)}%)</td><td style="text-align:right;font-size:13px">₱${stripeFee.toLocaleString()}</td></tr>`
    : "";

  const priceBreakdownHtml = `
    <table style="width:100%;font-size:14px;border-collapse:collapse;margin-top:8px">
      ${nightlyBreakdownRows}
      ${extraGuestFeeRow}
      ${discountRow}
      ${stripeFeeRow}
      <tr style="border-top:1px solid #e5e5e5">
        <td style="padding:8px 0 4px;font-weight:bold">Total</td>
        <td style="text-align:right;font-weight:bold;color:#335238">₱${computedTotal.toLocaleString()}</td>
      </tr>
    </table>`;

  // ── Emails ─────────────────────────────────────────────────────────────────
  const pmLabel = paymentMethod === "gcash" ? "GCash" : paymentMethod === "bpi" ? "BPI Bank" : "Stripe";

  if (isStripeConfirmed) {
    // ── Stripe auto-confirmed: send confirmation emails (same as admin confirm flow) ──

    // Confirmation email to guest
    try {
      const mailer = createMailer();
      await mailer.sendMail({
        from:    FROM_ADDRESS,
        to:      guestEmail,
        subject: `Booking Confirmed – ${booking.property.name}`,
        html: `
          <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#335238">
            <div style="background:#335238;padding:24px 32px;border-radius:8px 8px 0 0;text-align:center">
              <h1 style="color:#fff;margin:0;font-size:22px">Your Stay is Confirmed! 🎉</h1>
              <p style="color:rgba(255,255,255,.75);margin:8px 0 0;font-size:14px">We look forward to welcoming you</p>
            </div>
            <div style="background:#fff;border:1px solid #e5e5e5;border-top:none;padding:28px 32px;border-radius:0 0 8px 8px">
              <p style="font-size:15px;margin-bottom:20px">Hi <strong>${guestName}</strong>,</p>
              <p style="font-size:14px;color:#444;line-height:1.7;margin-bottom:24px">
                Great news! Your card payment went through and your booking at <strong>${booking.property.name}</strong> is officially confirmed.
              </p>
              <div style="background:#FFF8FA;border-radius:8px;padding:20px 24px;margin-bottom:24px">
                <h2 style="margin:0 0 16px;font-size:15px;color:#335238">Booking Summary</h2>
                <table style="width:100%;font-size:14px;border-collapse:collapse">
                  <tr><td style="padding:5px 0;color:#666;width:130px">Property</td><td style="font-weight:bold">${booking.property.name}</td></tr>
                  <tr><td style="padding:5px 0;color:#666">Location</td><td>${booking.property.location}</td></tr>
                  <tr><td style="padding:5px 0;color:#666">Check-in</td><td><strong>${fmtDate(checkIn)}</strong></td></tr>
                  <tr><td style="padding:5px 0;color:#666">Check-out</td><td><strong>${fmtDate(checkOut)}</strong></td></tr>
                  <tr><td style="padding:5px 0;color:#666">Duration</td><td>${nights} night${nights !== 1 ? "s" : ""}</td></tr>
                  <tr><td style="padding:5px 0;color:#666">Guests</td><td>${guests}</td></tr>
                </table>
                <div style="margin-top:12px;padding-top:12px;border-top:1px solid #f0e8f0">
                  <strong style="font-size:13px;color:#335238">Price Breakdown</strong>
                  ${priceBreakdownHtml}
                </div>
              </div>
              <p style="font-size:14px;color:#444;line-height:1.7;margin-bottom:20px">
                If you have any questions before your stay, don't hesitate to reach out to us:
              </p>
              <div style="font-size:14px;color:#444">
                📧 <a href="mailto:customerservice@haveninlipa.com" style="color:#335238">customerservice@haveninlipa.com</a><br/>
                📞 +639066554415
              </div>
              <div style="margin-top:28px;padding-top:20px;border-top:1px solid #e5e5e5;font-size:12px;color:#999;text-align:center">
                HavenInLipa — Stay in Style, Live in Comfort.<br/>
                Lipa City, Batangas, Philippines
              </div>
            </div>
          </div>
        `,
      });
    } catch (err) {
      console.error("Guest confirmation email failed:", err);
    }

    // Confirmation notification to admin
    try {
      const mailer = createMailer();
      await mailer.sendMail({
        from:    FROM_ADDRESS,
        to:      "customerservice@haveninlipa.com",
        replyTo: guestEmail,
        subject: `Booking Confirmed – ${booking.property.name}`,
        html: `
          <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#335238">
            <div style="background:#335238;padding:24px 32px;border-radius:8px 8px 0 0">
              <h1 style="color:#fff;margin:0;font-size:20px">Booking Confirmed</h1>
              <p style="color:rgba(255,255,255,.7);margin:6px 0 0;font-size:13px">Card payment succeeded — guest has been notified</p>
            </div>
            <div style="background:#fff;border:1px solid #e5e5e5;border-top:none;padding:28px 32px;border-radius:0 0 8px 8px">
              <table style="width:100%;font-size:14px;border-collapse:collapse">
                <tr><td style="padding:7px 0;color:#666;width:140px">Property</td><td style="font-weight:bold">${booking.property.name}</td></tr>
                <tr><td style="padding:7px 0;color:#666">Guest</td><td>${guestName}</td></tr>
                <tr><td style="padding:7px 0;color:#666">Email</td><td><a href="mailto:${guestEmail}">${guestEmail}</a></td></tr>
                <tr><td style="padding:7px 0;color:#666">Phone</td><td>${guestPhone}</td></tr>
                <tr><td style="padding:7px 0;color:#666">Check-in</td><td>${fmtDate(checkIn)}</td></tr>
                <tr><td style="padding:7px 0;color:#666">Check-out</td><td>${fmtDate(checkOut)}</td></tr>
                <tr><td style="padding:7px 0;color:#666">Duration</td><td>${nights} night${nights !== 1 ? "s" : ""}</td></tr>
                <tr><td style="padding:7px 0;color:#666">Guests</td><td>${guests}</td></tr>
                <tr><td style="padding:7px 0;color:#666">Payment via</td><td style="font-weight:bold">Credit/Debit Card</td></tr>
                ${notes ? `<tr><td style="padding:7px 0;color:#666;vertical-align:top">Notes</td><td>${notes}</td></tr>` : ""}
              </table>
              <div style="margin-top:16px;padding:14px;background:#F8FAF8;border-radius:6px;border:1px solid #e5e5e5">
                <strong style="font-size:13px">Price Breakdown</strong>
                ${priceBreakdownHtml}
              </div>
            </div>
          </div>
        `,
      });
    } catch (err) {
      console.error("Admin confirmation email failed:", err);
    }
  } else {
    // ── GCash / BPI: send pending acknowledgment emails (existing flow) ──

    // Email to admin
    try {
      const mailer = createMailer();
      await mailer.sendMail({
        from:    FROM_ADDRESS,
        to:      "customerservice@haveninlipa.com",
        replyTo: guestEmail,
        subject: `🏠 New Booking Request – ${booking.property.name}`,
        html: `
          <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#335238">
            <div style="background:#335238;padding:24px 32px;border-radius:8px 8px 0 0">
              <h1 style="color:#fff;margin:0;font-size:20px">New Booking Request</h1>
              <p style="color:rgba(255,255,255,.7);margin:6px 0 0;font-size:13px">Awaiting payment verification</p>
            </div>
            <div style="background:#fff;border:1px solid #e5e5e5;border-top:none;padding:28px 32px;border-radius:0 0 8px 8px">
              <table style="width:100%;font-size:14px;border-collapse:collapse">
                <tr><td style="padding:7px 0;color:#666;width:140px">Property</td><td style="font-weight:bold">${booking.property.name}</td></tr>
                <tr><td style="padding:7px 0;color:#666">Guest</td><td>${guestName}</td></tr>
                <tr><td style="padding:7px 0;color:#666">Email</td><td><a href="mailto:${guestEmail}">${guestEmail}</a></td></tr>
                <tr><td style="padding:7px 0;color:#666">Phone</td><td>${guestPhone}</td></tr>
                <tr><td style="padding:7px 0;color:#666">Check-in</td><td>${fmtDate(checkIn)}</td></tr>
                <tr><td style="padding:7px 0;color:#666">Check-out</td><td>${fmtDate(checkOut)}</td></tr>
                <tr><td style="padding:7px 0;color:#666">Duration</td><td>${nights} night${nights !== 1 ? "s" : ""}</td></tr>
                <tr><td style="padding:7px 0;color:#666">Guests</td><td>${guests}</td></tr>
                <tr><td style="padding:7px 0;color:#666">Payment via</td><td style="font-weight:bold">${pmLabel}</td></tr>
                ${notes ? `<tr><td style="padding:7px 0;color:#666;vertical-align:top">Notes</td><td>${notes}</td></tr>` : ""}
              </table>
              <div style="margin-top:16px;padding:14px;background:#F8FAF8;border-radius:6px;border:1px solid #e5e5e5">
                <strong style="font-size:13px">Price Breakdown</strong>
                ${priceBreakdownHtml}
              </div>
              <div style="margin-top:20px;padding:14px;background:#FFF0F3;border-left:3px solid #FF5371;border-radius:4px;font-size:13px;color:#666">
                Please verify the payment in your ${pmLabel} app and update the booking status to <strong>Confirmed</strong> in the admin panel.
              </div>
            </div>
          </div>
        `,
      });
    } catch (err) {
      console.error("Admin email failed:", err);
    }

    // Email to booker — acknowledgment
    try {
      const mailer = createMailer();
      await mailer.sendMail({
        from:    FROM_ADDRESS,
        to:      guestEmail,
        subject: `📋 Booking Request Received – ${booking.property.name}`,
        html: `
          <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#335238">
            <div style="background:#335238;padding:24px 32px;border-radius:8px 8px 0 0">
              <h1 style="color:#fff;margin:0;font-size:20px">We Received Your Booking Request!</h1>
              <p style="color:rgba(255,255,255,.7);margin:6px 0 0;font-size:13px">We'll verify your payment and confirm shortly</p>
            </div>
            <div style="background:#fff;border:1px solid #e5e5e5;border-top:none;padding:28px 32px;border-radius:0 0 8px 8px">
              <p style="font-size:15px;margin-bottom:20px">Hi <strong>${guestName}</strong>,</p>
              <p style="font-size:14px;color:#444;line-height:1.7;margin-bottom:24px">
                Thank you for your booking request at <strong>${booking.property.name}</strong>. We've received your payment submission and are currently verifying it. You'll receive a confirmation email once your booking is approved.
              </p>
              <div style="background:#FFF8FA;border-radius:8px;padding:20px 24px;margin-bottom:24px">
                <h2 style="margin:0 0 16px;font-size:15px;color:#335238">Booking Summary</h2>
                <table style="width:100%;font-size:14px;border-collapse:collapse">
                  <tr><td style="padding:5px 0;color:#666;width:130px">Property</td><td style="font-weight:bold">${booking.property.name}</td></tr>
                  <tr><td style="padding:5px 0;color:#666">Check-in</td><td><strong>${fmtDate(checkIn)}</strong></td></tr>
                  <tr><td style="padding:5px 0;color:#666">Check-out</td><td><strong>${fmtDate(checkOut)}</strong></td></tr>
                  <tr><td style="padding:5px 0;color:#666">Duration</td><td>${nights} night${nights !== 1 ? "s" : ""}</td></tr>
                  <tr><td style="padding:5px 0;color:#666">Guests</td><td>${guests}</td></tr>
                  <tr><td style="padding:5px 0;color:#666">Payment via</td><td style="font-weight:bold">${pmLabel}</td></tr>
                </table>
                <div style="margin-top:12px;padding-top:12px;border-top:1px solid #f0e8f0">
                  <strong style="font-size:13px;color:#335238">Price Breakdown</strong>
                  ${priceBreakdownHtml}
                </div>
              </div>
              <p style="font-size:14px;color:#444;line-height:1.7;margin-bottom:20px">
                If you have any questions, feel free to reach out to us:
              </p>
              <div style="font-size:14px;color:#444">
                📧 <a href="mailto:customerservice@haveninlipa.com" style="color:#335238">customerservice@haveninlipa.com</a><br/>
                📞 +639066554415
              </div>
              <div style="margin-top:28px;padding-top:20px;border-top:1px solid #e5e5e5;font-size:12px;color:#999;text-align:center">
                HavenInLipa — Stay in Style, Live in Comfort.<br/>
                Lipa City, Batangas, Philippines
              </div>
            </div>
          </div>
        `,
      });
    } catch (err) {
      console.error("Booker acknowledgment email failed:", err);
    }
  }

  await logAction({
    actor: guestName,
    actorRole: "guest",
    action: `Submitted booking request for "${booking.property.name}"`,
    module: "booking_flow",
    target: `booking-${booking.id}`,
    ipAddress: getIpFromRequest(req),
    metadata: { bookingId: booking.id, propertyId, checkIn, checkOut, paymentMethod },
  });

  // total/propertySlug are the server-authoritative values the guest was actually
  // charged — the client uses them for the GA4 booking_confirmed conversion.
  return NextResponse.json({
    success: true,
    bookingId: booking.id,
    total: computedTotal,
    propertySlug: booking.property.slug,
  });
}
