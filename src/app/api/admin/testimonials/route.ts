import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { propertyId, name, location, rating, message } = await req.json();
  const t = await prisma.testimonial.create({ data: { propertyId: Number(propertyId), name, location, rating: Number(rating), message } });
  return NextResponse.json(t, { status: 201 });
}
