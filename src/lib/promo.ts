/**
 * Property-scope helpers.
 *
 * Several models scope themselves to a subset of properties via a `propertyIds`
 * column holding a JSON array of Property ids (DiscountCode, QuickReply, …).
 * `null` or an empty array means it applies to ALL properties (the historical
 * behavior — every record was global before scoping existed).
 */

/** Parse a stored `propertyIds` JSON string into a clean number[] (empty on any problem). */
export function parsePropertyIds(propertyIds: string | null | undefined): number[] {
  if (!propertyIds) return [];
  try {
    const ids = JSON.parse(propertyIds);
    if (!Array.isArray(ids)) return [];
    return ids.map(Number).filter((n) => Number.isInteger(n));
  } catch {
    return [];
  }
}

/** True if a record with the given stored `propertyIds` applies to `propertyId` (empty/null = all). */
export function scopeAppliesToProperty(propertyIds: string | null | undefined, propertyId: number): boolean {
  const ids = parsePropertyIds(propertyIds);
  return ids.length === 0 || ids.includes(propertyId);
}

/** @deprecated Back-compat alias for {@link scopeAppliesToProperty} — used by discount-code redemption. */
export const codeAppliesToProperty = scopeAppliesToProperty;

/**
 * Optional date-range / allowed-weekday limits on a `DiscountCode` (DEC-035).
 * `validFrom`/`validUntil` are stay-night calendar dates (UTC midnight, see
 * src/lib/dates.ts) — inclusive on both ends. `allowedWeekdays` uses the same
 * 0=Sun…6=Sat convention as `PropertyRate.dayOfWeek`. Null/empty on any field
 * means that bound is not set.
 */
export interface DiscountLimits {
  type: string; // "fixed" | "percentage"
  value: number;
  // Date objects when read straight from Prisma; ISO strings when a value has made a
  // round trip through a JSON API response (e.g. the admin client's create/update
  // responses) and been stashed back into component state alongside RSC-served rows.
  validFrom?: Date | string | null;
  validUntil?: Date | string | null;
  allowedWeekdays?: number[] | null;
}

interface NightForDiscount {
  date: string; // YYYY-MM-DD
  rate: number;
}

/** Parse a stored `allowedWeekdays` JSON string into a clean 0–6 int[] (empty on any problem). */
export function parseAllowedWeekdays(allowedWeekdays: string | null | undefined): number[] {
  if (!allowedWeekdays) return [];
  try {
    const days = JSON.parse(allowedWeekdays);
    if (!Array.isArray(days)) return [];
    return [...new Set(days.map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))];
  } catch {
    return [];
  }
}

function utcMidnightFromDateish(d: Date | string): Date {
  if (typeof d === "string") {
    const bare = /^\d{4}-\d{2}-\d{2}$/.test(d.trim());
    const parsed = new Date(bare ? `${d.trim()}T00:00:00Z` : d);
    return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
  }
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Does this single stay night (YYYY-MM-DD) satisfy every bound that is set on this code? */
export function nightQualifiesForDiscount(
  date: string,
  limits: Pick<DiscountLimits, "validFrom" | "validUntil" | "allowedWeekdays">
): boolean {
  const night = utcMidnightFromDateish(date);
  if (limits.validFrom && night < utcMidnightFromDateish(limits.validFrom)) return false;
  if (limits.validUntil && night > utcMidnightFromDateish(limits.validUntil)) return false;
  const weekdays = limits.allowedWeekdays ?? [];
  if (weekdays.length > 0 && !weekdays.includes(night.getUTCDay())) return false;
  return true;
}

const WEEKDAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEKDAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatWeekdayList(weekdays: number[], opts: { abbr?: boolean } = {}): string {
  const names = opts.abbr ? WEEKDAY_ABBR : WEEKDAY_FULL;
  const sorted = [...new Set(weekdays)].sort((a, b) => a - b);
  const isContiguous = sorted.length > 1 && sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);
  if (isContiguous) return `${names[sorted[0]]}–${names[sorted[sorted.length - 1]]}`;
  return sorted.map((d) => names[d]).join(", ");
}

