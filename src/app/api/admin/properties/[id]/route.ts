import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const data = await req.json();

  // Build a partial update: only write fields that are actually present in the body.
  // This lets the property form (no pricing fields) and the Rates page (pricePerNight
  // only) both PUT here safely, and avoids the old `parseFloat("") → NaN` corruption.
  const update: Record<string, unknown> = {};
  if (data.name !== undefined)         update.name = data.name;
  if (data.slug !== undefined)         update.slug = data.slug;
  if (data.description !== undefined)  update.description = data.description;
  if (data.type !== undefined)         update.type = data.type;
  if (data.location !== undefined)     update.location = data.location;
  if (data.bedrooms !== undefined)     update.bedrooms = parseInt(data.bedrooms);
  if (data.bathrooms !== undefined)    update.bathrooms = parseInt(data.bathrooms);
  if (data.maxGuests !== undefined)    update.maxGuests = parseInt(data.maxGuests);
  if (data.includedGuests !== undefined) update.includedGuests = parseInt(data.includedGuests);
  if (data.amenities !== undefined)    update.amenities = data.amenities;
  if (data.isActive !== undefined)     update.isActive = data.isActive;
  if (data.isFeatured !== undefined)   update.isFeatured = data.isFeatured;
  if (data.airbnbIcsUrl !== undefined) update.airbnbIcsUrl = data.airbnbIcsUrl ?? null;
  if (data.propertyRules !== undefined) update.propertyRules = data.propertyRules ?? null;

  // pricePerNight (the weekday/base rate) is patched only from the Rates page.
  if (data.pricePerNight !== undefined && data.pricePerNight !== "") {
    const ppn = parseFloat(data.pricePerNight);
    if (!Number.isFinite(ppn) || ppn <= 0) {
      return NextResponse.json({ error: "Weekday / base rate must be a positive number." }, { status: 400 });
    }
    update.pricePerNight = ppn;
  }

  // Extra-guest fee per night (patched from the Rates page). 0 = disabled.
  if (data.extraGuestFeePerNight !== undefined && data.extraGuestFeePerNight !== "") {
    const egf = parseFloat(data.extraGuestFeePerNight);
    if (!Number.isFinite(egf) || egf < 0) {
      return NextResponse.json({ error: "Extra guest fee must be 0 or positive." }, { status: 400 });
    }
    update.extraGuestFeePerNight = egf;
  }

  const property = await prisma.property.update({
    where: { id: Number(id) },
    data: update,
  });
  return NextResponse.json(property);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.property.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
