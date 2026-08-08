/**
 * Which booking statuses make dates unavailable.
 *
 * Lives in its own module so both the availability service and the shared-inventory
 * reconciler can depend on it without an import cycle (availability → external-calendar-sync
 * → inventory-groups would otherwise loop back to availability).
 *
 * `pending` blocks: an unpaid request holds its dates until an admin cancels it. That has
 * always been this site's behaviour — it was previously hard-coded as
 * `["confirmed", "pending"]` in three separate route handlers with no shared constant.
 *
 * Changing this list changes both what the public date picker rejects AND what propagates
 * to shared-inventory siblings, so it is intentionally a single edit point.
 */

export const BLOCKING_BOOKING_STATUSES = ["pending", "confirmed"] as const;

export type BookingStatus = "pending" | "confirmed" | "cancelled";

export function bookingBlocksAvailability(status: string): boolean {
  return (BLOCKING_BOOKING_STATUSES as readonly string[]).includes(status);
}
