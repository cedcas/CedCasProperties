// Early Check-In / Late Checkout are billed through the existing AdditionalCharge
// flow as a specialized creation mode — same model, same routes, no parallel system.
// Single source of truth for the published ₱200/hour rate so the admin API and UI
// can't drift from each other.
export const HOURLY_FEE_RATE = 200;

export type HourlyFeeType = "early_checkin" | "late_checkout";

export const HOURLY_FEE_LABELS: Record<HourlyFeeType, string> = {
  early_checkin: "Early Check-In",
  late_checkout: "Late Checkout",
};

export function isHourlyFeeType(value: unknown): value is HourlyFeeType {
  return value === "early_checkin" || value === "late_checkout";
}

// Whole hours only — no fractional-quantity precedent exists elsewhere in this
// codebase's pricing logic (nights/guests are always integers).
export function isValidHours(hours: unknown): hours is number {
  return typeof hours === "number" && Number.isInteger(hours) && hours > 0;
}

export function buildHourlyFeeDescription(feeType: HourlyFeeType, hours: number): string {
  return `${HOURLY_FEE_LABELS[feeType]} — ${hours} hour${hours === 1 ? "" : "s"} (₱${HOURLY_FEE_RATE}/hr)`;
}
