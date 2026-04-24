import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getIpFromRequest } from "@/lib/log";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const replies = await prisma.quickReply.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: { property: { select: { id: true, name: true, type: true } } },
  });
  return NextResponse.json(replies);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const trigger = body.trigger === "auto" ? "auto" : "manual";
  const validAnchors = ["checkIn", "checkOut", "confirmation"] as const;
  const anchor = trigger === "auto"
    ? (validAnchors.includes(body.anchor) ? body.anchor : "checkIn")
    : null;
  const offsetHours = trigger === "auto" && typeof body.offsetHours === "number" ? body.offsetHours : null;

  if (trigger === "auto" && offsetHours === null) {
    return NextResponse.json({ error: "offsetHours is required when trigger is auto" }, { status: 400 });
  }

  const reply = await prisma.quickReply.create({
    data: {
      name: String(body.name ?? "").trim(),
      propertyId: body.propertyId === null || body.propertyId === undefined ? null : Number(body.propertyId),
      subject: String(body.subject ?? "").trim(),
      bodyTemplate: String(body.bodyTemplate ?? ""),
      trigger,
      anchor,
      offsetHours,
      skipIfPastAnchor: Boolean(body.skipIfPastAnchor),
      isActive: body.isActive === false ? false : true,
    },
  });

  await logAction({
    actor: session.user.name ?? "Admin",
    actorRole: (session.user.role ?? "admin") as "admin" | "manager",
    actorId: parseInt(session.user.id),
    action: `Created Quick Reply "${reply.name}"`,
    module: "messages",
    target: `quick-reply-${reply.id}`,
    ipAddress: getIpFromRequest(req),
  });

  return NextResponse.json(reply);
}
