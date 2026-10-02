import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendGuestMessage, type Channel } from "@/lib/guestMessages";
import { scopeAppliesToProperty } from "@/lib/promo";

/** A worker's claim older than this is treated as an interrupted send. */
const STALE_CLAIM_MINUTES = 15;

function computeSendAt(anchor: Date, offsetHours: number): Date {
  return new Date(anchor.getTime() + offsetHours * 60 * 60 * 1000);
}

// Returns the current hour (0-23) in Asia/Manila regardless of server tz.
function currentHourInManila(now: Date = new Date()): number {
  const fmt = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    hour12: false,
  });
  return Number(fmt.format(now));
}

// Quiet hours window — SMS deferred during this range. Defaults: 21:00 → 08:00 Manila.
// A run inside the window leaves SMS rows pending; a later run outside the window
// will fire them (status stays "pending", sendAt unchanged).
function isInSmsQuietHours(now: Date = new Date()): boolean {
  const startEnv = Number(process.env.SMS_QUIET_HOURS_START);
  const endEnv = Number(process.env.SMS_QUIET_HOURS_END);
  const start = Number.isFinite(startEnv) ? startEnv : 21;
  const end = Number.isFinite(endEnv) ? endEnv : 8;
  const h = currentHourInManila(now);
  // Window may wrap midnight (e.g. 21..8 means 21,22,23,0,1,2,3,4,5,6,7).
  return start > end ? (h >= start || h < end) : (h >= start && h < end);
}

// Called when a booking transitions to "confirmed".
// Enumerates applicable active auto QuickReplies and inserts ScheduledMessage rows.
export async function materializeScheduledMessagesForBooking(bookingId: number): Promise<number> {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.status !== "confirmed") return 0;

  // JSON-array membership isn't cleanly queryable via Prisma on MySQL, so fetch all
  // active auto replies and filter by property scope in JS. The set is tiny.
  const allAutoReplies = await prisma.quickReply.findMany({
    where: { isActive: true, trigger: "auto" },
  });
  const replies = allAutoReplies.filter((r) => scopeAppliesToProperty(r.propertyIds, booking.propertyId));

  if (replies.length === 0) return 0;

  const confirmationTime = new Date();
  const rows = replies
    .filter((r) => r.anchor && r.offsetHours !== null)
    .map((r) => {
      const anchorDate =
        r.anchor === "checkOut" ? booking.checkOut :
        r.anchor === "confirmation" ? confirmationTime :
        booking.checkIn;
      return {
        bookingId: booking.id,
        quickReplyId: r.id,
        channel: r.channel,
        sendAt: computeSendAt(anchorDate, r.offsetHours as number),
        status: "pending",
      };
    });

  if (rows.length === 0) return 0;

  // Avoid duplicates if called twice (e.g. pending→confirmed→pending→confirmed)
  const existing = await prisma.scheduledMessage.findMany({
    where: { bookingId: booking.id, quickReplyId: { in: rows.map((r) => r.quickReplyId) } },
    select: { quickReplyId: true, status: true },
  });
  const alreadyHandled = new Set(
    existing.filter((e) => e.status !== "skipped").map((e) => e.quickReplyId),
  );
  const toInsert = rows.filter((r) => !alreadyHandled.has(r.quickReplyId));
  if (toInsert.length === 0) return 0;

  await prisma.scheduledMessage.createMany({ data: toInsert });
  return toInsert.length;
}

// Cancels (marks as "skipped") any still-pending scheduled messages for a booking.
// Called when a booking is cancelled or un-confirmed.
export async function cancelScheduledMessagesForBooking(bookingId: number): Promise<number> {
  const res = await prisma.scheduledMessage.updateMany({
    where: { bookingId, status: "pending" },
    data: { status: "skipped" },
  });
  return res.count;
}

