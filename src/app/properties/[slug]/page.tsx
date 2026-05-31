import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PropertyGallery from "@/components/ui/PropertyGallery";
import ScrollReveal from "@/components/ui/ScrollReveal";
import BookingCard from "@/components/ui/BookingCard";
import Testimonials from "@/components/sections/Testimonials";
import { buildPropertyJsonLd } from "@/lib/property-schema";

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

type BestForSegment = {
  title: string;
  body: string;
  internalLinkLabel?: string;
  internalLinkUrl?: string;
};

type AmenitySection = {
  section: string;
  body?: string;
  items: string[];
};

type NeighborhoodGroup = {
  radiusLabel: string;
  places: string[];
};

type HousePolicies = {
  checkInTime?: string;
  checkOutTime?: string;
  maxGuests?: number;
  smoking?: string;
  parties?: string;
  pets?: string;
  notes?: string[];
};

type PricingNotes = {
  rate?: string;
  weeklyDiscount?: string;
  monthlyDiscount?: string;
  paymentMethods?: string;
  deposit?: string;
  cancellation?: string;
};

type PropertyFaq = { question: string; answer: string };

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const property = await prisma.property.findUnique({
    where: { slug, isActive: true },
    select: {
      name: true,
      description: true,
      location: true,
      type: true,
      featuredImage: true,
      seoTitle: true,
      seoDescription: true,
    },
  });

  if (!property) {
    return { alternates: { canonical: `/properties/${slug}` } };
  }

  const title =
    property.seoTitle ||
    `${property.name} — ${property.type} Vacation Rental in ${property.location}`;
  const description =
    property.seoDescription ||
    (property.description
      ? property.description.slice(0, 155).replace(/\s+\S*$/, "")
      : `${property.type} vacation rental in ${property.location}, Batangas. Book direct and save 15–20% vs. Airbnb.`);

  return {
    title,
    description,
    alternates: {
      canonical: `/properties/${slug}`,
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: `/properties/${slug}`,
      images: property.featuredImage ? [{ url: property.featuredImage, alt: property.name }] : undefined,
    },
  };
}

