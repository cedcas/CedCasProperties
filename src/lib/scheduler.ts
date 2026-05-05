import { prisma } from "@/lib/prisma";
import { sendGuestMessage, type Channel } from "@/lib/guestMessages";

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

  const replies = await prisma.quickReply.findMany({
    where: {
      isActive: true,
      trigger: "auto",
      OR: [{ propertyId: null }, { propertyId: booking.propertyId }],
    },
  });

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
  const due = await prisma.scheduledMessage.findMany({
    where: {
      status: "pending",
      sendAt: { lte: now },
      ...(opts?.bookingId ? { bookingId: opts.bookingId } : {}),
    },
    include: {
      quickReply: true,
      booking: true,
    },
  });

  let sent = 0, skipped = 0, failed = 0, deferred = 0;
  const inQuietHours = isInSmsQuietHours(now);

  for (const row of due) {
    const { quickReply, booking } = row;
    const rowChannel = (row.channel as Channel) ?? "email";

    // Skip if the booking is no longer confirmed.
    if (booking.status !== "confirmed") {
      await prisma.scheduledMessage.update({
        where: { id: row.id },
        data: { status: "skipped", error: `booking status=${booking.status}` },
      });
      skipped++;
      continue;
    }

    // Defer SMS during quiet hours; row stays pending and fires on the next non-quiet run.
    if (rowChannel === "sms" && inQuietHours) {
      deferred++;
      continue;
    }

    // Honor skipIfPastAnchor: if true and the anchor event is already in the past, skip.
    // Not applicable to anchor="confirmation" (the anchor is a booking-state moment, not a future event).
    if (quickReply.skipIfPastAnchor && quickReply.anchor && quickReply.anchor !== "confirmation") {
      const anchorDate = quickReply.anchor === "checkOut" ? booking.checkOut : booking.checkIn;
      if (anchorDate.getTime() < now.getTime()) {
        await prisma.scheduledMessage.update({
          where: { id: row.id },
          data: { status: "skipped", error: "anchor already passed" },
        });
        skipped++;
        continue;
      }
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
      sent++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await prisma.scheduledMessage.update({
        where: { id: row.id },
        data: { status: "failed", error: message },
      });
      failed++;
    }
  }

  return { processed: due.length, sent, skipped, failed, deferred };
}
