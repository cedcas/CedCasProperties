import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { code, nightlyTotal } = await req.json();

    if (!code || typeof nightlyTotal !== "number") {
      return NextResponse.json({ error: "Missing code or nightlyTotal" }, { status: 400 });
    }

    const discount = await prisma.discountCode.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    if (!discount) {
      return NextResponse.json({ error: "Invalid promo code" }, { status: 404 });
    }

    if (!discount.isActive) {
      return NextResponse.json({ error: "This promo code is no longer active" }, { status: 400 });
    }

    if (discount.maxUses !== null && discount.usageCount >= discount.maxUses) {
      return NextResponse.json({ error: "This promo code has reached its usage limit" }, { status: 400 });
    }

    let discountAmount: number;
    if (discount.type === "percentage") {
      discountAmount = Math.round(nightlyTotal * (Number(discount.value) / 100) * 100) / 100;
    } else {
      discountAmount = Math.min(Number(discount.value), nightlyTotal);
    }

    return NextResponse.json({
      valid: true,
      code: discount.code,
      type: discount.type,
      value: Number(discount.value),
      discountAmount,
      message:
        discount.type === "percentage"
          ? `${Number(discount.value)}% off nightly rate`
          : `₱${Number(discount.value).toLocaleString()} off nightly rate`,
    });
  } catch (err) {
    console.error("Discount code validation error:", err);
    return NextResponse.json({ error: "Failed to validate code" }, { status: 500 });
  }
}
