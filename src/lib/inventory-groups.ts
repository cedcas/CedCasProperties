/**
 * Shared inventory groups — sibling-block propagation and reconciliation.
 *
 * Some listings are different configurations of the same physical property (Mickey in
 * Lipa 1BR / 2BR / 3BR). Only one configuration can be occupied at a time, so when a
 * qualifying source event lands on one member, every other ACTIVE member gets a
 * system-generated block for the same nights.
 *
 * Design rules this module upholds:
 *
 *  - The source event stays on its original property. The reservation itself is never
 *    duplicated — only derived *blocks* are created elsewhere.
 *  - Channel-neutral: a source is a HIL booking, an imported external event, or a
 *    group-scoped manual block. No platform-specific logic lives here.
 *  - Every derived block references its source and carries a deterministic
 *    `externalUid`, which is UNIQUE — so reprocessing can only update, never duplicate.
 *  - Reconciliation is "compute the desired set, upsert it, cancel active strays".
 *    Idempotent by construction: a no-op run performs no writes.
 *  - Blocks are soft-cancelled, never deleted, so the audit trail survives.
 *
 * The decision logic lives in the pure `planDerivedBlocks` so it can be tested without
 * a database — necessary here, because Hostinger blocks DB access from laptops and CI.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toUtcMidnight, todayUtc } from "@/lib/dates";
import { derivedBlockUid, type DerivedSourceKind } from "@/lib/calendar-uids";
import { bookingBlocksAvailability } from "@/lib/booking-status";
import { logAction } from "@/lib/log";

/** Marker values shared by every derived block. */
export const DERIVED_BLOCK_TYPE = "inventory_derived";
export const DERIVED_BLOCK_REASON = "inventory_group";
export const MANUAL_BLOCK_TYPE = "manual";

// ── Pure planning layer ────────────────────────────────────────────────────

export interface DerivedSource {
  kind: DerivedSourceKind;
  id: number;
  /** The property the source event actually sits on. */
  propertyId: number;
  start: Date;
  end: Date;
  /** False when the source no longer affects availability (cancelled booking, removed event…). */
  isActive: boolean;
}

export interface GroupSnapshot {
  id: number;
  isActive: boolean;
  /** Every member of the group, including the source property. */
  memberPropertyIds: number[];
}

export interface ExistingDerivedBlock {
  id: number;
  propertyId: number;
  externalUid: string | null;
  startDate: Date;
  endDate: Date;
  status: string; // active | cancelled
}

export interface DesiredDerivedBlock {
  externalUid: string;
  propertyId: number; // the sibling being blocked
  startDate: Date;
  endDate: Date;
  sourcePropertyId: number;
  inventoryGroupId: number;
  sourceBookingId: number | null;
  sourceExternalEventId: number | null;
  parentBlockId: number | null;
}

export interface DerivedBlockPlan {
  upserts: DesiredDerivedBlock[];
  /** Block ids to soft-cancel. */
  cancels: number[];
}

function sourceRefs(source: DerivedSource) {
  return {
    sourceBookingId: source.kind === "booking" ? source.id : null,
    sourceExternalEventId: source.kind === "external_event" ? source.id : null,
    parentBlockId: source.kind === "block" ? source.id : null,
  };
}

/**
 * Decide which sibling blocks should exist for a source, and which existing ones are
 * now stale. Pure: no database, no clock, no side effects.
 *
 * Returns an empty plan when the property is in no group, the group is inactive, or the
 * source no longer affects availability — which is exactly why a property outside any
 * group behaves as if this feature did not exist.
 *
 * `cancelCutoff` limits cancellation to blocks ending after that date. Pass `null` to
 * cancel regardless of date (a vanished source has no valid shadows); pass today for
 * group/membership edits, where past blocks are inert history worth leaving alone.
 */
