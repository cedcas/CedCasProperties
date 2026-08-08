import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getIpFromRequest } from "@/lib/log";
import { reconcileGroup } from "@/lib/inventory-groups";

// PATCH — rename, activate/deactivate, edit notes.
// DELETE — remove the group; membership rows cascade and derived blocks are reconciled
//          away first so no orphaned sibling blocks are left blocking dates.

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const groupId = Number(id);
  if (!Number.isInteger(groupId))
    return NextResponse.json({ error: "Invalid group id" }, { status: 400 });

  const existing = await prisma.inventoryGroup.findUnique({
    where: { id: groupId },
    select: { id: true, name: true, isActive: true },
  });
  if (!existing) return NextResponse.json({ error: "Inventory group not found" }, { status: 404 });

  const body = await req.json();

  // Whitelist — never spread the request body into Prisma.
  const data: Record<string, unknown> = {};
  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: "Group name cannot be empty" }, { status: 400 });
    data.name = name;
  }
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if (body.notes !== undefined) {
    data.notes = typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const group = await prisma.inventoryGroup.update({ where: { id: groupId }, data });

  const actor = {
    actor: session.user.name ?? "Admin",
    actorRole: (session.user.role ?? "admin") as "admin" | "manager",
    actorId: parseInt(session.user.id),
    module: "properties" as const,
    target: `inventory-group-${groupId}`,
    ipAddress: getIpFromRequest(req),
  };

  if (data.name !== undefined && data.name !== existing.name) {
    await logAction({ ...actor, action: `Renamed inventory group #${groupId} to "${group.name}"` });
  }
  if (data.isActive !== undefined && data.isActive !== existing.isActive) {
    await logAction({
      ...actor,
      action: `${group.isActive ? "Activated" : "Deactivated"} inventory group "${group.name}"`,
      metadata: { groupId, isActive: group.isActive },
    });
  }

  // Activation must propagate existing reservations; deactivation must stop propagating.
  // Either way only FUTURE derived blocks are touched — past ones stay as audit history.
  if (data.isActive !== undefined && data.isActive !== existing.isActive) {
    try {
      await reconcileGroup(groupId);
    } catch (err) {
      console.error("[inventory-groups] reconcile after activation change failed:", err);
    }
  }

  return NextResponse.json(group);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const groupId = Number(id);
  if (!Number.isInteger(groupId))
    return NextResponse.json({ error: "Invalid group id" }, { status: 400 });

  const existing = await prisma.inventoryGroup.findUnique({
    where: { id: groupId },
    select: { id: true, name: true, members: { select: { propertyId: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Inventory group not found" }, { status: 404 });

  // Deactivate first, then reconcile: that cancels every future derived block through the
  // normal path before the group disappears, so nothing is left blocking dates for a
  // group that no longer exists.
  await prisma.inventoryGroup.update({ where: { id: groupId }, data: { isActive: false } });
  try {
    await reconcileGroup(groupId);
  } catch (err) {
    console.error("[inventory-groups] reconcile before delete failed:", err);
  }

  await prisma.inventoryGroup.delete({ where: { id: groupId } });

  await logAction({
    actor: session.user.name ?? "Admin",
    actorRole: (session.user.role ?? "admin") as "admin" | "manager",
    actorId: parseInt(session.user.id),
    action: `Deleted inventory group "${existing.name}"`,
    module: "properties",
    target: `inventory-group-${groupId}`,
    ipAddress: getIpFromRequest(req),
    metadata: { groupId, propertyIds: existing.members.map((m) => m.propertyId) },
  });

  return NextResponse.json({ success: true });
}
