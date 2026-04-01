import { prisma } from "@/lib/prisma";
import DeleteButton from "@/components/admin/DeleteButton";
import TestimonialToggle from "@/components/admin/TestimonialToggle";
import AddTestimonialForm from "@/components/admin/AddTestimonialForm";

export const dynamic = "force-dynamic";

export default async function TestimonialsPage() {
  const [testimonials, properties] = await Promise.all([
    prisma.testimonial.findMany({
      orderBy: { createdAt: "desc" },
      include: { property: { select: { name: true } } },
    }),
    prisma.property.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="font-serif font-semibold text-charcoal text-[1.8rem]">Testimonials</h1>
        <p className="text-charcoal/45 text-[14px] mt-1">{testimonials.filter((t) => t.isActive).length} active</p>
      </div>

      <AddTestimonialForm properties={properties} />

      <div className="flex flex-col gap-4 mt-8">
        {testimonials.map((t) => (
          <div key={t.id} className={`bg-white rounded-[16px] p-6 shadow-[0_2px_12px_rgba(44,44,44,.07)] border ${t.isActive ? "border-black/[.04]" : "border-black/[.04] opacity-60"}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-charcoal text-[15px]">{t.name}</span>
                  <span className="text-charcoal/40 text-[12px]">· {t.location}</span>
                  <span className="text-[10px] font-semibold text-forest bg-forest/10 px-2 py-0.5 rounded-full">
                    {t.property.name}
                  </span>
                </div>
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <i key={i} className={`fa-solid fa-star text-[12px] ${i < t.rating ? "text-[#FF5371]" : "text-black/15"}`} />
                  ))}
                </div>
                <p className="text-[13.5px] text-charcoal/65 leading-[1.65]">{t.message}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <TestimonialToggle id={t.id} isActive={t.isActive} />
                <DeleteButton id={t.id} type="testimonial" />
              </div>
            </div>
          </div>
        ))}
        {testimonials.length === 0 && (
          <div className="bg-white rounded-[16px] py-16 text-center shadow-[0_2px_12px_rgba(44,44,44,.07)] border border-black/[.04]">
            <p className="text-charcoal/40 text-[15px]">No testimonials yet. Add one above.</p>
          </div>
        )}
      </div>
    </div>
  );
}
