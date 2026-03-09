import { prisma } from "@/lib/prisma";

// Airbnb requires DATE-only format (YYYYMMDD) for all-day blocking events
function toDateOnly(date: Date): string {
  return date.toISOString().split("T")[0].replace(/-/g, "");
}

// DTSTAMP must be a full datetime stamp
function toDtStamp(date: Date): string {
  return date.toISOString().replace(/[-:.]/g, "").slice(0, 15) + "Z";
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const property = await prisma.property.findUnique({
    where: { slug },
    include: {
      bookings: {
        where: { status: { in: ["confirmed", "pending"] } },
        select: { id: true, checkIn: true, checkOut: true },
      },
    },
  });

  if (!property) {
    return new Response("Calendar not found", { status: 404 });
  }

  const now = toDtStamp(new Date());

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CedCas Properties//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${property.name} - CedCas Properties`,
    "X-WR-TIMEZONE:Asia/Manila",
  ];

  for (const booking of property.bookings) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:booking-${booking.id}@cedcasproperties.com`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${toDateOnly(booking.checkIn)}`,
      `DTEND;VALUE=DATE:${toDateOnly(booking.checkOut)}`,
      "SUMMARY:Not available",
      "STATUS:CONFIRMED",
      "TRANSP:OPAQUE",
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");

  // iCal spec requires CRLF line endings
  const body = lines.join("\r\n") + "\r\n";

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${slug}.ics"`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
