import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

// Runs daily at 00:00 UTC = 08:00 PHT (Asia/Manila, UTC+8)
// Configured in vercel.json: { "schedule": "0 0 * * *" }
// Sends a check-in reminder to confirmed guests whose stay begins tomorrow.

export async function GET(req: Request) {
  // Verify cron secret so only Vercel (or authorized callers) can trigger this
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Compute "tomorrow" window in UTC (check-in dates are stored as UTC midnight)
  const now = new Date();
  const tomorrowStart = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0, 0
  ));
  const tomorrowEnd = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 2,
    0, 0, 0, 0
  ));

  const bookings = await prisma.booking.findMany({
    where: {
      status: "confirmed",
      checkIn: {
        gte: tomorrowStart,
        lt:  tomorrowEnd,
      },
    },
    include: { property: true },
  });

  const results: Array<{ bookingId: number; email: string; sent: boolean; error?: string }> = [];

  for (const booking of bookings) {
    const fmtDate = (d: Date) =>
      d.toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const nights = Math.ceil(
      (booking.checkOut.getTime() - booking.checkIn.getTime()) / 86400000
    );

    try {
      await sendEmail({
        to:      booking.guestEmail,
        subject: `🌅 Your Check-in is Tomorrow – ${booking.property.name}`,
        html: `
          <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#335238">
            <div style="background:#335238;padding:24px 32px;border-radius:8px 8px 0 0;text-align:center">
              <h1 style="color:#fff;margin:0;font-size:22px">Your Check-in is Tomorrow! 🌅</h1>
              <p style="color:rgba(255,255,255,.75);margin:8px 0 0;font-size:14px">We're looking forward to welcoming you</p>
            </div>
            <div style="background:#fff;border:1px solid #e5e5e5;border-top:none;padding:28px 32px;border-radius:0 0 8px 8px">
              <p style="font-size:15px;margin-bottom:20px">Hi <strong>${booking.guestName}</strong>,</p>
              <p style="font-size:14px;color:#444;line-height:1.7;margin-bottom:24px">
                This is a friendly reminder that your stay at <strong>${booking.property.name}</strong> begins tomorrow.
                We're excited to have you and want to make sure everything is ready for a smooth check-in.
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
              </div>

              <p style="font-size:14px;color:#444;line-height:1.7;margin-bottom:8px">
                If you have any last-minute questions or need assistance before your arrival, please don't hesitate to reach out — we're happy to help:
              </p>
              <div style="font-size:14px;color:#444;margin-bottom:24px">
                📧 <a href="mailto:customerservice@haveninlipa.com" style="color:#335238">customerservice@haveninlipa.com</a><br/>
                📞 +639066554415
              </div>

              <p style="font-size:14px;color:#444;line-height:1.7">
                We look forward to seeing you tomorrow. Have a safe journey to Lipa City! 🌿
              </p>

              <div style="margin-top:28px;padding-top:20px;border-top:1px solid #e5e5e5;font-size:12px;color:#999;text-align:center">
                HavenInLipa — Stay in Style, Live in Comfort.<br/>
                Lipa City, Batangas, Philippines
              </div>
            </div>
          </div>
        `,
      });
      results.push({ bookingId: booking.id, email: booking.guestEmail, sent: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Reminder email failed for booking ${booking.id}:`, message);
      results.push({ bookingId: booking.id, email: booking.guestEmail, sent: false, error: message });
    }
  }

  console.log(`Check-in reminder cron: processed ${bookings.length} booking(s)`, results);
  return NextResponse.json({ processed: bookings.length, results });
}
