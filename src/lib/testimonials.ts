/**
 * Pure selection logic for the "featured reviews" block near the top of a
 * listing page (DEC-034) — picks a small, real subset of a property's
 * already-fetched active `Testimonial` rows to show above the fold, next to
 * the gallery and booking card. Never fabricates a quote: an empty input
 * yields an empty output, and the caller renders nothing in that case.
 */
export type SelectableTestimonial = {
  rating: number;
  message: string;
};

export const FEATURED_TESTIMONIAL_MAX = 3;

/**
 * Highest rating first, then the longest message as the tie-break (a longer
 * real quote reads as more substantive/useful than a one-liner) — never more
 * than `max`. Does not mutate the input array.
 */
export function selectFeaturedTestimonials<T extends SelectableTestimonial>(
  testimonials: T[],
  max: number = FEATURED_TESTIMONIAL_MAX
): T[] {
  return [...testimonials]
    .sort((a, b) => b.rating - a.rating || b.message.length - a.message.length)
    .slice(0, Math.max(0, max));
}
