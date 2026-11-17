import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseDiscountLimitsInput } from "@/lib/promo";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  // Whitelist editable fields — never trust the client to set code/usageCount/etc.
  const data: {
    isActive?: boolean;
    notes?: string | null;
    validFrom?: Date | null;
    validUntil?: Date | null;
    allowedWeekdays?: string | null;
  } = {};
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if ("notes" in body) {
    data.notes = typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null;
  }

  // Limits are edited together — a client sending any one of the three is asking to
  // set all three (missing ones are treated as "clear this bound").
  if ("validFrom" in body || "validUntil" in body || "allowedWeekdays" in body) {
    const limitsResult = parseDiscountLimitsInput(body);
    if (!limitsResult.ok) {
      return NextResponse.json({ error: limitsResult.error }, { status: 400 });
    }
    data.validFrom = limitsResult.limits.validFrom;
    data.validUntil = limitsResult.limits.validUntil;
    data.allowedWeekdays = limitsResult.limits.allowedWeekdays;
  }

  const updated = await prisma.discountCode.update({
    where: { id: Number(id) },
    data,
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.discountCode.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
