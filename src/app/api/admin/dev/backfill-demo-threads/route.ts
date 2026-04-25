// TEMPORARY backfill route — creates 10 demo bookings + GuestMessage rows
// so the Admin > Messages thread list has realistic entries to demo against.
// Runs inside Vercel's network because direct MySQL access from outside
// Hostinger shared hosting is blocked.
//
// This route MUST be removed after the backfill is complete.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildVars, render } from "@/lib/templates";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const DEMO_MARKER = "__DEMO_THREAD_BACKFILL__";
const DAY = 86_400_000;
const HR = 3_600_000;

type Spec = {
  first: string;
  last: string;
  bedrooms: 1 | 2;
  guests: number;
  checkInOffsetMs: number;
  checkOutOffsetMs: number;
  nightlyRate: number;
  payment: "stripe" | "gcash" | "bpi";
  manualSmartLock?: boolean;
};

const SPECS: Spec[] = [
  { first: "Carlos",   last: "Santos",     bedrooms: 1, guests: 2, checkInOffsetMs: -10 * DAY,          checkOutOffsetMs: -5 * DAY,           nightlyRate: 2500, payment: "stripe" },
  { first: "Maricel",  last: "Dela Cruz",  bedrooms: 2, guests: 4, checkInOffsetMs: -5 * DAY,           checkOutOffsetMs: -2 * DAY,           nightlyRate: 4500, payment: "gcash"  },
  { first: "Juan",     last: "Reyes",      bedrooms: 1, guests: 3, checkInOffsetMs: -3 * DAY,           checkOutOffsetMs: -2 * HR,            nightlyRate: 2500, payment: "bpi"    },
  { first: "Liza",     last: "Manalo",     bedrooms: 2, guests: 5, checkInOffsetMs: -1 * DAY,           checkOutOffsetMs: 2 * DAY,            nightlyRate: 4500, payment: "stripe" },
  { first: "Mark",     last: "Villanueva", bedrooms: 1, guests: 2, checkInOffsetMs: -2 * HR,            checkOutOffsetMs: 3 * DAY,            nightlyRate: 2500, payment: "stripe" },
  { first: "Aileen",   last: "Garcia",     bedrooms: 2, guests: 6, checkInOffsetMs: 22 * HR,            checkOutOffsetMs: 3 * DAY + 22 * HR,  nightlyRate: 4500, payment: "gcash"  },
  { first: "Paolo",    last: "Aquino",     bedrooms: 1, guests: 3, checkInOffsetMs: 3 * DAY,            checkOutOffsetMs: 5 * DAY,            nightlyRate: 2500, payment: "stripe" },
  { first: "Nicole",   last: "Bautista",   bedrooms: 2, guests: 4, checkInOffsetMs: 5 * DAY,            checkOutOffsetMs: 8 * DAY,            nightlyRate: 4500, payment: "bpi"    },
  { first: "Joshua",   last: "Tan",        bedrooms: 1, guests: 2, checkInOffsetMs: 14 * DAY,           checkOutOffsetMs: 16 * DAY,           nightlyRate: 2500, payment: "stripe", manualSmartLock: true },
  { first: "Kimberly", last: "Ramirez",    bedrooms: 2, guests: 5, checkInOffsetMs: 21 * DAY,           checkOutOffsetMs: 23 * DAY,           nightlyRate: 4500, payment: "gcash",  manualSmartLock: true },
];

