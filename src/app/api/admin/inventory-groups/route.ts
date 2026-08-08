import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getIpFromRequest } from "@/lib/log";
import { todayUtc } from "@/lib/dates";
import { reconcileGroup } from "@/lib/inventory-groups";

// Shared inventory groups — listings that are different configurations of the SAME
// physical property (e.g. Mickey in Lipa 1BR / 2BR / 3BR). Logged under the existing
// "properties" module; no new AdminPermission column is introduced.

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cutoff = todayUtc();

  const groups = await prisma.inventoryGroup.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: {
      members: {
        orderBy: { propertyId: "asc" },
        select: {
          id: true,
          propertyId: true,
          property: {
            select: { id: true, name: true, slug: true, isActive: true, maxGuests: true },
          },
        },
      },
      // Upcoming propagated blocks, so the admin can see the group's live effect.
      blocks: {
        where: { status: "active", isSystemGenerated: true, endDate: { gt: cutoff } },
        orderBy: { startDate: "asc" },
        take: 50,
        select: {
          id: true,
          propertyId: true,
          startDate: true,
          endDate: true,
          sourcePropertyId: true,
          sourceBookingId: true,
          sourceExternalEventId: true,
          property: { select: { name: true } },
          sourceProperty: { select: { name: true } },
        },
      },
    },
  });

  // Properties that are free to join a group — a property may belong to only one.
  const available = await prisma.property.findMany({
    where: { inventoryMembership: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, isActive: true, maxGuests: true },
  });

  return NextResponse.json({ groups, availableProperties: available });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Group name is required" }, { status: 400 });

  // Deliberately created INACTIVE unless explicitly switched on: activating starts
  // writing sibling blocks that flow out through the iCal feeds to live channels.
  const isActive = body.isActive === true;
  const notes = typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null;

  const rawIds: unknown[] = Array.isArray(body.propertyIds) ? body.propertyIds : [];
  const propertyIds: number[] = [
    ...new Set(rawIds.map((v) => Number(v)).filter((n) => Number.isInteger(n))),
  ];

  if (propertyIds.length > 0) {
    const existing = await prisma.property.findMany({
      where: { id: { in: propertyIds } },
      select: { id: true },
    });
    if (existing.length !== propertyIds.length) {
      return NextResponse.json(
        { error: "One or more selected properties no longer exist" },
        { status: 400 }
      );
    }
    const taken = await prisma.inventoryGroupMember.findMany({
      where: { propertyId: { in: propertyIds } },
      select: { property: { select: { name: true } } },
    });
    if (taken.length > 0) {
      const names = taken.map((t) => t.property.name).join(", ");
      return NextResponse.json(
        {
          error: `Already in another inventory group: ${names}. A property may belong to only one group.`,
        },
        { status: 409 }
      );
    }
  }

  const group = await prisma.inventoryGroup.create({
    data: {
      name,
      isActive,
      notes,
      members: { create: propertyIds.map((propertyId) => ({ propertyId })) },
    },
    include: { members: { select: { propertyId: true } } },
  });

  await logAction({
    actor: session.user.name ?? "Admin",
    actorRole: (session.user.role ?? "admin") as "admin" | "manager",
    actorId: parseInt(session.user.id),
    action: `Created inventory group "${group.name}"${isActive ? " (active)" : " (inactive)"}`,
    module: "properties",
    target: `inventory-group-${group.id}`,
    ipAddress: getIpFromRequest(req),
    metadata: { groupId: group.id, isActive, propertyIds },
  });

  // A group created already-active must immediately propagate existing reservations.
  if (isActive && propertyIds.length > 0) {
    try {
      await reconcileGroup(group.id);
    } catch (err) {
      console.error("[inventory-groups] initial reconcile failed:", err);
    }
  }

  return NextResponse.json(group, { status: 201 });
}
