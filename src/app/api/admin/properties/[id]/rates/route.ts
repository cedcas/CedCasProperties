import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const rates = await prisma.propertyRate.findMany({
    where: { propertyId: Number(id) },
    orderBy: [{ rateType: "asc" }, { dayOfWeek: "asc" }, { specificDate: "asc" }],
  });
  return NextResponse.json(rates);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { rateType, dayOfWeek, specificDate, rate, note } = await req.json();

  if (!rateType || rate === undefined) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!["weekday", "weekend", "override"].includes(rateType)) {
    return NextResponse.json({ error: "Invalid rateType" }, { status: 400 });
  }

  // For weekday/weekend, upsert by rateType + dayOfWeek
  if (rateType === "weekday" || rateType === "weekend") {
    const existing = await prisma.propertyRate.findFirst({
      where: { propertyId: Number(id), rateType },
    });
    if (existing) {
      const updated = await prisma.propertyRate.update({
        where: { id: existing.id },
        data: { rate: Number(rate), note: note || null, dayOfWeek: null },
      });
      return NextResponse.json(updated);
    }
  }

  const created = await prisma.propertyRate.create({
    data: {
      propertyId: Number(id),
      rateType,
      dayOfWeek: dayOfWeek !== undefined ? Number(dayOfWeek) : null,
      specificDate: specificDate ? new Date(specificDate) : null,
      rate: Number(rate),
      note: note || null,
    },
  });
  return NextResponse.json(created);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { rateId } = await req.json();

  await prisma.propertyRate.delete({ where: { id: Number(rateId), propertyId: Number(id) } });
  return NextResponse.json({ success: true });
}
