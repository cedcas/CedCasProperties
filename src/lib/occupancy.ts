/**
 * Public-facing occupancy + extra-guest-fee copy.
 *
 * Reads the same three `Property` fields the booking calculator uses
 * (`maxGuests`, `includedGuests`, `extraGuestFeePerNight`) so the displayed
 * note can never drift from what `calcExtraGuestFee` charges at booking.
 * Prisma-free on purpose — safe to import into any server component that
 * already has the property record.
 */

export interface OccupancyFee {
  maxGuests: number;
  includedGuests: number;
  extraGuestFeePerNight: number; // caller passes Number(property.extraGuestFeePerNight)
}

const peso = (n: number) => `₱${Math.round(n).toLocaleString("en-PH")}`;
const guestWord = (n: number) => (n === 1 ? "guest" : "guests");

/**
 * The fee can ever apply only when it's set AND the included threshold is
 * below max occupancy. Mirrors the admin's "leave the fee at 0 to disable"
 * rule and `calcExtraGuestFee`'s `feePerNight <= 0` short-circuit.
 */
export function extraGuestFeeApplies(f: OccupancyFee): boolean {
  return f.extraGuestFeePerNight > 0 && f.includedGuests < f.maxGuests;
}

/** Full occupancy + fee sentence for the property detail page. */
export function buildOccupancyNote(f: OccupancyFee): string {
  if (!extraGuestFeeApplies(f)) {
    return `Sleeps up to ${f.maxGuests}. All guests included in the nightly rate.`;
  }
  return `Sleeps up to ${f.maxGuests}. The nightly rate covers ${f.includedGuests} ${guestWord(
    f.includedGuests
  )} — additional guests are ${peso(f.extraGuestFeePerNight)}/guest per night. Full breakdown shown at booking; no hidden fees.`;
}
