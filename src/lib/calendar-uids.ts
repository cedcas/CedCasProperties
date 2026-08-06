/**
 * Deterministic iCalendar UIDs.
 *
 * Every UID is a pure function of database ids, which buys two things at once:
 *
 *  1. **Feed stability** — a consumer (Airbnb, Google Calendar) sees the same UID for
 *     the same underlying record forever, so it can tell a real change from a re-fetch.
 *     UIDs are never generated per request.
 *  2. **Idempotency** — `AvailabilityBlock.externalUid` is UNIQUE, so a derived UID
 *     doubles as the upsert key. Reprocessing the same source can only ever update the
 *     existing row, never create a duplicate, even if two syncs run concurrently.
 *
 * `booking-{id}@haveninlipa.com` predates this module and is reproduced exactly —
 * changing it would orphan every event already in an external calendar.
 */

const DOMAIN = "haveninlipa.com";

/** A HIL booking on its own property. Unchanged since the original export route. */
export function bookingUid(bookingId: number): string {
  return `booking-${bookingId}@${DOMAIN}`;
}

/** An admin-created manual block (maintenance, owner use, …). */
export function manualBlockUid(blockId: number): string {
  return `manual-block-${blockId}@${DOMAIN}`;
}

/** Sibling block generated because a booking occupies another member of the group. */
export function bookingDerivedBlockUid(sourceBookingId: number, targetPropertyId: number): string {
  return `inventory-block-booking-${sourceBookingId}-property-${targetPropertyId}@${DOMAIN}`;
}

/** Sibling block generated from an imported external calendar event. */
export function externalDerivedBlockUid(
  sourceExternalEventId: number,
  targetPropertyId: number
): string {
  return `inventory-block-external-${sourceExternalEventId}-property-${targetPropertyId}@${DOMAIN}`;
}

/** Sibling block generated from a group-scoped manual block. */
export function manualDerivedBlockUid(sourceBlockId: number, targetPropertyId: number): string {
  return `inventory-block-manual-${sourceBlockId}-property-${targetPropertyId}@${DOMAIN}`;
}

export type DerivedSourceKind = "booking" | "external_event" | "block";

/** Dispatch to the right derived-UID builder for a source kind. */
export function derivedBlockUid(
  kind: DerivedSourceKind,
  sourceId: number,
  targetPropertyId: number
): string {
  switch (kind) {
    case "booking":
      return bookingDerivedBlockUid(sourceId, targetPropertyId);
    case "external_event":
      return externalDerivedBlockUid(sourceId, targetPropertyId);
    case "block":
      return manualDerivedBlockUid(sourceId, targetPropertyId);
  }
}

/**
 * Stable fallback UID for a feed event that omits UID. Derived from the property and
 * the date range so the same event keeps its identity across syncs instead of being
 * treated as removed-then-recreated on every run. Airbnb always emits a UID; this is
 * belt-and-braces for other channels.
 */
export function syntheticExternalUid(startKey: string, endKey: string): string {
  return `synthetic-${startKey.replace(/-/g, "")}-${endKey.replace(/-/g, "")}@imported`;
}
