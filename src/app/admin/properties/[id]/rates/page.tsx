import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import PropertyRatesClient from "./PropertyRatesClient";

export const dynamic = "force-dynamic";

export default async function PropertyRatesPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/admin/login");

  const { id } = await params;

  const property = await prisma.property.findUnique({
    where: { id: Number(id) },
    select: {
      id: true,
      name: true,
      pricePerNight: true,
      rates: {
        orderBy: [{ rateType: "asc" }, { specificDate: "asc" }],
      },
    },
  });

  if (!property) redirect("/admin/properties");

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/admin/properties/${id}`} className="text-charcoal/40 hover:text-charcoal transition-colors text-[13px]">
          <i className="fa-solid fa-arrow-left mr-1" /> {property.name}
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-[1.6rem] font-serif font-semibold text-charcoal">Daily Rate Pricing</h1>
        <p className="text-gray-500 text-[14px] mt-1">
          Set weekday/weekend rates or override pricing for specific dates. Default rate: ₱{Number(property.pricePerNight).toLocaleString()}/night.
        </p>
      </div>

      <PropertyRatesClient
        propertyId={property.id}
        defaultRate={Number(property.pricePerNight)}
        initialRates={property.rates.map((r) => ({
          ...r,
          rate: Number(r.rate),
          specificDate: r.specificDate ? r.specificDate.toISOString().split("T")[0] : null,
        }))}
      />
    </div>
  );
}
