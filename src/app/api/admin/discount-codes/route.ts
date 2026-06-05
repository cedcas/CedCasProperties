import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const codes = await prisma.discountCode.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(codes);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code, type, value, maxUses, propertyIds } = await req.json();

  if (!code || !type || value === undefined) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!["fixed", "percentage"].includes(type)) {
    return NextResponse.json({ error: "Invalid type. Use 'fixed' or 'percentage'" }, { status: 400 });
  }

  if (type === "percentage" && (Number(value) <= 0 || Number(value) > 100)) {
    return NextResponse.json({ error: "Percentage must be between 1 and 100" }, { status: 400 });
  }

  // Normalize scope: null/empty array → all properties; otherwise validate the ids exist.
  let propertyIdsJson: string | null = null;
  if (Array.isArray(propertyIds) && propertyIds.length > 0) {
    const ids = [...new Set(propertyIds.map(Number).filter((n) => Number.isInteger(n)))];
    const existing = await prisma.property.findMany({ where: { id: { in: ids } }, select: { id: true } });
    if (existing.length !== ids.length) {
      return NextResponse.json({ error: "One or more selected properties no longer exist" }, { status: 400 });
    }
    propertyIdsJson = JSON.stringify(ids);
  }

  try {
    const discount = await prisma.discountCode.create({
      data: {
        code: code.trim().toUpperCase(),
        type,
        value: Number(value),
        maxUses: maxUses ? Number(maxUses) : null,
        propertyIds: propertyIdsJson,
      },
    });
    return NextResponse.json(discount);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "Code already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create discount code" }, { status: 500 });
  }
}
