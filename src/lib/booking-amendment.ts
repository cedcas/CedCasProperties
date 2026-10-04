/**
 * Booking amendments — changing the Guest and Stay details of an existing booking.
 *
 * One service behind `POST /api/admin/bookings/[id]/amend`:
 *
 *   previewAmendment → validates and describes the change; writes nothing.
 *   commitAmendment  → re-validates everything under the inventory lock and applies it.
 *
 * What a commit guarantees:
 *
 *  - The booking keeps its id, status, payment evidence and price. Financial fields are
 *    never written here (see PRICING below).
 *  - Availability is checked against the full inventory scope with ONLY this booking and
 *    its own derived blocks excluded. Another reservation, a manual block or an imported
 *    channel event still conflicts — including an imported event that overlaps the
 *    booking's current dates.
 *  - The booking row, its sibling-block projection, its unsent scheduled messages and the
 *    audit entry are written in ONE transaction. A rejected or failed amendment leaves the
 *    original booking and every block exactly as they were; there is no moment at which
 *    the new nights are claimed but not yet blocked on sibling listings.
 *  - A stale edit (the booking changed since the form was loaded) is rejected.
 *
 * PRICING. The Owner's first-release policy (DEC-024, approved 2026-10-02) is to keep the
 * agreed price and defer re-pricing, so the only mode is "preserve": the stored totals stay
 * as they are and the review shows a server-calculated reference quote for comparison.
 * Nothing is charged, refunded or added as an AdditionalCharge.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  addUtcDays,
  formatStayDate,
  nightsBetween,
  todayInManila,
  toUtcMidnight,
  utcDateKey,
} from "@/lib/dates";
import { bookingBlocksAvailability } from "@/lib/booking-status";
import { normalizePhone } from "@/lib/phone";
import {
  formatConflictRange,
  getInventoryScopeConflicts,
  refreshExternalFeedForBooking,
  type Conflict,
} from "@/lib/availability";
import {
  checkBookingProjection,
  getActiveSiblingPropertyIds,
  reconcileBookingDerivedBlocks,
  reconcileOverlappingExternalEvents,
  reconcileSource,
  type ReconcileResult,
} from "@/lib/inventory-groups";
import { withInventoryLock } from "@/lib/inventory-lock";
import { computeBookingQuote } from "@/lib/booking-quote";
import {
  applyScheduledMessageAmendment,
  planScheduledMessagesForAmendedBooking,
  type ScheduledMessageAmendmentPlan,
} from "@/lib/scheduler";
import type { AdminActor } from "@/lib/admin-permissions";

// ── Fields and eligibility ─────────────────────────────────────────────────

export const AMENDABLE_FIELDS = [
  "guestName",
  "guestEmail",
  "guestPhone",
  "guests",
  "propertyId",
  "checkIn",
  "checkOut",
] as const;
export type AmendableField = (typeof AMENDABLE_FIELDS)[number];

export const FIELD_LABELS: Record<AmendableField, string> = {
  guestName: "Name",
  guestEmail: "Email",
  guestPhone: "Phone",
  guests: "Guests",
  propertyId: "Property",
  checkIn: "Check-in",
  checkOut: "Check-out",
};

const CONTACT_FIELDS: AmendableField[] = ["guestName", "guestEmail", "guestPhone"];

export type StayPhase = "cancelled" | "past" | "in_progress" | "upcoming";

/**
 * Where a booking is in its life, on the property's calendar (`today` = Manila date).
 * The check-out day itself still counts as in progress, so a stay can be extended on the
 * morning the guest was due to leave.
 */
export function classifyStayPhase(
  booking: { status: string; checkIn: Date; checkOut: Date },
  today: Date
): StayPhase {
  if (!bookingBlocksAvailability(booking.status)) return "cancelled";
  if (toUtcMidnight(booking.checkOut) < today) return "past";
  if (toUtcMidnight(booking.checkIn) <= today) return "in_progress";
  return "upcoming";
}