export function planDerivedBlocks(input: {
  source: DerivedSource;
  group: GroupSnapshot | null;
  existing: ExistingDerivedBlock[];
  cancelCutoff?: Date | null;
}): DerivedBlockPlan {
  const { source, group, existing } = input;
  const cutoff = input.cancelCutoff ?? null;

  const propagating = Boolean(group?.isActive) && source.isActive;

  const targets = propagating
    ? [...new Set(group!.memberPropertyIds)]
        .filter((id) => id !== source.propertyId)
        .sort((a, b) => a - b)
    : [];

  const start = toUtcMidnight(source.start);
  const end = toUtcMidnight(source.end);
  const refs = sourceRefs(source);

  // A zero-length or inverted range occupies no nights, so it blocks nothing.
  const upserts: DesiredDerivedBlock[] =
    end > start
      ? targets.map((propertyId) => ({
          externalUid: derivedBlockUid(source.kind, source.id, propertyId),
          propertyId,
          startDate: start,
          endDate: end,
          sourcePropertyId: source.propertyId,
          inventoryGroupId: group!.id,
          ...refs,
        }))
      : [];

  const desiredUids = new Set(upserts.map((u) => u.externalUid));

  const cancels = existing
    .filter((b) => b.status === "active")
    .filter((b) => !b.externalUid || !desiredUids.has(b.externalUid))
    .filter((b) => cutoff === null || b.endDate > cutoff)
    .map((b) => b.id);

  return { upserts, cancels };
}

// ── Database layer ─────────────────────────────────────────────────────────

type Db = Prisma.TransactionClient | typeof prisma;

/** The property's group, or null when it belongs to none. Includes inactive groups. */
export async function getGroupForProperty(
  propertyId: number,
  db: Db = prisma
): Promise<GroupSnapshot | null> {
  const membership = await db.inventoryGroupMember.findUnique({
    where: { propertyId },
    select: {
      inventoryGroup: {
        select: { id: true, isActive: true, members: { select: { propertyId: true } } },
      },
    },
  });
  if (!membership?.inventoryGroup) return null;
  const g = membership.inventoryGroup;
  return { id: g.id, isActive: g.isActive, memberPropertyIds: g.members.map((m) => m.propertyId) };
}

/** The property's group only if it is active — the gate on all propagation. */
export async function getActiveGroupForProperty(
  propertyId: number,
  db: Db = prisma
): Promise<GroupSnapshot | null> {
  const group = await getGroupForProperty(propertyId, db);
  return group?.isActive ? group : null;
}

/** Sibling property ids that would be blocked alongside this one. Empty when ungrouped. */
export async function getActiveSiblingPropertyIds(
  propertyId: number,
  db: Db = prisma
): Promise<number[]> {
  const group = await getActiveGroupForProperty(propertyId, db);
  if (!group) return [];
  return group.memberPropertyIds.filter((id) => id !== propertyId);
}

/**
 * Names of the properties a group-scoped action would additionally affect.
 * Drives the "This will also block: …" preview in the admin block form.
 */
export async function previewAffectedProperties(propertyId: number): Promise<{
  groupId: number | null;
  groupName: string | null;
  groupIsActive: boolean;
  siblings: { id: number; name: string }[];
}> {
  const membership = await prisma.inventoryGroupMember.findUnique({
    where: { propertyId },
    select: {
      inventoryGroup: {
        select: {
          id: true,
          name: true,
          isActive: true,
          members: { select: { property: { select: { id: true, name: true } } } },
        },
      },
    },
  });

  const group = membership?.inventoryGroup;
  if (!group) return { groupId: null, groupName: null, groupIsActive: false, siblings: [] };

  return {
    groupId: group.id,
    groupName: group.name,
    groupIsActive: group.isActive,
    siblings: group.members.map((m) => m.property).filter((p) => p.id !== propertyId),
  };
}

async function loadExistingDerived(source: DerivedSource, db: Db): Promise<ExistingDerivedBlock[]> {
  const where: Prisma.AvailabilityBlockWhereInput = { isSystemGenerated: true };
  if (source.kind === "booking") where.sourceBookingId = source.id;
  else if (source.kind === "external_event") where.sourceExternalEventId = source.id;
  else where.parentBlockId = source.id;

  return db.availabilityBlock.findMany({
    where,
    select: {
      id: true,
      propertyId: true,
      externalUid: true,
      startDate: true,
      endDate: true,
      status: true,
    },
  });
}