function formatPromoDate(d: Date | string): string {
  const date = utcMidnightFromDateish(d);
  return `${date.getUTCDate()} ${MONTH_ABBR[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function formatDateRangePart(validFrom?: Date | string | null, validUntil?: Date | string | null): string {
  if (validFrom && validUntil) return `from ${formatPromoDate(validFrom)} to ${formatPromoDate(validUntil)}`;
  if (validUntil) return `until ${formatPromoDate(validUntil)}`;
  if (validFrom) return `from ${formatPromoDate(validFrom)}`;
  return "";
}

/** Short admin-facing summary, e.g. "Sun–Thu, until 18 Dec 2026" or "No date/day limits". */
export function describeDiscountLimits(limits: Pick<DiscountLimits, "validFrom" | "validUntil" | "allowedWeekdays">): string {
  const weekdays = limits.allowedWeekdays ?? [];
  const hasWeekday = weekdays.length > 0;
  const hasDate = !!(limits.validFrom || limits.validUntil);
  if (!hasWeekday && !hasDate) return "No date/day limits";
  const parts: string[] = [];
  if (hasWeekday) parts.push(formatWeekdayList(weekdays, { abbr: true }));
  if (hasDate) parts.push(formatDateRangePart(limits.validFrom, limits.validUntil));
  return parts.join(", ");
}

/** Clear, short English guest message for a code whose limits reject every night of a stay. */
export function buildPromoRejectionMessage(limits: Pick<DiscountLimits, "validFrom" | "validUntil" | "allowedWeekdays">): string {
  const weekdays = limits.allowedWeekdays ?? [];
  const hasWeekday = weekdays.length > 0;
  const hasDate = !!(limits.validFrom || limits.validUntil);
  if (hasWeekday && hasDate) {
    return `This code is only valid on ${formatWeekdayList(weekdays)} nights, ${formatDateRangePart(limits.validFrom, limits.validUntil)}. None of the nights in this stay qualify.`;
  }
  if (hasWeekday) {
    return `This code is only valid on ${formatWeekdayList(weekdays)} nights. None of the nights in this stay qualify.`;
  }
  if (hasDate) {
    return `This code is only valid for nights ${formatDateRangePart(limits.validFrom, limits.validUntil)}. None of the nights in this stay qualify.`;
  }
  return "This code doesn't apply to any night of this stay.";
}

export interface PromoEvaluation {
  ok: boolean;
  discountAmount: number;
  qualifyingNightCount: number;
  totalNightCount: number;
  /** Guest-facing reason, present only when `ok` is false. */
  rejectionMessage?: string;
}

/**
 * Pure DEC-035 mixed-stay evaluator: given a code's limits and the stay's per-night
 * server rates, returns which nights qualify and the resulting discount. A percentage
 * discounts the qualifying-nights subtotal only; a fixed amount is capped at that same
 * subtotal so it can never eat a non-qualifying night. Zero qualifying nights (on a
 * non-empty stay) is a rejection, not a silent ₱0 discount — `computeBookingQuote` and
 * `POST /api/discount-codes/validate` both call this so eligibility/amount can never
 * drift between the two.
 */
export function evaluatePromoDiscount(limits: DiscountLimits, dailyRates: NightForDiscount[]): PromoEvaluation {
  const totalNightCount = dailyRates.length;
  const qualifyingNights = dailyRates.filter((r) => nightQualifiesForDiscount(r.date, limits));
  const qualifyingNightCount = qualifyingNights.length;

  if (qualifyingNightCount === 0 && totalNightCount > 0) {
    return {
      ok: false,
      discountAmount: 0,
      qualifyingNightCount,
      totalNightCount,
      rejectionMessage: buildPromoRejectionMessage(limits),
    };
  }

  const qualifyingSubtotal = qualifyingNights.reduce((sum, r) => sum + r.rate, 0);
  const discountAmount =
    limits.type === "percentage"
      ? Math.round(qualifyingSubtotal * (limits.value / 100) * 100) / 100
      : Math.min(limits.value, qualifyingSubtotal);

  return { ok: true, discountAmount, qualifyingNightCount, totalNightCount };
}

export interface ParsedDiscountLimitsInput {
  validFrom: Date | null;
  validUntil: Date | null;
  allowedWeekdays: string | null; // ready to store in DiscountCode.allowedWeekdays
}

export type ParseDiscountLimitsResult =
  | { ok: true; limits: ParsedDiscountLimitsInput }
  | { ok: false; error: string };

/**
 * Validate and normalize the admin create/edit form's optional limit fields.
 * Accepts `validFrom`/`validUntil` as `YYYY-MM-DD` strings (or null/empty to clear) and
 * `allowedWeekdays` as a number[] (or null/empty to clear — "every weekday", same as null).
 */
export function parseDiscountLimitsInput(body: {
  validFrom?: unknown;
  validUntil?: unknown;
  allowedWeekdays?: unknown;
}): ParseDiscountLimitsResult {
  const validFrom =
    typeof body.validFrom === "string" && body.validFrom.trim() ? utcMidnightFromDateish(body.validFrom) : null;
  const validUntil =
    typeof body.validUntil === "string" && body.validUntil.trim() ? utcMidnightFromDateish(body.validUntil) : null;

  if (validFrom && isNaN(validFrom.getTime())) return { ok: false, error: "Invalid validFrom date" };
  if (validUntil && isNaN(validUntil.getTime())) return { ok: false, error: "Invalid validUntil date" };
  if (validFrom && validUntil && validFrom > validUntil) {
    return { ok: false, error: "Valid-from date must not be after the valid-until date" };
  }

  let allowedWeekdays: string | null = null;
  if (Array.isArray(body.allowedWeekdays) && body.allowedWeekdays.length > 0) {
    const days = [...new Set(body.allowedWeekdays.map(Number))];
    if (days.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) {
      return { ok: false, error: "allowedWeekdays must each be an integer 0–6 (0=Sunday)" };
    }
    allowedWeekdays = JSON.stringify(days.sort((a, b) => a - b));
  }

  return { ok: true, limits: { validFrom, validUntil, allowedWeekdays } };
}
