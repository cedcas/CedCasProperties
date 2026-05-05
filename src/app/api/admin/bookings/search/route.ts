import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json([]);

  const phoneE164 = normalizePhone(q)?.e164;

  const bookings = await prisma.booking.findMany({
    where: {
      OR: [
        { guestName: { contains: q } },
        { guestEmail: { contains: q } },
        { guestPhone: { contains: q } },
        ...(phoneE164 ? [{ guestPhone: phoneE164 }] : []),
      ],
    },
    orderBy: [{ checkIn: "desc" }, { id: "desc" }],
    take: 20,
    include: { property: { select: { name: true, type: true } } },
  });

  return NextResponse.json(bookings);
}
