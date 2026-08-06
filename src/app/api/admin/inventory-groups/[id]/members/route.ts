import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { logAction, getIpFromRequest } from "@/lib/log";
import { reconcileGroup, reconcilePropertyRemovedFromGroup } from "@/lib/inventory-groups";

// POST   — add a property to the group
// DELETE — remove a property from the group and reconcile its future derived blocks
//
// A property may belong to only one group; that rule is enforced by a UNIQUE index on
// InventoryGroupMember.propertyId, so a race between two admins fails cleanly with a 409
// rather than producing a property in two groups.

async function loadGroup(groupId: number) {
  return prisma.inventoryGroup.findUnique({
    where: { id: groupId },
    select: { id: true, name: true },
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const groupId = Number(id);
  if (!Number.isInteger(groupId))
    return NextResponse.json({ error: "Invalid group id" }, { status: 400 });

  const group = await loadGroup(groupId);
  if (!group) return NextResponse.json({ error: "Inventory group not found" }, { status: 404 });

  const body = await req.json();
  const propertyId = Number(body.propertyId);
  if (!Number.isInteger(propertyId))
    return NextResponse.json({ error: "Invalid propertyId" }, { status: 400 });

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { id: true, name: true },
  });
  if (!property) return NextResponse.json({ error: "Property not found" }, { status: 404 });

  const current = await prisma.inventoryGroupMember.findUnique({
    where: { propertyId },
    select: { inventoryGroupId: true, inventoryGroup: { select: { name: true } } },
  });
  if (current) {
    return current.inventoryGroupId === groupId
      ? NextResponse.json({ error: `"${property.name}" is already in this group` }, { status: 409 })
      : NextResponse.json(
          {
            error: `"${property.name}" already belongs to "${current.inventoryGroup.name}". A property may belong to only one inventory group.`,
          },
          { status: 409 }
        );
  }

  try {
    await prisma.inventoryGroupMember.create({ data: { inventoryGroupId: groupId, propertyId } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: "That property was just added to a group. Reload and try again." },
        { status: 409 }
      );
    }
    throw err;
  }

  await logAction({
    actor: session.user.name ?? "Admin",
    actorRole: (session.user.role ?? "admin") as "admin" | "manager",
    actorId: parseInt(session.user.id),
    action: `Added "${property.name}" to inventory group "${group.name}"`,
    module: "properties",
    target: `inventory-group-${groupId}`,
    ipAddress: getIpFromRequest(req),
    metadata: { groupId, propertyId },
  });

  // The new member must immediately reflect (and contribute) existing reservations.
  try {
    await reconcileGroup(groupId);
  } catch (err) {
    console.error("[inventory-groups] reconcile after member add failed:", err);
  }

  return NextResponse.json({ success: true }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const groupId = Number(id);
  if (!Number.isInteger(groupId))
    return NextResponse.json({ error: "Invalid group id" }, { status: 400 });

  const group = await loadGroup(groupId);
  if (!group) return NextResponse.json({ error: "Inventory group not found" }, { status: 404 });

  // DELETE reads its id from the JSON body, matching the existing rates route convention.
  const body = await req.json();
  const propertyId = Number(body.propertyId);
  if (!Number.isInteger(propertyId))
    return NextResponse.json({ error: "Invalid propertyId" }, { status: 400 });

  const membership = await prisma.inventoryGroupMember.findFirst({
    where: { inventoryGroupId: groupId, propertyId },
    select: { id: true, property: { select: { name: true } } },
  });
  if (!membership)
    return NextResponse.json({ error: "That property is not in this group" }, { status: 404 });

  await prisma.inventoryGroupMember.delete({ where: { id: membership.id } });

  await logAction({
    actor: session.user.name ?? "Admin",
    actorRole: (session.user.role ?? "admin") as "admin" | "manager",
    actorId: parseInt(session.user.id),
    action: `Removed "${membership.property.name}" from inventory group "${group.name}"`,
    module: "properties",
    target: `inventory-group-${groupId}`,
    ipAddress: getIpFromRequest(req),
    metadata: { groupId, propertyId },
  });

  // Cleans up in both directions: blocks ON the departed property that came from former
  // siblings, and blocks on siblings that came FROM it. Past blocks are left as history.
  try {
    await reconcilePropertyRemovedFromGroup(groupId, propertyId);
  } catch (err) {
    console.error("[inventory-groups] reconcile after member removal failed:", err);
  }

  return NextResponse.json({ success: true });
}
