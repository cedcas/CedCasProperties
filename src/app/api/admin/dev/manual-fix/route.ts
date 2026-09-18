import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/log";
import { toUtcMidnight } from "@/lib/dates";
import { getPropertyConflicts, formatConflictRange } from "@/lib/availability";
import { reconcileBookingDerivedBlocks } from "@/lib/inventory-groups";

/**
 * TEMPORARY one-off admin route — 2026-09-17 manual data fix requested by the Owner.
 * Delete this file once both changes below are confirmed applied. Do not generalize it.
 *
 * 1. Booking #130 (Rhoan L. Sebastia) — move property to "Mickey in Lipa — Family
 *    Staycation — Sleeps 7". Dates and totalPrice/nightlyTotal untouched (already paid).
 * 2. Booking #136 (Ellen) — extend checkOut 2026-09-18 -> 2026-09-19. totalPrice -> 3000,
 *    nightlyTotal += 1500 (extra night the guest already paid for separately).
 */

const TARGET_SLUG = "mickey-in-lipa--family-staycation--sleeps-7";
const RHOAN_BOOKING_ID = 130;
const ELLEN_BOOKING_ID = 136;
const ELLEN_OLD_CHECKOUT = "2026-09-18";
const ELLEN_NEW_CHECKOUT = "2026-09-19";
const ELLEN_NEW_TOTAL = 3000;
const ELLEN_NIGHTLY_DELTA = 1500;

