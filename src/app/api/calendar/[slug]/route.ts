import { prisma } from "@/lib/prisma";
import { buildVCalendar, type IcsExportEvent } from "@/lib/ical";
import { bookingUid, manualBlockUid } from "@/lib/calendar-uids";
import { BLOCKING_BOOKING_STATUSES, humanizeReason } from "@/lib/availability";
import { todayUtc } from "@/lib/dates";

// GET /api/calendar/[slug].ics — the outbound feed external calendars subscribe to.
//
// Exports, for this property:
//   • HIL bookings in a blocking status                (UID: booking-{id}@…)
//   • active manual blocks with exportToIcal           (UID: manual-block-{id}@…)
//   • active shared-inventory sibling blocks           (UID: inventory-block-…@…)
//
// Deliberately does NOT export ExternalCalendarEvent rows. Those were imported FROM a
// channel feed; echoing them back through the same property's feed would create a loop
// where a channel re-imports its own reservations. A sibling block derived from an
// imported event IS exported — but on the OTHER properties in the group, which is the
// whole point of shared inventory.
//
// UIDs are deterministic (src/lib/calendar-uids.ts) and DTSTAMP now comes from each
// record's updatedAt rather than the current time, so a feed fetched twice with no
// underlying change is byte-for-byte identical.

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const rawSlug = (await params).slug;
  // Support URLs ending in .ics (e.g. /api/calendar/the-lipa-retreat.ics)
  const slug = rawSlug.replace(/\.ics$/i, "");

  const property = await prisma.property.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      bookings: {
        where: { status: { in: [...BLOCKING_BOOKING_STATUSES] } },
        select: { id: true, checkIn: true, checkOut: true, updatedAt: true },
      },
    },
  });

  if (!property) {
    return new Response("Calendar not found", { status: 404 });
  }

  // Blocks are bounded to current-and-future: a past block is inert, and there is no value
  // in growing the feed with historical maintenance windows.
  const blocks = await prisma.availabilityBlock.findMany({
    where: {
      propertyId: property.id,
      status: "active",
      exportToIcal: true,
      affectsAvailability: true,
      endDate: { gt: todayUtc() },
    },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      reason: true,
      isSystemGenerated: true,
      externalUid: true,
      updatedAt: true,
    },
    orderBy: { startDate: "asc" },
  });

  const events: IcsExportEvent[] = [
    ...property.bookings.map((booking) => ({
      uid: bookingUid(booking.id),
      start: booking.checkIn,
      end: booking.checkOut,
      summary: "Not available",
      stamp: booking.updatedAt,
    })),
    ...blocks.map((block) => ({
      // Derived blocks already carry their deterministic UID; manual blocks fall back to
      // the id-derived form in case externalUid was never stamped.
      uid: block.externalUid ?? manualBlockUid(block.id),
      start: block.startDate,
      end: block.endDate,
      // Kept generic for guest-facing channels — "Not available" rather than the internal
      // reason. System-generated blocks say so, which helps when debugging a group.
      summary: block.isSystemGenerated ? "Not available" : `Not available (${humanizeReason(block.reason)})`,
      stamp: block.updatedAt,
    })),
  ];

  const body = buildVCalendar({ calendarName: `${property.name} - HavenInLipa`, events });

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${slug}.ics"`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
