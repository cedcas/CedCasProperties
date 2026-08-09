/**
 * Pure pricing math — no Prisma, no server-only imports.
 *
 * Split out of `lib/pricing.ts` so client components (BookingCard, BookingForm)
 * can share the exact formulas the booking API charges with, instead of keeping
 * their own drifting copies. `lib/pricing.ts` re-exports everything here, so
 * existing server-side importers are unaffected.
 */

export const STRIPE_FEE_RATE = 0.06; // 6%

export interface DailyRateEntry {
  date: string; // YYYY-MM-DD
  rate: number;
  note?: string | null;
}

export function sumDailyRates(entries: DailyRateEntry[]): number {
  return entries.reduce((sum, e) => sum + e.rate, 0);
}

export function calcStripeFee(nightlyTotal: number): number {
  return Math.round(nightlyTotal * STRIPE_FEE_RATE * 100) / 100;
}

/**
 * Extra-guest fee for a stay: ₱fee × (guests − includedGuests) × nights.
 * Returns 0 when disabled (fee ≤ 0), within the included threshold, or for an empty stay.
 */
export function calcExtraGuestFee(
  guests: number,
  includedGuests: number,
  feePerNight: number,
  nights: number
): number {
  if (feePerNight <= 0 || guests <= includedGuests || nights <= 0) return 0;
  return Math.round((guests - includedGuests) * feePerNight * nights * 100) / 100;
}
