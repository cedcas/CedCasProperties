import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/log";
import { toUtcMidnight } from "@/lib/dates";
import { computeBookingQuote } from "@/lib/booking-quote";
import { getPropertyConflicts, formatConflictRange } from "@/lib/availability";
import { reconcileBookingDerivedBlocks } from "@/lib/inventory-groups";

/**
 * TEMPORARY one-off admin route — 2026-09-27 manual booking requested by the Owner.
 * Delete this file once the booking is confirmed created. Do not generalize it.
 *
 * Repeat guest Kiel Portes paid by GCash directly but never completed the booking flow
 * (never tapped "I Paid"), so no Booking row exists. This creates it:
 *   Mickey in Lipa — Sleeps 7, check-in 2026-09-28, check-out 2026-09-29.
 *
 * Contact details (email/phone) and the default guest count come from the guest's most
 * recent prior booking. Price is the server quote for a GCash booking (no Stripe fee)
 * with promo KIEL-400 applied — the same computation /api/bookings uses — and must equal
 * the ₱2,100 the Owner actually received, or nothing is written.
 *
 * Created as "pending", exactly like a normal GCash booking. The Owner then sets it to
 * Confirmed in /admin/bookings, which runs the usual confirmation path (guest email,
 * scheduled messages, shared-inventory blocks) — nothing here re-implements that.
 *
 * GET  = dry run (no writes). POST = create, after re-running every check.
 */

const GUEST_NAME = "Kiel Portes";
const GUEST_NAME_PATTERN = /kiel/i;
const GUEST_SURNAME = "Portes";
const TARGET_SLUG = "mickey-in-lipa--family-staycation--sleeps-7";
const CHECK_IN = "2026-09-28";
const CHECK_OUT = "2026-09-29";
/** null = use the guest count from the prior booking. Set a number if the Owner says otherwise. */
const GUESTS_OVERRIDE: number | null = null;
const DISCOUNT_CODE = "KIEL-400";
/** What the Owner received via GCash. The server quote must match exactly. */
const EXPECTED_TOTAL = 2100;
const NOTES = "Manual entry by admin — guest paid via GCash directly without completing the online booking flow.";

