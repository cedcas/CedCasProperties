/**
 * Server-side permission checks for admin API routes.
 *
 * A session only proves someone is logged in. A manager's access is defined by their
 * `AdminPermission` row, and the JWT carries only the role as it was at sign-in — so the
 * user is re-read from the database on every check. A deleted account, a demoted admin or
 * a revoked module takes effect immediately rather than when the token expires.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type PermissionModule =
  | "properties"
  | "bookings"
  | "messages"
  | "testimonials"
  | "promoCodes"
  | "logs"
  | "userManagement";

export interface AdminActor {
  id: number;
  name: string;
  role: "admin" | "manager";
}

export type PermissionResult =
  | { ok: true; actor: AdminActor }
  | { ok: false; status: 401 | 403; error: string };

/** Admins hold every module; managers only the ones switched on for them. */
export async function checkPermission(module: PermissionModule): Promise<PermissionResult> {
  const session = await auth();
  const id = Number(session?.user?.id);
  if (!session || !Number.isInteger(id)) return { ok: false, status: 401, error: "Unauthorized" };

  const user = await prisma.adminUser.findUnique({
    where: { id },
    select: { id: true, name: true, role: true, permissions: true },
  });
  if (!user) return { ok: false, status: 401, error: "Unauthorized" };

  if (user.role === "admin") return { ok: true, actor: { id: user.id, name: user.name, role: "admin" } };

  if (user.role === "manager" && user.permissions?.[module] === true) {
    return { ok: true, actor: { id: user.id, name: user.name, role: "manager" } };
  }
  return { ok: false, status: 403, error: "You don't have permission to do this." };
}

export function permissionDenied(result: Extract<PermissionResult, { ok: false }>): NextResponse {
  return NextResponse.json({ error: result.error }, { status: result.status });
}