async function buildPlan() {
  const issues: string[] = [];

  const [rhoan, ellen, targetProperty] = await Promise.all([
    prisma.booking.findUnique({ where: { id: RHOAN_BOOKING_ID }, include: { property: true } }),
    prisma.booking.findUnique({ where: { id: ELLEN_BOOKING_ID }, include: { property: true } }),
    prisma.property.findUnique({ where: { slug: TARGET_SLUG } }),
  ]);

  if (!rhoan) issues.push(`Booking #${RHOAN_BOOKING_ID} not found`);
  else if (!/rhoan/i.test(rhoan.guestName)) issues.push(`Booking #${RHOAN_BOOKING_ID} guestName "${rhoan.guestName}" doesn't look like Rhoan — aborting as a safety check`);

  if (!ellen) issues.push(`Booking #${ELLEN_BOOKING_ID} not found`);
  else if (!/ellen/i.test(ellen.guestName)) issues.push(`Booking #${ELLEN_BOOKING_ID} guestName "${ellen.guestName}" doesn't look like Ellen — aborting as a safety check`);
  else {
    const onFile = ellen.checkOut.toISOString().slice(0, 10);
    if (onFile !== ELLEN_OLD_CHECKOUT) {
      issues.push(`Booking #${ELLEN_BOOKING_ID} current checkOut is ${onFile}, expected ${ELLEN_OLD_CHECKOUT} — aborting as a safety check`);
    }
  }

  if (!targetProperty) issues.push(`Target property with slug "${TARGET_SLUG}" not found`);

  let rhoanConflicts: string[] = [];
  if (rhoan && targetProperty) {
    const conflicts = await getPropertyConflicts({
      propertyId: targetProperty.id,
      start: rhoan.checkIn,
      end: rhoan.checkOut,
      excludeBookingId: rhoan.id,
    });
    rhoanConflicts = conflicts.map(formatConflictRange);
    if (conflicts.length > 0) issues.push(`Target property has ${conflicts.length} conflict(s) for Rhoan's dates: ${rhoanConflicts.join(", ")}`);
  }

  let ellenConflicts: string[] = [];
  if (ellen) {
    const conflicts = await getPropertyConflicts({
      propertyId: ellen.propertyId,
      start: toUtcMidnight(ELLEN_OLD_CHECKOUT),
      end: toUtcMidnight(ELLEN_NEW_CHECKOUT),
      excludeBookingId: ellen.id,
    });
    ellenConflicts = conflicts.map(formatConflictRange);
    if (conflicts.length > 0) issues.push(`Ellen's property has ${conflicts.length} conflict(s) for the extra night: ${ellenConflicts.join(", ")}`);
  }

  return { rhoan, ellen, targetProperty, rhoanConflicts, ellenConflicts, issues };
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plan = await buildPlan();

  return NextResponse.json({
    clearToExecute: plan.issues.length === 0,
    issues: plan.issues,
    rhoan: plan.rhoan && {
      bookingId: plan.rhoan.id,
      guestName: plan.rhoan.guestName,
      currentProperty: plan.rhoan.property.name,
      targetProperty: plan.targetProperty?.name ?? null,
      checkIn: plan.rhoan.checkIn.toISOString().slice(0, 10),
      checkOut: plan.rhoan.checkOut.toISOString().slice(0, 10),
      status: plan.rhoan.status,
      totalPrice: plan.rhoan.totalPrice.toString(),
      willChange: "propertyId only",
      conflicts: plan.rhoanConflicts,
    },
    ellen: plan.ellen && {
      bookingId: plan.ellen.id,
      guestName: plan.ellen.guestName,
      property: plan.ellen.property.name,
      checkIn: plan.ellen.checkIn.toISOString().slice(0, 10),
      currentCheckOut: plan.ellen.checkOut.toISOString().slice(0, 10),
      newCheckOut: ELLEN_NEW_CHECKOUT,
      status: plan.ellen.status,
      currentTotalPrice: plan.ellen.totalPrice.toString(),
      newTotalPrice: ELLEN_NEW_TOTAL,
      currentNightlyTotal: plan.ellen.nightlyTotal?.toString() ?? null,
      newNightlyTotal: plan.ellen.nightlyTotal ? Number(plan.ellen.nightlyTotal) + ELLEN_NIGHTLY_DELTA : null,
      conflicts: plan.ellenConflicts,
    },
  });
}

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plan = await buildPlan();
  if (plan.issues.length > 0) {
    return NextResponse.json({ error: "Aborted — plan has unresolved issues", issues: plan.issues }, { status: 409 });
  }

  const { rhoan, ellen, targetProperty } = plan;
  if (!rhoan || !ellen || !targetProperty) {
    return NextResponse.json({ error: "Aborted — missing record" }, { status: 409 });
  }

  const before = {
    rhoan: { propertyId: rhoan.propertyId, propertyName: rhoan.property.name },
    ellen: {
      checkOut: ellen.checkOut.toISOString().slice(0, 10),
      totalPrice: ellen.totalPrice.toString(),
      nightlyTotal: ellen.nightlyTotal?.toString() ?? null,
    },
  };

  const [updatedRhoan, updatedEllen] = await prisma.$transaction([
    prisma.booking.update({
      where: { id: rhoan.id },
      data: { propertyId: targetProperty.id },
    }),
    prisma.booking.update({
      where: { id: ellen.id },
      data: {
        checkOut: toUtcMidnight(ELLEN_NEW_CHECKOUT),
        totalPrice: ELLEN_NEW_TOTAL,
        nightlyTotal: ellen.nightlyTotal ? Number(ellen.nightlyTotal) + ELLEN_NIGHTLY_DELTA : ELLEN_NIGHTLY_DELTA,
      },
    }),
  ]);

  // Re-derive shared-inventory sibling blocks now that property/dates changed.
  await reconcileBookingDerivedBlocks(updatedRhoan.id);
  await reconcileBookingDerivedBlocks(updatedEllen.id);

  await logAction({
    actor: session.user.name ?? "Admin",
    actorRole: (session.user.role ?? "admin") as "admin" | "manager",
    actorId: parseInt(session.user.id),
    action: `Manual fix: moved booking #${rhoan.id} (${rhoan.guestName}) from "${before.rhoan.propertyName}" to "${targetProperty.name}"`,
    module: "bookings",
    target: `booking-${rhoan.id}`,
    metadata: { before: before.rhoan, after: { propertyId: targetProperty.id, propertyName: targetProperty.name } },
  });

  await logAction({
    actor: session.user.name ?? "Admin",
    actorRole: (session.user.role ?? "admin") as "admin" | "manager",
    actorId: parseInt(session.user.id),
    action: `Manual fix: extended booking #${ellen.id} (${ellen.guestName}) checkOut ${before.ellen.checkOut} -> ${ELLEN_NEW_CHECKOUT}, totalPrice ${before.ellen.totalPrice} -> ${ELLEN_NEW_TOTAL}`,
    module: "bookings",
    target: `booking-${ellen.id}`,
    metadata: { before: before.ellen, after: { checkOut: ELLEN_NEW_CHECKOUT, totalPrice: ELLEN_NEW_TOTAL, nightlyTotal: updatedEllen.nightlyTotal?.toString() } },
  });

  return NextResponse.json({
    success: true,
    rhoan: { id: updatedRhoan.id, propertyId: updatedRhoan.propertyId },
    ellen: {
      id: updatedEllen.id,
      checkOut: updatedEllen.checkOut.toISOString().slice(0, 10),
      totalPrice: updatedEllen.totalPrice.toString(),
      nightlyTotal: updatedEllen.nightlyTotal?.toString(),
    },
  });
}
