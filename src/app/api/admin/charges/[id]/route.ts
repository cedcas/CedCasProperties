import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendGuestMessage } from "@/lib/guestMessages";
import { logAction, getIpFromRequest } from "@/lib/log";
import { chargeUrl, buildChargeEmail } from "@/lib/charge-message";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const chargeId = Number(id);
  const body = await req.json();

  const charge = await prisma.additionalCharge.findUnique({
    where: { id: chargeId },
    include: { booking: { select: { id: true, guestName: true } } },
  });
  if (!charge) return NextResponse.json({ error: "Charge not found" }, { status: 404 });

  const actor = {
    actor: session.user.name ?? "Admin",
    actorRole: (session.user.role ?? "admin") as "admin" | "manager",
    actorId: parseInt(session.user.id),
    module: "bookings" as const,
    target: `booking-${charge.bookingId}`,
    ipAddress: getIpFromRequest(req),
  };

  // Resend the guest payment link (threaded into Guest Messages).
  if (body.resend === true) {
    const url = chargeUrl(charge.token);
    const email = buildChargeEmail({
      guestName: charge.booking.guestName,
      amount: Number(charge.amount),
      description: charge.description,
      url,
    });
    await sendGuestMessage({
      bookingId: charge.bookingId,
      quickReplyId: null,
      channel: "email",
      trigger: "manual",
      subject: email.subject,
      body: email.body,
    });
    const updated = await prisma.additionalCharge.update({
      where: { id: chargeId },
      data: { notifiedAt: new Date() },
    });
    await logAction({ ...actor, action: `Resent charge #${chargeId} payment link` });
    return NextResponse.json(updated);
  }

  // Whitelist status transitions only — never trust client to set amount/token/etc.
  const status = body.status;
  if (status !== "paid" && status !== "cancelled") {
    return NextResponse.json({ error: "Unsupported update" }, { status: 400 });
  }

  const updated = await prisma.additionalCharge.update({
    where: { id: chargeId },
    data: {
      status,
      paidAt: status === "paid" ? charge.paidAt ?? new Date() : charge.paidAt,
    },
  });

  await logAction({
    ...actor,
    action:
      status === "paid"
        ? `Marked charge #${chargeId} (₱${Number(charge.amount).toLocaleString()}) as paid`
        : `Cancelled charge #${chargeId}`,
    metadata: { chargeId, status },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const chargeId = Number(id);
  const charge = await prisma.additionalCharge.findUnique({ where: { id: chargeId } });
  if (!charge) return NextResponse.json({ error: "Charge not found" }, { status: 404 });

  await prisma.additionalCharge.delete({ where: { id: chargeId } });

  await logAction({
    actor: session.user.name ?? "Admin",
    actorRole: (session.user.role ?? "admin") as "admin" | "manager",
    actorId: parseInt(session.user.id),
    action: `Deleted charge #${chargeId}`,
    module: "bookings",
    target: `booking-${charge.bookingId}`,
    ipAddress: getIpFromRequest(req),
  });

  return NextResponse.json({ success: true });
}
