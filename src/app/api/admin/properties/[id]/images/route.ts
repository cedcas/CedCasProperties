import { NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

// POST — upload a new image, save URL to property.images
export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const blob = await put(`properties/${id}/${Date.now()}-${file.name}`, file, {
    access: "public",
  });

  const property = await prisma.property.findUnique({ where: { id: Number(id) } });
  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const images: string[] = JSON.parse(property.images || "[]");
  images.push(blob.url);

  const updated = await prisma.property.update({
    where: { id: Number(id) },
    data: { images: JSON.stringify(images) },
  });

  return NextResponse.json({ url: blob.url, images: JSON.parse(updated.images) });
}

// PATCH — set featured image { url: string }
export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { url } = await req.json();

  const updated = await prisma.property.update({
    where: { id: Number(id) },
    data: { featuredImage: url },
  });

  return NextResponse.json({ featuredImage: updated.featuredImage });
}

// DELETE — remove image { url: string }
export async function DELETE(req: Request, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { url } = await req.json();

  const property = await prisma.property.findUnique({ where: { id: Number(id) } });
  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Remove from Vercel Blob
  try { await del(url); } catch { /* ignore if already deleted */ }

  const images: string[] = JSON.parse(property.images || "[]").filter((u: string) => u !== url);
  const featuredImage = property.featuredImage === url ? (images[0] ?? null) : property.featuredImage;

  const updated = await prisma.property.update({
    where: { id: Number(id) },
    data: { images: JSON.stringify(images), featuredImage },
  });

  return NextResponse.json({ images: JSON.parse(updated.images), featuredImage: updated.featuredImage });
}
