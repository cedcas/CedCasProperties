import type { Property } from "@prisma/client";
import Link from "next/link";

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

export default function PropertyCard({ property, index }: { property: Property; index: number }) {
  const amenities: string[] = JSON.parse(property.amenities || "[]");
  const images: string[] = JSON.parse(property.images || "[]");
  const coverImage = property.featuredImage || images[0] || null;
  const delayClass = index < 4 ? `reveal-d${index + 1}` : "reveal-d4";

  return (
    <div className={`bg-white rounded-[20px] overflow-hidden shadow-[0_4px_24px_rgba(44,44,44,.08)] hover:shadow-[0_12px_40px_rgba(44,44,44,.16)] hover:-translate-y-1.5 transition-all duration-350 reveal ${delayClass}`}>
      {/* Image */}
      <div className="relative h-[220px] overflow-hidden">
        {coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverImage} alt={property.name} className="w-full h-full object-cover" />
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
            <h3 className="font-serif font-semibold text-charcoal text-[1.15rem] leading-tight">{property.name}</h3>
            <span className="text-[12px] text-charcoal/50 mt-0.5 block">{property.type} · Entire Unit</span>
          </div>
          <div className="text-right">
            <div className="font-bold text-charcoal text-[1.1rem]">₱{Number(property.pricePerNight).toLocaleString()}</div>
            <div className="text-[11px] text-charcoal/45">/night</div>
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

        <Link
          href={`/properties/${property.slug}`}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-[13px] font-semibold border-2 border-forest text-forest hover:bg-forest hover:text-white transition-all duration-250"
        >
          View Details <i className="fa-solid fa-arrow-right text-[11px]" />
        </Link>
      </div>
    </div>
  );
}