async function buildPlan() {
  const issues: string[] = [];

  const [property, priorBookings] = await Promise.all([
    prisma.property.findUnique({ where: { slug: TARGET_SLUG }, select: { id: true, name: true } }),
    prisma.booking.findMany({
      where: { guestName: { contains: GUEST_SURNAME } },
      orderBy: { createdAt: "desc" },
      include: { property: { select: { name: true } } },
    }),
  ]);

  const matches = priorBookings.filter((b) => GUEST_NAME_PATTERN.test(b.guestName));
  const prior = matches[0] ?? null;

  if (!property) issues.push(`Property with slug "${TARGET_SLUG}" not found`);
  if (!prior) issues.push(`No prior booking found for "${GUEST_NAME}" — can't source email/phone`);

  // Idempotency: if the guest (or a previous POST) already created this stay, stop.
  const checkInDate = toUtcMidnight(CHECK_IN);
  const checkOutDate = toUtcMidnight(CHECK_OUT);
  const duplicate = matches.find(
    (b) =>
      property && b.propertyId === property.id &&
      b.status !== "cancelled" &&
      b.checkIn.getTime() === checkInDate.getTime() &&
      b.checkOut.getTime() === checkOutDate.getTime()
  );
  if (duplicate) issues.push(`Booking #${duplicate.id} for this guest/property/dates already exists (status ${duplicate.status}) — nothing to create`);

  const guests = GUESTS_OVERRIDE ?? prior?.guests ?? 1;

  let quote = null;
  let conflicts: string[] = [];
  if (property) {
    const result = await computeBookingQuote({
      propertyId: property.id,
      checkIn: CHECK_IN,
      checkOut: CHECK_OUT,
      guests,
      discountCode: DISCOUNT_CODE,
      paymentMethod: "gcash",
    });
    if (!result.ok) issues.push(`Quote failed: ${result.error}`);
    else {
      quote = result.quote;
      // computeBookingQuote silently drops a code that is inactive, used up, or not valid
      // for this property — surface that instead of quietly booking at full price.
      if (quote.discountCode !== DISCOUNT_CODE) issues.push(`Promo ${DISCOUNT_CODE} was not applied (inactive, used up, or not valid for this property)`);
      if (quote.total !== EXPECTED_TOTAL) issues.push(`Quote total ₱${quote.total} does not match the ₱${EXPECTED_TOTAL} received`);
    }

    const found = await getPropertyConflicts({
      propertyId: property.id,
      start: checkInDate,
      end: checkOutDate,
      syncPolicy: "booking",
    });
    conflicts = found.map((c) => `${c.kind}: ${formatConflictRange(c)}`);
    if (found.length > 0) issues.push(`Property has ${found.length} conflict(s) for these dates: ${conflicts.join(", ")}`);
  }

  return { issues, property, prior, matches, guests, quote, conflicts };
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plan = await buildPlan();

  return NextResponse.json({
    clearToExecute: plan.issues.length === 0,
    issues: plan.issues,
    willCreate: {
      guestName: GUEST_NAME,
      guestEmail: plan.prior?.guestEmail ?? null,
      guestPhone: plan.prior?.guestPhone ?? null,
      property: plan.property?.name ?? null,
      checkIn: CHECK_IN,
      checkOut: CHECK_OUT,
      guests: plan.guests,
      guestsSource: GUESTS_OVERRIDE !== null ? "override" : "prior booking",
      nightlyTotal: plan.quote?.nightlyTotal ?? null,
      extraGuestFee: plan.quote?.extraGuestFee ?? null,
      discountCode: plan.quote?.discountCode ?? null,
      discountAmount: plan.quote?.discountAmount ?? null,
      totalPrice: plan.quote?.total ?? null,
      expectedTotal: EXPECTED_TOTAL,
      paymentMethod: "gcash",
      status: "pending",
      notes: NOTES,
    },
    conflicts: plan.conflicts,
    priorBookingsForGuest: plan.matches.map((b) => ({
      id: b.id,
      guestName: b.guestName,
      property: b.property.name,
      checkIn: b.checkIn.toISOString().slice(0, 10),
      checkOut: b.checkOut.toISOString().slice(0, 10),
      guests: b.guests,
      status: b.status,
    })),
  });
}

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plan = await buildPlan();
  if (plan.issues.length > 0 || !plan.property || !plan.prior || !plan.quote) {
    return NextResponse.json({ error: "Aborted before any writes", issues: plan.issues }, { status: 409 });
  }
  const { property, prior, quote } = plan;

  const booking = await prisma.booking.create({
    data: {
      propertyId: property.id,
      guestName: GUEST_NAME,
      guestEmail: prior.guestEmail,
      guestPhone: prior.guestPhone,
      checkIn: quote.checkInDate,
      checkOut: quote.checkOutDate,
      guests: quote.guestCount,
      totalPrice: quote.total,
      nightlyTotal: quote.nightlyTotal,
      extraGuestFee: quote.extraGuestFee > 0 ? quote.extraGuestFee : null,
      discountCode: quote.discountCode,
      discountAmount: quote.discountAmount > 0 ? quote.discountAmount : null,
      paymentMethod: "gcash",
      status: "pending",
      notes: NOTES,
    },
  });

  // Count the promo use, same as /api/bookings.
  await prisma.discountCode.update({
    where: { code: DISCOUNT_CODE },
    data: { usageCount: { increment: 1 } },
  });

  // Shared inventory: block the same nights on sibling listings (same as /api/bookings).
  await reconcileBookingDerivedBlocks(booking.id);

  await logAction({
    actor: session.user.name ?? "Admin",
    actorRole: (session.user.role ?? "admin") as "admin" | "manager",
    actorId: parseInt(session.user.id),
    action: `Manual booking: created #${booking.id} for ${GUEST_NAME} at "${property.name}" ${CHECK_IN} → ${CHECK_OUT} (GCash paid directly)`,
    module: "bookings",
    target: `booking-${booking.id}`,
    metadata: { sourcePriorBookingId: prior.id, guests: quote.guestCount, discountCode: DISCOUNT_CODE, totalPrice: quote.total },
  });

  return NextResponse.json({
    success: true,
    bookingId: booking.id,
    status: booking.status,
    totalPrice: booking.totalPrice.toString(),
    next: `Set booking #${booking.id} to Confirmed in /admin/bookings to send the guest confirmation.`,
  });
}
