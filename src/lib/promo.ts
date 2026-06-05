/**
 * Promo-code scope helpers.
 *
 * A DiscountCode's `propertyIds` column holds a JSON array of Property ids.
 * `null` or an empty array means the code applies to ALL properties (the
 * historical behavior — every code was global before scoping existed).
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

/** True if a code with the given stored `propertyIds` may be redeemed on `propertyId`. */
export function codeAppliesToProperty(propertyIds: string | null | undefined, propertyId: number): boolean {
  const ids = parsePropertyIds(propertyIds);
  return ids.length === 0 || ids.includes(propertyId);
}
