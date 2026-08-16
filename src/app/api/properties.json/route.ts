import { prisma } from "@/lib/prisma";
import { extraGuestFeeApplies, normalizePricingProse } from "@/lib/occupancy";

// GET /api/properties.json — the public, read-only listing feed.
//
// Consumed by the WordPress blog (blog.haveninlipa.com) so in-article property
// recommendations read live DB values instead of prices hardcoded at authoring
// time. ~29 articles currently hardcode rates and several are already wrong
// (the sleeps-15 house is published at ₱7,000 against a DB value of ₱6,500).
// This feed is the single source of truth that retires that whole bug class.
//
// Posture matches /api/calendar/[slug]: public, unauthenticated, and carrying
// nothing that isn't already rendered on the public property page. No booking,
// guest, revenue, or availability data — availability stays on
// /api/availability/[slug], which is the surface built to answer it.
//
// Cached at the CDN for an hour, mirroring the Footer's ISR cadence
// (src/components/layout/Footer.tsx) — see the Cache-Control header below.
//
// Deliberately NOT `export const revalidate` / statically prerendered. That
// form runs this query at BUILD time, which (a) fails CI outright, since the
// lint/build workflow has no database and Prisma resolves DATABASE_URL to
// localhost:3306, and (b) would let a transient DB error during a production
// build get baked into a static asset and served for a full hour. Going
// dynamic with an explicit s-maxage keeps the same one-hour edge cache and the
// same ~1-origin-hit-per-hour DB load, but a bad moment costs one request
// instead of an hour of them.
export const dynamic = "force-dynamic";
const CACHE_SECONDS = 3600;

const BASE_URL = process.env.NEXTAUTH_URL || "https://haveninlipa.com";
const BLOG_ORIGIN = "https://blog.haveninlipa.com";

type BestForSegment = {
  title: string;
  body: string;
  internalLinkLabel?: string;
  internalLinkUrl?: string;
};

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Relative internal links are absolutised — the consumer is on another origin. */
function absoluteUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  return url.startsWith("/") ? `${BASE_URL}${url}` : url;
}

export async function GET() {
  const properties = await prisma.property.findMany({
    // Same gate as the public grid (src/components/sections/Properties.tsx) and
    // the sitemap: active AND priced. A pricePerNight of 0 means "not yet
    // configured" — publishing it would put a ₱0 rate in an article, and its
    // /book URL redirects straight back to the property page anyway
    // (src/app/properties/[slug]/book/page.tsx).
    where: { isActive: true, pricePerNight: { gt: 0 } },
    orderBy: { createdAt: "desc" },
    select: {
      slug: true,
      name: true,
      type: true,
      location: true,
      pricePerNight: true,
      includedGuests: true,
      maxGuests: true,
      extraGuestFeePerNight: true,
      bedrooms: true,
      bathrooms: true,
      featuredImage: true,
      amenities: true,
      tagline: true,
      heroSummary: true,
      bestForSegments: true,
      updatedAt: true,
    },
  });

  const payload = properties.map((property) => {
    const url = `${BASE_URL}/properties/${property.slug}`;

    // The three fields every fee surface reads from.
    const occupancy = {
      maxGuests: property.maxGuests,
      includedGuests: property.includedGuests,
      extraGuestFeePerNight: Number(property.extraGuestFeePerNight),
    };

    // Same normalisation the property page and the JSON-LD apply: authored prose
    // can carry a seeded rate that has since drifted from pricePerNight, and this
    // feed exists to stop that drift reaching the blog — re-exporting it raw would
    // defeat the point.
    const norm = (text: string | null | undefined) =>
      normalizePricingProse(
        text,
        {
          pricePerNight: Number(property.pricePerNight),
          includedGuests: property.includedGuests,
        },
        occupancy,
      );

    const segments = safeJsonParse<BestForSegment[]>(property.bestForSegments, []);

    return {
      slug: property.slug,
      name: property.name,
      type: property.type,
      location: property.location,
      url,
      bookUrl: `${url}/book`,

      // Raw numbers, never display strings — the blog does its own formatting.
      pricePerNight: Number(property.pricePerNight),
      includedGuests: property.includedGuests,
      maxGuests: property.maxGuests,
      extraGuestFeePerNight: Number(property.extraGuestFeePerNight),
      // Whether the blog should prefix the rate with "From". Comes from the same
      // predicate PropertyCard uses (57ab099) rather than a reimplementation, so
      // a flat-price listing can never imply an increase that cannot happen.
      priceFrom: extraGuestFeeApplies(occupancy),

      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      featuredImage: property.featuredImage,
      amenities: safeJsonParse<string[]>(property.amenities, []),

      tagline: norm(property.tagline) || null,
      heroSummary: norm(property.heroSummary) || null,
      // Audience-fit data the recommendation engine scores against.
      bestForSegments: segments.map((segment) => ({
        title: segment.title,
        body: norm(segment.body),
        internalLinkLabel: segment.internalLinkLabel,
        internalLinkUrl: absoluteUrl(segment.internalLinkUrl),
      })),

      updatedAt: property.updatedAt.toISOString(),
    };
  });

  return Response.json(
    { count: payload.length, properties: payload },
    {
      headers: {
        // WordPress fetches server-side, so CORS isn't strictly needed today.
        // Declaring it now means a future client-side widget on the blog works
        // without a CSP or header change. Scoped to the blog origin rather than
        // "*" — this feed has one known consumer.
        "Access-Control-Allow-Origin": BLOG_ORIGIN,
        "Vary": "Origin",
        "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=86400`,
      },
    },
  );
}
