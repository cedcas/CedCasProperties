import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PropertyGallery from "@/components/ui/PropertyGallery";
import ScrollReveal from "@/components/ui/ScrollReveal";
import BookingCard from "@/components/ui/BookingCard";
import Testimonials from "@/components/sections/Testimonials";
import { cache } from "react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXTAUTH_URL || "https://www.haveninlipa.com";

const getProperty = cache(async (slug: string) =>
  prisma.property.findUnique({ where: { slug, isActive: true } })
);

const getTestimonials = cache(async (propertyId: number) =>
  prisma.testimonial.findMany({
    where: { propertyId, isActive: true },
    select: { name: true, rating: true, message: true },
    take: 10,
  })
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const property = await getProperty(slug);
  if (!property) return {};

  const title = `${property.name} — ${property.type} Rental in ${property.location}`;
  const description =
    (property.description?.slice(0, 155) ?? "") ||
    `${property.type} vacation rental in ${property.location}. Book directly and save on Airbnb fees.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `${BASE_URL}/properties/${slug}`,
      images: property.featuredImage
        ? [
            {
              url: property.featuredImage,
              alt: `${property.name} — ${property.type} in ${property.location}`,
            },
          ]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: property.featuredImage ? [property.featuredImage] : [],
    },
  };
}

const AMENITY_ICONS: Record<string, string> = {
  WiFi: "wifi",
  AC: "snowflake",
  Parking: "car",
  TV: "tv",
  Kitchen: "utensils",
  Pool: "water-ladder",
  Washer: "shirt",
  Coffee: "mug-hot",
};

export default async function PropertyDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const property = await getProperty(slug);
  if (!property) notFound();

  const rawImages: string[] = JSON.parse(property.images || "[]");
  const featuredUrl = property.featuredImage ?? null;
  const images = featuredUrl
    ? [featuredUrl, ...rawImages.filter((u) => u !== featuredUrl)]
    : rawImages;
  const amenities: string[] = JSON.parse(property.amenities || "[]");
  const coverImage = featuredUrl || images[0] || null;

  const testimonials = await getTestimonials(property.id);

  const avgRating =
    testimonials.length > 0
      ? (testimonials.reduce((s, t) => s + t.rating, 0) / testimonials.length).toFixed(1)
      : null;

  const vacationRentalSchema = {
    "@context": "https://schema.org",
    "@type": "VacationRental",
    name: property.name,
    description: property.description ?? undefined,
    url: `${BASE_URL}/properties/${property.slug}`,
    image: coverImage ?? undefined,
    address: {
      "@type": "PostalAddress",
      addressLocality: property.location,
      addressRegion: "Batangas",
      addressCountry: "PH",
    },
    priceRange: `₱${Number(property.pricePerNight).toLocaleString()} per night`,
    numberOfRooms: property.bedrooms,
    occupancy: {
      "@type": "QuantitativeValue",
      maxValue: property.maxGuests,
      unitText: "guests",
    },
    amenityFeature: amenities.map((a) => ({
      "@type": "LocationFeatureSpecification",
      name: a,
      value: true,
    })),
    ...(testimonials.length > 0 && {
      review: testimonials.map((t) => ({
        "@type": "Review",
        author: { "@type": "Person", name: t.name },
        reviewRating: {
          "@type": "Rating",
          ratingValue: t.rating,
          bestRating: 5,
        },
        reviewBody: t.message,
      })),
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: avgRating,
        reviewCount: testimonials.length,
        bestRating: 5,
      },
    }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(vacationRentalSchema) }}
      />
      <ScrollReveal />
      <Navbar />
      <main className="bg-offwhite min-h-screen">

        {/* Hero banner */}
        <div className="relative h-[55vh] min-h-[340px] overflow-hidden">
          {coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverImage} alt={`${property.name} — ${property.type} in ${property.location}`} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full" style={{ background: "linear-gradient(135deg,#1e3310,#3B5323,#2C2C2C)" }} />
          )}
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(0,0,0,.25) 0%,rgba(0,0,0,.65) 100%)" }} />
          <div className="absolute bottom-0 left-0 right-0 p-8 max-w-6xl mx-auto">
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-white/15 backdrop-blur-sm text-white text-[11px] font-semibold px-3 py-1 rounded-full border border-white/20">
                    <i className="fa-solid fa-location-dot mr-1.5" />{property.location}
                  </span>
                  <span className="bg-white/15 backdrop-blur-sm text-white text-[11px] font-semibold px-3 py-1 rounded-full border border-white/20">
                    {property.type} · Entire Unit
                  </span>
                </div>
                <h1 className="font-serif font-semibold text-white leading-tight" style={{ fontSize: "clamp(1.6rem,4vw,2.5rem)" }}>
                  {property.name}
                </h1>
              </div>
              <div className="text-right">
                <div className="text-white/60 text-[12px] font-medium uppercase tracking-wider mb-1">Starting from</div>
                <div className="font-bold text-white" style={{ fontSize: "clamp(1.5rem,3vw,2rem)" }}>
                  ₱{Number(property.pricePerNight).toLocaleString()}
                </div>
                <div className="text-white/60 text-[13px]">per night</div>
              </div>
            </div>
          </div>
        </div>

        {/* Back link */}
        <div className="max-w-6xl mx-auto px-6 pt-6">
          <Link href="/#properties" className="inline-flex items-center gap-2 text-[13px] text-charcoal/50 hover:text-forest transition-colors">
            <i className="fa-solid fa-arrow-left text-[11px]" /> Back to Properties
          </Link>
        </div>

        {/* Gallery — only when multiple images */}
        {images.length > 1 && (
          <div className="max-w-6xl mx-auto px-6 mt-5">
            <PropertyGallery images={images} name={property.name} />
          </div>
        )}

        {/* Main content */}
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10">

          {/* Left — details */}
          <div className="space-y-8">

            {/* Stats bar */}
            <div className="flex flex-wrap gap-6 py-6 border-y border-black/[.08]">
              {[
                { icon: "bed", label: "Bedrooms", value: property.bedrooms },
                { icon: "bath", label: "Bathrooms", value: property.bathrooms },
                { icon: "user-group", label: "Max Guests", value: property.maxGuests },
              ].map(({ icon, label, value }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-forest/10 flex items-center justify-center">
                    <i className={`fa-solid fa-${icon} text-forest text-[14px]`} />
                  </div>
                  <div>
                    <div className="font-semibold text-charcoal text-[15px]">{value}</div>
                    <div className="text-[11px] text-charcoal/45">{label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* About */}
            <div>
              <h2 className="font-serif font-semibold text-charcoal text-[1.3rem] mb-3">About this property</h2>
              <p className="text-charcoal/65 text-[15px] leading-[1.8] whitespace-pre-line">{property.description}</p>
            </div>

            {/* Amenities */}
            {amenities.length > 0 && (
              <div>
                <h2 className="font-serif font-semibold text-charcoal text-[1.3rem] mb-4">Amenities</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {amenities.map((a) => (
                    <div key={a} className="flex items-center gap-3 bg-white rounded-[10px] px-4 py-3 border border-black/[.06]">
                      <div className="w-8 h-8 rounded-lg bg-cream flex items-center justify-center flex-shrink-0">
                        <i className={`fa-solid fa-${AMENITY_ICONS[a] ?? "check"} text-forest text-[13px]`} />
                      </div>
                      <span className="text-[13.5px] font-medium text-charcoal/75">{a}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* House Rules */}
            <div>
              <h2 className="font-serif font-semibold text-charcoal text-[1.3rem] mb-4">House Rules</h2>
              <div className="bg-white rounded-[12px] p-6 border border-black/[.06]">
                {property.propertyRules ? (
                  <div className="text-charcoal/75 text-[14px] leading-[1.7] whitespace-pre-line mb-4">
                    {property.propertyRules}
                  </div>
                ) : null}
                <ol className="space-y-2.5">
                  {[
                    "No pets allowed on the property.",
                    "No parties or events without prior host approval.",
                    "No smoking or vaping anywhere on the premises.",
                    "Quiet hours are observed from 10:00 PM to 8:00 AM — please be mindful of neighbors.",
                    "Check-in begins at 2:00 PM. Check-out is by 12:00 PM (noon).",
                    `This property accommodates up to ${property.maxGuests} guests. Please do not exceed the maximum.`,
                    "Please leave the home as you found it — wash and put away dishes, and take out the trash before you leave.",
                    "Guests are responsible for any damages or missing items during their stay.",
                    "Prohibited at all times: candles, incense, open flames, and cooking strong-smelling foods.",
                    "Air conditioning: Please turn it off when not in use and before leaving the house. Failure to do so may result in additional charges.",
                    "Locking up: When leaving, pull the door shut and hold the ✓ (check) button on the smart lock until it clicks. Please make sure the door is fully locked before you go.",
                  ].map((rule, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span
                        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white mt-0.5"
                        style={{ background: "#3B5323" }}
                      >
                        {i + 1}
                      </span>
                      <span className="text-charcoal/75 text-[14px] leading-[1.65]">{rule}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Check-In & Check-Out */}
            <div>
              <h2 className="font-serif font-semibold text-charcoal text-[1.3rem] mb-4">Check-In &amp; Check-Out</h2>
              <div className="bg-white rounded-[12px] p-6 border border-black/[.06]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-4">
                  {[
                    { icon: "fa-arrow-right-to-bracket", label: "Check-in",  value: "2:00 PM or later",        color: "#3B5323" },
                    { icon: "fa-arrow-right-from-bracket", label: "Check-out", value: "12:00 PM (noon) or earlier", color: "#C4A862" },
                  ].map(({ icon, label, value, color }) => (
                    <div key={label} className="flex items-center gap-4 bg-cream rounded-[10px] px-5 py-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
                        <i className={`fa-solid ${icon} text-[14px]`} style={{ color }} />
                      </div>
                      <div>
                        <div className="text-[11px] text-charcoal/45 uppercase tracking-wide font-semibold">{label}</div>
                        <div className="text-charcoal font-semibold text-[14.5px]">{value}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-charcoal/60 text-[13.5px] leading-[1.7]">
                  Early check-in or late check-out may be available upon request — just reach out to your host in advance and we&apos;ll do our best to accommodate.
                </p>
              </div>
            </div>

            {/* Cancellation & Rebooking Policy */}
            <div>
              <h2 className="font-serif font-semibold text-charcoal text-[1.3rem] mb-4">Cancellation &amp; Rebooking Policy</h2>
              <div className="bg-white rounded-[12px] p-6 border border-black/[.06] space-y-6">
                <div>
                  <h3 className="font-semibold text-charcoal text-[14.5px] mb-3 flex items-center gap-2">
                    <i className="fa-solid fa-ban text-[13px]" style={{ color: "#FF5371" }} /> Cancellation Policy
                  </h3>
                  <p className="text-charcoal/60 text-[13.5px] leading-[1.7] mb-3">
                    We follow a <strong className="text-charcoal/80">strict cancellation policy</strong>.
                  </p>
                  <ul className="space-y-2">
                    {[
                      { rule: "Cancellations made 7+ days before check-in", outcome: "Eligible for a partial refund", positive: true },
                      { rule: "Cancellations made less than 7 days before check-in", outcome: "Non-refundable", positive: false },
                      { rule: "No full refunds under any circumstances", outcome: "", positive: false },
                    ].map(({ rule, outcome, positive }) => (
                      <li key={rule} className="flex items-start gap-2.5 text-[13.5px]">
                        <i className={`fa-solid ${positive ? "fa-circle-check" : "fa-circle-xmark"} mt-0.5 flex-shrink-0`}
                          style={{ color: positive ? "#3B5323" : "#FF5371" }} />
                        <span className="text-charcoal/70">
                          {rule}{outcome ? <> — <span className="font-medium text-charcoal/85">{outcome}</span></> : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="border-t border-black/[.06] pt-5">
                  <h3 className="font-semibold text-charcoal text-[14.5px] mb-3 flex items-center gap-2">
                    <i className="fa-solid fa-calendar-days text-[13px]" style={{ color: "#3B5323" }} /> Rebooking Policy
                  </h3>
                  <ul className="space-y-2">
                    {[
                      { rule: "14+ days before check-in", outcome: "One free rebooking, no penalty", positive: true },
                      { rule: "7–13 days before check-in", outcome: "Rebooking allowed with a 50% penalty per night", positive: null },
                      { rule: "Less than 7 days before check-in", outcome: "Rebooking not available", positive: false },
                    ].map(({ rule, outcome, positive }) => (
                      <li key={rule} className="flex items-start gap-2.5 text-[13.5px]">
                        <i className={`fa-solid ${positive === true ? "fa-circle-check" : positive === null ? "fa-circle-exclamation" : "fa-circle-xmark"} mt-0.5 flex-shrink-0`}
                          style={{ color: positive === true ? "#3B5323" : positive === null ? "#C4A862" : "#FF5371" }} />
                        <span className="text-charcoal/70">
                          <span className="font-medium text-charcoal/85">{rule}</span> — {outcome}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-charcoal/50 text-[12.5px] mt-4">Rebooking is subject to availability. Please reach out to your host to start the process.</p>
                </div>
              </div>
            </div>

            {/* Guest Reviews */}
            <Testimonials propertyId={property.id} />
          </div>

          {/* Right — booking card */}
          <div className="lg:sticky lg:top-[90px] self-start">
            <BookingCard
              slug={property.slug}
              pricePerNight={Number(property.pricePerNight)}
              maxGuests={property.maxGuests}
              bedrooms={property.bedrooms}
              bathrooms={property.bathrooms}
              location={property.location}
              type={property.type}
              propertyRules={property.propertyRules}
            />
          </div>

        </div>
      </main>
      <Footer />
    </>
  );
}
