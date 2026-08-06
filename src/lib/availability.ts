/**
 * Availability — the single source of truth for whether a property's dates are free.
 *
 * Before this module, conflict rules were scattered across three route handlers, each
 * with its own copy of the blocking-status list and its own inline iCal parser. A date
 * is now unavailable if ANY of four active record types overlaps it:
 *
 *   1. HIL bookings in a blocking status
 *   2. Active manual availability blocks
 *   3. Active system-generated shared-inventory blocks
 *   4. Active persisted external calendar events (imported from a channel feed)
 *
 * Availability is always computed from the full set of overlapping records — never from
 * a property-level boolean. Cancelling one source therefore cannot reopen a date that a
 * different, still-active record also covers.
 *
 * Ranges are half-open: start inclusive, end exclusive. Check-out dates stay bookable.
 */

import { prisma } from "@/lib/prisma";
import { rangesOverlap, toUtcMidnight, todayUtc, utcDateKey } from "@/lib/dates";
import { ensureExternalEventsFresh } from "@/lib/external-calendar-sync";
import { BLOCKING_BOOKING_STATUSES } from "@/lib/booking-status";

// Re-exported so callers can treat this module as the availability entry point.
export { BLOCKING_BOOKING_STATUSES, bookingBlocksAvailability } from "@/lib/booking-status";

/** How fresh an external feed must be before we answer from persisted events. */
export const FRESHNESS_AVAILABILITY_MINUTES = 30;
/** Tighter window immediately before a booking commits — the double-booking guard. */
export const FRESHNESS_BOOKING_MINUTES = 2;

export type ConflictKind = "booking" | "manual_block" | "inventory_block" | "external_event";

export interface Conflict {
  kind: ConflictKind;
  /** Row id within its own table — not globally unique across kinds. */
  id: number;
  start: Date; // UTC midnight, inclusive
  end: Date; // UTC midnight, exclusive
  /** Short admin-facing description, e.g. "Maintenance" or "Blocked by Mickey 1BR booking #123". */
  label: string;
  reason?: string;
  sourcePropertyId?: number | null;
  sourcePropertyName?: string | null;
  bookingId?: number | null;
  /** Admin surfaces only — never returned by the public availability API. */
  guestName?: string | null;
}

/** A minimal overlapping-record shape, so the matching logic stays pure and testable. */
export interface ConflictCandidate {
  kind: ConflictKind;
  id: number;
  start: Date;
  end: Date;
  label: string;
  reason?: string;
  sourcePropertyId?: number | null;
  sourcePropertyName?: string | null;
  bookingId?: number | null;
  guestName?: string | null;
}

/** Thrown by `assertPropertyAvailable`. `message` is safe to show a guest. */
export class AvailabilityConflictError extends Error {
  readonly conflicts: Conflict[];
  readonly status = 409;

  constructor(message: string, conflicts: Conflict[]) {
    super(message);
    this.name = "AvailabilityConflictError";
    this.conflicts = conflicts;
  }
}

// ── Pure core ──────────────────────────────────────────────────────────────

/**
 * Filter candidates down to those overlapping [start, end). Pure — no DB, no clock.
 * `excludeBookingId` lets an admin re-check a stay's own dates without self-conflicting.
 */