export interface ReconcileResult {
  created: number;
  updated: number;
  cancelled: number;
}

/**
 * Apply a plan.
 *
 * Deliberately NOT wrapped in one big transaction. Each upsert is atomic and idempotent
 * on its unique `externalUid`, and desired blocks are written BEFORE stale ones are
 * cancelled. So a mid-flight failure leaves extra active blocks rather than missing ones
 * — it over-blocks, never under-blocks, and the next reconciliation converges. For a
 * system whose job is preventing double bookings, that is the correct failure direction.
 */
async function applyPlan(plan: DerivedBlockPlan, db: Db = prisma): Promise<ReconcileResult> {
  let created = 0;
  let updated = 0;

  for (const desired of plan.upserts) {
    const create: Prisma.AvailabilityBlockUncheckedCreateInput = {
      propertyId: desired.propertyId,
      startDate: desired.startDate,
      endDate: desired.endDate,
      type: DERIVED_BLOCK_TYPE,
      reason: DERIVED_BLOCK_REASON,
      scope: "inventory_group",
      status: "active",
      isSystemGenerated: true,
      affectsAvailability: true,
      exportToIcal: true,
      sourceBookingId: desired.sourceBookingId,
      sourceExternalEventId: desired.sourceExternalEventId,
      parentBlockId: desired.parentBlockId,
      sourcePropertyId: desired.sourcePropertyId,
      inventoryGroupId: desired.inventoryGroupId,
      externalUid: desired.externalUid,
    };

    // Revive as well as re-date: a source that comes back flips its blocks active again.
    const update: Prisma.AvailabilityBlockUncheckedUpdateInput = {
      startDate: desired.startDate,
      endDate: desired.endDate,
      status: "active",
      cancelledAt: null,
      affectsAvailability: true,
      inventoryGroupId: desired.inventoryGroupId,
      sourcePropertyId: desired.sourcePropertyId,
    };

    const before = await db.availabilityBlock.findUnique({
      where: { externalUid: desired.externalUid },
      select: { id: true, startDate: true, endDate: true, status: true },
    });

    try {
      await db.availabilityBlock.upsert({
        where: { externalUid: desired.externalUid },
        create,
        update,
      });
    } catch (err) {
      // A concurrent sync inserted the same UID between our read and write. The unique
      // index is doing its job; fall back to an update so both runs converge.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        await db.availabilityBlock.update({
          where: { externalUid: desired.externalUid },
          data: update,
        });
      } else {
        throw err;
      }
    }

    if (!before) created += 1;
    else if (
      before.status !== "active" ||
      before.startDate.getTime() !== desired.startDate.getTime() ||
      before.endDate.getTime() !== desired.endDate.getTime()
    ) {
      updated += 1;
    }
  }

  let cancelled = 0;
  if (plan.cancels.length > 0) {
    const res = await db.availabilityBlock.updateMany({
      where: { id: { in: plan.cancels }, status: "active" },
      data: { status: "cancelled", cancelledAt: new Date() },
    });
    cancelled = res.count;
  }

  return { created, updated, cancelled };
}

const SYSTEM_ACTOR = { actor: "System", actorRole: "admin" as const, module: "bookings" as const };

/** Log only real changes, so a quiet reconciliation writes nothing. */
async function logReconcile(
  result: ReconcileResult,
  context: { label: string; target: string; metadata?: Record<string, unknown> }
) {
  const parts: string[] = [];
  if (result.created) parts.push(`created ${result.created}`);
  if (result.updated) parts.push(`updated ${result.updated}`);
  if (result.cancelled) parts.push(`cancelled ${result.cancelled}`);
  if (parts.length === 0) return;

  await logAction({
    ...SYSTEM_ACTOR,
    action: `Reconciled shared-inventory blocks for ${context.label} — ${parts.join(", ")}`,
    target: context.target,
    metadata: { ...result, ...context.metadata },
  });
}

