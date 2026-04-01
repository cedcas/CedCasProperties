import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import PropertyForm from "@/components/admin/PropertyForm";
import ImageManager from "@/components/admin/ImageManager";

export const dynamic = "force-dynamic";

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const property = await prisma.property.findUnique({ where: { id: Number(id) } });
  if (!property) notFound();

  const images: string[] = JSON.parse(property.images || "[]");

  return (
    <div className="p-6 lg:p-10 max-w-3xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-serif font-semibold text-charcoal text-[1.8rem]">Edit Property</h1>
          <p className="text-charcoal/45 text-[14px] mt-1">{property.name}</p>
        </div>
        <Link
          href={`/admin/properties/${property.id}/rates`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] border border-black/10 text-[13px] text-charcoal/60 hover:text-forest hover:border-forest transition-colors"
        >
          <i className="fa-solid fa-calendar-days" /> Manage Rates
        </Link>
      </div>
      <div className="space-y-6">
        <PropertyForm property={property} />
        <ImageManager
          propertyId={property.id}
          initialImages={images}
          initialFeatured={property.featuredImage ?? null}
        />
      </div>
    </div>
  );
}
