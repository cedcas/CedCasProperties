import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createMailer, FROM_ADDRESS } from "@/lib/email";
import { STRIPE_FEE_RATE } from "@/lib/pricing";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { status } = await req.json();

  const booking = await prisma.booking.update({
    where: { id: Number(id) },
    data: { status },
    include: { property: true },
  });

  // Send confirmation email to guest when status moves to "confirmed"
  if (status === "confirmed") {
    const fmtDate = (d: Date) => d.toLocaleDateString("en-PH", { weekday: "short", year: "numeric", month: "long", day: "numeric" });
    const nights = Math.ceil((booking.checkOut.getTime() - booking.checkIn.getTime()) / 86400000);

    // Build itemized price breakdown from stored booking fields
    const nightlyTotal = Number(booking.nightlyTotal ?? booking.totalPrice);
    const discountAmount = Number(booking.discountAmount ?? 0);
    const stripeFee = Number(booking.stripeFee ?? 0);
    const totalPrice = Number(booking.totalPrice);

    const nightlyRow = `<tr><td style="padding:4px 0;color:#888;font-size:13px">${nights} night${nights !== 1 ? "s" : ""} × ₱${(nightlyTotal / nights).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td><td style="text-align:right;font-size:13px">₱${nightlyTotal.toLocaleString()}</td></tr>`;
    const discountRow = discountAmount > 0
      ? `<tr><td style="padding:4px 0;color:#2a7a2a;font-size:13px">Promo code (${booking.discountCode})</td><td style="text-align:right;font-size:13px;color:#2a7a2a">−₱${discountAmount.toLocaleString()}</td></tr>`
      : "";
    const stripeFeeRow = stripeFee > 0
      ? `<tr><td style="padding:4px 0;color:#888;font-size:13px">Stripe transaction fee (${(STRIPE_FEE_RATE * 100).toFixed(0)}%)</td><td style="text-align:right;font-size:13px">₱${stripeFee.toLocaleString()}</td></tr>`
      : "";
    const priceBreakdownHtml = `
      <table style="width:100%;font-size:14px;border-collapse:collapse;margin-top:8px">
        ${nightlyRow}
        ${discountRow}
        ${stripeFeeRow}
        <tr style="border-top:1px solid #e5e5e5">
          <td style="padding:8px 0 4px;font-weight:bold">Total</td>
          <td style="text-align:right;font-weight:bold;color:#335238">₱${totalPrice.toLocaleString()}</td>
        </tr>
      </table>`;

    try {
      const mailer = createMailer();
      await mailer.sendMail({
        from:    FROM_ADDRESS,
        to:      booking.guestEmail,
        subject: `Booking Confirmed – ${booking.property.name}`,
        html: `
          <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#335238">
            <div style="background:#335238;padding:24px 32px;border-radius:8px 8px 0 0;text-align:center">
              <h1 style="color:#fff;margin:0;font-size:22px">Your Stay is Confirmed! 🎉</h1>
              <p style="color:rgba(255,255,255,.75);margin:8px 0 0;font-size:14px">We look forward to welcoming you</p>
            </div>
            <div style="background:#fff;border:1px solid #e5e5e5;border-top:none;padding:28px 32px;border-radius:0 0 8px 8px">
              <p style="font-size:15px;margin-bottom:20px">Hi <strong>${booking.guestName}</strong>,</p>
              <p style="font-size:14px;color:#444;line-height:1.7;margin-bottom:24px">
                Great news! Your payment has been verified and your booking at <strong>${booking.property.name}</strong> is officially confirmed.
              </p>

              <div style="background:#FFF8FA;border-radius:8px;padding:20px 24px;margin-bottom:24px">
                <h2 style="margin:0 0 16px;font-size:15px;color:#335238">Booking Summary</h2>
                <table style="width:100%;font-size:14px;border-collapse:collapse">
                  <tr><td style="padding:5px 0;color:#666;width:130px">Property</td><td style="font-weight:bold">${booking.property.name}</td></tr>
                  <tr><td style="padding:5px 0;color:#666">Location</td><td>${booking.property.location}</td></tr>
                  <tr><td style="padding:5px 0;color:#666">Check-in</td><td><strong>${fmtDate(booking.checkIn)}</strong></td></tr>
                  <tr><td style="padding:5px 0;color:#666">Check-out</td><td><strong>${fmtDate(booking.checkOut)}</strong></td></tr>
                  <tr><td style="padding:5px 0;color:#666">Duration</td><td>${nights} night${nights !== 1 ? "s" : ""}</td></tr>
                  <tr><td style="padding:5px 0;color:#666">Guests</td><td>${booking.guests}</td></tr>
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
      console.error("Confirmation email failed:", err);
    }

    // Email to admin — confirmation summary
    try {
      const mailer = createMailer();
      await mailer.sendMail({
        from:    FROM_ADDRESS,
        to:      "customerservice@haveninlipa.com",
        subject: `Booking Confirmed – ${booking.property.name}`,
        html: `
          <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#335238">
            <div style="background:#335238;padding:24px 32px;border-radius:8px 8px 0 0">
              <h1 style="color:#fff;margin:0;font-size:20px">Booking Confirmed</h1>
              <p style="color:rgba(255,255,255,.7);margin:6px 0 0;font-size:13px">Payment verified — guest has been notified</p>
            </div>
            <div style="background:#fff;border:1px solid #e5e5e5;border-top:none;padding:28px 32px;border-radius:0 0 8px 8px">
              <table style="width:100%;font-size:14px;border-collapse:collapse">
                <tr><td style="padding:7px 0;color:#666;width:140px">Property</td><td style="font-weight:bold">${booking.property.name}</td></tr>
                <tr><td style="padding:7px 0;color:#666">Guest</td><td>${booking.guestName}</td></tr>
                <tr><td style="padding:7px 0;color:#666">Email</td><td><a href="mailto:${booking.guestEmail}">${booking.guestEmail}</a></td></tr>
                <tr><td style="padding:7px 0;color:#666">Phone</td><td>${booking.guestPhone}</td></tr>
                <tr><td style="padding:7px 0;color:#666">Check-in</td><td>${fmtDate(booking.checkIn)}</td></tr>
                <tr><td style="padding:7px 0;color:#666">Check-out</td><td>${fmtDate(booking.checkOut)}</td></tr>
                <tr><td style="padding:7px 0;color:#666">Duration</td><td>${nights} night${nights !== 1 ? "s" : ""}</td></tr>
                <tr><td style="padding:7px 0;color:#666">Guests</td><td>${booking.guests}</td></tr>
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
  }

  return NextResponse.json(booking);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.booking.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
