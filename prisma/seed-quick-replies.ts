import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Seeds a default "Check-in reminder" QuickReply equivalent to the retired
// /api/cron/check-in-reminders route, and backfills ScheduledMessage rows for
// existing confirmed bookings whose check-in is still in the future.
//
// Run once after deploying the messaging system:
//   npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-quick-replies.ts

const CHECK_IN_REMINDER = {
  name: "Check-in reminder (24h before)",
  subject: "🌅 Your Check-in is Tomorrow – {{propertyName}}",
  bodyTemplate: `Hi {{guestFirstName}},

This is a friendly reminder that your stay at {{propertyName}} begins tomorrow. We're excited to have you and want to make sure everything is ready for a smooth check-in.

Booking Summary
Property: {{propertyName}}
Location: {{propertyLocation}}
Check-in: {{checkIn}}
Check-out: {{checkOut}}
Duration: {{nights}} night(s)
Guests: {{guests}}

If you have any last-minute questions or need assistance before your arrival, please don't hesitate to reach out — we're happy to help:
📧 customerservice@haveninlipa.com
📞 +639066554415

We look forward to seeing you tomorrow. Have a safe journey to Lipa City! 🌿`,
  trigger: "auto" as const,
  anchor: "checkIn" as const,
  offsetHours: -24,
  skipIfPastAnchor: true,
  isActive: true,
};

async function main() {
  const existing = await prisma.quickReply.findFirst({
    where: { name: CHECK_IN_REMINDER.name },
  });

  let reply;
  if (existing) {
    console.log(`Quick Reply "${CHECK_IN_REMINDER.name}" already exists (id=${existing.id}). Skipping create.`);
    reply = existing;
  } else {
    reply = await prisma.quickReply.create({
      data: { ...CHECK_IN_REMINDER, propertyId: null },
    });
    console.log(`✅ Created Quick Reply "${reply.name}" (id=${reply.id})`);
  }

  // Backfill: materialize ScheduledMessage rows for existing confirmed bookings
  // whose check-in is still in the future, mirroring the production scheduler.
  const now = new Date();
  const confirmed = await prisma.booking.findMany({
    where: { status: "confirmed", checkIn: { gt: now } },
    select: { id: true, checkIn: true, checkOut: true, propertyId: true },
  });

  console.log(`Backfilling for ${confirmed.length} confirmed upcoming booking(s)...`);
  let inserted = 0;
  for (const b of confirmed) {
    // Same applicability rule as materializeScheduledMessagesForBooking
    const applies = reply.propertyId === null || reply.propertyId === b.propertyId;
    if (!applies) continue;

    const alreadyExists = await prisma.scheduledMessage.findFirst({
      where: { bookingId: b.id, quickReplyId: reply.id, NOT: { status: "skipped" } },
    });
    if (alreadyExists) continue;

    const anchorDate = reply.anchor === "checkOut" ? b.checkOut : b.checkIn;
    const sendAt = new Date(anchorDate.getTime() + (reply.offsetHours ?? 0) * 60 * 60 * 1000);

    await prisma.scheduledMessage.create({
      data: {
        bookingId: b.id,
        quickReplyId: reply.id,
        sendAt,
        status: "pending",
      },
    });
    inserted++;
  }
  console.log(`✅ Backfill complete. ${inserted} ScheduledMessage row(s) inserted.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
