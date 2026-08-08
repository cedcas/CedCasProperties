import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getIpFromRequest } from "@/lib/log";
import { toUtcMidnight, addUtcDays, utcDateKey, todayUtc } from "@/lib/dates";
import { manualBlockUid } from "@/lib/calendar-uids";
import { humanizeReason, isManualBlockReason } from "@/lib/availability";
import {
  MANUAL_BLOCK_TYPE,
  reconcileManualBlockDerivedBlocks,
  previewAffectedProperties,
} from "@/lib/inventory-groups";

// Manual availability blocks — maintenance, owner use, repairs and similar. Distinct from
// bookings (which carry a guest and money) and from imported channel events.
// Logged under the existing "bookings" module; no new AdminPermission column.

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const propertyIdParam = searchParams.get("propertyId");
  const includeCancelled = searchParams.get("includeCancelled") === "1";
  const includePast = searchParams.get("includePast") === "1";

  const where: Record<string, unknown> = {};
  if (propertyIdParam) {
    const propertyId = Number(propertyIdParam);
    if (!Number.isInteger(propertyId))
      return NextResponse.json({ error: "Invalid propertyId" }, { status: 400 });
    where.propertyId = propertyId;
  }
  if (!includeCancelled) where.status = "active";
  if (!includePast) where.endDate = { gt: todayUtc() };

  const blocks = await prisma.availabilityBlock.findMany({
    where,
    orderBy: [{ startDate: "asc" }, { id: "asc" }],
    select: {
      id: true,
      propertyId: true,
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
      externalUid: true,
      sourceBookingId: true,
      sourceExternalEventId: true,
      parentBlockId: true,
      sourcePropertyId: true,
      inventoryGroupId: true,
      createdAt: true,
      cancelledAt: true,
      property: { select: { id: true, name: true } },
      sourceProperty: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ blocks });
}

/**
 * Resolve the requested dates into a half-open [start, end) range.
 * A lone `startDate` (or an `endDate` equal to it) means a single night, matching the
 * "block a single date" requirement while keeping the check-out-exclusive convention.
 */
function resolveRange(
  body: Record<string, unknown>
): { start: Date; end: Date } | { error: string } {
  if (typeof body.startDate !== "string" || !body.startDate.trim()) {
    return { error: "Start date is required" };
  }
  const start = toUtcMidnight(body.startDate);
  if (isNaN(start.getTime())) return { error: "Invalid start date" };

  if (body.endDate === undefined || body.endDate === null || body.endDate === "") {
    return { start, end: addUtcDays(start, 1) };
  }
  if (typeof body.endDate !== "string") return { error: "Invalid end date" };

  const end = toUtcMidnight(body.endDate);
  if (isNaN(end.getTime())) return { error: "Invalid end date" };
  if (end.getTime() === start.getTime()) return { start, end: addUtcDays(start, 1) };
  if (end < start) return { error: "End date must be on or after the start date" };

  return { start, end };
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const propertyId = Number(body.propertyId);
  if (!Number.isInteger(propertyId))
    return NextResponse.json({ error: "Invalid propertyId" }, { status: 400 });

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { id: true, name: true },
  });
  if (!property) return NextResponse.json({ error: "Property not found" }, { status: 404 });

  const range = resolveRange(body);
  if ("error" in range) return NextResponse.json({ error: range.error }, { status: 400 });

  if (!isManualBlockReason(body.reason)) {
    return NextResponse.json({ error: "Choose a valid reason for the block" }, { status: 400 });
  }
  const reason = body.reason;

  const scope = body.scope === "inventory_group" ? "inventory_group" : "listing_only";
  const exportToIcal = body.exportToIcal === false ? false : true;
  const affectsAvailability = body.affectsAvailability === false ? false : true;
  const internalNotes =
    typeof body.internalNotes === "string" && body.internalNotes.trim()
      ? body.internalNotes.trim()
      : null;

  // Create then stamp the UID in one transaction: the UID embeds the row id, and
  // externalUid is nullable precisely so this two-step is legal under the unique index.
  const block = await prisma.$transaction(async (tx) => {
    const created = await tx.availabilityBlock.create({
      data: {
        propertyId,
        startDate: range.start,
        endDate: range.end,
        type: MANUAL_BLOCK_TYPE,
        reason,
        internalNotes,
        scope,
        status: "active",
        isSystemGenerated: false,
        affectsAvailability,
        exportToIcal,
        createdById: parseInt(session.user.id),
      },
      select: { id: true },
    });

    return tx.availabilityBlock.update({
      where: { id: created.id },
      data: { externalUid: manualBlockUid(created.id) },
    });
  });

  await logAction({
    actor: session.user.name ?? "Admin",
    actorRole: (session.user.role ?? "admin") as "admin" | "manager",
    actorId: parseInt(session.user.id),
    action: `Created ${humanizeReason(reason).toLowerCase()} block on "${property.name}" (${utcDateKey(range.start)} → ${utcDateKey(range.end)})${scope === "inventory_group" ? " for the whole inventory group" : ""}`,
    module: "bookings",
    target: `availability-block-${block.id}`,
    ipAddress: getIpFromRequest(req),
    metadata: {
      blockId: block.id,
      propertyId,
      reason,
      scope,
      exportToIcal,
      start: utcDateKey(range.start),
      end: utcDateKey(range.end),
    },
  });

  // Group scope fans the block out to every active sibling. No-op for listing_only, and
  // no-op when the property is ungrouped or its group is inactive.
  let affected: { id: number; name: string }[] = [];
  if (scope === "inventory_group") {
    try {
      await reconcileManualBlockDerivedBlocks(block.id);
      affected = (await previewAffectedProperties(propertyId)).siblings;
    } catch (err) {
      console.error("[availability-blocks] group propagation failed:", err);
    }
  }

  return NextResponse.json({ block, affectedProperties: affected }, { status: 201 });
}
