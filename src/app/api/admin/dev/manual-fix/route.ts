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
 *
 * Ellen's property shares an inventory group with Cozy 1-BR, so Rhoan's *current*
 * booking there derives a block onto Ellen's listing for her stay window — that block
 * self-resolves once Rhoan's booking moves off Cozy 1-BR. So the two changes are applied
 * SEQUENTIALLY: Rhoan first (+ reconcile), then Ellen is re-checked against the resulting
 * state before being applied. Doing both against a single up-front snapshot (as the first
 * version of this route did) spuriously flags Ellen's own soon-to-be-cleared block as an
 * unresolvable conflict.
 */

const TARGET_SLUG = "mickey-in-lipa--family-staycation--sleeps-7";
const RHOAN_BOOKING_ID = 130;
const ELLEN_BOOKING_ID = 136;
const ELLEN_OLD_CHECKOUT = "2026-09-18";
const ELLEN_NEW_CHECKOUT = "2026-09-19";
const ELLEN_NEW_TOTAL = 3000;
const ELLEN_NIGHTLY_DELTA = 1500;

async function checkRhoan() {
  const issues: string[] = [];
  const [rhoan, targetProperty] = await Promise.all([
    prisma.booking.findUnique({ where: { id: RHOAN_BOOKING_ID }, include: { property: true } }),
    prisma.property.findUnique({ where: { slug: TARGET_SLUG } }),
  ]);

  if (!rhoan) issues.push(`Booking #${RHOAN_BOOKING_ID} not found`);
  else if (!/rhoan/i.test(rhoan.guestName)) issues.push(`Booking #${RHOAN_BOOKING_ID} guestName "${rhoan.guestName}" doesn't look like Rhoan — aborting as a safety check`);

  if (!targetProperty) issues.push(`Target property with slug "${TARGET_SLUG}" not found`);

  let conflicts: string[] = [];
  if (rhoan && targetProperty) {
    const found = await getPropertyConflicts({
      propertyId: targetProperty.id,
      start: rhoan.checkIn,
      end: rhoan.checkOut,
      excludeBookingId: rhoan.id,
    });
    conflicts = found.map(formatConflictRange);
    if (found.length > 0) issues.push(`Target property has ${found.length} conflict(s) for Rhoan's dates: ${conflicts.join(", ")}`);
  }

  return { rhoan, targetProperty, conflicts, issues };
}

