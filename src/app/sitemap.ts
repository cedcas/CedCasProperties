import type { MetadataRoute } from "next";
import { getPublicListings } from "@/lib/listings";

const BASE_URL = process.env.NEXTAUTH_URL || "https://haveninlipa.com";

// Reads live inventory, so this route can't be statically prerendered: a
// build-time Prisma query fails CI (no database in the lint/build workflow).
// Same precedent as /about and /properties — dynamic, with the query itself
// cached for an hour via getPublicListings() in src/lib/listings.ts.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const properties = await getPublicListings();

  // `lastModified` must be a real date or be left out. It used to be the
  // request time on every non-listing URL, so each fetch claimed the whole site
  // had just changed, and Google learns to ignore a sitemap's dates when they
  // are not trustworthy (2026-09-30 SEO audit).
  // - Pages that render the inventory use the newest listing update.
  // - Fixed-copy pages (/faq, /privacy, /terms, /ambassadors) carry no date.
  // `updatedAt` may arrive as a string: getPublicListings() is cached, and the
  // cache serializes Dates.
  const times = properties
    .map((p) => new Date(p.updatedAt).getTime())
    .filter((t) => Number.isFinite(t));
  const inventoryUpdated = times.length ? new Date(Math.max(...times)) : undefined;

  return [
    {
      url: BASE_URL,
      lastModified: inventoryUpdated,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      // The inventory index (src/app/properties/page.tsx). Ranks above the
      // individual listings because it's the landing surface for plain lodging
      // intent and the target of the external links that used to 404.
      url: `${BASE_URL}/properties`,
      lastModified: inventoryUpdated,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    ...properties.map((p) => ({
      url: `${BASE_URL}/properties/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    {
      // The staycation money page (src/app/staycation/page.tsx). Priority 0.9,
      // level with /properties: it is cluster C1's landing surface and the
      // consolidation target for the retired blog article #6.
      url: `${BASE_URL}/staycation`,
      lastModified: inventoryUpdated,
      changeFrequency: "monthly" as const,
      priority: 0.9,
    },
    {
      // Wedding-party accommodation (src/app/weddings-accommodation/page.tsx).
      // Ranks with the listings rather than below them: it is a money page for a
      // multi-night, full-house booking, and the only content in this market
      // answering "where does the entourage sleep".
      url: `${BASE_URL}/weddings-accommodation`,
      lastModified: inventoryUpdated,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/faq`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: inventoryUpdated,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    },
    {
      // The Ambassador program page (src/app/ambassadors/page.tsx): public,
      // self-canonical and linked site-wide, but it was missing here. The Owner
      // confirmed 2026-10-04 that it should be findable in search.
      url: `${BASE_URL}/ambassadors`,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/privacy`,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/terms`,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
  ];
}