/**
 * Reconcile the sibling blocks a source currently justifies.
 * Safe to call repeatedly and safe to call for ungrouped properties (it no-ops).
 */
export async function reconcileSource(
  source: DerivedSource,
  opts: { cancelCutoff?: Date | null; db?: Db; logLabel?: string; logTarget?: string } = {}
): Promise<ReconcileResult> {
  const db = opts.db ?? prisma;
  const [group, existing] = await Promise.all([
    getGroupForProperty(source.propertyId, db),
    loadExistingDerived(source, db),
  ]);

  const plan = planDerivedBlocks({
    source,
    // Propagation is gated on the group being active; planDerivedBlocks handles the rest.
    group,
    existing,
    cancelCutoff: opts.cancelCutoff ?? null,
  });

  const result = await applyPlan(plan, db);

  if (opts.logLabel && opts.logTarget) {
    await logReconcile(result, { label: opts.logLabel, target: opts.logTarget });
  }
  return result;
}

/**
 * Reconcile the sibling blocks generated by a booking.
 *
 * Called after a booking is created, after its status changes, and after its dates
 * change. Reads the booking's CURRENT state, so it handles every direction: a booking
 * that starts blocking creates siblings, one that stops blocking cancels them, and a
 * date change re-dates them in place.
 */
export async function reconcileBookingDerivedBlocks(
  bookingId: number,
  db: Db = prisma
): Promise<ReconcileResult> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, propertyId: true, checkIn: true, checkOut: true, status: true },
  });

  // Hard-deleted booking: its derived blocks cascade away with it, nothing to do.
  if (!booking) return { created: 0, updated: 0, cancelled: 0 };

  return reconcileSource(
    {
      kind: "booking",
      id: booking.id,
      propertyId: booking.propertyId,
      start: booking.checkIn,
      end: booking.checkOut,
      isActive: bookingBlocksAvailability(booking.status),
    },
    { db, logLabel: `booking #${booking.id}`, logTarget: `booking-${booking.id}` }
  );
}

/** Reconcile the sibling blocks generated by an imported external calendar event. */
export async function reconcileExternalEventDerivedBlocks(
  eventId: number,
  db: Db = prisma
): Promise<ReconcileResult> {
  const event = await db.externalCalendarEvent.findUnique({
    where: { id: eventId },
    select: { id: true, propertyId: true, startDate: true, endDate: true, status: true },
  });
  if (!event) return { created: 0, updated: 0, cancelled: 0 };

  return reconcileSource(
    {
      kind: "external_event",
      id: event.id,
      propertyId: event.propertyId,
      start: event.startDate,
      end: event.endDate,
      isActive: event.status === "active",
    },
    { db, logLabel: `external event #${event.id}`, logTarget: `external-event-${event.id}` }
  );
}

/** Reconcile the sibling blocks generated by a group-scoped manual block. */
export async function reconcileManualBlockDerivedBlocks(
  blockId: number,
  db: Db = prisma
): Promise<ReconcileResult> {
  const block = await db.availabilityBlock.findUnique({
    where: { id: blockId },
    select: {
      id: true,
      propertyId: true,
      startDate: true,
      endDate: true,
      status: true,
      scope: true,
      affectsAvailability: true,
      isSystemGenerated: true,
    },
  });
  if (!block || block.isSystemGenerated) return { created: 0, updated: 0, cancelled: 0 };

  return reconcileSource(
    {
      kind: "block",
      id: block.id,
      propertyId: block.propertyId,
      start: block.startDate,
      end: block.endDate,
      isActive:
        block.status === "active" && block.scope === "inventory_group" && block.affectsAvailability,
    },
    { db, logLabel: `availability block #${block.id}`, logTarget: `availability-block-${block.id}` }
  );
}

// ── Group-level reconciliation ─────────────────────────────────────────────

