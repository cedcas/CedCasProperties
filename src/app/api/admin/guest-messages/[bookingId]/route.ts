import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ bookingId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bookingId } = await params;
  const id = Number(bookingId);

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { property: true },
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const messages = await prisma.guestMessage.findMany({
    where: { bookingId: id },
    orderBy: { sentAt: "asc" },
  });

  return NextResponse.json({ booking, messages });
}
