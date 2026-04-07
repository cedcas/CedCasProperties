import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import UsersClient from "./UsersClient";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await auth();
  if (!session || session.user.role !== "admin") redirect("/admin/dashboard");

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

  const serialized = users.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
    permissions: u.permissions ? { ...u.permissions, createdAt: u.permissions.createdAt.toISOString(), updatedAt: u.permissions.updatedAt.toISOString() } : null,
  }));

  return <UsersClient initialUsers={serialized} currentUserId={session.user.id} />;
}
