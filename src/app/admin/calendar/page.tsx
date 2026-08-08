import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import CalendarClient from "./CalendarClient";

export const dynamic = "force-dynamic";

export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ propertyId?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/admin/login");

  const properties = await prisma.property.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, isActive: true, airbnbIcsUrl: true },
  });

  const { propertyId } = await searchParams;
  const requested = Number(propertyId);
  const selectedId =
    properties.find((p) => p.id === requested)?.id ??
    properties.find((p) => p.isActive)?.id ??
    properties[0]?.id ??
    null;

  return (
    <div className="mx-auto max-w-6xl p-6 lg:p-10">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-charcoal font-serif text-[1.8rem] font-semibold">Calendar</h1>
          <p className="text-charcoal/45 mt-1 text-[14px]">
            Bookings, imported channel events and availability blocks — and why any date is
            unavailable.
          </p>
        </div>
        <Link
          href="/admin/properties/inventory-groups"
          className="text-charcoal/60 hover:text-forest hover:border-forest inline-flex items-center gap-2 rounded-[10px] border border-black/10 px-4 py-2 text-[13px] transition-colors"
        >
          <i className="fa-solid fa-layer-group" /> Inventory Groups
        </Link>
      </div>

      {properties.length === 0 ? (
        <div className="rounded-[16px] border border-black/[.04] bg-white py-20 text-center shadow-[0_2px_12px_rgba(44,44,44,.07)]">
          <i className="fa-solid fa-calendar-days text-charcoal/20 mb-4 block text-[3rem]" />
          <p className="text-charcoal/40 text-[15px]">No properties yet.</p>
          <Link
            href="/admin/properties/new"
            className="text-forest mt-4 inline-block text-[14px] font-semibold hover:underline"
          >
            Add your first property →
          </Link>
        </div>
      ) : (
        <CalendarClient
          properties={properties.map((p) => ({ ...p, hasFeed: Boolean(p.airbnbIcsUrl?.trim()) }))}
          initialPropertyId={selectedId!}
        />
      )}
    </div>
  );
}
