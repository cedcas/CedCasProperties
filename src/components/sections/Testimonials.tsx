import { prisma } from "@/lib/prisma";

export default async function Testimonials({ propertyId }: { propertyId: number }) {
  const testimonials = await prisma.testimonial.findMany({
    where: { propertyId, isActive: true },
    orderBy: { createdAt: "desc" },
  });

  if (testimonials.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="font-serif font-semibold text-charcoal text-[1.3rem] mb-6">Guest Reviews</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {testimonials.map((t, i) => (
          <div
            key={t.id}
            className={`bg-white rounded-[20px] p-7 relative shadow-[0_4px_24px_rgba(44,44,44,.08)] hover:shadow-[0_12px_40px_rgba(44,44,44,.14)] hover:-translate-y-1 transition-[transform,box-shadow] duration-300 reveal reveal-d${i + 1}`}
          >
            {/* Stars */}
            <div className="flex gap-1 mb-4">
              {Array.from({ length: 5 }).map((_, j) => (
                <i
                  key={j}
                  className={`fa-solid fa-star text-[13px] ${j < t.rating ? "text-[#C4A862]" : "text-black/15"}`}
                />
              ))}
            </div>
            {/* Decorative quote */}
            <div className="absolute top-5 right-6 text-[#C4A862] opacity-10" style={{ fontSize: 52, fontFamily: "Georgia", lineHeight: 1 }}>&ldquo;</div>
            <p className="text-charcoal/70 text-[14px] leading-[1.75] mb-6 relative z-[1]">
              &ldquo;{t.message}&rdquo;
            </p>
            <div className="flex items-center gap-3 border-t border-black/[.06] pt-4">
              <div className="w-9 h-9 rounded-full bg-[#3B5323] flex items-center justify-center text-white font-bold text-[13px] flex-shrink-0">
                {t.name.charAt(0)}
              </div>
              <div>
                <div className="font-semibold text-charcoal text-[13.5px]">{t.name}</div>
                <div className="text-charcoal/45 text-[11.5px] flex items-center gap-1.5 mt-0.5">
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
    </section>
  );
}