async function checkEllen() {
  const issues: string[] = [];
  const ellen = await prisma.booking.findUnique({ where: { id: ELLEN_BOOKING_ID }, include: { property: true } });

  if (!ellen) issues.push(`Booking #${ELLEN_BOOKING_ID} not found`);
  else if (!/ellen/i.test(ellen.guestName)) issues.push(`Booking #${ELLEN_BOOKING_ID} guestName "${ellen.guestName}" doesn't look like Ellen — aborting as a safety check`);
  else {
    const onFile = ellen.checkOut.toISOString().slice(0, 10);
    if (onFile !== ELLEN_OLD_CHECKOUT) {
      issues.push(`Booking #${ELLEN_BOOKING_ID} current checkOut is ${onFile}, expected ${ELLEN_OLD_CHECKOUT} — aborting as a safety check`);
    }
  }

  let conflicts: string[] = [];
  if (ellen) {
    const found = await getPropertyConflicts({
      propertyId: ellen.propertyId,
      start: toUtcMidnight(ELLEN_OLD_CHECKOUT),
      end: toUtcMidnight(ELLEN_NEW_CHECKOUT),
      excludeBookingId: ellen.id,
    });
    conflicts = found.map(formatConflictRange);
    if (found.length > 0) issues.push(`Ellen's property has ${found.length} conflict(s) for the extra night: ${conflicts.join(", ")}`);
  }

  return { ellen, conflicts, issues };
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [rhoanPlan, ellenPlan] = await Promise.all([checkRhoan(), checkEllen()]);

  return NextResponse.json({
    note: "Applied sequentially on POST: Rhoan's move executes first, then Ellen is re-checked fresh. If Ellen's conflict below matches Rhoan's current Cozy 1-BR dates (shared inventory), it will self-resolve once Rhoan's booking moves and does not block POST.",
    rhoanClearToExecute: rhoanPlan.issues.length === 0,
    rhoanIssues: rhoanPlan.issues,
    rhoan: rhoanPlan.rhoan && {
      bookingId: rhoanPlan.rhoan.id,
      guestName: rhoanPlan.rhoan.guestName,
      currentProperty: rhoanPlan.rhoan.property.name,
      targetProperty: rhoanPlan.targetProperty?.name ?? null,
      checkIn: rhoanPlan.rhoan.checkIn.toISOString().slice(0, 10),
      checkOut: rhoanPlan.rhoan.checkOut.toISOString().slice(0, 10),
      status: rhoanPlan.rhoan.status,
      totalPrice: rhoanPlan.rhoan.totalPrice.toString(),
      willChange: "propertyId only",
      conflicts: rhoanPlan.conflicts,
    },
    ellenIssues: ellenPlan.issues,
    ellen: ellenPlan.ellen && {
      bookingId: ellenPlan.ellen.id,
      guestName: ellenPlan.ellen.guestName,
      property: ellenPlan.ellen.property.name,
      checkIn: ellenPlan.ellen.checkIn.toISOString().slice(0, 10),
      currentCheckOut: ellenPlan.ellen.checkOut.toISOString().slice(0, 10),
      newCheckOut: ELLEN_NEW_CHECKOUT,
      status: ellenPlan.ellen.status,
      currentTotalPrice: ellenPlan.ellen.totalPrice.toString(),
      newTotalPrice: ELLEN_NEW_TOTAL,
      currentNightlyTotal: ellenPlan.ellen.nightlyTotal?.toString() ?? null,
      newNightlyTotal: ellenPlan.ellen.nightlyTotal ? Number(ellenPlan.ellen.nightlyTotal) + ELLEN_NIGHTLY_DELTA : null,
      conflicts: ellenPlan.conflicts,
    },
  });
}

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actor = session.user.name ?? "Admin";
  const actorRole = (session.user.role ?? "admin") as "admin" | "manager";
  const actorId = parseInt(session.user.id);

  // ── Step 1: Rhoan's move ──────────────────────────────────────────────────
  const rhoanPlan = await checkRhoan();
  if (rhoanPlan.issues.length > 0 || !rhoanPlan.rhoan || !rhoanPlan.targetProperty) {
    return NextResponse.json({ error: "Aborted before any writes — Rhoan's plan has unresolved issues", issues: rhoanPlan.issues }, { status: 409 });
  }
  const { rhoan, targetProperty } = rhoanPlan;

  const rhoanBefore = { propertyId: rhoan.propertyId, propertyName: rhoan.property.name };
  const updatedRhoan = await prisma.booking.update({
    where: { id: rhoan.id },
    data: { propertyId: targetProperty.id },
  });
  await reconcileBookingDerivedBlocks(updatedRhoan.id);

  await logAction({
    actor,
    actorRole,
    actorId,
    action: `Manual fix: moved booking #${rhoan.id} (${rhoan.guestName}) from "${rhoanBefore.propertyName}" to "${targetProperty.name}"`,
    module: "bookings",
    target: `booking-${rhoan.id}`,
    metadata: { before: rhoanBefore, after: { propertyId: targetProperty.id, propertyName: targetProperty.name } },
  });

  // ── Step 2: Ellen's extension, re-checked against post-move state ─────────
  const ellenPlan = await checkEllen();
  if (ellenPlan.issues.length > 0 || !ellenPlan.ellen) {
    return NextResponse.json(
      {
        rhoanApplied: true,
        rhoan: { id: updatedRhoan.id, propertyId: updatedRhoan.propertyId },
        ellenApplied: false,
        error: "Rhoan's move succeeded, but Ellen's plan still has unresolved issues after re-checking — no Ellen writes made",
        issues: ellenPlan.issues,
      },
      { status: 409 }
    );
  }
  const { ellen } = ellenPlan;

  const ellenBefore = {
    checkOut: ellen.checkOut.toISOString().slice(0, 10),
    totalPrice: ellen.totalPrice.toString(),
    nightlyTotal: ellen.nightlyTotal?.toString() ?? null,
  };

  const updatedEllen = await prisma.booking.update({
    where: { id: ellen.id },
    data: {
      checkOut: toUtcMidnight(ELLEN_NEW_CHECKOUT),
      totalPrice: ELLEN_NEW_TOTAL,
      nightlyTotal: ellen.nightlyTotal ? Number(ellen.nightlyTotal) + ELLEN_NIGHTLY_DELTA : ELLEN_NIGHTLY_DELTA,
    },
  });
  await reconcileBookingDerivedBlocks(updatedEllen.id);

  await logAction({
    actor,
    actorRole,
    actorId,
    action: `Manual fix: extended booking #${ellen.id} (${ellen.guestName}) checkOut ${ellenBefore.checkOut} -> ${ELLEN_NEW_CHECKOUT}, totalPrice ${ellenBefore.totalPrice} -> ${ELLEN_NEW_TOTAL}`,
    module: "bookings",
    target: `booking-${ellen.id}`,
    metadata: { before: ellenBefore, after: { checkOut: ELLEN_NEW_CHECKOUT, totalPrice: ELLEN_NEW_TOTAL, nightlyTotal: updatedEllen.nightlyTotal?.toString() } },
  });

  return NextResponse.json({
    success: true,
    rhoanApplied: true,
    ellenApplied: true,
    rhoan: { id: updatedRhoan.id, propertyId: updatedRhoan.propertyId },
    ellen: {
      id: updatedEllen.id,
      checkOut: updatedEllen.checkOut.toISOString().slice(0, 10),
      totalPrice: updatedEllen.totalPrice.toString(),
      nightlyTotal: updatedEllen.nightlyTotal?.toString(),
    },
  });
}