// Fires every ScheduledMessage row whose sendAt <= now and status="pending".
// Respects QuickReply.skipIfPastAnchor (measured against booking's anchor event).
export async function flushDueScheduledMessages(opts?: { bookingId?: number }): Promise<{
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
  deferred: number;
}> {
  const now = new Date();

  // A row left in "sending" means a run died between claiming and recording the result.
  // Whether the message went out is unknown, so it is surfaced as failed for a human to
  // check in the thread — never re-sent automatically, which could duplicate it.
  await prisma.scheduledMessage.updateMany({
    where: {
      status: "sending",
      updatedAt: { lt: new Date(now.getTime() - STALE_CLAIM_MINUTES * 60_000) },
      ...(opts?.bookingId ? { bookingId: opts.bookingId } : {}),
    },
    data: {
      status: "failed",
      error: "Send was interrupted — check the guest's thread before sending again",
    },
  });

  const due = await prisma.scheduledMessage.findMany({
    where: {
      status: "pending",
      sendAt: { lte: now },
      ...(opts?.bookingId ? { bookingId: opts.bookingId } : {}),
    },
    select: { id: true, sendAt: true, channel: true },
  });

  let sent = 0, skipped = 0, failed = 0, deferred = 0;
  const inQuietHours = isInSmsQuietHours(now);

  for (const row of due) {
    // Defer SMS during quiet hours; row stays pending and fires on the next non-quiet run.
    if (((row.channel as Channel) ?? "email") === "sms" && inQuietHours) {
      deferred++;
      continue;
    }
    if (!(await claimScheduledMessage(row))) continue;
    const outcome = await deliverClaimedScheduledMessage(row.id, now);
    if (outcome === "sent") sent++;
    else if (outcome === "skipped") skipped++;
    else if (outcome === "failed") failed++;
    else deferred++;
  }

  return { processed: due.length, sent, skipped, failed, deferred };
}

/**
 * Claim a due row for sending: `pending → sending`, in one conditional UPDATE.
 *
 * The claim succeeds only if the row is still pending AT THE SEND TIME THE WORKER READ.
 * So a booking amendment that re-timed or withdrew the reminder before this statement
 * wins, and two overlapping runs (the hourly cron and an inline flush) cannot both send
 * it. If the amendment's transaction has changed the row but not yet committed, this
 * UPDATE waits on the row lock and then sees the committed result.
 *
 * THIS IS THE POINT OF NO RETURN for an amendment: once a row is `sending`, an amendment
 * no longer changes it (its own updates are conditional on `pending`). See
 * {@link deliverClaimedScheduledMessage} for the one re-check that still happens.
 */
export async function claimScheduledMessage(row: { id: number; sendAt: Date }): Promise<boolean> {
  const claim = await prisma.scheduledMessage.updateMany({
    where: { id: row.id, status: "pending", sendAt: row.sendAt },
    data: { status: "sending" },
  });
  return claim.count === 1;
}

/**
 * Send a claimed row, after re-reading the booking and template ONCE.
 *
 * That re-read catches an amendment or cancellation that committed between the worker's
 * first read and this point: the reminder is skipped if the booking is no longer
 * confirmed or the template no longer applies to its listing, and handed back (with the
 * corrected time) if the stay has moved the send time into the future.
 *
 * What it cannot catch: a change that commits AFTER this re-read. From here the message
 * is rendered and handed to the mail server; it goes out. The message body is rendered
 * from a second read of the booking inside `sendGuestMessage`, so in that narrow window
 * the content may already reflect the amendment even though the decision to send did not.
 */
export async function deliverClaimedScheduledMessage(
  rowId: number,
  now: Date = new Date()
): Promise<"sent" | "skipped" | "failed" | "handed_back"> {
  const row = await prisma.scheduledMessage.findUnique({
    where: { id: rowId },
    include: { quickReply: true, booking: true },
  });
  if (!row || row.status !== "sending") return "skipped";
  const { quickReply, booking } = row;
  const rowChannel = (row.channel as Channel) ?? "email";
  const skip = async (error: string) => {
    await prisma.scheduledMessage.update({ where: { id: row.id }, data: { status: "skipped", error } });
    return "skipped" as const;
  };

  // Skip if the booking is no longer confirmed.
  if (booking.status !== "confirmed") return skip(`booking status=${booking.status}`);

  // The booking moved to a listing this template is not for.
  if (!scopeAppliesToProperty(quickReply.propertyIds, booking.propertyId)) return skip(NOT_APPLICABLE_REASON);

  // The stay moved later between our read and the claim: this reminder is no longer
  // due. Hand it back with its corrected time instead of sending it early.
  if (quickReply.anchor && quickReply.anchor !== "confirmation" && quickReply.offsetHours !== null) {
    const expected = computeSendAt(
      quickReply.anchor === "checkOut" ? booking.checkOut : booking.checkIn,
      quickReply.offsetHours
    );
    if (expected.getTime() > now.getTime()) {
      await prisma.scheduledMessage.update({
        where: { id: row.id },
        data: { status: "pending", sendAt: expected },
      });
      return "handed_back";
    }
  }

  // Honor skipIfPastAnchor: if true and the anchor event is already in the past, skip.
  // Not applicable to anchor="confirmation" (the anchor is a booking-state moment, not a future event).
  if (quickReply.skipIfPastAnchor && quickReply.anchor && quickReply.anchor !== "confirmation") {
    const anchorDate = quickReply.anchor === "checkOut" ? booking.checkOut : booking.checkIn;
    if (anchorDate.getTime() < now.getTime()) return skip("anchor already passed");
  }

  try {
    await sendGuestMessage({
      bookingId: booking.id,
      quickReplyId: quickReply.id,
      channel: rowChannel,
      trigger: "auto",
      subject: quickReply.subject,
      body: quickReply.bodyTemplate,
    });
    await prisma.scheduledMessage.update({
      where: { id: row.id },
      data: { status: "sent", sentAt: new Date() },
    });
    return "sent";
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.scheduledMessage.update({
      where: { id: row.id },
      data: { status: "failed", error: message },
    });
    return "failed";
  }
}