export function conflictsFor(
  candidates: ConflictCandidate[],
  start: Date,
  end: Date,
  opts: { excludeBookingId?: number | null } = {}
): Conflict[] {
  const exclude = opts.excludeBookingId ?? null;
  return candidates
    .filter((c) => {
      if (exclude !== null && c.kind === "booking" && c.id === exclude) return false;
      // A derived block whose source is the excluded booking is also self-inflicted.
      if (exclude !== null && c.kind === "inventory_block" && c.bookingId === exclude) return false;
      return rangesOverlap(start, end, c.start, c.end);
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

/**
 * Guest-safe conflict message. Deliberately does not leak *why* a date is unavailable —
 * a guest has no business knowing the owner is using the unit or that a sibling listing
 * is booked. The two booking-conflict strings are preserved verbatim from the original
 * booking route so existing client handling and tests keep working.
 */
export function guestFacingConflictMessage(conflicts: Conflict[]): string {
  if (conflicts.some((c) => c.kind === "booking")) {
    return "Those dates are already booked. Please choose different dates.";
  }
  if (conflicts.some((c) => c.kind === "external_event")) {
    return "Those dates are not available (blocked on Airbnb). Please choose different dates.";
  }
  return "Those dates are not available. Please choose different dates.";
}

// ── Data loading ───────────────────────────────────────────────────────────

interface LoadOpts {
  propertyId: number;
  /** Only load records that could overlap this window. Omit to load all future records. */
  from?: Date;
  to?: Date;
}

/**
 * Load every active blocking record for a property as uniform candidates.
 *
 * The date filter is deliberately loose (`end > from` / `start < to`) so a record that
 * straddles the window boundary is still caught. Narrowing it to fully-contained ranges
 * would miss exactly the conflicts that matter.
 */
async function loadCandidates({ propertyId, from, to }: LoadOpts): Promise<ConflictCandidate[]> {
  const dateWindow = <T extends string>(startField: T, endField: T) => {
    const clauses: Record<string, unknown> = {};
    if (to) clauses[startField] = { lt: to };
    if (from) clauses[endField] = { gt: from };
    return clauses;
  };

  const [bookings, blocks, externalEvents] = await Promise.all([
    prisma.booking.findMany({
      where: {
        propertyId,
        status: { in: [...BLOCKING_BOOKING_STATUSES] },
        ...dateWindow("checkIn", "checkOut"),
      },
      select: { id: true, checkIn: true, checkOut: true, guestName: true, status: true },
    }),
    prisma.availabilityBlock.findMany({
      where: {
        propertyId,
        status: "active",
        affectsAvailability: true,
        ...dateWindow("startDate", "endDate"),
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        reason: true,
        isSystemGenerated: true,
        sourcePropertyId: true,
        sourceBookingId: true,
        sourceProperty: { select: { name: true } },
      },
    }),
    prisma.externalCalendarEvent.findMany({
      where: {
        propertyId,
        status: "active",
        ...dateWindow("startDate", "endDate"),
      },
      select: { id: true, startDate: true, endDate: true, summary: true },
    }),
  ]);

  const candidates: ConflictCandidate[] = [];

  for (const b of bookings) {
    candidates.push({
      kind: "booking",
      id: b.id,
      start: b.checkIn,
      end: b.checkOut,
      label: `Booking #${b.id} — ${b.guestName}`,
      reason: b.status,
      bookingId: b.id,
      guestName: b.guestName,
    });
  }

  for (const bl of blocks) {
    candidates.push({
      kind: bl.isSystemGenerated ? "inventory_block" : "manual_block",
      id: bl.id,
      start: bl.startDate,
      end: bl.endDate,
      label: bl.isSystemGenerated
        ? `Shared inventory — ${bl.sourceProperty?.name ?? "sibling listing"}`
        : humanizeReason(bl.reason),
      reason: bl.reason,
      sourcePropertyId: bl.sourcePropertyId,
      sourcePropertyName: bl.sourceProperty?.name ?? null,
      bookingId: bl.sourceBookingId,
    });
  }

  for (const ev of externalEvents) {
    candidates.push({
      kind: "external_event",
      id: ev.id,
      start: ev.startDate,
      end: ev.endDate,
      label: ev.summary?.trim() ? `Imported — ${ev.summary.trim()}` : "Imported calendar event",
    });
  }

  return candidates;
}

/** Reasons an admin may choose when creating a manual block. */
export const MANUAL_BLOCK_REASONS = [
  "maintenance",
  "owner_use",
  "repair",
  "deep_cleaning",
  "pest_control",
  "temporary_hold",
  "personal_reservation",
  "other",
] as const;

/** All reasons, including the one reserved for system-generated sibling blocks. */
export const BLOCK_REASONS = [...MANUAL_BLOCK_REASONS, "inventory_group"] as const;

export type ManualBlockReason = (typeof MANUAL_BLOCK_REASONS)[number];
export type BlockReason = (typeof BLOCK_REASONS)[number];

export function isManualBlockReason(value: unknown): value is ManualBlockReason {
  return typeof value === "string" && (MANUAL_BLOCK_REASONS as readonly string[]).includes(value);
}

const REASON_LABELS: Record<string, string> = {
  maintenance: "Maintenance",
  owner_use: "Owner use",
  repair: "Repair",
  deep_cleaning: "Deep cleaning",
  pest_control: "Pest control",
  temporary_hold: "Temporary hold",
  personal_reservation: "Personal reservation",
  other: "Other",
  inventory_group: "Shared inventory",
};

export function humanizeReason(reason: string): string {
  return REASON_LABELS[reason] ?? reason;
}

// ── Public API ─────────────────────────────────────────────────────────────

export type SyncPolicy = "availability" | "booking" | "skip";

/**
 * Bring a property's imported feed up to date before we trust persisted events.
 *
 * This is what makes correctness independent of any scheduler: whatever the cron did or
 * did not do, a stale feed is re-synced at the moment it matters. Best-effort by design —
 * a channel outage must not take the booking flow down with it, which matches the
 * fail-open behaviour the site has always had.
 */
async function applySyncPolicy(propertyId: number, policy: SyncPolicy): Promise<void> {
  if (policy === "skip") return;
  const maxAgeMinutes =
    policy === "booking" ? FRESHNESS_BOOKING_MINUTES : FRESHNESS_AVAILABILITY_MINUTES;
  try {
    await ensureExternalEventsFresh(propertyId, { maxAgeMinutes });
  } catch {
    // Availability still answers from the last known-good persisted events.
  }
}

/** Every active record conflicting with [start, end) for a property. */
export async function getPropertyConflicts(opts: {
  propertyId: number;
  start: Date;
  end: Date;
  excludeBookingId?: number | null;
  syncPolicy?: SyncPolicy;
}): Promise<Conflict[]> {
  const start = toUtcMidnight(opts.start);
  const end = toUtcMidnight(opts.end);

  await applySyncPolicy(opts.propertyId, opts.syncPolicy ?? "availability");

  const candidates = await loadCandidates({ propertyId: opts.propertyId, from: start, to: end });
  return conflictsFor(candidates, start, end, { excludeBookingId: opts.excludeBookingId });
}

/**
 * All unavailable ranges for a property in a window, for calendar rendering.
 * Defaults to "from today, unbounded" — the shape the public date picker needs.
 */
export async function getUnavailableDateRanges(opts: {
  propertyId: number;
  from?: Date;
  to?: Date;
  syncPolicy?: SyncPolicy;
}): Promise<Conflict[]> {
  const from = opts.from ? toUtcMidnight(opts.from) : todayUtc();

  await applySyncPolicy(opts.propertyId, opts.syncPolicy ?? "availability");

  const candidates = await loadCandidates({ propertyId: opts.propertyId, from, to: opts.to });
  return candidates
    .filter((c) => c.end > from && (!opts.to || c.start < opts.to))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

export async function isPropertyAvailable(opts: {
  propertyId: number;
  start: Date;
  end: Date;
  excludeBookingId?: number | null;
  syncPolicy?: SyncPolicy;
}): Promise<boolean> {
  return (await getPropertyConflicts(opts)).length === 0;
}

/**
 * Throw unless the dates are free. Server-side enforcement for booking creation —
 * client-side date disabling is not sufficient, since the API is directly callable.
 */
export async function assertPropertyAvailable(opts: {
  propertyId: number;
  start: Date;
  end: Date;
  excludeBookingId?: number | null;
  syncPolicy?: SyncPolicy;
}): Promise<void> {
  const conflicts = await getPropertyConflicts({
    ...opts,
    syncPolicy: opts.syncPolicy ?? "booking",
  });
  if (conflicts.length > 0) {
    throw new AvailabilityConflictError(guestFacingConflictMessage(conflicts), conflicts);
  }
}

/** Compact `YYYY-MM-DD – YYYY-MM-DD` label, the shape the public API has always returned. */
export function formatConflictRange(conflict: Conflict): string {
  return `${utcDateKey(conflict.start)} – ${utcDateKey(conflict.end)}`;
}
