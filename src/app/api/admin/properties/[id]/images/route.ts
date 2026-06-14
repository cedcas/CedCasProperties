import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

// POST — record an image URL on property.images.
// The file itself is uploaded directly from the browser to Vercel Blob
// (see ./upload/route.ts) to bypass the 4.5 MB serverless body limit; this
// endpoint only receives the resulting URL as a small JSON payload.
export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { url } = await req.json();
  if (!url || typeof url !== "string") return NextResponse.json({ error: "No url provided" }, { status: 400 });

  const property = await prisma.property.findUnique({ where: { id: Number(id) } });
  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const images: string[] = JSON.parse(property.images || "[]");
  images.push(url);

  const updated = await prisma.property.update({
    where: { id: Number(id) },
    data: { images: JSON.stringify(images) },
  });

  return NextResponse.json({ url, images: JSON.parse(updated.images) });
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
