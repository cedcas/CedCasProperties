import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Returns one row per booking that has at least one GuestMessage,
// with the latest message preview. Supports ?q= simple search over
// guestName, guestEmail, property.name, subject, body.

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  // Grab all outbound messages + their booking + property (scales fine at expected volume).
  const messages = await prisma.guestMessage.findMany({
    orderBy: { sentAt: "desc" },
    include: {
      booking: { include: { property: { select: { id: true, name: true, type: true, featuredImage: true } } } },
    },
  });

  // Dedupe to first-seen (= latest) per bookingId
  const byBooking = new Map<number, typeof messages[number]>();
  for (const m of messages) {
    if (!byBooking.has(m.bookingId)) byBooking.set(m.bookingId, m);
  }

  let threads = Array.from(byBooking.values()).map((m) => ({
    bookingId: m.bookingId,
    lastSentAt: m.sentAt,
    lastSubject: m.subject,
    lastPreview: m.body.slice(0, 140),
    guestName: m.booking.guestName,
    guestEmail: m.booking.guestEmail,
    status: m.booking.status,
    checkIn: m.booking.checkIn,
    checkOut: m.booking.checkOut,
    property: m.booking.property,
  }));

  if (q) {
    const needle = q.toLowerCase();
    threads = threads.filter((t) =>
      t.guestName.toLowerCase().includes(needle) ||
      t.guestEmail.toLowerCase().includes(needle) ||
      t.property.name.toLowerCase().includes(needle) ||
      t.lastSubject.toLowerCase().includes(needle) ||
      t.lastPreview.toLowerCase().includes(needle),
    );
  }

  return NextResponse.json(threads);
}
