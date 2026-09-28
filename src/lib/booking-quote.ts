import { prisma } from "@/lib/prisma";
import { getDailyRates, sumDailyRates, calcStripeFee, calcExtraGuestFee, type DailyRateEntry } from "@/lib/pricing";
import { codeAppliesToProperty } from "@/lib/promo";
import { toUtcMidnight } from "@/lib/dates";

export { toStripeAmount, STRIPE_CURRENCY } from "@/lib/stripe-payment";

/**
 * Server-authoritative price for a stay — the single computation behind both the
 * Stripe PaymentIntent amount (/api/stripe/payment-intent) and the booking record
 * (/api/bookings). Nothing here reads a client-supplied total: the card is charged
 * exactly what this returns, and the booking route re-runs it to verify the payment.
 *
 * Availability is deliberately NOT checked here — callers choose their own sync policy.
 */
export interface BookingQuote {
  propertyId: number;
  property: {
    name: string;
    maxGuests: number;
    includedGuests: number;
    extraGuestFeePerNight: number;
  };
  checkInDate: Date;
  checkOutDate: Date;
  guestCount: number;
  dailyRates: DailyRateEntry[];
  nightlyTotal: number;
  extraGuestFee: number;
  discountCode: string | null;
  discountAmount: number;
  stripeFee: number;
  total: number;
}

export type BookingQuoteResult =
  | { ok: true; quote: BookingQuote }
  | { ok: false; status: number; error: string };

export async function computeBookingQuote(input: {
  propertyId: unknown;
  checkIn: string;
  checkOut: string;
  guests: unknown;
  discountCode?: string | null;
  paymentMethod?: string | null;
}): Promise<BookingQuoteResult> {
  const propertyId = Number(input.propertyId);

  // Stay dates are calendar dates anchored at UTC midnight — see src/lib/dates.ts.
  const checkInDate  = toUtcMidnight(input.checkIn);
  const checkOutDate = toUtcMidnight(input.checkOut);

  if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime()) || checkOutDate <= checkInDate) {
    return { ok: false, status: 400, error: "Invalid check-in / check-out dates" };
  }

  // ── Property lookup ───────────────────────────────────────────────────────
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      name: true,
      pricePerNight: true,
      maxGuests: true,
      includedGuests: true,
      extraGuestFeePerNight: true,
      rates: { select: { rateType: true } },
    },
  });

  if (!property) return { ok: false, status: 404, error: "Property not found" };

  // ── Guest capacity guard ────────────────────────────────────────────────────
  // The booking form caps the guest dropdown at maxGuests, but never trust the client:
  // reject anything over capacity (or a non-positive count) server-side.
  const guestCount = Number(input.guests) || 1;
  if (guestCount < 1 || guestCount > property.maxGuests) {
    return {
      ok: false,
      status: 400,
      error: `This property accommodates up to ${property.maxGuests} guest${property.maxGuests !== 1 ? "s" : ""}.`,
    };
  }

  // ── Pricing guard ──────────────────────────────────────────────────────────
  // Never let an unpriced property be booked (would otherwise charge ₱0).
  if (Number(property.pricePerNight) <= 0) {
    return { ok: false, status: 400, error: "This property isn't available for booking yet — pricing hasn't been set up." };
  }
  // Weekend rate is required: block a stay that includes a Fri/Sat when no weekend rate exists.
  const hasWeekendRate = property.rates.some((r) => r.rateType === "weekend");
  if (!hasWeekendRate) {
    let stayHasWeekend = false;
    for (const d = new Date(checkInDate); d < checkOutDate; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay();
      if (dow === 5 || dow === 6) { stayHasWeekend = true; break; }
    }
    if (stayHasWeekend) {
      return { ok: false, status: 400, error: "Weekend pricing for these dates isn't available yet. Please contact us or choose different dates." };
    }
  }

  // ── Compute server-side pricing ──────────────────────────────────────────
  const dailyRates = await getDailyRates(
    propertyId,
    checkInDate,
    checkOutDate,
    Number(property.pricePerNight)
  );
  const nightlyTotal = sumDailyRates(dailyRates);

  // ── Discount code validation ──────────────────────────────────────────────
  // The discount base is the SERVER nightly total. It used to be the client-sent
  // nightlyTotal/totalPrice, which let a tampered request inflate a percentage (or
  // uncap a fixed) discount. Same formulas as /api/discount-codes/validate (UI preview).
  let discountCode: string | null = null;
  let discountAmount: number = 0;

  if (typeof input.discountCode === "string" && input.discountCode.trim()) {
    const codeUpper = input.discountCode.trim().toUpperCase();
    const discount = await prisma.discountCode.findUnique({
      where: { code: codeUpper },
    });

    if (discount && discount.isActive && codeAppliesToProperty(discount.propertyIds, propertyId)) {
      if (discount.maxUses === null || discount.usageCount < discount.maxUses) {
        if (discount.type === "percentage") {
          discountAmount = Math.round(nightlyTotal * (Number(discount.value) / 100) * 100) / 100;
        } else {
          discountAmount = Math.min(Number(discount.value), nightlyTotal);
        }
        discountCode = codeUpper;
      }
    }
  }

  // Extra-guest fee — recomputed from the property's own fields (never trust the client total).
  // Promo discounts the nightly base only; the fee is added on top, then Stripe's 6% on the full amount.
  const extraGuestFee = calcExtraGuestFee(
    guestCount,
    property.includedGuests,
    Number(property.extraGuestFeePerNight),
    dailyRates.length
  );
  const chargeBeforeStripe = nightlyTotal + extraGuestFee - discountAmount;
  const stripeFee = input.paymentMethod === "stripe" ? calcStripeFee(chargeBeforeStripe) : 0;
  const total = chargeBeforeStripe + stripeFee;

  return {
    ok: true,
    quote: {
      propertyId,
      property: {
        name: property.name,
        maxGuests: property.maxGuests,
        includedGuests: property.includedGuests,
        extraGuestFeePerNight: Number(property.extraGuestFeePerNight),
      },
      checkInDate,
      checkOutDate,
      guestCount,
      dailyRates,
      nightlyTotal,
      extraGuestFee,
      discountCode,
      discountAmount,
      stripeFee,
      total,
    },
  };
}
