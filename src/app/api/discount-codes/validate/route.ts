import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { codeAppliesToProperty, evaluatePromoDiscount, parseAllowedWeekdays } from "@/lib/promo";
import { getDailyRates } from "@/lib/pricing";
import { toUtcMidnight } from "@/lib/dates";

export async function POST(req: Request) {
  try {
    // `nightlyTotal` may still arrive from an older client build; it is never read —
    // the server recomputes the discount from its own per-night rates (DEC-020/DEC-035).
    const { code, propertyId, checkIn, checkOut } = await req.json();

    if (!code || !checkIn || !checkOut) {
      return NextResponse.json({ error: "Missing code, checkIn or checkOut" }, { status: 400 });
    }

    const checkInDate = toUtcMidnight(checkIn);
    const checkOutDate = toUtcMidnight(checkOut);
    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime()) || checkOutDate <= checkInDate) {
      return NextResponse.json({ error: "Invalid check-in / check-out dates" }, { status: 400 });
    }

    const discount = await prisma.discountCode.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    if (!discount) {
      return NextResponse.json({ error: "Invalid promo code" }, { status: 404 });
    }

    // Scope check — a code restricted to specific properties reads as "invalid"
    // elsewhere, so we don't reveal it exists for another listing.
    if (!codeAppliesToProperty(discount.propertyIds, Number(propertyId))) {
      return NextResponse.json({ error: "Invalid promo code" }, { status: 404 });
    }

    if (!discount.isActive) {
      return NextResponse.json({ error: "This promo code is no longer active" }, { status: 400 });
    }

    if (discount.maxUses !== null && discount.usageCount >= discount.maxUses) {
      return NextResponse.json({ error: "This promo code has reached its usage limit" }, { status: 400 });
    }

    const property = await prisma.property.findUnique({
      where: { id: Number(propertyId) },
      select: { pricePerNight: true },
    });
    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const dailyRates = await getDailyRates(Number(propertyId), checkInDate, checkOutDate, Number(property.pricePerNight));

    const evaluation = evaluatePromoDiscount(
      {
        type: discount.type,
        value: Number(discount.value),
        validFrom: discount.validFrom,
        validUntil: discount.validUntil,
        allowedWeekdays: parseAllowedWeekdays(discount.allowedWeekdays),
      },
      dailyRates
    );

    // Zero qualifying nights on an otherwise-valid code: reject with a clear reason
    // rather than silently applying a ₱0 discount while still attaching the code.
    if (!evaluation.ok) {
      return NextResponse.json({ error: evaluation.rejectionMessage }, { status: 400 });
    }

    const isPartial = evaluation.qualifyingNightCount < evaluation.totalNightCount;
    const message =
      discount.type === "percentage"
        ? `${Number(discount.value)}% off ${isPartial ? "eligible nights" : "nightly rate"}`
        : `₱${Number(discount.value).toLocaleString()} off ${isPartial ? "eligible nights" : "nightly rate"}`;

    return NextResponse.json({
      valid: true,
      code: discount.code,
      type: discount.type,
      value: Number(discount.value),
      discountAmount: evaluation.discountAmount,
      message,
    });
  } catch (err) {
    console.error("Discount code validation error:", err);
    return NextResponse.json({ error: "Failed to validate code" }, { status: 500 });
  }
}
