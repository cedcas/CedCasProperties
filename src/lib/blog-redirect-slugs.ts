/**
 * `haveninlipa.com/<blog-slug>` 301s to `blog.haveninlipa.com/<slug>/` (October SEO review
 * #8, seo-review-2026-10.md §5/§8 — real visitors were hitting a 404 landing on the main
 * site instead of the blog). Slugs copied from /workspace/hil-prompts/111226/blog-slugs.txt
 * (2026-11-12, 37 posts) — every `blog.haveninlipa.com` post that exists today.
 *
 * Kept as a plain data module (not inlined in next.config.ts) so `buildBlogSlugRedirects()`
 * is unit-testable and the "must not shadow an existing site route" check in
 * blog-redirect-slugs.test.ts has something to import against the app's real top-level
 * routes.
 */
export const BLOG_REDIRECT_SLUGS: readonly string[] = [
  "business-trip-accommodation-lipa-lima-estate",
  "milestone-birthday-staycation-lipa",
  "meet-haven-ai-assistant",
  "whole-house-rental-vs-hotel-lipa",
  "undas-2026-lipa-long-weekend",
  "wedding-guest-accommodation-lipa",
  "team-building-house-rentals-lipa",
  "family-reunion-accommodation-lipa",
  "solo-travel-guide-lipa",
  "senior-friendly-staycation-guide-lipa",
  "summer-in-lipa-cool-highland-escape",
  "batangas-road-trip-itinerary-lipa-base",
  "barkada-getaway-near-manila-why-a-whole-house-in-lipa-beats-a-beach-resort-cost-per-head-math-inside",
  "heroes-day-weekend-lipa-2026-quiet-itinerary",
  "ninoy-aquino-day-long-weekend-lipa-2026",
  "lipa-charter-day-history-coffee-town-to-city",
  "august-long-weekends-lipa-city-2026",
  "lipa-pilgrimage-guide",
  "casa-de-segunda-lipa-city",
  "lipa-vs-tagaytay-an-honest-comparison-from-a-host-who-lives-in-lipa",
  "work-from-lipa-rainy-season-july",
  "best-lomi-lipa-city",
  "lipa-barako-coffee-heritage",
  "indoor-things-to-do-in-lipa-city-when-it-rains",
  "independence-day-long-weekend-lipa-2026",
  "family-weekend-batangas-without-beach-crowds",
  "romantic-getaway-batangas-lipa-city",
  "mickey-in-lipa-coming-soon",
  "family-staycation-lipa-city-batangas",
  "how-to-get-to-lipa-city-from-manila-2026-guide",
  "work-from-lipa-the-affordable-remote-work-staycation-near-manila",
  "taal-volcano-day-trip-from-lipa-city-2026-updated-guide",
  "best-restaurants-cafes-in-lipa-city-batangas-2026-food-guide",
  "mt-maculot-hiking-guide-2026-trail-tips-routes-where-to-stay-in-lipa",
  "weekend-getaway-in-lipa-city-batangas-your-chill-escape-near-manila",
  "15-best-things-to-do-in-lipa-city-batangas-2026-locals-guide",
  "holy-week-in-lipa-city-batangas-a-peaceful-retreat-near-manila",
] as const;

export interface BlogSlugRedirect {
  source: string;
  destination: string;
  permanent: true;
}

/**
 * One redirect per slug, with and without a trailing slash on the source (Next.js
 * `source` matching is exact — `/foo` does not also match `/foo/` — and both forms get
 * linked to from old social posts/GBP/elsewhere, same precedent as the `/contact` redirect
 * already in next.config.ts).
 */
export function buildBlogSlugRedirects(): BlogSlugRedirect[] {
  return BLOG_REDIRECT_SLUGS.flatMap((slug) => [
    { source: `/${slug}`, destination: `https://blog.haveninlipa.com/${slug}/`, permanent: true as const },
    { source: `/${slug}/`, destination: `https://blog.haveninlipa.com/${slug}/`, permanent: true as const },
  ]);
}
