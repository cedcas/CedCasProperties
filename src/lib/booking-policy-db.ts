import { prisma } from "@/lib/prisma";
import { utcDateKey } from "@/lib/dates";
import {
  normalizeBookingPolicy,
  normalizeInstantBookingMode,
  type BookingPolicy,
  type InstantBookingMode,
} from "@/lib/booking-policy";

/**
 * A listing's stored advance-notice settings. Kept apart from booking-policy.ts so the
 * rule itself stays free of the database. A missing property gets the permissive default —
 * the caller's own property lookup is what reports "not found".
 */
export async function loadBookingPolicy(propertyId: number): Promise<BookingPolicy> {
  const row = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { advanceNoticeDays: true, sameDayCutoffMinutes: true },
  });
  return normalizeBookingPolicy(row);
}

/** Advance notice and the Instant Booking mode together — what the guest routes need. */
export async function loadBookingRules(
  propertyId: number
): Promise<{ policy: BookingPolicy; instantBookingMode: InstantBookingMode }> {
  const row = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { advanceNoticeDays: true, sameDayCutoffMinutes: true, instantBookingMode: true },
  });
  return { policy: normalizeBookingPolicy(row), instantBookingMode: normalizeInstantBookingMode(row?.instantBookingMode) };
}

/**
 * When the guest reached the payment screen, for the grace rule at final submission
 * (GCash/BPI — a card uses its verified PaymentIntent instead). Only an attempt recorded
 * for this same listing and check-in counts; the token comes from the browser.
 */
export async function checkoutAttemptStartedAt(
  token: unknown,
  stay: { propertyId: number; checkIn: Date }
): Promise<Date | null> {
  if (typeof token !== "string" || !token) return null;
  const attempt = await prisma.checkoutAttempt.findUnique({
    where: { token },
    select: { propertyId: true, checkIn: true, createdAt: true },
  });
  if (!attempt || attempt.propertyId !== stay.propertyId) return null;
  if (utcDateKey(attempt.checkIn) !== utcDateKey(stay.checkIn)) return null;
  return attempt.createdAt;
}
