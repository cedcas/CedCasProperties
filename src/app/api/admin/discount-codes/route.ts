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

  const { code, type, value, maxUses } = await req.json();

  if (!code || !type || value === undefined) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!["fixed", "percentage"].includes(type)) {
    return NextResponse.json({ error: "Invalid type. Use 'fixed' or 'percentage'" }, { status: 400 });
  }

  if (type === "percentage" && (Number(value) <= 0 || Number(value) > 100)) {
    return NextResponse.json({ error: "Percentage must be between 1 and 100" }, { status: 400 });
  }

  try {
    const discount = await prisma.discountCode.create({
      data: {
        code: code.trim().toUpperCase(),
        type,
        value: Number(value),
        maxUses: maxUses ? Number(maxUses) : null,
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
