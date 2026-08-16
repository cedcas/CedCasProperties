/**
 * Shared definition of "a listing the public can see", plus the cached loaders
 * and display helpers that go with it.
 */

import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";

/**
 * The public gate: active AND priced.
 *
 * `pricePerNight` of 0 means "not yet configured" — publishing it would put a ₱0
 * rate on a page, and such a listing's /book URL redirects straight back to the
 * property page anyway (src/app/properties/[slug]/book/page.tsx).
 *
 * The same predicate is currently inlined in three older surfaces — the homepage
 * grid (src/components/sections/Properties.tsx), the sitemap
 * (src/app/sitemap.ts) and the feed (src/app/api/properties.json/route.ts).
 * They are byte-identical to this; anything new should import from here instead
 * of adding a fifth copy, and those three can adopt it whenever they're next
 * touched.
 */
export const PUBLIC_LISTING_GATE = { isActive: true, pricePerNight: { gt: 0 } } as const;

/** Newest first — the order every public surface lists properties in. */
export const PUBLIC_LISTING_ORDER = { createdAt: "desc" } as const;

/**
 * Display names for prose contexts (a sentence, a table cell, a bulleted list).
 *
 * `Property.name` carries an SEO suffix after a pipe — "Cozy 1BR Haven | Solar
 * Power•Netflix•Wi-Fi•5 Pax" — which reads badly mid-sentence. The first segment
 * is the human name, except where several listings share one: the three Mickey
 * configurations are all "Mickey in Lipa" and need their second segment
 * ("Full Family House") to stay distinguishable.
 *
 * Derived rather than hardcoded so renaming a listing in admin can't leave a
 * stale label behind on a page that never learns about the change.
 */
export function buildShortNames(props: { slug: string; name: string }[]): Map<string, string> {
  const segmentsOf = (name: string) => name.split("|").map((s) => s.trim()).filter(Boolean);

  const firstSegmentCounts = new Map<string, number>();
  for (const p of props) {
    const base = segmentsOf(p.name)[0] ?? p.name;
    firstSegmentCounts.set(base, (firstSegmentCounts.get(base) ?? 0) + 1);
  }

  return new Map(
    props.map((p) => {
      const segments = segmentsOf(p.name);
      const base = segments[0] ?? p.name;
      const ambiguous = (firstSegmentCounts.get(base) ?? 0) > 1 && segments[1];
      return [p.slug, ambiguous ? `${base} — ${segments[1]}` : base];
    }),
  );
}

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

/** "five" for 5, falling back to digits past ten. */
export const numberWord = (n: number) => NUMBER_WORDS[n] ?? String(n);

/** `plural(1, "bedroom")` → "bedroom"; `plural(2, "bedroom")` → "bedrooms". */
export const plural = (n: number, word: string) => (n === 1 ? word : `${word}s`);

/* ────────────────────────────────────────────────────────────────────────────
   Cached loaders
   ──────────────────────────────────────────────────────────────────────────── */

const CACHE_SECONDS = 3600;

/**
 * Why the data is cached rather than the response.
 *
 * `/properties` and `/about` are `force-dynamic` — they must not run Prisma at
 * build time, which would fail CI (no database in the lint/build workflow) and
 * could bake a transient DB error into a static asset. The original plan was
 * `force-dynamic` + an `s-maxage` header declared in `next.config.ts`, mirroring
 * what `/api/properties.json` does.
 *
 * **That does not work for a page on Vercel.** A Route Handler sets its own
 * response headers and they survive; a *page* cannot, and the `next.config.ts`
 * header loses to the framework's own `Cache-Control: private, no-cache,
 * no-store` for a dynamic route. Confirmed against production on 2026-08-16:
 * every request came back `x-vercel-cache: MISS` with the no-store header, so
 * each page view ran the query. `next start` locally served the configured
 * header, which made this a false positive in pre-deploy testing.
 *
 * Caching the query result instead gets the thing actually worth having — about
 * one DB round trip an hour per page instead of one per request — without any
 * build-time execution.
 *
 * ⚠️ Values round-trip through the cache as JSON: Prisma `Decimal` comes back a
 * string and `DateTime` an ISO string, while the TypeScript types still claim
 * `Decimal`/`Date`. Every consumer already goes through `Number(...)` or
 * `JSON.parse(...)`, which is why this is safe today — but read a new field
 * through one of those, not off the raw value, and never do date arithmetic on
 * the result without re-parsing.
 *
 * Staleness: an admin edit takes up to an hour to reach these two pages, the
 * same trade `/api/properties.json` already makes. The `public-listings` tag is
 * declared so a future `revalidateTag()` in the admin property routes can make
 * that instant.
 */
export const getPublicListings = unstable_cache(
  async () =>
    prisma.property.findMany({
      where: PUBLIC_LISTING_GATE,
      orderBy: PUBLIC_LISTING_ORDER,
    }),
  ["public-listings"],
  { revalidate: CACHE_SECONDS, tags: ["public-listings"] },
);

/** Count behind the same gate and the same cache window, for `generateMetadata`. */
export const getPublicListingCount = unstable_cache(
  async () => prisma.property.count({ where: PUBLIC_LISTING_GATE }),
  ["public-listing-count"],
  { revalidate: CACHE_SECONDS, tags: ["public-listings"] },
);