/**
 * Which fields may be amended in each phase.
 *
 *  - upcoming (pending or confirmed): everything.
 *  - in progress: contact details, guest count and check-out. Check-in and property are
 *    locked — nights already stayed happened where and when they happened.
 *  - past: contact details only (record corrections).
 *  - cancelled: nothing. An amendment never reactivates a booking; restoring one is a
 *    status change, made separately and deliberately.
 */
export function editableFieldsFor(phase: StayPhase): AmendableField[] {
  switch (phase) {
    case "upcoming":
      return [...AMENDABLE_FIELDS];
    case "in_progress":
      return [...CONTACT_FIELDS, "guests", "checkOut"];
    case "past":
      return [...CONTACT_FIELDS];
    case "cancelled":
      return [];
  }
}

export function phaseNotice(phase: StayPhase): string | null {
  switch (phase) {
    case "upcoming":
      return null;
    case "in_progress":
      return "This stay is in progress, so check-in and property can no longer be changed.";
    case "past":
      return "This stay has ended. Only contact details can be corrected.";
    case "cancelled":
      return "This booking is cancelled and cannot be amended. Amending never reactivates a booking.";
  }
}

// ── Snapshot, parsing and validation (pure) ────────────────────────────────

/** The amendable state of a booking, with stay dates as `YYYY-MM-DD` calendar dates. */
export interface BookingSnapshot {
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guests: number;
  propertyId: number;
  checkIn: string;
  checkOut: string;
}

export function snapshotOf(booking: {
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guests: number;
  propertyId: number;
  checkIn: Date;
  checkOut: Date;
}): BookingSnapshot {
  return {
    guestName: booking.guestName,
    guestEmail: booking.guestEmail,
    guestPhone: booking.guestPhone,
    guests: booking.guests,
    propertyId: booking.propertyId,
    checkIn: utcDateKey(booking.checkIn),
    checkOut: utcDateKey(booking.checkOut),
  };
}

export interface TargetProperty {
  id: number;
  name: string;
  maxGuests: number;
  isActive: boolean;
}

export type FieldErrors = Partial<Record<AmendableField | "reason", string>>;

export class AmendmentError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code:
      | "invalid"
      | "not_found"
      | "not_editable"
      | "stale"
      | "conflict"
      | "no_changes"
      | "unsupported",
    readonly details: { fieldErrors?: FieldErrors; conflicts?: ConflictSummary[] } = {}
  ) {
    super(message);
    this.name = "AmendmentError";
  }
}

export const REASON_MIN = 5;
export const REASON_MAX = 500;
export const MAX_STAY_NIGHTS = 365;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** A real calendar date in strict `YYYY-MM-DD` form (rejects 2026-02-31 and time suffixes). */
export function parseStayDateStrict(value: unknown): Date | null {
  if (typeof value !== "string" || !DATE_RE.test(value)) return null;
  const d = toUtcMidnight(value);
  return !isNaN(d.getTime()) && utcDateKey(d) === value ? d : null;
}

function parseIntStrict(value: unknown): number | null {
  if (typeof value === "number") return Number.isInteger(value) ? value : null;
  if (typeof value === "string" && /^\d{1,6}$/.test(value.trim())) return Number(value.trim());
  return null;
}

/**
 * Allowlist and type-check the raw `changes` object. Anything outside the seven amendable
 * fields is rejected outright rather than ignored — a request carrying `totalPrice` or
 * `status` is a bug or a probe, not something to quietly drop.
 */
