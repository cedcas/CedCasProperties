import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BookingForm from "@/components/booking/BookingForm";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const property = await prisma.property.findUnique({
    where: { slug, isActive: true },
    select: { name: true, location: true, type: true },
  });
  if (!property) return {};

  return {
    title: `Book ${property.name}`,
    description: `Reserve your stay at ${property.name} — a ${property.type} rental in ${property.location}. Book directly and save on Airbnb service fees.`,
  };
}

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ checkIn?: string; checkOut?: string }>;
}) {
  const { slug } = await params;
  const { checkIn, checkOut } = await searchParams;
  const property = await prisma.property.findUnique({ where: { slug, isActive: true } });
  if (!property) notFound();

  return (
    <>
      <Navbar />
      <main className="bg-offwhite min-h-screen pb-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">

          {/* Header */}
          <div className="pt-8 pb-6">
            <Link href={`/properties/${slug}`} className="inline-flex items-center gap-2 text-[12px] text-charcoal/40 hover:text-forest transition-colors mb-5">
              <i className="fa-solid fa-arrow-left text-[10px]" /> Back to property
            </Link>
            <h1 className="font-serif font-semibold text-charcoal text-[1.7rem] leading-tight mb-1">Book Your Stay</h1>
            <p className="text-charcoal/45 text-[14px]">{property.name} · {property.location}</p>
          </div>

          <BookingForm
            propertyId={property.id}
            propertyName={property.name}
            propertyType={property.type}
            pricePerNight={Number(property.pricePerNight)}
            maxGuests={property.maxGuests}
            bedrooms={property.bedrooms}
            slug={slug}
            initialCheckIn={checkIn ?? ""}
            initialCheckOut={checkOut ?? ""}
            propertyRules={property.propertyRules}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
