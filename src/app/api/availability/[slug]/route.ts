import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toUtcMidnight, utcDateKey } from "@/lib/dates";
import { getPropertyConflicts, getUnavailableDateRanges, formatConflictRange } from "@/lib/availability";

// GET /api/availability/[slug]?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD
//   → { available: boolean, conflicts: string[] }
// GET /api/availability/[slug]  (no dates)
//   → { blockedRanges: [{ start, end }] }  — every unavailable range from today
//
// PUBLIC route. The response shape is unchanged from the original implementation so
// BookingCard and BookingForm need no edits, and it deliberately exposes only opaque date
// ranges — never guest names or block reasons. Admin detail lives in /api/admin/calendar.
//
// Conflict rules now come from src/lib/availability.ts, which unions HIL bookings, manual
// blocks, shared-inventory sibling blocks and persisted external calendar events. This
// route previously carried its own copy of the blocking-status list and its own inline
// iCal parser, and re-fetched the external feed on every keystroke; the feed is now
// persisted and refreshed on demand when stale.

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const checkInStr = searchParams.get("checkIn");
  const checkOutStr = searchParams.get("checkOut");
  const excludeIdParam = searchParams.get("excludeBookingId"); // skip when re-checking own booking

  const property = await prisma.property.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const excludeBookingId = excludeIdParam && Number.isInteger(Number(excludeIdParam)) ? Number(excludeIdParam) : null;

  // ── Specific dates: is this stay bookable? ────────────────────────────────
  if (checkInStr && checkOutStr) {
    const checkIn = toUtcMidnight(checkInStr);
    const checkOut = toUtcMidnight(checkOutStr);

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      return NextResponse.json({ error: "Invalid dates" }, { status: 400 });
    }

    const conflicts = await getPropertyConflicts({
      propertyId: property.id,
      start: checkIn,
      end: checkOut,
      excludeBookingId,
    });

    return NextResponse.json({
      available: conflicts.length === 0,
      conflicts: conflicts.map(formatConflictRange),
    });
  }

  // ── No dates: every blocked range from today, for the date picker ─────────
  const ranges = await getUnavailableDateRanges({ propertyId: property.id });

  return NextResponse.json({
    blockedRanges: ranges
      .filter((r) => !(excludeBookingId !== null && r.bookingId === excludeBookingId))
      .map((r) => ({ start: utcDateKey(r.start), end: utcDateKey(r.end) })),
  });
}
