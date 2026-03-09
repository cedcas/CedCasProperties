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

  const images: string[] = JSON.parse(property.images || "[]");
  const amenities: string[] = JSON.parse(property.amenities || "[]");
  const coverImage = property.featuredImage || images[0] || null;

  return (
    <>
      <ScrollReveal />
      <Navbar />
      <main className="bg-offwhite min-h-screen">

        {/* Hero banner */}
        <div className="relative h-[55vh] min-h-[340px] overflow-hidden">
          {coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverImage} alt={property.name} className="w-full h-full object-cover" />
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

        {/* Gallery */}
        {images.length > 1 && (
          <div className="max-w-6xl mx-auto px-6 mt-5 relative">
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
          </div>

          {/* Right — booking card */}
          <div className="lg:sticky lg:top-[90px] self-start">
            <div className="bg-white rounded-[20px] p-7 shadow-[0_8px_32px_rgba(44,44,44,.10)] border border-black/[.05]">
              <div className="flex items-baseline gap-1 mb-1">
                <span className="font-bold text-charcoal text-[1.75rem]">₱{Number(property.pricePerNight).toLocaleString()}</span>
                <span className="text-charcoal/45 text-[13px]">/ night</span>
              </div>
              <p className="text-[12px] text-charcoal/40 mb-6">Entire unit · {property.type}</p>

              <div className="space-y-3 mb-6 text-[13px] text-charcoal/60">
                <div className="flex items-center gap-2"><i className="fa-solid fa-users text-forest w-4" /> Up to {property.maxGuests} guests</div>
                <div className="flex items-center gap-2"><i className="fa-solid fa-bed text-forest w-4" /> {property.bedrooms} bedroom{property.bedrooms !== 1 ? "s" : ""}</div>
                <div className="flex items-center gap-2"><i className="fa-solid fa-bath text-forest w-4" /> {property.bathrooms} bathroom{property.bathrooms !== 1 ? "s" : ""}</div>
                <div className="flex items-center gap-2"><i className="fa-solid fa-location-dot text-forest w-4" /> {property.location}</div>
              </div>

              <a
                href="/#contact"
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full text-[14px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                style={{ background: "linear-gradient(135deg,#C4A862,#A8893F)" }}
              >
                <i className="fa-solid fa-calendar-check" /> Book this Property
              </a>

              <p className="text-center text-[11px] text-charcoal/35 mt-3">
                We&apos;ll confirm availability within 24 hours
              </p>

              <div className="mt-5 pt-5 border-t border-black/[.07] flex items-center justify-center gap-4 text-[12px] text-charcoal/45">
                <span><i className="fa-solid fa-shield-halved mr-1 text-forest" /> Trusted host</span>
                <span><i className="fa-solid fa-broom mr-1 text-forest" /> Spotlessly clean</span>
              </div>
            </div>
          </div>

        </div>
      </main>
      <Footer />
    </>
  );
}