// ── Booking amendments ──────────────────────────────────────────────────────
//
// `sendAt` is precomputed when a booking is confirmed, so changing a booking's dates or
// listing does not move its reminders by itself. These reconcile the UNSENT rows with the
// amended stay. Sent rows are history and are never touched or re-sent.

export interface AmendmentReplyInfo {
  id: number;
  name: string;
  isActive: boolean;
  trigger: string;
  channel: string;
  anchor: string | null;
  offsetHours: number | null;
  propertyIds: string | null;
}

export interface AmendmentScheduledRow {
  id: number;
  quickReplyId: number;
  sendAt: Date;
  status: string;
}

export interface ScheduledMessageAmendmentPlan {
  /** Pending rows whose send time moves with the stay. */
  reschedule: { id: number; quickReplyId: number; name: string; from: Date; to: Date }[];
  /** Pending rows withdrawn because the template does not apply to the new listing. */
  withdraw: { id: number; quickReplyId: number; name: string; reason: string }[];
  /** Templates that newly apply and get a fresh pending row. */
  create: { quickReplyId: number; name: string; channel: string; sendAt: Date }[];
  /**
   * Reminders whose amended send time is already in the past. They are NOT sent
   * automatically: an existing pending row is withdrawn (`rowId`), a new one is not created.
   */
  held: { rowId: number | null; quickReplyId: number; name: string; wouldHaveSentAt: Date }[];
  /** Stay-anchored templates already sent for the old stay — not re-sent. */
  alreadySent: string[];
  /**
   * Rows the sending worker has already claimed. An amendment cannot change these; the
   * worker re-checks the booking once before sending, after which the message goes out.
   */
  inFlight: string[];
  /** Confirmation-anchored templates that newly apply — never replayed automatically. */
  notReplayed: string[];
}

export const HELD_REASON = "Amended send time had already passed — not sent automatically";
export const NOT_APPLICABLE_REASON = "Booking amended — template no longer applies to this listing";

const EMPTY_PLAN = (): ScheduledMessageAmendmentPlan => ({
  reschedule: [],
  withdraw: [],
  create: [],
  held: [],
  alreadySent: [],
  inFlight: [],
  notReplayed: [],
});

/**
 * Decide how a confirmed booking's scheduled messages should follow an amended stay.
 * Pure: no database, no clock (pass `now`).
 */
