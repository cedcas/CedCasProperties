import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getIpFromRequest } from "@/lib/log";
import { toUtcMidnight, addUtcDays, utcDateKey } from "@/lib/dates";
import { reconcileManualBlockDerivedBlocks } from "@/lib/inventory-groups";
import { isManualBlockReason } from "@/lib/availability";

// PATCH  — edit a manual block (dates, reason, notes, scope, iCal export)
// DELETE — cancel a manual block (soft: status="cancelled" + cancelledAt)
//
// System-generated sibling blocks are rejected by both handlers. They are a projection of
// their source, so editing one directly would be silently undone by the next
// reconciliation — the source must be changed instead.

const SYSTEM_BLOCK_ERROR =
  "This block was generated automatically from a shared-inventory source. Edit or cancel the original booking, imported event, or group block instead.";

async function loadBlock(blockId: number) {
  return prisma.availabilityBlock.findUnique({
    where: { id: blockId },
    select: {
      id: true,
      propertyId: true,
      startDate: true,
      endDate: true,
      reason: true,
      scope: true,
      status: true,
      isSystemGenerated: true,
      exportToIcal: true,
      affectsAvailability: true,
      property: { select: { name: true } },
    },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const blockId = Number(id);
  if (!Number.isInteger(blockId))
    return NextResponse.json({ error: "Invalid block id" }, { status: 400 });

  const existing = await loadBlock(blockId);
  if (!existing)
    return NextResponse.json({ error: "Availability block not found" }, { status: 404 });
  if (existing.isSystemGenerated)
    return NextResponse.json({ error: SYSTEM_BLOCK_ERROR }, { status: 400 });

  const body = await req.json();

  // Whitelist — never spread the request body into Prisma.
  const data: Record<string, unknown> = {};

  if (body.startDate !== undefined || body.endDate !== undefined) {
    const startSource = body.startDate ?? utcDateKey(existing.startDate);
    if (typeof startSource !== "string")
      return NextResponse.json({ error: "Invalid start date" }, { status: 400 });
    const start = toUtcMidnight(startSource);
    if (isNaN(start.getTime()))
      return NextResponse.json({ error: "Invalid start date" }, { status: 400 });

    let end: Date;
    if (body.endDate === undefined) {
      end = existing.endDate;
    } else if (body.endDate === null || body.endDate === "") {
      end = addUtcDays(start, 1);
    } else if (typeof body.endDate === "string") {
      end = toUtcMidnight(body.endDate);
      if (isNaN(end.getTime()))
        return NextResponse.json({ error: "Invalid end date" }, { status: 400 });
      if (end.getTime() === start.getTime()) end = addUtcDays(start, 1);
    } else {
      return NextResponse.json({ error: "Invalid end date" }, { status: 400 });
    }

    if (end <= start)
      return NextResponse.json({ error: "End date must be after the start date" }, { status: 400 });
    data.startDate = start;
    data.endDate = end;
  }

  if (body.reason !== undefined) {
    if (!isManualBlockReason(body.reason)) {
      return NextResponse.json({ error: "Choose a valid reason for the block" }, { status: 400 });
    }
    data.reason = body.reason;
  }

  if (body.internalNotes !== undefined) {
    data.internalNotes =
      typeof body.internalNotes === "string" && body.internalNotes.trim()
        ? body.internalNotes.trim()
        : null;
  }
  if (body.scope === "listing_only" || body.scope === "inventory_group") data.scope = body.scope;
  if (typeof body.exportToIcal === "boolean") data.exportToIcal = body.exportToIcal;
  if (typeof body.affectsAvailability === "boolean")
    data.affectsAvailability = body.affectsAvailability;

  // Reactivating a cancelled block is a legitimate undo.
  if (body.status === "active" || body.status === "cancelled") {
    data.status = body.status;
    data.cancelledAt = body.status === "cancelled" ? new Date() : null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const block = await prisma.availabilityBlock.update({ where: { id: blockId }, data });

  await logAction({
    actor: session.user.name ?? "Admin",
    actorRole: (session.user.role ?? "admin") as "admin" | "manager",
    actorId: parseInt(session.user.id),
    action: `Updated availability block #${blockId} on "${existing.property.name}" (${utcDateKey(block.startDate)} → ${utcDateKey(block.endDate)})`,
    module: "bookings",
    target: `availability-block-${blockId}`,
    ipAddress: getIpFromRequest(req),
    metadata: {
      blockId,
      changed: Object.keys(data),
      from: {
        start: utcDateKey(existing.startDate),
        end: utcDateKey(existing.endDate),
        scope: existing.scope,
      },
      to: {
        start: utcDateKey(block.startDate),
        end: utcDateKey(block.endDate),
        scope: block.scope,
      },
    },
  });

  // Re-derive siblings against the block's new state. Handles every direction: a scope
  // change to listing_only cancels its derived blocks, a date change re-dates them.
  try {
    await reconcileManualBlockDerivedBlocks(blockId);
  } catch (err) {
    console.error("[availability-blocks] reconcile after update failed:", err);
  }

  return NextResponse.json(block);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const blockId = Number(id);
  if (!Number.isInteger(blockId))
    return NextResponse.json({ error: "Invalid block id" }, { status: 400 });

  const existing = await loadBlock(blockId);
  if (!existing)
    return NextResponse.json({ error: "Availability block not found" }, { status: 404 });
  if (existing.isSystemGenerated)
    return NextResponse.json({ error: SYSTEM_BLOCK_ERROR }, { status: 400 });

  if (existing.status === "cancelled") {
    return NextResponse.json({ success: true, alreadyCancelled: true });
  }

  // Soft cancel, so the audit trail survives. Cancelling this block removes ONLY its own
  // derived siblings — any unrelated block or booking overlapping the same dates stays.
  await prisma.availabilityBlock.update({
    where: { id: blockId },
    data: { status: "cancelled", cancelledAt: new Date() },
  });

  await logAction({
    actor: session.user.name ?? "Admin",
    actorRole: (session.user.role ?? "admin") as "admin" | "manager",
    actorId: parseInt(session.user.id),
    action: `Cancelled availability block #${blockId} on "${existing.property.name}" (${utcDateKey(existing.startDate)} → ${utcDateKey(existing.endDate)})`,
    module: "bookings",
    target: `availability-block-${blockId}`,
    ipAddress: getIpFromRequest(req),
    metadata: {
      blockId,
      propertyId: existing.propertyId,
      reason: existing.reason,
      scope: existing.scope,
    },
  });

  try {
    await reconcileManualBlockDerivedBlocks(blockId);
  } catch (err) {
    console.error("[availability-blocks] reconcile after cancel failed:", err);
  }

  return NextResponse.json({ success: true });
}
