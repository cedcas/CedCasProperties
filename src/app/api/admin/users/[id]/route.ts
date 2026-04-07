import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { logAction, getIpFromRequest } from "@/lib/log";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const userId = parseInt(id);
  const body = await req.json();
  const { name, email, password, permissions } = body;

  const existing = await prisma.adminUser.findUnique({
    where: { id: userId },
    include: { permissions: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Prevent demoting the last admin
  if (body.role && body.role !== "admin" && existing.role === "admin") {
    const adminCount = await prisma.adminUser.count({ where: { role: "admin" } });
    if (adminCount <= 1) {
      return NextResponse.json({ error: "Cannot change role of the last admin account" }, { status: 400 });
    }
  }

  const dataUpdate: Record<string, unknown> = {};
  if (name) dataUpdate.name = name;
  if (email) dataUpdate.email = email;
  if (password) dataUpdate.password = await bcrypt.hash(password, 10);
  if (body.role) dataUpdate.role = body.role;

  const user = await prisma.adminUser.update({
    where: { id: userId },
    data: dataUpdate,
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  // Update permissions if provided
  if (permissions && existing.role === "manager") {
    if (existing.permissions) {
      await prisma.adminPermission.update({
        where: { adminUserId: userId },
        data: {
          properties: permissions.properties ?? false,
          bookings: permissions.bookings ?? false,
          messages: permissions.messages ?? false,
          testimonials: permissions.testimonials ?? false,
          promoCodes: permissions.promoCodes ?? false,
          logs: permissions.logs ?? false,
          userManagement: permissions.userManagement ?? false,
        },
      });
    } else {
      await prisma.adminPermission.create({
        data: {
          adminUserId: userId,
          properties: permissions.properties ?? false,
          bookings: permissions.bookings ?? false,
          messages: permissions.messages ?? false,
          testimonials: permissions.testimonials ?? false,
          promoCodes: permissions.promoCodes ?? false,
          logs: permissions.logs ?? false,
          userManagement: permissions.userManagement ?? false,
        },
      });
    }
  }

  await logAction({
    actor: session.user.name ?? "Admin",
    actorRole: session.user.role as "admin" | "manager",
    actorId: parseInt(session.user.id),
    action: `Updated user account: ${existing.email}`,
    module: "users",
    target: existing.email,
    ipAddress: getIpFromRequest(req),
  });

  return NextResponse.json({ user });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const userId = parseInt(id);

  // Prevent deleting own account
  if (String(userId) === session.user.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  const existing = await prisma.adminUser.findUnique({ where: { id: userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Prevent deleting last admin
  if (existing.role === "admin") {
    const adminCount = await prisma.adminUser.count({ where: { role: "admin" } });
    if (adminCount <= 1) {
      return NextResponse.json({ error: "Cannot delete the last admin account" }, { status: 400 });
    }
  }

  await prisma.adminUser.delete({ where: { id: userId } });

  await logAction({
    actor: session.user.name ?? "Admin",
    actorRole: session.user.role as "admin" | "manager",
    actorId: parseInt(session.user.id),
    action: `Deleted user account: ${existing.email}`,
    module: "users",
    target: existing.email,
    ipAddress: getIpFromRequest(req),
  });

  return NextResponse.json({ success: true });
}
