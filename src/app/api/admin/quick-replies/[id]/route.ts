import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getIpFromRequest } from "@/lib/log";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const reply = await prisma.quickReply.findUnique({
    where: { id: Number(id) },
    include: { property: { select: { id: true, name: true, type: true } } },
  });
  if (!reply) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(reply);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string") data.name = body.name.trim();
  if (body.propertyId === null || typeof body.propertyId === "number") data.propertyId = body.propertyId;
  if (typeof body.subject === "string") data.subject = body.subject.trim();
  if (typeof body.bodyTemplate === "string") data.bodyTemplate = body.bodyTemplate;
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if (typeof body.skipIfPastAnchor === "boolean") data.skipIfPastAnchor = body.skipIfPastAnchor;

  if (body.trigger === "manual") {
    data.trigger = "manual";
    data.anchor = null;
    data.offsetHours = null;
  } else if (body.trigger === "auto") {
    data.trigger = "auto";
    const validAnchors = ["checkIn", "checkOut", "confirmation"];
    data.anchor = validAnchors.includes(body.anchor) ? body.anchor : "checkIn";
    if (typeof body.offsetHours === "number") data.offsetHours = body.offsetHours;
  }

  const reply = await prisma.quickReply.update({ where: { id: Number(id) }, data });

  await logAction({
    actor: session.user.name ?? "Admin",
    actorRole: (session.user.role ?? "admin") as "admin" | "manager",
    actorId: parseInt(session.user.id),
    action: `Updated Quick Reply "${reply.name}"`,
    module: "messages",
    target: `quick-reply-${reply.id}`,
    ipAddress: getIpFromRequest(req),
  });

  return NextResponse.json(reply);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const reply = await prisma.quickReply.delete({ where: { id: Number(id) } });

  await logAction({
    actor: session.user.name ?? "Admin",
    actorRole: (session.user.role ?? "admin") as "admin" | "manager",
    actorId: parseInt(session.user.id),
    action: `Deleted Quick Reply "${reply.name}"`,
    module: "messages",
    target: `quick-reply-${reply.id}`,
    ipAddress: getIpFromRequest(req),
  });

  return NextResponse.json({ success: true });
}
