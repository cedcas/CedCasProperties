import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getIpFromRequest } from "@/lib/log";

// PATCH body: { bookingId?: number, dismiss?: true }
//   - bookingId: re-thread by creating an inbound GuestMessage on that booking
//   - dismiss: mark resolved with no follow-up
//
// Either marks the row as resolved (resolvedAt set).

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const rowId = Number(id);
  const body = await req.json().catch(() => ({}));

  const row = await prisma.unmatchedInboundMessage.findUnique({ where: { id: rowId } });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (row.resolvedAt) return NextResponse.json({ error: "Already resolved" }, { status: 400 });

  if (body.bookingId) {
    const targetBookingId = Number(body.bookingId);
    const booking = await prisma.booking.findUnique({ where: { id: targetBookingId } });
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    await prisma.$transaction([
      prisma.guestMessage.create({
        data: {
          bookingId: booking.id,
          quickReplyId: null,
          sourceQuickReplyId: null,
          channel: row.channel,
          direction: "inbound",
          trigger: "manual",
          subject: "Reply from guest (re-threaded)",
          body: row.body,
          status: "sent",
          fromNumber: row.fromNumber,
          notes: `Re-threaded from unmatched inbox by ${session.user.name ?? "admin"}`,
        },
      }),
      prisma.unmatchedInboundMessage.update({
        where: { id: rowId },
        data: { resolvedAt: new Date(), resolvedBookingId: booking.id },
      }),
    ]);

    await logAction({
      actor: session.user.name ?? "Admin",
      actorRole: (session.user.role ?? "admin") as "admin" | "manager",
      actorId: parseInt(session.user.id),
      action: `Re-threaded unmatched SMS to booking #${booking.id}`,
      module: "messages",
      target: `unmatched-${rowId}`,
      ipAddress: getIpFromRequest(req),
    });

    return NextResponse.json({ ok: true });
  }

  if (body.dismiss) {
    await prisma.unmatchedInboundMessage.update({
      where: { id: rowId },
      data: { resolvedAt: new Date() },
    });
    await logAction({
      actor: session.user.name ?? "Admin",
      actorRole: (session.user.role ?? "admin") as "admin" | "manager",
      actorId: parseInt(session.user.id),
      action: `Dismissed unmatched SMS from ${row.fromNumber}`,
      module: "messages",
      target: `unmatched-${rowId}`,
      ipAddress: getIpFromRequest(req),
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Provide bookingId to re-thread or dismiss=true" }, { status: 400 });
}
