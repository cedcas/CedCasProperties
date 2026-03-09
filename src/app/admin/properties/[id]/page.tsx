import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import PropertyForm from "@/components/admin/PropertyForm";

export const dynamic = "force-dynamic";

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const property = await prisma.property.findUnique({ where: { id: Number(id) } });
  if (!property) notFound();

  return (
    <div className="p-6 lg:p-10 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="font-serif font-semibold text-charcoal text-[1.8rem]">Edit Property</h1>
        <p className="text-charcoal/45 text-[14px] mt-1">{property.name}</p>
      </div>
      <PropertyForm property={property} />
    </div>
  );
}
