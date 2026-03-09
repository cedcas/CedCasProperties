import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function toIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const property = await prisma.property.findUnique({
    where: { slug },
    include: {
      bookings: {
        where: { status: { in: ["confirmed", "pending"] } },
        select: { id: true, checkIn: true, checkOut: true, guestName: true },
      },
    },
  });

  if (!property) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CedCas Properties//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${property.name} – CedCas Properties`,
    "X-WR-TIMEZONE:Asia/Manila",
  ];

  for (const booking of property.bookings) {
    const uid = `booking-${booking.id}@cedcasproperties.com`;
    const dtstart = toIcsDate(booking.checkIn);
    const dtend = toIcsDate(booking.checkOut);
    const now = toIcsDate(new Date());

    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      `DTSTART:${dtstart}`,
      `DTEND:${dtend}`,
      `SUMMARY:Not available`,
      `STATUS:CONFIRMED`,
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");

  return new Response(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${slug}.ics"`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