export function parseAmendmentChanges(raw: unknown): Partial<BookingSnapshot> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new AmendmentError(400, "No changes provided.", "invalid");
  }
  const unknownKeys = Object.keys(raw).filter(
    (k) => !(AMENDABLE_FIELDS as readonly string[]).includes(k)
  );
  if (unknownKeys.length > 0) {
    throw new AmendmentError(400, `These fields cannot be amended: ${unknownKeys.join(", ")}.`, "invalid");
  }

  const input = raw as Record<string, unknown>;
  const out: Partial<BookingSnapshot> = {};
  const errors: FieldErrors = {};

  if ("guestName" in input) {
    const v = typeof input.guestName === "string" ? input.guestName.trim().replace(/\s+/g, " ") : "";
    if (!v) errors.guestName = "Enter the guest's name.";
    else if (v.length > 120) errors.guestName = "Name is too long (120 characters max).";
    else out.guestName = v;
  }
  if ("guestEmail" in input) {
    const v = typeof input.guestEmail === "string" ? input.guestEmail.trim() : "";
    if (!v || v.length > 254 || !EMAIL_RE.test(v)) errors.guestEmail = "Enter a valid email address.";
    else out.guestEmail = v;
  }
  if ("guestPhone" in input) {
    const parsed = typeof input.guestPhone === "string" ? normalizePhone(input.guestPhone) : null;
    if (!parsed) {
      errors.guestPhone = "Enter a valid phone number, e.g. 09171234567 or +1 312 555 0123.";
    } else out.guestPhone = parsed.e164;
  }
  if ("guests" in input) {
    const v = parseIntStrict(input.guests);
    if (v === null || v < 1) errors.guests = "Guests must be a whole number of 1 or more.";
    else out.guests = v;
  }
  if ("propertyId" in input) {
    const v = parseIntStrict(input.propertyId);
    if (v === null || v < 1) errors.propertyId = "Choose a property.";
    else out.propertyId = v;
  }
  for (const field of ["checkIn", "checkOut"] as const) {
    if (field in input) {
      const d = parseStayDateStrict(input[field]);
      if (!d) errors[field] = "Enter a valid date.";
      else out[field] = utcDateKey(d);
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new AmendmentError(400, "Some details need attention.", "invalid", { fieldErrors: errors });
  }
  return out;
}

export function parseReason(raw: unknown): string {
  const reason = typeof raw === "string" ? raw.trim() : "";
  if (reason.length < REASON_MIN) {
    throw new AmendmentError(400, "Give a reason for this amendment.", "invalid", {
      fieldErrors: { reason: `Enter a reason (at least ${REASON_MIN} characters).` },
    });
  }
  if (reason.length > REASON_MAX) {
    throw new AmendmentError(400, "Reason is too long.", "invalid", {
      fieldErrors: { reason: `Keep the reason under ${REASON_MAX} characters.` },
    });
  }
  return reason;
}

export interface ResolvedAmendment {
  before: BookingSnapshot;
  after: BookingSnapshot;
  changed: AmendableField[];
  /** Property or dates changed — the only changes that touch availability. */
  stayChanged: boolean;
}

/**
 * Merge parsed changes onto the current booking and apply the business rules.
 * Pure — `today` is the Manila calendar date, `target` the property the booking would be on.
 */