async function deleteDemo(): Promise<number> {
  const bookings = await prisma.booking.findMany({
    where: { notes: { contains: DEMO_MARKER } },
    select: { id: true },
  });
  if (!bookings.length) return 0;
  const ids = bookings.map((b) => b.id);
  await prisma.guestMessage.deleteMany({ where: { bookingId: { in: ids } } });
  await prisma.scheduledMessage.deleteMany({ where: { bookingId: { in: ids } } });
  const res = await prisma.booking.deleteMany({ where: { id: { in: ids } } });
  return res.count;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  if (action === "delete") {
    const deleted = await deleteDemo();
    return NextResponse.json({ deleted });
  }

  const deletedFirst = await deleteDemo();

  const props = await prisma.property.findMany({ where: { isActive: true } });
  const br1 = props.find((p) => p.bedrooms === 1);
  const br2 = props.find((p) => p.bedrooms === 2);
  if (!br1 || !br2) {
    return NextResponse.json({ error: "Need one active 1BR and one active 2BR property." }, { status: 400 });
  }

  const qrs = await prisma.quickReply.findMany();
  const qr24h     = qrs.find((q) => q.name === "Check-in reminder - 24h before Check-in");
  const qrConfirm = qrs.find((q) => q.anchor === "confirmation" && q.trigger === "auto");
  const qrWelcome = qrs.find((q) => q.name === "Welcome & Tips - During Check-in");
  const qr4hOut   = qrs.find((q) => q.name === "How the guest found us - Morning before Checkout");
  const qrSmart1  = qrs.find((q) => q.name === "SmartLock Code for 1-Bedroom");
  const qrSmart2  = qrs.find((q) => q.name === "SmartLock Code for 2-Bedroom");
  if (!qrConfirm) {
    return NextResponse.json({ error: "Confirmation-anchor QuickReply not found." }, { status: 400 });
  }

  const now = new Date();
  let bookingCount = 0;
  let messageCount = 0;
  const log: string[] = [];

  for (let i = 0; i < SPECS.length; i++) {
    const s = SPECS[i];
    const property = s.bedrooms === 1 ? br1 : br2;
    const checkIn = new Date(now.getTime() + s.checkInOffsetMs);
    const checkOut = new Date(now.getTime() + s.checkOutOffsetMs);
    const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / DAY));
    const nightlyTotal = nights * s.nightlyRate;
    const stripeFee = s.payment === "stripe" ? Math.round(nightlyTotal * 0.06) : 0;
    const totalPrice = nightlyTotal + stripeFee;
    const confirmationTime = new Date(
      Math.min(now.getTime() - 3 * DAY, checkIn.getTime() - 7 * DAY),
    );

    const booking = await prisma.booking.create({
      data: {
        propertyId: property.id,
        guestName: `${s.first} ${s.last}`,
        guestEmail: `demo.${s.first.toLowerCase()}.${i + 1}@haveninlipa.com`,
        guestPhone: `+63 917 555 ${String(1000 + i).slice(-4)}`,
        checkIn,
        checkOut,
        guests: s.guests,
        nightlyTotal,
        stripeFee,
        totalPrice,
        status: "confirmed",
        paymentMethod: s.payment,
        notes: `DEMO ${DEMO_MARKER} — thread backfill #${i + 1}`,
        createdAt: confirmationTime,
      },
    });
    bookingCount++;

    const vars = buildVars({ booking, property });

    type Msg = { qrId: number | null; trigger: "auto" | "manual"; subject: string; body: string; sentAt: Date };
    const msgs: Msg[] = [];

    msgs.push({
      qrId: qrConfirm.id, trigger: "auto",
      subject: render(qrConfirm.subject, vars),
      body: render(qrConfirm.bodyTemplate, vars),
      sentAt: confirmationTime,
    });

    const t24h = new Date(checkIn.getTime() - 24 * HR);
    if (qr24h && t24h.getTime() <= now.getTime() && t24h.getTime() > confirmationTime.getTime()) {
      msgs.push({
        qrId: qr24h.id, trigger: "auto",
        subject: render(qr24h.subject, vars),
        body: render(qr24h.bodyTemplate, vars),
        sentAt: t24h,
      });
    }

    if (qrWelcome && checkIn.getTime() <= now.getTime()) {
      msgs.push({
        qrId: qrWelcome.id, trigger: "auto",
        subject: render(qrWelcome.subject, vars),
        body: render(qrWelcome.bodyTemplate, vars),
        sentAt: checkIn,
      });
    }

    const t4hOut = new Date(checkOut.getTime() - 4 * HR);
    if (qr4hOut && t4hOut.getTime() <= now.getTime()) {
      msgs.push({
        qrId: qr4hOut.id, trigger: "auto",
        subject: render(qr4hOut.subject, vars),
        body: render(qr4hOut.bodyTemplate, vars),
        sentAt: t4hOut,
      });
    }

    if (s.manualSmartLock) {
      const manual = s.bedrooms === 1 ? qrSmart1 : qrSmart2;
      if (manual) {
        msgs.push({
          qrId: manual.id, trigger: "manual",
          subject: render(manual.subject, vars),
          body: render(manual.bodyTemplate, vars),
          sentAt: new Date(confirmationTime.getTime() + 2 * HR),
        });
      }
    }

    for (const m of msgs) {
      await prisma.guestMessage.create({
        data: {
          bookingId: booking.id,
          quickReplyId: m.qrId,
          channel: "email",
          direction: "outbound",
          trigger: m.trigger,
          subject: m.subject,
          body: m.body,
          status: "sent",
          sentAt: m.sentAt,
        },
      });
      messageCount++;
    }

    log.push(`#${i + 1} ${s.first} ${s.last} ${property.type} (${msgs.length} msgs)`);
  }

  return NextResponse.json({
    deletedFirst,
    bookingsCreated: bookingCount,
    messagesCreated: messageCount,
    log,
  });
}
