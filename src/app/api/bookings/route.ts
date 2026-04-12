import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createMailer, FROM_ADDRESS } from "@/lib/email";
import { getDailyRates, sumDailyRates, calcStripeFee, STRIPE_FEE_RATE } from "@/lib/pricing";
import { logAction, getIpFromRequest } from "@/lib/log";

export async function POST(req: NextRequest) {
  const {
    propertyId,
    guestName,
    guestEmail,
    guestPhone,
    checkIn,
    checkOut,
    guests,
    totalPrice,
    nightlyTotal: clientNightlyTotal,
    paymentMethod,
    stripePaymentIntentId,
    discountCode: rawDiscountCode,
    discountAmount: clientDiscountAmount,
    notes,
  } = await req.json();

  if (!propertyId || !guestName || !guestEmail || !guestPhone || !checkIn || !checkOut) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const checkInDate  = new Date(checkIn);
  const checkOutDate = new Date(checkOut);

  if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime()) || checkOutDate <= checkInDate) {
    return NextResponse.json({ error: "Invalid check-in / check-out dates" }, { status: 400 });
  }

  // ── Property lookup ───────────────────────────────────────────────────────
  const property = await prisma.property.findUnique({
    where: { id: Number(propertyId) },
    select: {
      name: true,
      pricePerNight: true,
      airbnbIcsUrl: true,
      bookings: {
        where: { status: { in: ["confirmed", "pending"] } },
        select: { checkIn: true, checkOut: true },
      },
    },
  });

  if (!property) return NextResponse.json({ error: "Property not found" }, { status: 404 });

  // ── Availability check: DB bookings ──────────────────────────────────────
  const overlaps = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) =>
    aStart < bEnd && aEnd > bStart;

  for (const b of property.bookings) {
    if (overlaps(checkInDate, checkOutDate, b.checkIn, b.checkOut)) {
      return NextResponse.json({ error: "Those dates are already booked. Please choose different dates." }, { status: 409 });
    }
  }

  // ── Availability check: Airbnb iCal ──────────────────────────────────────
  if (property.airbnbIcsUrl) {
    try {
      const icsRes = await fetch(property.airbnbIcsUrl, {
        headers: { "User-Agent": "HavenInLipa/1.0" },
        signal: AbortSignal.timeout(5000),
      });
      if (icsRes.ok) {
        const icsText = await icsRes.text();
        const lines = icsText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
        let inEvent = false, evStart: Date | null = null, evEnd: Date | null = null;
        const parseD = (s: string): Date | null => {
          const c = s.trim();
          if (/^\d{8}$/.test(c)) return new Date(`${c.slice(0,4)}-${c.slice(4,6)}-${c.slice(6,8)}T00:00:00Z`);
          if (/^\d{8}T\d{6}/.test(c)) return new Date(`${c.slice(0,4)}-${c.slice(4,6)}-${c.slice(6,8)}T${c.slice(9,11)}:${c.slice(11,13)}:${c.slice(13,15)}${c.endsWith("Z")?"Z":""}`);
          return null;
        };
        for (const raw of lines) {
          const line = raw.trim();
          if (line === "BEGIN:VEVENT")  { inEvent = true; evStart = null; evEnd = null; }
          else if (line === "END:VEVENT") {
            if (evStart && evEnd && overlaps(checkInDate, checkOutDate, evStart, evEnd)) {
              return NextResponse.json({ error: "Those dates are not available (blocked on Airbnb). Please choose different dates." }, { status: 409 });
            }
            inEvent = false;
          } else if (inEvent) {
            if (/^DTSTART[;:]/.test(line)) evStart = parseD(line.split(":").slice(1).join(":"));
            else if (/^DTEND[;:]/.test(line)) evEnd = parseD(line.split(":").slice(1).join(":"));
          }
        }
      }
    } catch {
      console.warn("Airbnb iCal fetch failed during booking; skipping Airbnb check");
    }
  }

  // ── Discount code validation ──────────────────────────────────────────────
  let discountCode: string | null = null;
  let discountAmount: number = 0;

  if (rawDiscountCode) {
    const codeUpper = rawDiscountCode.trim().toUpperCase();
    const discount = await prisma.discountCode.findUnique({
      where: { code: codeUpper },
    });

    if (discount && discount.isActive) {
      if (discount.maxUses === null || discount.usageCount < discount.maxUses) {
        const nightlyBase = clientNightlyTotal ?? parseFloat(totalPrice);
        if (discount.type === "percentage") {
          discountAmount = Math.round(nightlyBase * (Number(discount.value) / 100) * 100) / 100;
        } else {
          discountAmount = Math.min(Number(discount.value), nightlyBase);
        }
        discountCode = codeUpper;
      }
    }
  }

  // ── Compute server-side pricing ──────────────────────────────────────────
  const dailyRates = await getDailyRates(
    Number(propertyId),
    checkInDate,
    checkOutDate,
    Number(property.pricePerNight)
  );
  const serverNightlyTotal = sumDailyRates(dailyRates);
  const stripeFee = paymentMethod === "stripe" ? calcStripeFee(serverNightlyTotal - discountAmount) : 0;
  const computedTotal = serverNightlyTotal - discountAmount + stripeFee;

  // ── Save booking ──────────────────────────────────────────────────────────
  // Stripe payments with a successful PaymentIntent are auto-confirmed
  const isStripeConfirmed = paymentMethod === "stripe" && stripePaymentIntentId;

  const booking = await prisma.booking.create({
    data: {
      propertyId: Number(propertyId),
      guestName,
      guestEmail,
      guestPhone,
      checkIn:   checkInDate,
      checkOut:  checkOutDate,
      guests:    Number(guests) || 1,
      totalPrice: computedTotal,
      nightlyTotal: serverNightlyTotal,
      stripeFee:  stripeFee > 0 ? stripeFee : null,
      discountCode: discountCode || null,
      discountAmount: discountAmount > 0 ? discountAmount : null,
      paymentMethod: paymentMethod || null,
      stripePaymentIntentId: stripePaymentIntentId || null,
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

  const nights = dailyRates.length;
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-PH", { weekday: "short", year: "numeric", month: "long", day: "numeric" });

  // Build itemized nightly rates HTML table rows
  const hasVariedRates = dailyRates.some((r) => r.rate !== dailyRates[0].rate);
  const nightlyBreakdownRows = hasVariedRates
    ? dailyRates
        .map((r) => `<tr><td style="padding:4px 0;color:#888;font-size:13px">${new Date(r.date).toLocaleDateString("en-PH",{weekday:"short",month:"short",day:"numeric"})}</td><td style="text-align:right;font-size:13px">₱${r.rate.toLocaleString()}</td></tr>`)
        .join("")
    : `<tr><td style="padding:4px 0;color:#888;font-size:13px">${nights} night${nights!==1?"s":""} × ₱${dailyRates[0].rate.toLocaleString()}</td><td style="text-align:right;font-size:13px">₱${serverNightlyTotal.toLocaleString()}</td></tr>`;

  const discountRow = discountAmount > 0
    ? `<tr><td style="padding:4px 0;color:#2a7a2a;font-size:13px">Promo code (${discountCode})</td><td style="text-align:right;font-size:13px;color:#2a7a2a">−₱${discountAmount.toLocaleString()}</td></tr>`
    : "";

  const stripeFeeRow = stripeFee > 0
    ? `<tr><td style="padding:4px 0;color:#888;font-size:13px">Stripe transaction fee (${(STRIPE_FEE_RATE * 100).toFixed(0)}%)</td><td style="text-align:right;font-size:13px">₱${stripeFee.toLocaleString()}</td></tr>`
    : "";

  const priceBreakdownHtml = `
    <table style="width:100%;font-size:14px;border-collapse:collapse;margin-top:8px">
      ${nightlyBreakdownRows}
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
                <tr><td style="padding:7px 0;color:#666">Payment via</td><td style="font-weight:bold">Stripe (Card)</td></tr>
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

  return NextResponse.json({ success: true, bookingId: booking.id });
}