export function resolveAmendment(input: {
  current: BookingSnapshot;
  status: string;
  changes: Partial<BookingSnapshot>;
  today: Date;
  target: TargetProperty | null;
}): ResolvedAmendment {
  const { current, changes, today, target } = input;
  const phase = classifyStayPhase(
    { status: input.status, checkIn: toUtcMidnight(current.checkIn), checkOut: toUtcMidnight(current.checkOut) },
    today
  );
  const editable = editableFieldsFor(phase);
  if (editable.length === 0) {
    throw new AmendmentError(409, phaseNotice(phase) ?? "This booking cannot be amended.", "not_editable");
  }

  const after: BookingSnapshot = { ...current, ...changes };
  const changed = AMENDABLE_FIELDS.filter((f) => after[f] !== current[f]);
  if (changed.length === 0) {
    throw new AmendmentError(400, "Nothing has changed.", "no_changes");
  }

  const errors: FieldErrors = {};
  for (const field of changed) {
    if (!editable.includes(field)) {
      errors[field] = `${FIELD_LABELS[field]} can no longer be changed for this booking.`;
    }
  }
  if (Object.keys(errors).length > 0) {
    throw new AmendmentError(409, phaseNotice(phase) ?? "Some fields can no longer be changed.", "not_editable", {
      fieldErrors: errors,
    });
  }

  const stayChanged = changed.some((f) => f === "propertyId" || f === "checkIn" || f === "checkOut");

  if (changed.includes("propertyId") || changed.includes("guests")) {
    if (!target) {
      errors.propertyId = "That property does not exist.";
    } else {
      if (changed.includes("propertyId") && !target.isActive) {
        errors.propertyId = `${target.name} is not an active listing.`;
      }
      if (after.guests > target.maxGuests) {
        errors.guests = `${target.name} accommodates up to ${target.maxGuests} guest${target.maxGuests !== 1 ? "s" : ""}.`;
      }
    }
  }

  if (changed.includes("checkIn") || changed.includes("checkOut")) {
    const checkIn = toUtcMidnight(after.checkIn);
    const checkOut = toUtcMidnight(after.checkOut);
    if (checkOut <= checkIn) {
      errors.checkOut = "Check-out must be after check-in.";
    } else if (nightsBetween(checkIn, checkOut) > MAX_STAY_NIGHTS) {
      errors.checkOut = `A stay cannot be longer than ${MAX_STAY_NIGHTS} nights.`;
    }
    if (changed.includes("checkIn") && checkIn < today) {
      errors.checkIn = "Check-in cannot be moved to a date that has already passed.";
    }
    if (phase === "in_progress" && changed.includes("checkOut") && checkOut < today && !errors.checkOut) {
      errors.checkOut = "Check-out cannot be moved to a date that has already passed.";
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new AmendmentError(400, "Some details need attention.", "invalid", { fieldErrors: errors });
  }
  return { before: current, after, changed, stayChanged };
}

// ── Review (what the admin sees before saving) ─────────────────────────────

export interface ConflictSummary {
  label: string;
  range: string;
  kind: Conflict["kind"];
}

export interface ReviewChange {
  field: AmendableField;
  label: string;
  before: string;
  after: string;
}

export interface FinancialReview {
  mode: "preserve";
  paymentMethod: string | null;
  hasStripePayment: boolean;
  stored: {
    nightlyTotal: number | null;
    extraGuestFee: number | null;
    discountCode: string | null;
    discountAmount: number | null;
    stripeFee: number | null;
    total: number;
  };
  /** Today's server price for the amended stay — shown for comparison, never applied. */
  reference:
    | { ok: true; nightlyTotal: number; extraGuestFee: number; discountAmount: number; stripeFee: number; total: number; difference: number }
    | { ok: false; error: string }
    | null;
}

export interface MessagesReview {
  reschedule: { name: string; from: string; to: string }[];
  withdraw: { name: string }[];
  create: { name: string; sendAt: string }[];
  held: { name: string; wouldHaveSentAt: string }[];
  alreadySent: string[];
  inFlight: string[];
  notReplayed: string[];
}

export interface AmendmentReview {
  bookingId: number;
  status: string;
  phase: StayPhase;
  /** Echo this back on commit; a mismatch means the booking changed in the meantime. */
  expectedUpdatedAt: string;
  changes: ReviewChange[];
  stayChanged: boolean;
  nights: { before: number; after: number };
  property: { before: { id: number; name: string }; after: { id: number; name: string } };
  inventory: { alsoBlocks: string[]; releases: string[] };
  conflicts: ConflictSummary[];
  financial: FinancialReview;
  messages: MessagesReview | null;
  warnings: string[];
  channelNote: string | null;
}

export const CHANNEL_NOTE =
  "Airbnb and other connected calendars pick this change up the next time they import the HIL feed — usually within a few hours, not instantly. Until then the channel still shows the old dates as blocked and the new ones as open.";

const longDate = (key: string) => formatStayDate(key, { weekday: "short", year: "numeric", month: "short", day: "numeric" });

function summarizeConflicts(conflicts: Conflict[]): ConflictSummary[] {
  return conflicts.map((c) => ({ label: c.label, range: formatConflictRange(c), kind: c.kind }));
}

function messagesReview(plan: ScheduledMessageAmendmentPlan): MessagesReview {
  return {
    reschedule: plan.reschedule.map((r) => ({ name: r.name, from: r.from.toISOString(), to: r.to.toISOString() })),
    withdraw: plan.withdraw.map((w) => ({ name: w.name })),
    create: plan.create.map((c) => ({ name: c.name, sendAt: c.sendAt.toISOString() })),
    held: plan.held.map((h) => ({ name: h.name, wouldHaveSentAt: h.wouldHaveSentAt.toISOString() })),
    alreadySent: plan.alreadySent,
    inFlight: plan.inFlight,
    notReplayed: plan.notReplayed,
  };
}

type Db = Prisma.TransactionClient | typeof prisma;

const BOOKING_SELECT = {
  id: true,
  status: true,
  propertyId: true,
  guestName: true,
  guestEmail: true,
  guestPhone: true,
  guests: true,
  checkIn: true,
  checkOut: true,
  totalPrice: true,
  nightlyTotal: true,
  extraGuestFee: true,
  stripeFee: true,
  discountCode: true,
  discountAmount: true,
  paymentMethod: true,
  stripePaymentIntentId: true,
  updatedAt: true,
  property: { select: { id: true, name: true } },
} satisfies Prisma.BookingSelect;

type LoadedBooking = Prisma.BookingGetPayload<{ select: typeof BOOKING_SELECT }>;

async function loadBooking(bookingId: number, db: Db): Promise<LoadedBooking> {
  const booking = await db.booking.findUnique({ where: { id: bookingId }, select: BOOKING_SELECT });
  if (!booking) throw new AmendmentError(404, "Booking not found.", "not_found");
  return booking;
}

async function loadTarget(propertyId: number, db: Db): Promise<TargetProperty | null> {
  return db.property.findUnique({
    where: { id: propertyId },
    select: { id: true, name: true, maxGuests: true, isActive: true },
  });
}

async function siblingNames(propertyId: number, db: Db): Promise<Map<number, string>> {
  const ids = await getActiveSiblingPropertyIds(propertyId, db);
  if (ids.length === 0) return new Map();
  const rows = await db.property.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
  return new Map(rows.map((r) => [r.id, r.name]));
}

const num = (v: Prisma.Decimal | null) => (v === null ? null : Number(v));

/** Resolve + describe an amendment against the booking as seen through `db`. Writes nothing. */
async function buildReview(
  booking: LoadedBooking,
  changes: Partial<BookingSnapshot>,
  db: Db,
  now: Date
): Promise<{ resolved: ResolvedAmendment; review: AmendmentReview; conflicts: Conflict[]; plan: ScheduledMessageAmendmentPlan | null }> {
  const current = snapshotOf(booking);
  const targetId = changes.propertyId ?? current.propertyId;
  const target = await loadTarget(targetId, db);
  const today = todayInManila(now);

  const resolved = resolveAmendment({ current, status: booking.status, changes, today, target });
  const { after, changed, stayChanged } = resolved;
  const checkIn = toUtcMidnight(after.checkIn);
  const checkOut = toUtcMidnight(after.checkOut);
  const warnings: string[] = [];

  // Availability — only when the booking would occupy different nights or a different unit.
  let conflicts: Conflict[] = [];
  let alsoBlocks: string[] = [];
  let releases: string[] = [];
  if (stayChanged) {
    conflicts = await getInventoryScopeConflicts({
      propertyId: after.propertyId,
      start: checkIn,
      end: checkOut,
      excludeBookingId: booking.id,
      db,
    });
    const [oldSiblings, newSiblings] = await Promise.all([
      siblingNames(current.propertyId, db),
      siblingNames(after.propertyId, db),
    ]);
    alsoBlocks = [...newSiblings.values()];
    releases = [...oldSiblings.entries()]
      .filter(([id]) => !newSiblings.has(id) && id !== after.propertyId)
      .map(([, name]) => name);

    const feed = await db.externalCalendarSyncState.findUnique({
      where: { propertyId: after.propertyId },
      select: { lastStatus: true, lastSyncedAt: true },
    });
    if (feed && feed.lastStatus && feed.lastStatus !== "ok" && feed.lastStatus !== "not_configured") {
      warnings.push(
        `The channel calendar for ${target?.name ?? "this listing"} could not be refreshed (${feed.lastStatus}). Availability was checked against the last successful import${feed.lastSyncedAt ? ` (${feed.lastSyncedAt.toISOString()})` : ""} — confirm the dates on the channel before saving.`
      );
    }
  }

  // Contact changes: say where the new address or number already appears, so a change
  // that regroups this booking under another customer is a decision, not a surprise.
  if (changed.includes("guestEmail") || changed.includes("guestPhone")) {
    const or: Prisma.BookingWhereInput[] = [];
    if (changed.includes("guestEmail")) or.push({ guestEmail: after.guestEmail });
    if (changed.includes("guestPhone")) or.push({ guestPhone: after.guestPhone });
    const others = await db.booking.findMany({
      where: { id: { not: booking.id }, OR: or },
      select: { id: true, guestName: true },
      take: 5,
    });
    if (others.length > 0) {
      warnings.push(
        `The new contact details are already on ${others.map((o) => `booking #${o.id} (${o.guestName})`).join(", ")}. The Customers view groups bookings by email and phone, so this booking will be listed with ${others.length === 1 ? "that one" : "those"}. Message history is not moved or merged.`
      );
    }
    if (changed.includes("guestEmail")) {
      warnings.push(
        "Future emails for this booking go to the new address, and replies from it are threaded here. Messages already sent stay in the thread as they were."
      );
    }
  }

  // Financial — stored values are untouched; the reference quote is informational.
  let reference: FinancialReview["reference"] = null;
  if (stayChanged || changed.includes("guests")) {
    const quote = await computeBookingQuote({
      propertyId: after.propertyId,
      checkIn: after.checkIn,
      checkOut: after.checkOut,
      guests: after.guests,
      discountCode: booking.discountCode,
      paymentMethod: booking.paymentMethod,
    });
    reference = quote.ok
      ? {
          ok: true,
          nightlyTotal: quote.quote.nightlyTotal,
          extraGuestFee: quote.quote.extraGuestFee,
          discountAmount: quote.quote.discountAmount,
          stripeFee: quote.quote.stripeFee,
          total: quote.quote.total,
          difference: Math.round((quote.quote.total - Number(booking.totalPrice)) * 100) / 100,
        }
      : { ok: false, error: quote.error };
  }

  const plan = stayChanged
    ? await planScheduledMessagesForAmendedBooking(
        { id: booking.id, status: booking.status, propertyId: after.propertyId, checkIn, checkOut },
        current.propertyId,
        db,
        now
      )
    : null;

  const display = (field: AmendableField, snap: BookingSnapshot, propertyName: string): string => {
    if (field === "propertyId") return propertyName;
    if (field === "checkIn" || field === "checkOut") return longDate(snap[field]);
    return String(snap[field]);
  };
  const afterName = target?.name ?? booking.property.name;

  const review: AmendmentReview = {
    bookingId: booking.id,
    status: booking.status,
    phase: classifyStayPhase(booking, today),
    expectedUpdatedAt: booking.updatedAt.toISOString(),
    changes: changed.map((field) => ({
      field,
      label: FIELD_LABELS[field],
      before: display(field, current, booking.property.name),
      after: display(field, after, afterName),
    })),
    stayChanged,
    nights: {
      before: nightsBetween(booking.checkIn, booking.checkOut),
      after: nightsBetween(checkIn, checkOut),
    },
    property: {
      before: { id: booking.property.id, name: booking.property.name },
      after: { id: after.propertyId, name: afterName },
    },
    inventory: { alsoBlocks, releases },
    conflicts: summarizeConflicts(conflicts),
    financial: {
      mode: "preserve",
      paymentMethod: booking.paymentMethod,
      hasStripePayment: Boolean(booking.stripePaymentIntentId),
      stored: {
        nightlyTotal: num(booking.nightlyTotal),
        extraGuestFee: num(booking.extraGuestFee),
        discountCode: booking.discountCode,
        discountAmount: num(booking.discountAmount),
        stripeFee: num(booking.stripeFee),
        total: Number(booking.totalPrice),
      },
      reference,
    },
    messages: plan ? messagesReview(plan) : null,
    warnings,
    channelNote: stayChanged ? CHANNEL_NOTE : null,
  };

  return { resolved, review, conflicts, plan };
}

/** Refresh the channel feed for the listing the booking would land on (pre-commit window). */
async function refreshTargetFeed(bookingId: number, changes: Partial<BookingSnapshot>): Promise<void> {
  const touchesStay = "propertyId" in changes || "checkIn" in changes || "checkOut" in changes;
  if (!touchesStay) return;
  const row = await prisma.booking.findUnique({ where: { id: bookingId }, select: { propertyId: true } });
  if (!row) return;
  await refreshExternalFeedForBooking(changes.propertyId ?? row.propertyId);
}

export async function previewAmendment(input: {
  bookingId: number;
  changes: unknown;
  now?: Date;
}): Promise<AmendmentReview> {
  const changes = parseAmendmentChanges(input.changes);
  await refreshTargetFeed(input.bookingId, changes);
  const booking = await loadBooking(input.bookingId, prisma);
  const { review } = await buildReview(booking, changes, prisma, input.now ?? new Date());
  return review;
}

// ── Commit ─────────────────────────────────────────────────────────────────

export interface AmendmentResult {
  /**
   * `applied` — booking saved and its sibling blocks verified in step with it.
   * `applied_propagation_incomplete` — booking saved, but the post-save check found the
   * projection out of step. Dates are over- rather than under-blocked; run `resync`.
   */
  outcome: "applied" | "applied_propagation_incomplete";
  review: AmendmentReview;
  updatedAt: string;
  propagation: {
    blocks: ReconcileResult;
    messages: { rescheduled: number; withdrawn: number; created: number; held: number } | null;
    verified: boolean;
  };
}

export const AMENDMENT_LOG_PREFIX = "Amended booking";

export async function commitAmendment(input: {
  bookingId: number;
  changes: unknown;
  reason: unknown;
  expectedUpdatedAt: unknown;
  pricing?: unknown;
  actor: AdminActor;
  ipAddress?: string;
  now?: Date;
}): Promise<AmendmentResult> {
  const changes = parseAmendmentChanges(input.changes);
  const reason = parseReason(input.reason);
  if (input.pricing !== undefined && input.pricing !== "preserve") {
    throw new AmendmentError(
      400,
      "Re-pricing an amended booking is not enabled. The agreed price is kept as it is.",
      "unsupported"
    );
  }
  if (typeof input.expectedUpdatedAt !== "string" || !input.expectedUpdatedAt) {
    throw new AmendmentError(400, "Review the changes before saving.", "invalid");
  }
  const now = input.now ?? new Date();

  // Network I/O stays outside the transaction.
  await refreshTargetFeed(input.bookingId, changes);

  const pre = await prisma.booking.findUnique({ where: { id: input.bookingId }, select: { propertyId: true } });
  if (!pre) throw new AmendmentError(404, "Booking not found.", "not_found");
  const lockIds = [pre.propertyId, ...(changes.propertyId ? [changes.propertyId] : [])];

  const committed = await withInventoryLock(lockIds, async (tx) => {
    // Serialise with anything else writing this booking (status changes, another amendment).
    await tx.$queryRaw`SELECT id FROM \`Booking\` WHERE id = ${input.bookingId} FOR UPDATE`;
    const booking = await loadBooking(input.bookingId, tx);

    if (booking.updatedAt.toISOString() !== input.expectedUpdatedAt) {
      throw new AmendmentError(
        409,
        "This booking was changed by someone else after you opened it. Reload to see the current details, then make your changes again.",
        "stale"
      );
    }

    const { resolved, review, conflicts, plan } = await buildReview(booking, changes, tx, now);
    if (conflicts.length > 0) {
      throw new AmendmentError(
        409,
        "Those dates are not available for this property. Nothing was changed.",
        "conflict",
        { conflicts: review.conflicts }
      );
    }

    const { after, changed, stayChanged } = resolved;
    const data: Prisma.BookingUncheckedUpdateInput = {};
    for (const field of changed) {
      if (field === "checkIn" || field === "checkOut") data[field] = toUtcMidnight(after[field]);
      else if (field === "guests" || field === "propertyId") data[field] = after[field];
      else data[field] = after[field];
    }
    const updated = await tx.booking.update({
      where: { id: booking.id },
      data,
      select: { updatedAt: true, propertyId: true, checkIn: true, checkOut: true, status: true },
    });

    let blocks: ReconcileResult = { created: 0, updated: 0, cancelled: 0 };
    let messages: AmendmentResult["propagation"]["messages"] = null;

    if (stayChanged) {
      // Same order as every other reconciliation: desired blocks first, stale ones after.
      blocks = await reconcileSource(
        {
          kind: "booking",
          id: booking.id,
          propertyId: updated.propertyId,
          start: updated.checkIn,
          end: updated.checkOut,
          isActive: bookingBlocksAvailability(updated.status),
        },
        { db: tx }
      );
      // The nights this booking left are no longer HIL-covered: an imported event that was
      // being suppressed as an echo of it must start blocking siblings again.
      const uncovered = await reconcileOverlappingExternalEvents(
        booking.propertyId,
        booking.checkIn,
        booking.checkOut,
        tx
      );
      blocks = {
        created: blocks.created + uncovered.created,
        updated: blocks.updated + uncovered.updated,
        cancelled: blocks.cancelled + uncovered.cancelled,
      };
      if (plan) messages = await applyScheduledMessageAmendment(booking.id, plan, tx);
    }

    // The audit entry commits or rolls back with the change it describes.
    await tx.adminLog.create({
      data: {
        actor: input.actor.name,
        actorRole: input.actor.role,
        actorId: input.actor.id,
        action: `${AMENDMENT_LOG_PREFIX} #${booking.id} — ${changed.map((f) => FIELD_LABELS[f].toLowerCase()).join(", ")}`,
        module: "bookings",
        target: `booking-${booking.id}`,
        ipAddress: input.ipAddress ?? null,
        metadata: JSON.stringify({
          bookingId: booking.id,
          reason,
          status: booking.status,
          changes: review.changes,
          before: resolved.before,
          after,
          pricing: "preserve",
          totalPrice: Number(booking.totalPrice),
          referenceQuote: review.financial.reference,
          blocks,
          messages,
          heldMessages: review.messages?.held ?? [],
        }),
      },
    });

    return { review, updatedAt: updated.updatedAt.toISOString(), blocks, messages };
  });

  // Don't take "the transaction committed" as proof the projection is right — read it back.
  let verified = false;
  try {
    verified = (await checkBookingProjection(input.bookingId)).inSync;
  } catch (err) {
    console.error("[booking-amendment] projection check failed:", err);
  }

  return {
    outcome: verified ? "applied" : "applied_propagation_incomplete",
    review: committed.review,
    updatedAt: committed.updatedAt,
    propagation: { blocks: committed.blocks, messages: committed.messages, verified },
  };
}

/**
 * Re-run propagation for a booking: sibling blocks and unsent scheduled messages.
 * Idempotent — a booking already in step produces no writes — so it is safe to retry.
 */
export async function resyncAmendedBooking(
  bookingId: number,
  now: Date = new Date()
): Promise<{ verified: boolean; blocks: ReconcileResult }> {
  const booking = await loadBooking(bookingId, prisma);
  const blocks = await reconcileBookingDerivedBlocks(bookingId);
  const plan = await planScheduledMessagesForAmendedBooking(booking, booking.propertyId, prisma, now);
  await applyScheduledMessageAmendment(bookingId, plan);
  const { inSync } = await checkBookingProjection(bookingId);
  return { verified: inSync, blocks };
}

/** Next calendar day, as a `YYYY-MM-DD` key — the earliest check-out for a given check-in. */
export function dayAfter(key: string): string {
  return utcDateKey(addUtcDays(toUtcMidnight(key), 1));
}
