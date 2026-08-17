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

/**
 * Which listings are configurations of the same physical property.
 *
 * Same cache window and tag as the listings themselves, so a page can read both
 * without a second staleness story. Ungated on purpose — membership is keyed by
 * `propertyId` and joined in memory against whatever the gate returned, so a
 * deactivated listing simply has no row to match.
 */
export const getPublicListingGroups = unstable_cache(
  async () =>
    prisma.inventoryGroupMember.findMany({
      select: { propertyId: true, inventoryGroupId: true },
    }),
  ["public-listing-groups"],
  { revalidate: CACHE_SECONDS, tags: ["public-listings"] },
);

/* ────────────────────────────────────────────────────────────────────────────
   Physical houses, derived from shared inventory
   ──────────────────────────────────────────────────────────────────────────── */

export interface House<T> {
  /** Stable key: the inventory group id, or the slug for an ungrouped listing. */
  key: string;
  /** Every listing that is a configuration of this house, smallest party first. */
  configurations: T[];
  /** The configuration with the highest occupancy — the house at its fullest. */
  largest: T;
  /** How many people the house sleeps when booked at its largest configuration. */
  maxGuests: number;
}

/**
 * Collapse listings into the physical properties behind them.
 *
 * Five listings are two houses: `cozy-1-bedroom`/`spacious-2-bedroom` are Block 34
 * and the three Mickey configurations are Block 38 (see Shared Inventory Groups in
 * the Website spec). Each house takes **one booking at a time**, so any public claim
 * about how many people we can host simultaneously has to be summed per house, not
 * per listing — summing listings would advertise 47 beds' worth of capacity we
 * cannot actually sell on one date.
 *
 * Membership, **not** `InventoryGroup.isActive`, is what identifies a house here.
 * `isActive` gates whether sibling *blocks* propagate; it says nothing about the
 * building. A group switched off is an availability bug, not five separate houses.
 *
 * A listing in no group is its own house, which is the correct reading: nothing
 * shares its inventory.
 *
 * Ordered largest house first, tie-broken by slug so the render is deterministic.
 * Pure — no Prisma, no clock — so the capacity arithmetic this page's headline
 * claim rests on is testable without a database.
 */
export function deriveHouses<T extends { id: number; slug: string; maxGuests: number }>(
  listings: T[],
  memberships: { propertyId: number; inventoryGroupId: number }[],
): House<T>[] {
  const groupOf = new Map(memberships.map((m) => [m.propertyId, m.inventoryGroupId]));
  const buckets = new Map<string, T[]>();

  for (const listing of listings) {
    const groupId = groupOf.get(listing.id);
    const key = groupId === undefined ? `listing-${listing.slug}` : `group-${groupId}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(listing);
    else buckets.set(key, [listing]);
  }

  return [...buckets.entries()]
    .map(([key, configurations]) => {
      const sorted = [...configurations].sort(
        (a, b) => a.maxGuests - b.maxGuests || a.slug.localeCompare(b.slug),
      );
      const largest = sorted[sorted.length - 1];
      return { key, configurations: sorted, largest, maxGuests: largest.maxGuests };
    })
    .sort((a, b) => b.maxGuests - a.maxGuests || a.largest.slug.localeCompare(b.largest.slug));
}

/**
 * Total people we can host on one date: the sum of each house at its largest
 * configuration. Always "sleeps up to N people", never "N beds" — the capacity
 * comes from mixed sleeping arrangements (a queen sleeps two, a daybed three), so
 * bed count and guest count are different numbers and quoting beds both understates
 * the house and invites a complaint on arrival.
 */
export const totalHouseCapacity = <T>(houses: House<T>[]) =>
  houses.reduce((sum, house) => sum + house.maxGuests, 0);
