import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const data = await req.json();
  const property = await prisma.property.update({
    where: { id: Number(id) },
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
      amenities:     data.amenities,
      isActive:      data.isActive,
      isFeatured:    data.isFeatured,
    },
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
