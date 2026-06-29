import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getIpFromRequest } from "@/lib/log";

/**
 * Normalize an incoming `propertyIds` array into a stored JSON string (or null = all properties).
 * Dedupes, keeps integers only, and validates every id still exists. Returns { error } on a bad id.
 */
export async function normalizePropertyIds(
  propertyIds: unknown,
): Promise<{ value: string | null } | { error: string }> {
  if (!Array.isArray(propertyIds) || propertyIds.length === 0) return { value: null };
  const ids = [...new Set(propertyIds.map(Number).filter((n) => Number.isInteger(n)))];
  if (ids.length === 0) return { value: null };
  const existing = await prisma.property.findMany({ where: { id: { in: ids } }, select: { id: true } });
  if (existing.length !== ids.length) {
    return { error: "One or more selected properties no longer exist" };
  }
  return { value: JSON.stringify(ids) };
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const replies = await prisma.quickReply.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
  return NextResponse.json(replies);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const trigger = body.trigger === "auto" ? "auto" : "manual";
  const channel = body.channel === "sms" ? "sms" : "email";
  const validAnchors = ["checkIn", "checkOut", "confirmation"] as const;
  const anchor = trigger === "auto"
    ? (validAnchors.includes(body.anchor) ? body.anchor : "checkIn")
    : null;
  const offsetHours = trigger === "auto" && typeof body.offsetHours === "number" ? body.offsetHours : null;

  if (trigger === "auto" && offsetHours === null) {
    return NextResponse.json({ error: "offsetHours is required when trigger is auto" }, { status: 400 });
  }

  const scope = await normalizePropertyIds(body.propertyIds);
  if ("error" in scope) return NextResponse.json({ error: scope.error }, { status: 400 });

  const reply = await prisma.quickReply.create({
    data: {
      name: String(body.name ?? "").trim(),
      propertyIds: scope.value,
      subject: String(body.subject ?? "").trim(),
      bodyTemplate: String(body.bodyTemplate ?? ""),
      trigger,
      channel,
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
