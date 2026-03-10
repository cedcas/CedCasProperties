import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  const { propertyId, guestName, guestEmail, guestPhone, checkIn, checkOut, guests, totalPrice, paymentMethod, notes } = await req.json();

  if (!propertyId || !guestName || !guestEmail || !guestPhone || !checkIn || !checkOut) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const checkInDate  = new Date(checkIn);
  const checkOutDate = new Date(checkOut);

  if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime()) || checkOutDate <= checkInDate) {
    return NextResponse.json({ error: "Invalid check-in / check-out dates" }, { status: 400 });
  }

  // ── Availability check: DB bookings ──────────────────────────────────────
  const property = await prisma.property.findUnique({
    where: { id: Number(propertyId) },
    select: {
      airbnbIcsUrl: true,
      bookings: {
        where: { status: { in: ["confirmed", "pending"] } },
        select: { checkIn: true, checkOut: true },
      },
    },
  });

  if (!property) return NextResponse.json({ error: "Property not found" }, { status: 404 });

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
        headers: { "User-Agent": "CedCasProperties/1.0" },
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
      // If Airbnb fetch fails, proceed — don't block the guest
      console.warn("Airbnb iCal fetch failed during booking; skipping Airbnb check");
    }
  }

  // Save booking
  const booking = await prisma.booking.create({
    data: {
      propertyId: Number(propertyId),
      guestName,
      guestEmail,
      guestPhone,
      checkIn:   new Date(checkIn),
      checkOut:  new Date(checkOut),
      guests:    Number(guests) || 1,
      totalPrice: parseFloat(totalPrice) || 0,
      paymentMethod: paymentMethod || null,
      status:    "pending",
      notes:     notes || null,
    },
    include: { property: true },
  });

  const nights = Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000);
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-PH", { weekday: "short", year: "numeric", month: "long", day: "numeric" });

  // Email to admin
  try {
    await resend.emails.send({
      from:    "CedCas Properties <noreply@cedcasproperties.com>",
      to:      "customerservice@cedcasproperties.com",
      replyTo: guestEmail,
      subject: `🏠 New Booking Request – ${booking.property.name}`,
      html: `
        <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#2C2C2C">
          <div style="background:#3B5323;padding:24px 32px;border-radius:8px 8px 0 0">
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
              <tr><td style="padding:7px 0;color:#666">Payment via</td><td style="font-weight:bold;text-transform:uppercase">${paymentMethod || "N/A"}</td></tr>
              <tr><td style="padding:7px 0;color:#666">Total</td><td style="font-weight:bold;font-size:16px;color:#3B5323">₱${Number(totalPrice).toLocaleString()}</td></tr>
              ${notes ? `<tr><td style="padding:7px 0;color:#666;vertical-align:top">Notes</td><td>${notes}</td></tr>` : ""}
            </table>
            <div style="margin-top:20px;padding:14px;background:#FFF8EC;border-left:3px solid #C4A862;border-radius:4px;font-size:13px;color:#666">
              Please verify the payment in your ${paymentMethod === "gcash" ? "GCash" : "BPI"} app and update the booking status to <strong>Confirmed</strong> in the admin panel.
            </div>
          </div>
        </div>
      `,
    });
  } catch (err) {
    console.error("Admin email failed:", err);
  }

  return NextResponse.json({ success: true, bookingId: booking.id });
}
