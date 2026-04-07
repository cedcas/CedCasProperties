import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { logAction, getIpFromRequest } from "@/lib/log";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const users = await prisma.adminUser.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      permissions: true,
    },
  });

  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { email, name, password, role = "manager", permissions } = body;

  if (!email || !name || !password) {
    return NextResponse.json({ error: "email, name, and password are required" }, { status: 400 });
  }

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

  const hashed = await bcrypt.hash(password, 10);

  const user = await prisma.adminUser.create({
    data: {
      email,
      name,
      password: hashed,
      role,
      permissions: role === "manager" ? {
        create: {
          properties: permissions?.properties ?? false,
          bookings: permissions?.bookings ?? false,
          messages: permissions?.messages ?? false,
          testimonials: permissions?.testimonials ?? false,
          promoCodes: permissions?.promoCodes ?? false,
          logs: permissions?.logs ?? false,
          userManagement: permissions?.userManagement ?? false,
        },
      } : undefined,
    },
    select: { id: true, email: true, name: true, role: true, createdAt: true, permissions: true },
  });

  await logAction({
    actor: session.user.name ?? "Admin",
    actorRole: session.user.role as "admin" | "manager",
    actorId: parseInt(session.user.id),
    action: `Created user account for ${email} (${role})`,
    module: "users",
    target: email,
    ipAddress: getIpFromRequest(req),
  });

  return NextResponse.json({ user }, { status: 201 });
}
