import { prisma } from "@/lib/prisma";

const STATIC = [
  { name: "Maria Santos",   location: "Manila, NCR",       rating: 5, message: "Absolutely loved our stay at The Lipa Retreat! The place was spotlessly clean, cozy, and had everything we needed. The caretaker was so responsive. Will definitely book again for our next Batangas trip." },
  { name: "Ramon dela Cruz", location: "Quezon City, NCR", rating: 5, message: "Casa Verde was perfect for our family reunion. Spacious, fully furnished, and the price was very reasonable. Lipa's cool weather made it even more enjoyable. Highly recommend CedCas Properties!" },
  { name: "Andrea Reyes",   location: "Makati City, NCR",  rating: 4, message: "Stayed at The Urban Suite for a week for work. It was quiet, comfortable, and the WiFi was fast and reliable. Everything you need for a productive stay away from home. Great value!" },
];

export default async function Testimonials() {
  let testimonials = STATIC;

  try {
    const dbData = await prisma.testimonial.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      take: 3,
    });
    if (dbData.length > 0) {
      testimonials = dbData.map((t) => ({
        name:     t.name,
        location: t.location,
        rating:   t.rating,
        message:  t.message,
      }));
    }
  } catch {
    // DB not connected yet — use static fallback
  }

  return (
    <section id="testimonials" className="py-28 bg-cream">
      <div className="max-w-6xl mx-auto px-6">

        <div className="flex flex-col items-center text-center reveal mb-14">
          <span className="flex items-center gap-2 text-forest text-[11px] font-semibold tracking-[.18em] uppercase mb-3">
            <span className="block w-7 h-0.5 bg-[#C4A862] rounded" />Guest Stories
            <span className="block w-7 h-0.5 bg-[#C4A862] rounded" />
          </span>
          <h2 className="font-serif font-semibold text-charcoal leading-tight mb-3" style={{ fontSize: "clamp(2rem,4vw,3rem)" }}>
            What Our Guests Say
          </h2>
          <div className="gold-line mx-auto" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
          {testimonials.map((t, i) => (
            <div
              key={t.name}
              className={`bg-white rounded-[20px] p-9 relative shadow-[0_4px_24px_rgba(44,44,44,.08)] hover:shadow-[0_12px_40px_rgba(44,44,44,.14)] hover:-translate-y-1 transition-all duration-350 reveal reveal-d${i + 1}`}
            >
              {/* Stars */}
              <div className="flex gap-1 mb-5">
                {Array.from({ length: 5 }).map((_, j) => (
                  <i
                    key={j}
                    className={`fa-solid fa-star text-[14px] ${j < t.rating ? "text-[#C4A862]" : "text-black/15"}`}
                  />
                ))}
              </div>
              {/* Quote */}
              <div className="absolute top-7 right-8 text-[#C4A862] opacity-15" style={{ fontSize: 56, fontFamily: "Georgia", lineHeight: 1 }}>&ldquo;</div>
              <p className="text-charcoal/70 text-[14.5px] leading-[1.75] mb-7 relative z-[1]">
                &ldquo;{t.message}&rdquo;
              </p>
              <div className="flex items-center gap-3 border-t border-black/[.06] pt-5">
                <div className="w-10 h-10 rounded-full bg-[#3B5323] flex items-center justify-center text-white font-bold text-[15px]">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold text-charcoal text-[14px]">{t.name}</div>
                  <div className="text-charcoal/45 text-[12px] flex items-center gap-1.5 mt-0.5">
                    <i className="fa-solid fa-location-dot text-[#C4A862] text-[10px]" />{t.location}
                  </div>
                </div>
                <div className="ml-auto">
                  <span className="text-[10px] font-semibold text-[#3B5323] bg-[#3B5323]/10 px-2.5 py-1 rounded-full tracking-wide uppercase">Verified</span>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
