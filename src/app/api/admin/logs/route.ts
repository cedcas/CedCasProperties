import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const module = searchParams.get("module") ?? "";
  const actorRole = searchParams.get("actorRole") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = 50;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { actor: { contains: search } },
      { action: { contains: search } },
      { target: { contains: search } },
    ];
  }
  if (module) where.module = module;
  if (actorRole) where.actorRole = actorRole;

  const [logs, total] = await Promise.all([
    prisma.adminLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.adminLog.count({ where }),
  ]);

  return NextResponse.json({ logs, total, page, limit });
}