export function planScheduledMessageAmendment(input: {
  booking: { status: string; propertyId: number; checkIn: Date; checkOut: Date };
  previousPropertyId: number;
  replies: AmendmentReplyInfo[];
  existing: AmendmentScheduledRow[];
  now: Date;
}): ScheduledMessageAmendmentPlan {
  const plan = EMPTY_PLAN();
  const { booking, replies, existing, now } = input;
  // Only confirmed bookings have scheduled messages; a pending one is materialized from
  // its amended dates when it is confirmed.
  if (booking.status !== "confirmed") return plan;

  const applies = (r: AmendmentReplyInfo, propertyId: number) =>
    r.isActive &&
    r.trigger === "auto" &&
    !!r.anchor &&
    r.offsetHours !== null &&
    scopeAppliesToProperty(r.propertyIds, propertyId);

  const targetFor = (r: AmendmentReplyInfo) =>
    computeSendAt(r.anchor === "checkOut" ? booking.checkOut : booking.checkIn, r.offsetHours as number);

  const byId = new Map(replies.map((r) => [r.id, r]));

  for (const row of existing) {
    const reply = byId.get(row.quickReplyId);

    if (row.status === "pending") {
      if (!reply || !applies(reply, booking.propertyId)) {
        plan.withdraw.push({
          id: row.id,
          quickReplyId: row.quickReplyId,
          name: reply?.name ?? `Template #${row.quickReplyId}`,
          reason: NOT_APPLICABLE_REASON,
        });
        continue;
      }
      if (reply.anchor === "confirmation") continue;
      const target = targetFor(reply);
      if (target.getTime() === row.sendAt.getTime()) continue;
      if (target.getTime() <= now.getTime()) {
        plan.held.push({ rowId: row.id, quickReplyId: reply.id, name: reply.name, wouldHaveSentAt: target });
      } else {
        plan.reschedule.push({ id: row.id, quickReplyId: reply.id, name: reply.name, from: row.sendAt, to: target });
      }
      continue;
    }

    if (row.status === "sending") {
      const name = reply?.name ?? `Template #${row.quickReplyId}`;
      if (!plan.inFlight.includes(name)) plan.inFlight.push(name);
      continue;
    }

    if (
      row.status === "sent" &&
      reply &&
      reply.anchor !== "confirmation" &&
      reply.offsetHours !== null &&
      targetFor(reply).getTime() !== row.sendAt.getTime() &&
      !plan.alreadySent.includes(reply.name)
    ) {
      plan.alreadySent.push(reply.name);
    }
  }

  for (const reply of replies) {
    if (!applies(reply, booking.propertyId)) continue;
    const rows = existing.filter((row) => row.quickReplyId === reply.id);
    if (rows.some((row) => row.status !== "skipped")) continue;

    // Only templates this amendment made relevant: new to the listing, or previously
    // skipped. A template created after the booking was confirmed is not retro-fitted.
    const newToListing = !applies(reply, input.previousPropertyId);
    if (!newToListing && rows.length === 0) continue;

    if (reply.anchor === "confirmation") {
      if (newToListing) plan.notReplayed.push(reply.name);
      continue;
    }
    const target = targetFor(reply);
    if (target.getTime() <= now.getTime()) {
      plan.held.push({ rowId: null, quickReplyId: reply.id, name: reply.name, wouldHaveSentAt: target });
    } else {
      plan.create.push({ quickReplyId: reply.id, name: reply.name, channel: reply.channel, sendAt: target });
    }
  }

  return plan;
}

/** Compute the plan for a booking's CURRENT state as seen through `db`. */
export async function planScheduledMessagesForAmendedBooking(
  booking: { id: number; status: string; propertyId: number; checkIn: Date; checkOut: Date },
  previousPropertyId: number,
  db: Prisma.TransactionClient | typeof prisma = prisma,
  now: Date = new Date()
): Promise<ScheduledMessageAmendmentPlan> {
  if (booking.status !== "confirmed") return EMPTY_PLAN();
  const [replies, existing] = await Promise.all([
    db.quickReply.findMany({
      where: { trigger: "auto" },
      select: {
        id: true,
        name: true,
        isActive: true,
        trigger: true,
        channel: true,
        anchor: true,
        offsetHours: true,
        propertyIds: true,
      },
    }),
    db.scheduledMessage.findMany({
      where: { bookingId: booking.id },
      select: { id: true, quickReplyId: true, sendAt: true, status: true },
    }),
  ]);
  return planScheduledMessageAmendment({ booking, previousPropertyId, replies, existing, now });
}

/**
 * Apply a plan. Every update is conditional on the row still being `pending`, so a row the
 * sending worker claimed in the meantime is left to it rather than fought over.
 */
export async function applyScheduledMessageAmendment(
  bookingId: number,
  plan: ScheduledMessageAmendmentPlan,
  db: Prisma.TransactionClient | typeof prisma = prisma
): Promise<{ rescheduled: number; withdrawn: number; created: number; held: number }> {
  let rescheduled = 0;
  let withdrawn = 0;
  let held = 0;

  for (const r of plan.reschedule) {
    const res = await db.scheduledMessage.updateMany({
      where: { id: r.id, status: "pending" },
      data: { sendAt: r.to },
    });
    rescheduled += res.count;
  }
  for (const w of plan.withdraw) {
    const res = await db.scheduledMessage.updateMany({
      where: { id: w.id, status: "pending" },
      data: { status: "skipped", error: w.reason },
    });
    withdrawn += res.count;
  }
  for (const h of plan.held) {
    if (h.rowId === null) continue;
    const res = await db.scheduledMessage.updateMany({
      where: { id: h.rowId, status: "pending" },
      data: { status: "skipped", error: HELD_REASON },
    });
    held += res.count;
  }
  if (plan.create.length > 0) {
    await db.scheduledMessage.createMany({
      data: plan.create.map((c) => ({
        bookingId,
        quickReplyId: c.quickReplyId,
        channel: c.channel,
        sendAt: c.sendAt,
        status: "pending",
      })),
    });
  }
  return { rescheduled, withdrawn, created: plan.create.length, held };
}
