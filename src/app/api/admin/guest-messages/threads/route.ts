import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Returns one row per booking that has at least one GuestMessage, with the latest
// message preview. Supports ?q= search and ?page=&pageSize= pagination (default 10/page).
// Search applies before pagination (so admin can search across all threads, not just
// the current page).

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page")) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(req.nextUrl.searchParams.get("pageSize")) || DEFAULT_PAGE_SIZE));

  const messages = await prisma.guestMessage.findMany({
    orderBy: { sentAt: "desc" },
    include: {
      booking: { include: { property: { select: { id: true, name: true, type: true, featuredImage: true } } } },
    },
  });

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

  const total = threads.length;
  const paged = threads.slice(0, page * pageSize); // cumulative — supports "Load older" UX

  return NextResponse.json({
    threads: paged,
    total,
    page,
    pageSize,
    hasMore: paged.length < total,
  });
}
