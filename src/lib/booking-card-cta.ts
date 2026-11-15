/**
 * Pure CTA readiness/label logic for the listing-page booking widget
 * (src/components/ui/BookingCard.tsx). Extracted so the DEC-034 behavior
 * change — the CTA no longer waits on a property-rules checkbox, only on
 * dates and availability — is unit-testable without a DOM/React renderer
 * (this repo has no component-rendering test harness; pure functions are the
 * established pattern for anything that needs CI coverage).
 *
 * Property-rules agreement moved to checkout (BookingForm.tsx's form and
 * payment steps already gate on it there) — notice there is no rules/agreed
 * parameter here at all, which is the fix: this function cannot reintroduce
 * that gate by accident.
 */
export type BookingAvailability = "idle" | "checking" | "available" | "unavailable";

export type BookingCtaState = {
  notPriced: boolean;
  availability: BookingAvailability;
  nights: number;
  stayTotal: number;
};

export function isBookingCtaDisabled(state: Pick<BookingCtaState, "notPriced" | "availability">): boolean {
  return state.notPriced || state.availability === "unavailable" || state.availability === "checking";
}

export function bookingCtaLabel(state: BookingCtaState): string {
  if (state.notPriced) return "Not Available Yet";
  if (state.availability === "unavailable") return "Dates Not Available";
  if (state.nights > 0) return `Book — ₱${Math.round(state.stayTotal).toLocaleString()}`;
  return "Continue to Book";
}
