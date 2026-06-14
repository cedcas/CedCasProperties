import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getIpFromRequest } from "@/lib/log";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await req.json();
  // Pricing is no longer set on create — pricePerNight defaults to 0 ("not configured").
  // The admin sets the weekday + weekend rate on the Rates page before activating.
  // New properties start inactive so a ₱0 property never goes live before it's priced.
  const property = await prisma.property.create({
    data: {
      name:          data.name,
      slug:          data.slug,
      description:   data.description,
      type:          data.type,
      location:      data.location,
      bedrooms:      parseInt(data.bedrooms),
      bathrooms:     parseInt(data.bathrooms),
      maxGuests:     parseInt(data.maxGuests),
      amenities:     data.amenities   ?? "[]",
      images:        data.images      ?? "[]",
      isActive:      data.isActive    ?? false,
      isFeatured:    data.isFeatured  ?? false,
      airbnbIcsUrl:  data.airbnbIcsUrl ?? null,
      propertyRules: data.propertyRules ?? null,
    },
  });

  await logAction({
    actor: session.user.name ?? "Admin",
    actorRole: (session.user.role ?? "admin") as "admin" | "manager",
    actorId: parseInt(session.user.id),
    action: `Created property "${data.name}"`,
    module: "properties",
    target: data.slug,
    ipAddress: getIpFromRequest(req),
  });

  return NextResponse.json(property, { status: 201 });
}
