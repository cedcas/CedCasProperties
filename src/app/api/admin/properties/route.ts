import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await req.json();
  const property = await prisma.property.create({
    data: {
      name:          data.name,
      slug:          data.slug,
      description:   data.description,
      type:          data.type,
      pricePerNight: parseFloat(data.pricePerNight),
      location:      data.location,
      bedrooms:      parseInt(data.bedrooms),
      bathrooms:     parseInt(data.bathrooms),
      maxGuests:     parseInt(data.maxGuests),
      amenities:     data.amenities ?? "[]",
      images:        data.images    ?? "[]",
      isActive:      data.isActive  ?? true,
      isFeatured:    data.isFeatured ?? false,
    },
  });
  return NextResponse.json(property, { status: 201 });
}
