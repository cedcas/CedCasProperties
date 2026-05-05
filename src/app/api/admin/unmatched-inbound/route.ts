import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await prisma.unmatchedInboundMessage.findMany({
    where: { resolvedAt: null },
    orderBy: { receivedAt: "desc" },
    take: 100,
  });
  const count = await prisma.unmatchedInboundMessage.count({ where: { resolvedAt: null } });
  return NextResponse.json({ rows, count });
}
