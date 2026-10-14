import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toUtcMidnight, utcDateKey } from "@/lib/dates";
import { getPropertyConflicts, getUnavailableDateRanges, formatConflictRange } from "@/lib/availability";
import {
  assertBookingPolicy,
  assertInstantBooking,
  earliestCheckIn,
  normalizeBookingPolicy,
  normalizeInstantBookingMode,
} from "@/lib/booking-policy";

// GET /api/availability/[slug]?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD
//   → { available: boolean, conflicts: string[], earliestCheckIn }
//     plus { reason: "too_soon", message } when the check-in is earlier than the listing's
//     advance notice allows (src/lib/booking-policy.ts) — `available` is false then too.
// GET /api/availability/[slug]  (no dates)
//   → { blockedRanges: [{ start, end }], earliestCheckIn }  — every unavailable range from today
// GET /api/availability/[slug]?earliest=1
//   → { earliestCheckIn }  — just the date pickers' `min`, without reading any calendar
//
// PUBLIC route. Fields are only ever added to the original response shape, and it
// deliberately exposes only opaque date ranges — never guest names or block reasons. Admin
// detail lives in /api/admin/calendar.
//
// Every response also carries `requiresApproval`: true when the listing has Instant Booking
// off, so a booking there is a request the Owner approves before any payment.
//
// `earliestCheckIn` depends on the time of day, which is why it is served here and never
// baked into a cached page (DEC-005). The advance-notice rule is a guest rule: a request
// carrying `excludeBookingId` is a re-check of an existing booking and skips it.
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
    select: { id: true, advanceNoticeDays: true, sameDayCutoffMinutes: true, instantBookingMode: true },
  });

  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const excludeBookingId = excludeIdParam && Number.isInteger(Number(excludeIdParam)) ? Number(excludeIdParam) : null;

  const policy = normalizeBookingPolicy(property);
  const now = new Date();
  const earliest = utcDateKey(earliestCheckIn(now, policy));
  // True when this listing takes requests the Owner approves, not instant bookings.
  const requiresApproval = !assertInstantBooking({ mode: normalizeInstantBookingMode(property.instantBookingMode) }).ok;

  if (searchParams.get("earliest") === "1") {
    return NextResponse.json({ earliestCheckIn: earliest, requiresApproval });
  }

  // ── Specific dates: is this stay bookable? ────────────────────────────────
  if (checkInStr && checkOutStr) {
    const checkIn = toUtcMidnight(checkInStr);
    const checkOut = toUtcMidnight(checkOutStr);

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      return NextResponse.json({ error: "Invalid dates" }, { status: 400 });
    }

    if (excludeBookingId === null) {
      const outcome = assertBookingPolicy({ checkIn, policy, now });
      if (!outcome.ok) {
        return NextResponse.json({
          available: false,
          conflicts: [],
          reason: outcome.code,
          message: outcome.message,
          earliestCheckIn: earliest,
          requiresApproval,
        });
      }
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
      earliestCheckIn: earliest,
      requiresApproval,
    });
  }

  // ── No dates: every blocked range from today, for the date picker ─────────
  const ranges = await getUnavailableDateRanges({ propertyId: property.id });

  return NextResponse.json({
    blockedRanges: ranges
      .filter((r) => !(excludeBookingId !== null && r.bookingId === excludeBookingId))
      .map((r) => ({ start: utcDateKey(r.start), end: utcDateKey(r.end) })),
    earliestCheckIn: earliest,
    requiresApproval,
  });
}
