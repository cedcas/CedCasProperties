/**
 * Which booking statuses make dates unavailable.
 *
 * Lives in its own module so both the availability service and the shared-inventory
 * reconciler can depend on it without an import cycle (availability → external-calendar-sync
 * → inventory-groups would otherwise loop back to availability).
 *
 * `pending` blocks: a booking whose GCash/BPI payment is waiting to be verified holds its
 * dates until an admin confirms or cancels it. That has always been this site's behaviour —
 * it was previously hard-coded as `["confirmed", "pending"]` in three separate route
 * handlers with no shared constant.
 *
 * Changing this list changes both what the public date picker rejects AND what propagates
 * to shared-inventory siblings, so it is intentionally a single edit point.
 */

export const BLOCKING_BOOKING_STATUSES = ["pending", "confirmed"] as const;

/**
 * Every status a booking can be in. Only the two above hold dates; the rest are an allowlist
 * miss, so a new status can never start blocking a calendar by accident.
 *
 *   requested — guest asked on a listing with Instant Booking off; waiting for the Owner
 *   approved  — Owner said yes; waiting for the guest to pay through the payment link
 *   pending   — GCash/BPI payment submitted; waiting for the Owner to verify it
 *   confirmed — paid and verified
 *   declined  — Owner said no (final)
 *   expired   — the request or its payment link timed out (final)
 *   cancelled — cancelled by an admin
 */
export const BOOKING_STATUSES = [
  "requested",
  "approved",
  "pending",
  "confirmed",
  "declined",
  "expired",
  "cancelled",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export function bookingBlocksAvailability(status: string): boolean {
  return (BLOCKING_BOOKING_STATUSES as readonly string[]).includes(status);
}

/** A request still in play: not holding dates, but not over either. */
export const OPEN_REQUEST_STATUSES = ["requested", "approved"] as const;

export function isOpenRequest(status: string): boolean {
  return (OPEN_REQUEST_STATUSES as readonly string[]).includes(status);
}

/** Over for good as far as the guest is concerned — never matched to new messages or counted as a stay. */
export const CLOSED_BOOKING_STATUSES = ["cancelled", "declined", "expired"] as const;

export function isClosedBooking(status: string): boolean {
  return (CLOSED_BOOKING_STATUSES as readonly string[]).includes(status);
}

/**
 * What the admin status control (PUT /api/admin/bookings/[id]) may do. Everything else is
 * reached only through its own route: a request is approved or declined in
 * /api/admin/bookings/[id]/request, expires in the cron job, and an approved request
 * becomes pending or confirmed only when the guest pays through the payment link — an
 * admin cannot confirm one without payment.
 */
const ADMIN_STATUS_TRANSITIONS: Record<string, readonly string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["pending", "cancelled"],
  cancelled: ["pending", "confirmed"],
  approved: ["cancelled"],
};

export function adminStatusChoices(from: string): string[] {
  return [...(ADMIN_STATUS_TRANSITIONS[from] ?? [])];
}

export function canAdminSetStatus(from: string, to: string): boolean {
  return adminStatusChoices(from).includes(to);
}

/** Tailwind classes for a status badge, shared by the admin lists. */
export function bookingStatusBadgeClass(status: string): string {
  switch (status) {
    case "confirmed":
      return "bg-green-100 text-green-700";
    case "requested":
      return "bg-blue-100 text-blue-700";
    case "approved":
      return "bg-indigo-100 text-indigo-700";
    case "pending":
      return "bg-amber-100 text-amber-700";
    case "cancelled":
    case "declined":
      return "bg-red-100 text-red-600";
    default:
      return "bg-gray-100 text-gray-600";
  }
}
