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
