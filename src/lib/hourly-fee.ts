// Early Check-In / Late Checkout are billed through the existing AdditionalCharge
// flow as a specialized creation mode — same model, same routes, no parallel system.
// Single source of truth for the published per-listing rate so the admin API, the admin
// UI, and Haven can't drift from each other or from one another's listing group.
//
// Per-listing rate (DEC-036, superseding the old flat ₱200/hour from DEC-014): ₱400/hour
// for the three Mickey in Lipa (B38) listings, ₱300/hour for the two Original Haven in
// Lipa (B34) listings. There is no flat/default rate — an unrecognized listing returns
// `null` from `hourlyFeeRateFor` rather than silently falling back to either number.

export type HourlyFeeType = "early_checkin" | "late_checkout";

export const HOURLY_FEE_LABELS: Record<HourlyFeeType, string> = {
  early_checkin: "Early Check-In",
  late_checkout: "Late Checkout",
};

/** Every Mickey in Lipa (B38) listing's slug begins with this prefix. */
const MICKEY_SLUG_PREFIX = "mickey-in-lipa";
/** The two Original Haven in Lipa (B34) listings. */
const ORIGINAL_HAVEN_SLUGS = new Set(["cozy-1-bedroom", "spacious-2-bedroom"]);

export const HOURLY_FEE_RATE_MICKEY = 400;
export const HOURLY_FEE_RATE_ORIGINAL_HAVEN = 300;

/** Guest-facing both-rates phrase for when the listing isn't known yet. */
export const HOURLY_FEE_RATES_DESCRIPTION =
  `₱${HOURLY_FEE_RATE_MICKEY}/hour for Mickey in Lipa listings, ₱${HOURLY_FEE_RATE_ORIGINAL_HAVEN}/hour for Original Haven in Lipa listings`;

export type PropertyLike = { slug?: string | null } | string | null | undefined;

function slugOf(property: PropertyLike): string | null {
  if (typeof property === "string") return property;
  return property?.slug ?? null;
}

/**
 * The published early check-in / late checkout hourly rate for a specific listing.
 * Returns `null` for an unrecognized or missing listing — callers must never substitute
 * either group's rate as a default; fall back to `HOURLY_FEE_RATES_DESCRIPTION` instead.
 */
export function hourlyFeeRateFor(property: PropertyLike): number | null {
  const slug = slugOf(property);
  if (!slug) return null;
  if (slug.startsWith(MICKEY_SLUG_PREFIX)) return HOURLY_FEE_RATE_MICKEY;
  if (ORIGINAL_HAVEN_SLUGS.has(slug)) return HOURLY_FEE_RATE_ORIGINAL_HAVEN;
  return null;
}

/** "₱400/hour" for a known listing, or the both-rates description when the listing is unknown. */
export function hourlyFeeLabelFor(property: PropertyLike): string {
  const rate = hourlyFeeRateFor(property);
  return rate !== null ? `₱${rate}/hour` : HOURLY_FEE_RATES_DESCRIPTION;
}

export function isHourlyFeeType(value: unknown): value is HourlyFeeType {
  return value === "early_checkin" || value === "late_checkout";
}

// Whole hours only — no fractional-quantity precedent exists elsewhere in this
// codebase's pricing logic (nights/guests are always integers).
export function isValidHours(hours: unknown): hours is number {
  return typeof hours === "number" && Number.isInteger(hours) && hours > 0;
}

/**
 * Admin-charge description text. `rate` must be resolved by the caller from the booking's
 * own property (via `hourlyFeeRateFor`) — never a flat default, since the rate depends on
 * which listing the booking is for.
 */
export function buildHourlyFeeDescription(feeType: HourlyFeeType, hours: number, rate: number): string {
  return `${HOURLY_FEE_LABELS[feeType]} — ${hours} hour${hours === 1 ? "" : "s"} (₱${rate}/hr)`;
}
