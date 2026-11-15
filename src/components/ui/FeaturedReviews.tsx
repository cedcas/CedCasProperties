/**
 * Above-the-fold "proof" block for a listing page (DEC-034) — a small set of
 * real reviews rendered right after the gallery, before the full description.
 * The caller (src/app/properties/[slug]/page.tsx) already selected the subset
 * via selectFeaturedTestimonials(); this component only renders what it's
 * given and renders nothing when that's empty — it never fabricates a quote.
 */
type FeaturedTestimonial = {
  id: number;
  name: string;
  location: string;
  rating: number;
  message: string;
};

export default function FeaturedReviews({
  testimonials,
  totalCount,
}: {
  testimonials: FeaturedTestimonial[];
  /** Total active reviews for this property, so the jump link can say "see all N". */
  totalCount: number;
}) {
  if (testimonials.length === 0) return null;

  return (
    <div>
      <h2 className="font-serif font-semibold text-charcoal text-[1.3rem] mb-4">What recent guests say</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {testimonials.map((t) => (
          <div
            key={t.id}
            className="bg-white rounded-[14px] p-5 border border-black/[.06] shadow-[0_2px_16px_rgba(0,0,0,.04)]"
          >
            <div className="flex gap-1 mb-2.5">
              {Array.from({ length: 5 }).map((_, j) => (
                <i
                  key={j}
                  className={`fa-solid fa-star text-[11px] ${j < t.rating ? "text-[#FF5371]" : "text-black/15"}`}
                  aria-hidden="true"
                />
              ))}
            </div>
            <p className="text-charcoal/70 text-[13.5px] leading-[1.65] mb-3">&ldquo;{t.message}&rdquo;</p>
            <div className="text-charcoal/45 text-[11.5px]">
              {t.name} &middot; {t.location}
            </div>
          </div>
        ))}
      </div>
      {totalCount > testimonials.length && (
        <a href="#reviews" className="inline-flex items-center gap-1.5 mt-3 text-[13px] font-semibold text-forest hover:underline">
          See all {totalCount} reviews
          <i className="fa-solid fa-arrow-down text-[11px]" aria-hidden="true" />
        </a>
      )}
    </div>
  );
}
