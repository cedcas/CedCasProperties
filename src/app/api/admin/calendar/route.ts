import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toUtcMidnight, utcDateKey, addUtcDays } from "@/lib/dates";
import { humanizeReason } from "@/lib/availability";
import { previewAffectedProperties } from "@/lib/inventory-groups";

// GET /api/admin/calendar?propertyId=1&from=YYYY-MM-DD&to=YYYY-MM-DD
//
// One payload for the whole calendar screen: bookings, imported external events, manual
// blocks and derived sibling blocks, plus the property's inventory group and feed health.
// Bundling the group in means the "this will also block…" preview needs no second request.
//
// Admin-only, and deliberately separate from the PUBLIC /api/availability/[slug] route —
// this one returns guest names and internal block reasons, which must never leak.

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const propertyIdParam = searchParams.get("propertyId");
  if (!propertyIdParam)
    return NextResponse.json({ error: "propertyId is required" }, { status: 400 });

  const propertyId = Number(propertyIdParam);
  if (!Number.isInteger(propertyId))
    return NextResponse.json({ error: "Invalid propertyId" }, { status: 400 });

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { id: true, name: true, slug: true, isActive: true, airbnbIcsUrl: true },
  });
  if (!property) return NextResponse.json({ error: "Property not found" }, { status: 404 });

  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const from = fromParam ? toUtcMidnight(fromParam) : toUtcMidnight(new Date());
  const to = toParam ? toUtcMidnight(toParam) : addUtcDays(from, 120);
  if (isNaN(from.getTime()) || isNaN(to.getTime()) || to <= from) {
    return NextResponse.json({ error: "Invalid date window" }, { status: 400 });
  }

  // Loose window bounds so a record straddling the edge is still returned — narrowing to
  // fully-contained ranges would hide exactly the conflicts that matter.
  const [bookings, blocks, externalEvents, syncState, group] = await Promise.all([
    prisma.booking.findMany({
      where: { propertyId, checkIn: { lt: to }, checkOut: { gt: from } },
      orderBy: { checkIn: "asc" },
      select: {
        id: true,
        guestName: true,
        guestEmail: true,
        checkIn: true,
        checkOut: true,
        guests: true,
        status: true,
        totalPrice: true,
      },
    }),
    prisma.availabilityBlock.findMany({
      where: { propertyId, startDate: { lt: to }, endDate: { gt: from } },
      orderBy: { startDate: "asc" },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        type: true,
        reason: true,
        internalNotes: true,
        scope: true,
        status: true,
        isSystemGenerated: true,
        affectsAvailability: true,
        exportToIcal: true,
        sourceBookingId: true,
        sourceExternalEventId: true,
        parentBlockId: true,
        sourcePropertyId: true,
        inventoryGroupId: true,
        cancelledAt: true,
        sourceProperty: { select: { id: true, name: true } },
      },
    }),
    prisma.externalCalendarEvent.findMany({
      where: { propertyId, startDate: { lt: to }, endDate: { gt: from } },
      orderBy: { startDate: "asc" },
      select: {
        id: true,
        externalUid: true,
        summary: true,
        startDate: true,
        endDate: true,
        status: true,
        lastSeenAt: true,
        removedAt: true,
      },
    }),
    prisma.externalCalendarSyncState.findUnique({
      where: { propertyId },
      select: {
        lastSyncedAt: true,
        lastAttemptAt: true,
        lastStatus: true,
        lastError: true,
        eventCount: true,
      },
    }),
    previewAffectedProperties(propertyId),
  ]);

  return NextResponse.json({
    property: { ...property, hasFeed: Boolean(property.airbnbIcsUrl?.trim()) },
    window: { from: utcDateKey(from), to: utcDateKey(to) },
    bookings: bookings.map((b) => ({
      ...b,
      totalPrice: Number(b.totalPrice),
      checkIn: utcDateKey(b.checkIn),
      checkOut: utcDateKey(b.checkOut),
    })),
    blocks: blocks.map((b) => ({
      ...b,
      startDate: utcDateKey(b.startDate),
      endDate: utcDateKey(b.endDate),
      reasonLabel: humanizeReason(b.reason),
    })),
    externalEvents: externalEvents.map((e) => ({
      ...e,
      startDate: utcDateKey(e.startDate),
      endDate: utcDateKey(e.endDate),
    })),
    syncState,
    inventoryGroup: group,
  });
}
