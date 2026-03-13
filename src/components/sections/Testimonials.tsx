import { prisma } from "@/lib/prisma";
import TestimonialList from "@/components/ui/TestimonialList";

export default async function Testimonials({ propertyId }: { propertyId: number }) {
  const testimonials = await prisma.testimonial.findMany({
    where: { propertyId, isActive: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, location: true, rating: true, message: true },
  });

  if (testimonials.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="font-serif font-semibold text-charcoal text-[1.3rem] mb-6">
        Guest Reviews
        <span className="ml-2 text-[13px] font-normal text-charcoal/40">({testimonials.length})</span>
      </h2>
      <TestimonialList testimonials={testimonials} />
    </section>
  );
}