export default async function PropertyDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const property = await prisma.property.findUnique({ where: { slug, isActive: true } });
  if (!property) notFound();

  // Pull a handful of active testimonials for the JSON-LD `review` entities.
  // Cap at 8 — Google's VacationRental rich result only needs ≥1 to clear
  // the optional `review` warning, and 8 is the soft ceiling for what
  // surfaces in rich snippets without bloating the JSON-LD.
  const reviewTestimonials = await prisma.testimonial.findMany({
    where: { propertyId: property.id, isActive: true },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  const rawImages: string[] = safeJsonParse(property.images, []);
  const featuredUrl = property.featuredImage ?? null;
  const images = featuredUrl
    ? [featuredUrl, ...rawImages.filter((u) => u !== featuredUrl)]
    : rawImages;
  const amenities: string[] = safeJsonParse(property.amenities, []);
  const imageAlts: string[] = safeJsonParse(property.imageAlts, []);
  const bestForSegments: BestForSegment[] = safeJsonParse(property.bestForSegments, []);
  const amenityDetails: AmenitySection[] = safeJsonParse(property.amenityDetails, []);
  const neighborhoodPlaces: NeighborhoodGroup[] = safeJsonParse(property.neighborhoodPlaces, []);
  const housePolicies: HousePolicies = safeJsonParse(property.housePolicies, {});
  const pricingNotes: PricingNotes = safeJsonParse(property.pricingNotes, {});
  const propertyFaqs: PropertyFaq[] = safeJsonParse(property.propertyFaqs, []);
  const coverImage = featuredUrl || images[0] || null;

  const jsonLd = buildPropertyJsonLd(property, reviewTestimonials);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ScrollReveal />
      <Navbar />
      <main className="bg-offwhite min-h-screen">

        {/* Hero banner */}
        <div className="relative h-[55vh] min-h-[340px] overflow-hidden">
          {coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverImage}
              alt={imageAlts[0] || `${property.name} — vacation rental in ${property.location}, Batangas`}
              className="w-full h-full object-cover"
            />
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
                  {property.tagline && (
                    <span className="bg-white/15 backdrop-blur-sm text-white text-[11px] font-semibold px-3 py-1 rounded-full border border-white/20">
                      {property.tagline}
                    </span>
                  )}
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
            <PropertyGallery
              images={images}
              name={property.name}
              imageAlts={imageAlts}
              location={property.location}
            />
          </div>
        )}

        {/* Main content */}
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10">

          {/* Left — details */}
          <div className="space-y-10">

            {/* Stats bar */}
            <div className="flex flex-wrap gap-6 py-6 border-y border-black/[.08]">
              {[
                { icon: "bed", label: "Bedrooms", value: property.bedrooms },
                { icon: "bath", label: "Bathrooms", value: property.bathrooms },
                { icon: "user-group", label: "Max Guests", value: property.maxGuests },
                ...(property.aggregateReviewCount
                  ? [{ icon: "star", label: "Verified Reviews", value: property.aggregateReviewCount }]
                  : []),
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

            {/* Hero summary */}
            {property.heroSummary && (
              <div>
                <p className="text-charcoal/75 text-[16px] leading-[1.85]">
                  {property.heroSummary}
                </p>
              </div>
            )}

            {/* Honest description */}
            <div>
              <h2 className="font-serif font-semibold text-charcoal text-[1.3rem] mb-3">About this property</h2>
              <div className="text-charcoal/65 text-[15px] leading-[1.8] whitespace-pre-line">{property.description}</div>
            </div>

            {/* Who this property is best for */}
            {bestForSegments.length > 0 && (
              <div>
                <h2 className="font-serif font-semibold text-charcoal text-[1.3rem] mb-4">Who this property is best for</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bestForSegments.map((seg) => (
                    <div
                      key={seg.title}
                      className="bg-white rounded-[12px] p-6 border-l-[3px]"
                      style={{ borderLeftColor: "#3B5323", boxShadow: "0 2px 16px rgba(0,0,0,.04)" }}
                    >
                      <h3 className="font-semibold text-charcoal text-[15px] mb-2">{seg.title}</h3>
                      <p className="text-charcoal/65 text-[14px] leading-[1.75]">{seg.body}</p>
                      {seg.internalLinkUrl && seg.internalLinkLabel && (
                        <a
                          href={seg.internalLinkUrl}
                          {...(seg.internalLinkUrl.startsWith("http")
                            ? { target: "_blank", rel: "noopener noreferrer" }
                            : {})}
                          className="inline-flex items-center gap-1.5 mt-3 text-[13px] font-semibold text-forest hover:underline"
                        >
                          {seg.internalLinkLabel}
                          <i className="fa-solid fa-arrow-right text-[11px]" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Amenities pill grid (existing, kept) */}
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

            {/* Full amenity tour */}
            {amenityDetails.length > 0 && (
              <div>
                <h2 className="font-serif font-semibold text-charcoal text-[1.3rem] mb-4">What&rsquo;s inside</h2>
                <div className="space-y-5">
                  {amenityDetails.map((sec) => (
                    <div key={sec.section} className="bg-white rounded-[12px] p-6 border border-black/[.06]">
                      <h3 className="font-semibold text-charcoal text-[15px] mb-2">{sec.section}</h3>
                      {sec.body && (
                        <p className="text-charcoal/65 text-[14px] leading-[1.75] mb-3">{sec.body}</p>
                      )}
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 list-disc pl-5 text-charcoal/70 text-[14px] leading-[1.7]">
                        {sec.items.map((it, i) => (
                          <li key={i}>{it}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Neighborhood */}
            {neighborhoodPlaces.length > 0 && (
              <div>
                <h2 className="font-serif font-semibold text-charcoal text-[1.3rem] mb-4">The neighborhood</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {neighborhoodPlaces.map((group) => (
                    <div
                      key={group.radiusLabel}
                      className="bg-white rounded-[12px] p-6 border border-black/[.06]"
                    >
                      <h3 className="font-semibold text-forest text-[14px] uppercase tracking-wide mb-3">
                        {group.radiusLabel}
                      </h3>
                      <ul className="space-y-1.5 text-charcoal/70 text-[14px] leading-[1.7]">
                        {group.places.map((p, i) => (
                          <li key={i} className="flex gap-2">
                            <i className="fa-solid fa-location-dot text-forest/50 text-[11px] mt-1.5 shrink-0" />
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Where you'll be — area-level map. Zoom 13 keeps it city/subdivision
                level (no exact pin) to preserve the gated-village privacy; the
                schema geo uses the same Lipa City fallback for the same reason. */}
            <div>
              <h2 className="font-serif font-semibold text-charcoal text-[1.3rem] mb-4">Where you&apos;ll be</h2>
              <div className="rounded-[12px] overflow-hidden border border-black/[.06]">
                <iframe
                  title={`Map of ${property.location || "Lipa City"}, Batangas`}
                  src={`https://www.google.com/maps?q=${encodeURIComponent(`${property.location || "Lipa City"}, Batangas, Philippines`)}&z=13&output=embed`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="w-full aspect-[16/9] border-0 block"
                />
                <p className="text-charcoal/45 text-[12.5px] px-4 py-2.5 bg-white">
                  Approximate area only — the exact address and gate details are shared after your booking is confirmed.
                </p>
              </div>
            </div>

            {/* Guest Reviews — existing testimonials component */}
            <div>
              <h2 className="font-serif font-semibold text-charcoal text-[1.3rem] mb-4">What guests say</h2>
              <Testimonials propertyId={property.id} />
            </div>

            {/* House rules + check-in/check-out */}
            {(housePolicies.checkInTime ||
              housePolicies.checkOutTime ||
              housePolicies.maxGuests ||
              housePolicies.smoking ||
              housePolicies.parties ||
              housePolicies.pets ||
              property.propertyRules) && (
              <div>
                <h2 className="font-serif font-semibold text-charcoal text-[1.3rem] mb-4">House rules &amp; check-in/check-out</h2>
                <div className="bg-white rounded-[12px] p-6 border border-black/[.06] space-y-2 text-charcoal/75 text-[14px] leading-[1.8]">
                  {housePolicies.checkInTime && (
                    <div><strong>Check-in:</strong> {housePolicies.checkInTime}</div>
                  )}
                  {housePolicies.checkOutTime && (
                    <div><strong>Check-out:</strong> {housePolicies.checkOutTime}</div>
                  )}
                  {typeof housePolicies.maxGuests === "number" && (
                    <div><strong>Maximum guests:</strong> {housePolicies.maxGuests} (strictly enforced)</div>
                  )}
                  {housePolicies.smoking && (
                    <div><strong>Smoking:</strong> {housePolicies.smoking}</div>
                  )}
                  {housePolicies.parties && (
                    <div><strong>Parties / events:</strong> {housePolicies.parties}</div>
                  )}
                  {housePolicies.pets && (
                    <div><strong>Pets:</strong> {housePolicies.pets}</div>
                  )}
                  {property.propertyRules && (
                    <div className="mt-3 pt-3 border-t border-black/[.06] whitespace-pre-line">
                      {property.propertyRules}
                    </div>
                  )}
                  <div className="text-[13px] text-charcoal/55 pt-2">
                    Full refund policy on the <Link href="/terms" className="text-forest hover:underline">Terms of Service</Link>.
                  </div>
                </div>
              </div>
            )}

            {/* Pricing + payment */}
            <div>
              <h2 className="font-serif font-semibold text-charcoal text-[1.3rem] mb-4">Pricing &amp; payment</h2>
              <div className="bg-white rounded-[12px] p-6 border border-black/[.06] space-y-2 text-charcoal/75 text-[14px] leading-[1.8]">
                <div>
                  <strong>Rate:</strong>{" "}
                  {pricingNotes.rate || `₱${Number(property.pricePerNight).toLocaleString()} per night`}
                </div>
                {pricingNotes.weeklyDiscount && <div>{pricingNotes.weeklyDiscount}</div>}
                {pricingNotes.monthlyDiscount && <div>{pricingNotes.monthlyDiscount}</div>}
                <div>
                  <strong>Payment methods:</strong>{" "}
                  {pricingNotes.paymentMethods ||
                    "GCash, BPI InstaPay (no fees), Stripe / credit card (6% processing fee applies)"}
                </div>
                {pricingNotes.deposit && (
                  <div><strong>Deposit:</strong> {pricingNotes.deposit}</div>
                )}
                {pricingNotes.cancellation && (
                  <div><strong>Cancellation:</strong> {pricingNotes.cancellation}</div>
                )}
              </div>
            </div>

            {/* Property FAQ */}
            {propertyFaqs.length > 0 && (
              <div>
                <h2 className="font-serif font-semibold text-charcoal text-[1.3rem] mb-4">Frequently asked</h2>
                <div className="space-y-3">
                  {propertyFaqs.map((faq, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-[12px] p-6 border-l-[3px]"
                      style={{ borderLeftColor: "#C4A862", boxShadow: "0 2px 16px rgba(0,0,0,.04)" }}
                    >
                      <h3 className="font-semibold text-forest text-[14.5px] mb-2">{faq.question}</h3>
                      <p className="text-charcoal/70 text-[14px] leading-[1.75]">{faq.answer}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-[13px] text-charcoal/55">
                  More common questions on our <Link href="/faq" className="text-forest hover:underline">FAQ page</Link>.
                </div>
              </div>
            )}

            {/* Book direct CTA */}
            <div
              className="rounded-[16px] p-8"
              style={{
                background:
                  "linear-gradient(135deg, rgba(59,83,35,0.06), rgba(196,168,98,0.10))",
                border: "1px solid rgba(59,83,35,0.15)",
              }}
            >
              <h2 className="font-serif font-semibold text-charcoal text-[1.3rem] mb-2">Book direct, save 15–20%</h2>
              <p className="text-charcoal/70 text-[14.5px] leading-[1.75] mb-4">
                Skip the Airbnb service fee, talk to a real host, get more flexible cancellations and check-in. Use the booking card on this page or message Melody on the homepage — we usually reply within an hour during the day.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/#contact"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-[13.5px] font-semibold text-white"
                  style={{
                    background: "linear-gradient(135deg,#FF5371,#E03D5A)",
                    boxShadow: "0 4px 14px rgba(255,83,113,.30)",
                  }}
                >
                  <i className="fa-solid fa-envelope" /> Message us
                </Link>
                <a
                  href="https://blog.haveninlipa.com/why-book-direct-instead-of-airbnb-a-philippines-hosts-honest-take/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-[13.5px] font-semibold transition-all duration-300 hover:bg-black/5"
                  style={{
                    color: "#2C2C2C",
                    border: "2px solid rgba(44,44,44,0.22)",
                  }}
                >
                  <i className="fa-solid fa-circle-info" /> Why book direct
                </a>
              </div>
            </div>
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
