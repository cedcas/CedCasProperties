import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { findCustomerCluster, normEmail } from "@/lib/customers";
import { logAction, getIpFromRequest } from "@/lib/log";

// Resolve the customer cluster that contains booking `id`, then return its
// normalized email — the stable key CustomerNote is keyed on.
async function resolveCustomerEmail(bookingId: number): Promise<string | null> {
  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: "desc" },
    include: { property: { select: { name: true } } },
  });
  const customer = findCustomerCluster(bookings, bookingId);
  if (!customer) return null;
  const key = normEmail(customer.email);
  return key || null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  if (!("note" in body)) {
    return NextResponse.json({ error: "note is required" }, { status: 400 });
  }
  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;

  const customerEmail = await resolveCustomerEmail(Number(id));
  if (!customerEmail) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const saved = await prisma.customerNote.upsert({
    where: { customerEmail },
    update: { note },
    create: { customerEmail, note },
  });

  await logAction({
    actor: session.user.name ?? "Admin",
    actorRole: (session.user.role ?? "admin") as "admin" | "manager",
    actorId: parseInt(session.user.id),
    action: `Updated customer note (${customerEmail})`,
    module: "bookings",
    target: `customer-${id}`,
    ipAddress: getIpFromRequest(req),
  });

  return NextResponse.json(saved);
}
