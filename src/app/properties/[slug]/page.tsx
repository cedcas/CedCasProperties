import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PropertyGallery from "@/components/ui/PropertyGallery";
import ScrollReveal from "@/components/ui/ScrollReveal";

export const dynamic = "force-dynamic";

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
  const property = await prisma.property.findUnique({ where: { slug, isActive: true } });
  if (!property) notFound();

  const rawImages: string[] = JSON.parse(property.images || "[]");
  // Put featuredImage first if set
  const featuredUrl = property.featuredImage ?? null;
  const images = featuredUrl
    ? [featuredUrl, ...rawImages.filter((u) => u !== featuredUrl)]
    : rawImages;
  const amenities: string[] = JSON.parse(property.amenities || "[]");

  return (
    <>
      <ScrollReveal />
      <Navbar />
      <main className="bg-offwhite min-h-screen pb-20">

        <div className="max-w-6xl mx-auto px-4 sm:px-6">

          {/* Header */}
          <div className="pt-8 pb-5">
            <Link href="/#properties" className="inline-flex items-center gap-2 text-[12px] text-charcoal/45 hover:text-forest transition-colors mb-4">
              <i className="fa-solid fa-arrow-left text-[10px]" /> Back to Properties
            </Link>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-semibold text-forest/80 bg-forest/8 px-2.5 py-1 rounded-full">
                    {property.type} · Entire Unit
                  </span>
                  <span className="text-[11px] text-charcoal/45">
                    <i className="fa-solid fa-location-dot mr-1" />{property.location}
                  </span>
                </div>
                <h1 className="font-serif font-semibold text-charcoal leading-tight" style={{ fontSize: "clamp(1.5rem,3.5vw,2.2rem)" }}>
                  {property.name}
                </h1>
              </div>
              <div className="text-right hidden sm:block">
                <div className="font-bold text-charcoal text-[1.6rem]">₱{Number(property.pricePerNight).toLocaleString()}</div>
                <div className="text-[12px] text-charcoal/45">per night</div>
              </div>
            </div>
          </div>

          {/* Gallery */}
          <PropertyGallery images={images} name={property.name} />

          {/* Content */}
          <div className="mt-10 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10">

            {/* Left */}
            <div className="space-y-8">

              {/* Quick stats */}
              <div className="flex flex-wrap gap-8 py-6 border-y border-black/[.07]">
                {[
                  { icon: "bed", label: "Bedrooms", value: property.bedrooms },
                  { icon: "bath", label: "Bathrooms", value: property.bathrooms },
                  { icon: "user-group", label: "Max Guests", value: property.maxGuests },
                ].map(({ icon, label, value }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-forest/8 flex items-center justify-center">
                      <i className={`fa-solid fa-${icon} text-forest text-[14px]`} />
                    </div>
                    <div>
                      <div className="font-semibold text-charcoal text-[16px]">{value}</div>
                      <div className="text-[11px] text-charcoal/40">{label}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Description */}
              <div>
                <h2 className="font-serif font-semibold text-charcoal text-[1.25rem] mb-3">About this property</h2>
                <p className="text-charcoal/65 text-[15px] leading-[1.85] whitespace-pre-line">{property.description}</p>
              </div>

              {/* Amenities */}
              {amenities.length > 0 && (
                <div>
                  <h2 className="font-serif font-semibold text-charcoal text-[1.25rem] mb-4">Amenities</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {amenities.map((a) => (
                      <div key={a} className="flex items-center gap-3 bg-white rounded-[10px] px-4 py-3 border border-black/[.05]">
                        <div className="w-8 h-8 rounded-lg bg-cream flex items-center justify-center flex-shrink-0">
                          <i className={`fa-solid fa-${AMENITY_ICONS[a] ?? "check"} text-forest text-[12px]`} />
                        </div>
                        <span className="text-[13px] font-medium text-charcoal/70">{a}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right — booking card */}
            <div className="lg:sticky lg:top-[88px] self-start">
              {/* Mobile price bar */}
              <div className="flex items-baseline justify-between sm:hidden mb-4 pb-4 border-b border-black/[.07]">
                <span className="font-bold text-charcoal text-[1.4rem]">₱{Number(property.pricePerNight).toLocaleString()}</span>
                <span className="text-charcoal/45 text-[13px]">/ night</span>
              </div>

              <div className="bg-white rounded-[20px] p-7 shadow-[0_8px_40px_rgba(44,44,44,.10)] border border-black/[.05]">
                <div className="hidden sm:flex items-baseline gap-1.5 mb-1">
                  <span className="font-bold text-charcoal text-[1.8rem]">₱{Number(property.pricePerNight).toLocaleString()}</span>
                  <span className="text-charcoal/40 text-[13px]">/ night</span>
                </div>
                <p className="hidden sm:block text-[12px] text-charcoal/35 mb-5">Entire unit · {property.type}</p>

                <div className="space-y-2.5 mb-6">
                  {[
                    { icon: "users", text: `Up to ${property.maxGuests} guests` },
                    { icon: "bed", text: `${property.bedrooms} bedroom${property.bedrooms !== 1 ? "s" : ""}` },
                    { icon: "bath", text: `${property.bathrooms} bathroom${property.bathrooms !== 1 ? "s" : ""}` },
                    { icon: "location-dot", text: property.location },
                  ].map(({ icon, text }) => (
                    <div key={text} className="flex items-center gap-2.5 text-[13px] text-charcoal/55">
                      <i className={`fa-solid fa-${icon} text-forest w-4 text-center`} />
                      {text}
                    </div>
                  ))}
                </div>

                <a
                  href="/#contact"
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full text-[14px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
                  style={{ background: "linear-gradient(135deg,#C4A862,#A8893F)" }}
                >
                  <i className="fa-solid fa-calendar-check" /> Book this Property
                </a>

                <p className="text-center text-[11px] text-charcoal/30 mt-3">
                  We&apos;ll confirm availability within 24 hours
                </p>

                <div className="mt-5 pt-5 border-t border-black/[.06] flex items-center justify-center gap-4 text-[11.5px] text-charcoal/40">
                  <span><i className="fa-solid fa-shield-halved mr-1 text-forest" /> Trusted host</span>
                  <span><i className="fa-solid fa-broom mr-1 text-forest" /> Spotlessly clean</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