/**
 * Re-derive every source in a group. Used after membership or activation changes, both
 * of which can invalidate or newly justify blocks across the whole group.
 *
 * Only FUTURE blocks are cancelled — a past block is inert and reads as history.
 * `extraPropertyIds` lets a just-removed property be swept in the same pass.
 */
export async function reconcileGroup(
  groupId: number,
  extraPropertyIds: number[] = []
): Promise<ReconcileResult> {
  const group = await prisma.inventoryGroup.findUnique({
    where: { id: groupId },
    select: { id: true, name: true, isActive: true, members: { select: { propertyId: true } } },
  });
  if (!group) return { created: 0, updated: 0, cancelled: 0 };

  const propertyIds = [
    ...new Set([...group.members.map((m) => m.propertyId), ...extraPropertyIds]),
  ];
  const cutoff = todayUtc();
  const total: ReconcileResult = { created: 0, updated: 0, cancelled: 0 };

  for (const propertyId of propertyIds) {
    const [bookings, events, manualBlocks] = await Promise.all([
      prisma.booking.findMany({
        where: { propertyId, checkOut: { gt: cutoff } },
        select: { id: true, propertyId: true, checkIn: true, checkOut: true, status: true },
      }),
      prisma.externalCalendarEvent.findMany({
        where: { propertyId, endDate: { gt: cutoff } },
        select: { id: true, propertyId: true, startDate: true, endDate: true, status: true },
      }),
      prisma.availabilityBlock.findMany({
        where: {
          propertyId,
          isSystemGenerated: false,
          scope: "inventory_group",
          endDate: { gt: cutoff },
        },
        select: {
          id: true,
          propertyId: true,
          startDate: true,
          endDate: true,
          status: true,
          affectsAvailability: true,
        },
      }),
    ]);

    const sources: DerivedSource[] = [
      ...bookings.map((b) => ({
        kind: "booking" as const,
        id: b.id,
        propertyId: b.propertyId,
        start: b.checkIn,
        end: b.checkOut,
        isActive: bookingBlocksAvailability(b.status),
      })),
      ...events.map((e) => ({
        kind: "external_event" as const,
        id: e.id,
        propertyId: e.propertyId,
        start: e.startDate,
        end: e.endDate,
        isActive: e.status === "active",
      })),
      ...manualBlocks.map((b) => ({
        kind: "block" as const,
        id: b.id,
        propertyId: b.propertyId,
        start: b.startDate,
        end: b.endDate,
        isActive: b.status === "active" && b.affectsAvailability,
      })),
    ];

    for (const source of sources) {
      const result = await reconcileSource(source, { cancelCutoff: cutoff });
      total.created += result.created;
      total.updated += result.updated;
      total.cancelled += result.cancelled;
    }
  }

  await logReconcile(total, {
    label: `inventory group "${group.name}"`,
    target: `inventory-group-${group.id}`,
    metadata: { groupId: group.id, isActive: group.isActive, propertyIds },
  });

  return total;
}

/**
 * Sweep a property that has just left a group.
 *
 * Two directions to clean up: blocks ON this property derived from siblings, and blocks
 * on siblings derived FROM this property. `reconcileGroup` covers both because the
 * property is passed as an extra source and its own group lookup now returns null.
 */
export async function reconcilePropertyRemovedFromGroup(
  groupId: number,
  propertyId: number
): Promise<ReconcileResult> {
  const cutoff = todayUtc();

  // Blocks on the departed property that came from its former siblings are orphaned the
  // moment membership ends; their sources will no longer target it.
  const orphaned = await prisma.availabilityBlock.updateMany({
    where: {
      propertyId,
      isSystemGenerated: true,
      status: "active",
      inventoryGroupId: groupId,
      endDate: { gt: cutoff },
    },
    data: { status: "cancelled", cancelledAt: new Date() },
  });

  const groupResult = await reconcileGroup(groupId, [propertyId]);

  return { ...groupResult, cancelled: groupResult.cancelled + orphaned.count };
}
