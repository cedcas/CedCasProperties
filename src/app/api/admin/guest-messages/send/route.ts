import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendGuestMessage } from "@/lib/guestMessages";
import { logAction, getIpFromRequest } from "@/lib/log";

// POST body: { bookingId, quickReplyId? , subject?, body? }
// - If quickReplyId is provided, render the template.
// - Otherwise, subject+body are required (free-text send).

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bookingId, quickReplyId, sourceQuickReplyId, subject, body } = await req.json();

  if (!bookingId) {
    return NextResponse.json({ error: "bookingId is required" }, { status: 400 });
  }

  let renderSubject: string;
  let renderBody: string;
  let resolvedQuickReplyId: number | null;
  let resolvedSourceId: number | null;

  if (quickReplyId) {
    const reply = await prisma.quickReply.findUnique({ where: { id: Number(quickReplyId) } });
    if (!reply) return NextResponse.json({ error: "Quick Reply not found" }, { status: 404 });
    renderSubject = reply.subject;
    renderBody = reply.bodyTemplate;
    resolvedQuickReplyId = reply.id;
    resolvedSourceId = reply.id;
  } else {
    if (typeof subject !== "string" || !subject.trim() || typeof body !== "string" || !body.trim()) {
      return NextResponse.json({ error: "subject and body are required" }, { status: 400 });
    }
    renderSubject = subject;
    renderBody = body;
    resolvedQuickReplyId = null;
    resolvedSourceId = sourceQuickReplyId ? Number(sourceQuickReplyId) : null;
  }

  try {
    const msg = await sendGuestMessage({
      bookingId: Number(bookingId),
      quickReplyId: resolvedQuickReplyId,
      sourceQuickReplyId: resolvedSourceId,
      trigger: "manual",
      subject: renderSubject,
      body: renderBody,
    });

    await logAction({
      actor: session.user.name ?? "Admin",
      actorRole: (session.user.role ?? "admin") as "admin" | "manager",
      actorId: parseInt(session.user.id),
      action: resolvedQuickReplyId
        ? `Sent Quick Reply to booking #${bookingId}`
        : `Sent manual message to booking #${bookingId}`,
      module: "messages",
      target: `booking-${bookingId}`,
      ipAddress: getIpFromRequest(req),
      metadata: { quickReplyId: resolvedQuickReplyId, guestMessageId: msg.id },
    });

    return NextResponse.json(msg);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
