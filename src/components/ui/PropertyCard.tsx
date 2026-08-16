import type { Property } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { extraGuestFeeApplies } from "@/lib/occupancy";

const plural = (n: number, word: string) => (n === 1 ? word : `${word}s`);

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

export default function PropertyCard({
  property,
  index,
  tagline,
  variant = "teaser",
}: {
  property: Property;
  index: number;
  /**
   * One-line blurb rendered under the spec line, `index` variant only.
   *
   * Passed in already normalised (`normalizePricingProse`) rather than read off
   * `property.tagline` here — the caller is a server component that already has
   * the occupancy fields, and normalising at the render site keeps this
   * component free of pricing logic.
   */
  tagline?: string;
  /**
   * `teaser`  — the homepage grid: name + type, one CTA, no blurb.
   * `index`   — the /properties inventory page: linked name, bed/bath spec
   *             line, what the rate covers, the tagline, and a second CTA into
   *             the booking form so `book_click` is measurable there too.
   *
   * Defaults to `teaser` so the homepage renders exactly as it did before.
   */
  variant?: "teaser" | "index";
}) {
  const isIndex = variant === "index";
  const amenities: string[] = JSON.parse(property.amenities || "[]");
  const images: string[] = JSON.parse(property.images || "[]");
  const coverImage = property.featuredImage || images[0] || null;
  const delayClass = index < 4 ? `reveal-d${index + 1}` : "reveal-d4";

  // "From" only when an extra-guest fee can actually push the total above the
  // base rate (fee > 0 AND maxGuests > includedGuests) — same predicate as the
  // property page. Flat pricing shows the plain rate with no "From".
  const showFrom = extraGuestFeeApplies({
    maxGuests: property.maxGuests,
    includedGuests: property.includedGuests,
    extraGuestFeePerNight: Number(property.extraGuestFeePerNight),
  });

  return (
    <div className={`bg-white rounded-[20px] overflow-hidden shadow-[0_4px_24px_rgba(44,44,44,.08)] hover:shadow-[0_12px_40px_rgba(44,44,44,.16)] hover:-translate-y-1.5 transition-all duration-350 reveal ${delayClass}`}>
      {/* Image */}
      <div className="relative h-[220px] overflow-hidden">
        {coverImage ? (
          <Image
            src={coverImage}
            alt={`${property.name} — ${property.type} rental in ${property.location}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority={index < 2}
            className="object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#2d4820,#3B5323)" }}
          >
            <i className="fa-solid fa-house text-white opacity-10" style={{ fontSize: 90 }} />
          </div>
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,transparent 40%,rgba(0,0,0,.45))" }} />
        <div className="absolute bottom-4 left-4">
          <span className="bg-white/20 backdrop-blur-sm text-white text-[11px] font-semibold px-3 py-1 rounded-full border border-white/25">
            <i className="fa-solid fa-location-dot mr-1.5" />{property.location}
          </span>
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-serif font-semibold text-charcoal text-[1.15rem] leading-tight">
              {isIndex ? (
                // "See the home" affordance — on an index page the name is the
                // natural way into the gallery, so it doesn't need a third button.
                <Link href={`/properties/${property.slug}`} className="hover:text-forest transition-colors">
                  {property.name}
                </Link>
              ) : (
                property.name
              )}
            </h3>
            <span className="text-[12px] text-charcoal/50 mt-0.5 block">
              {isIndex
                ? `Sleeps up to ${property.maxGuests} · ${property.bedrooms} ${plural(property.bedrooms, "bedroom")} · ${property.bathrooms} ${plural(property.bathrooms, "bath")}`
                : `${property.type} · Sleeps up to ${property.maxGuests}`}
            </span>
            {isIndex && tagline && (
              <span className="text-[12px] text-charcoal/45 mt-1.5 block leading-snug">{tagline}</span>
            )}
          </div>
          <div className="text-right shrink-0">
            {Number(property.pricePerNight) > 0 ? (
              <>
                <div className="font-bold text-charcoal text-[1.1rem]">{showFrom ? "From " : ""}₱{Number(property.pricePerNight).toLocaleString()}</div>
                <div className="text-[11px] text-charcoal/45">/night</div>
                {isIndex && (
                  <div className="text-[11px] text-charcoal/45 mt-1 italic">
                    rate covers {property.includedGuests}
                  </div>
                )}
              </>
            ) : (
              <div className="text-[12px] text-charcoal/45 font-medium">Rate coming soon</div>
            )}
          </div>
        </div>

        {amenities.length > 0 && (
          <div className="flex gap-3 mb-5">
            {amenities.slice(0, 4).map((a) => (
              <div key={a} className="w-8 h-8 rounded-lg bg-cream flex items-center justify-center" title={a}>
                <i className={`fa-solid fa-${AMENITY_ICONS[a] ?? "check"} text-forest text-[12px]`} />
              </div>
            ))}
          </div>
        )}

        {/* Single-child flex in the teaser variant, so the homepage grid renders
            byte-identically to before. */}
        <div className="flex gap-2.5">
          {/* Lands on the property page already scrolled to the booking widget (#book)
              rather than the top of a long page — the discovery→booking friction fix. */}
          <Link
            href={`/properties/${property.slug}#book`}
            aria-label={`Check availability for ${property.name}`}
            data-analytics="check_availability"
            data-property={property.slug}
            className="flex-1 flex items-center justify-center gap-2 py-3 min-h-[44px] rounded-full text-[13px] font-semibold border-2 border-forest text-forest hover:bg-forest hover:text-white transition-all duration-250"
          >
            Check Availability <i className="fa-solid fa-arrow-right text-[11px]" />
          </Link>

          {isIndex && (
            <Link
              href={`/properties/${property.slug}/book`}
              aria-label={`Book ${property.name}`}
              data-analytics="book_click"
              data-property={property.slug}
              className="flex-1 flex items-center justify-center gap-2 py-3 min-h-[44px] rounded-full text-[13px] font-semibold border-2 border-forest bg-forest text-white hover:bg-[#2d4820] hover:border-[#2d4820] transition-all duration-250"
            >
              Book Now
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
