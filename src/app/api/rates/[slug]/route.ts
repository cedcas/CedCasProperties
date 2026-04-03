import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDailyRates } from "@/lib/pricing";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const checkIn = searchParams.get("checkIn");
  const checkOut = searchParams.get("checkOut");

  if (!checkIn || !checkOut) {
    return NextResponse.json({ error: "checkIn and checkOut are required" }, { status: 400 });
  }

  const property = await prisma.property.findUnique({
    where: { slug },
    select: { id: true, pricePerNight: true },
  });

  if (!property) return NextResponse.json({ error: "Property not found" }, { status: 404 });

  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);

  if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime()) || checkOutDate <= checkInDate) {
    return NextResponse.json({ error: "Invalid dates" }, { status: 400 });
  }

  const dailyRates = await getDailyRates(
    property.id,
    checkInDate,
    checkOutDate,
    Number(property.pricePerNight)
  );

  const nightlyTotal = dailyRates.reduce((sum, e) => sum + e.rate, 0);

  return NextResponse.json({ dailyRates, nightlyTotal });
}
