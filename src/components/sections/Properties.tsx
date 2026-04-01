import { prisma } from "@/lib/prisma";
import PropertyCard from "@/components/ui/PropertyCard";

export default async function Properties() {
  let properties: Awaited<ReturnType<typeof prisma.property.findMany>> = [];
  try {
    properties = await prisma.property.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    });
  } catch {
    // DB not connected yet — use static fallback below
  }

  return (
    <section id="properties" className="py-28 bg-offwhite">
      <div className="max-w-6xl mx-auto px-6">

        <div className="flex flex-col items-center text-center reveal mb-14">
          <span className="flex items-center gap-2 text-forest text-[11px] font-semibold tracking-[.18em] uppercase mb-3">
            <span className="block w-7 h-0.5 bg-[#C4A862] rounded" />
            Our Listings
            <span className="block w-7 h-0.5 bg-[#C4A862] rounded" />
          </span>
          <h2
            className="font-serif font-semibold text-charcoal leading-tight mb-3"
            style={{ fontSize: "clamp(2rem,4vw,3rem)" }}
          >
            Our Rentals
          </h2>
          <div className="gold-line mx-auto" />
          <p className="text-charcoal/55 text-[16px] leading-[1.7] max-w-[500px] mt-5">
            Each property is personally maintained and designed for a clean, comfortable stay.
          </p>
        </div>

        {(() => {
          const count = properties.length;
          const gridClass =
            count === 0 ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7"
            : count === 1 ? "grid grid-cols-1 gap-7 max-w-sm mx-auto"
            : count === 2 ? "grid grid-cols-1 sm:grid-cols-2 gap-7 max-w-2xl mx-auto"
            : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7";
          return (
            <div className={gridClass}>
              {count > 0 ? (
                properties.map((p, i) => <PropertyCard key={p.id} property={p} index={i} />)
              ) : (
                <StaticPropertyCards />
              )}
            </div>
          );
        })()}

      </div>
    </section>
  );
}

function StaticPropertyCards() {
  const cards = [
    {
      name: "The Lipa Retreat",
      type: "2BR",
      price: "₱2,500",
      location: "Lipa City, Batangas",
      gradient: "linear-gradient(135deg,#2d4820 0%,#3B5323 50%,#4a6b30 100%)",
      amenities: ["wifi", "snowflake", "car", "tv"],
    },
    {
      name: "Casa Verde Lipa",
      type: "3BR",
      price: "₱3,800",
      location: "Lipa City, Batangas",
      gradient: "linear-gradient(135deg,#1e3310 0%,#2d4820 50%,#3B5323 100%)",
      amenities: ["wifi", "snowflake", "car", "utensils"],
    },
    {
      name: "The Urban Suite",
      type: "Studio",
      price: "₱1,800",
      location: "Lipa City, Batangas",
      gradient: "linear-gradient(135deg,#2C2C2C 0%,#3d3d3d 50%,#3B5323 100%)",
      amenities: ["wifi", "snowflake", "car", "mug-hot"],
    },
  ];

  return (
    <>
      {cards.map((c, i) => (
        <div
          key={c.name}
          className={`bg-white rounded-[20px] overflow-hidden shadow-[0_4px_24px_rgba(44,44,44,.08)] hover:shadow-[0_12px_40px_rgba(44,44,44,.16)] hover:-translate-y-1.5 transition-all duration-350 reveal reveal-d${i + 1}`}
        >
          {/* Image placeholder */}
          <div className="relative h-[220px] overflow-hidden" style={{ background: c.gradient }}>
            <div className="absolute inset-0 flex items-center justify-center opacity-10">
              <i className="fa-solid fa-house text-white" style={{ fontSize: 90 }} />
            </div>
            <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,transparent 40%,rgba(0,0,0,.45))" }} />
            <div className="absolute bottom-4 left-4">
              <span className="bg-white/20 backdrop-blur-sm text-white text-[11px] font-semibold px-3 py-1 rounded-full border border-white/25">
                <i className="fa-solid fa-location-dot mr-1.5" />{c.location}
              </span>
            </div>
          </div>

          <div className="p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-serif font-semibold text-charcoal text-[1.15rem] leading-tight">{c.name}</h3>
                <span className="text-[12px] text-charcoal/50 mt-0.5 block">{c.type} · Entire Unit</span>
              </div>
              <div className="text-right">
                <div className="font-bold text-charcoal text-[1.1rem]">{c.price}</div>
                <div className="text-[11px] text-charcoal/45">/night</div>
              </div>
            </div>

            <div className="flex gap-3 mb-5">
              {c.amenities.map((icon) => (
                <div key={icon} className="w-8 h-8 rounded-lg bg-[#F9F5EE] flex items-center justify-center">
                  <i className={`fa-solid fa-${icon} text-[#3B5323] text-[12px]`} />
                </div>
              ))}
            </div>

            <a
              href="#contact"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-[13px] font-semibold border-2 border-[#3B5323] text-[#3B5323] hover:bg-[#3B5323] hover:text-white transition-all duration-250"
            >
              View Details <i className="fa-solid fa-arrow-right text-[11px]" />
            </a>
          </div>
        </div>
      ))}
    </>
  );
}
