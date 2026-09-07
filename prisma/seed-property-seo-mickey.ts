/**
 * Seed long-form SEO / signal content onto the three "Mickey in Lipa"
 * configurations created via the admin panel (which does not yet expose the
 * SEO fields). Brings them to parity with the original two listings seeded by
 * seed-property-seo.ts.
 *
 * Idempotent — safe to re-run. Updates by slug; does not create new properties.
 *
 * IMPORTANT — review before running on prod:
 *   - Review counts/ratings are DERIVED from each property's active Testimonial
 *     rows at run time (see reviewAggregate below), not hardcoded. They were
 *     omitted entirely until Aug 2026 because these listings had no reviews and
 *     faking review schema violates Google's policy; real guest reviews now
 *     exist. A listing with no active testimonials still gets nulls, so the
 *     aggregate can never describe reviews that don't exist.
 *   - The extra-guest fee is described in words ("an extra per-guest fee"),
 *     never as a literal amount. This is load-bearing, not styling:
 *     `normalizePricingProse` rewrites the base rate and the "covers N guests"
 *     count at render time, but deliberately does NOT touch the extra-guest fee
 *     — see the note in src/lib/occupancy.ts, which relies on the prose already
 *     being number-free. A hardcoded "₱400" here is therefore an unprotected
 *     drift surface: change extraGuestFeePerNight in admin and the copy goes
 *     silently stale on the live property page. This seed shipped with literal
 *     ₱400s, they were stripped by hand in admin, and a later re-run reverted
 *     that fix — hence this warning. Keep it number-free.
 *   - housePolicies, pricingNotes (deposit/cancellation/payment), and the
 *     neighborhood drive-times are MIRRORED from the established business policy
 *     of the original two listings. Verify they hold for the Mickey house in
 *     Bella Vita before running, and adjust any that differ.
 *
 * Run:   npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-property-seo-mickey.ts
 */
import { PrismaClient } from "@prisma/client";
import { SLEEPS_7, SLEEPS_11, SLEEPS_15, type PropertySeoContent } from "./property-content/mickey-content";

const prisma = new PrismaClient();

/**
 * Aggregate review count/rating, computed from the property's own active
 * `Testimonial` rows rather than hardcoded.
 *
 * These listings had zero testimonials when this seed was written, so the
 * aggregates were deliberately omitted — fabricating review schema violates
 * Google's policy. Real guest reviews now exist, so the aggregates can be set.
 *
 * Derived, not literal, on purpose: a hardcoded count is stale the moment the
 * next guest review is added, and `aggregateRating` that disagrees with the
 * reviews rendered on the page is the exact drift the rest of this codebase
 * (normalizePricingProse, the properties feed) exists to prevent. Deriving also
 * means it can only ever describe rows that genuinely exist.
 *
 * Returns nulls when there are no active testimonials, which leaves
 * `aggregateRating` out of the JSON-LD entirely (see src/lib/property-schema.ts).
 */
async function reviewAggregate(propertyId: number) {
  const testimonials = await prisma.testimonial.findMany({
    where: { propertyId, isActive: true },
    select: { rating: true },
  });
  if (testimonials.length === 0) {
    return { aggregateReviewCount: null, aggregateReviewRating: null };
  }
  const sum = testimonials.reduce((total, t) => total + t.rating, 0);
  return {
    aggregateReviewCount: testimonials.length,
    // One decimal — matches how property-schema.ts serialises ratingValue.
    aggregateReviewRating: Math.round((sum / testimonials.length) * 10) / 10,
  };
}

async function applySeo(content: PropertySeoContent) {
  const existing = await prisma.property.findUnique({
    where: { slug: content.slug },
    select: { id: true, name: true },
  });
  if (!existing) {
    console.warn(`! Skipping ${content.slug} — no Property row found.`);
    return;
  }
  const aggregate = await reviewAggregate(existing.id);
  await prisma.property.update({
    where: { slug: content.slug },
    data: {
      description: content.description,
      seoTitle: content.seoTitle,
      seoDescription: content.seoDescription,
      tagline: content.tagline,
      heroSummary: content.heroSummary,
      bestForSegments: JSON.stringify(content.bestForSegments),
      amenityDetails: JSON.stringify(content.amenityDetails),
      neighborhoodPlaces: JSON.stringify(content.neighborhoodPlaces),
      housePolicies: JSON.stringify(content.housePolicies),
      pricingNotes: JSON.stringify(content.pricingNotes),
      propertyFaqs: JSON.stringify(content.propertyFaqs),
      imageAlts: JSON.stringify(content.imageAlts),
      ...aggregate,
    },
  });
  const reviewNote =
    aggregate.aggregateReviewCount === null
      ? "no active testimonials — aggregateRating left off"
      : `${aggregate.aggregateReviewCount} reviews, ${aggregate.aggregateReviewRating?.toFixed(1)} avg`;
  console.log(`✓ Updated ${content.slug} (${existing.name}) — ${reviewNote}`);
}

async function main() {
  console.log("Seeding Mickey in Lipa SEO content...");
  await applySeo(SLEEPS_7);
  await applySeo(SLEEPS_11);
  await applySeo(SLEEPS_15);
  console.log("Done.");
}

// Guarded so importing SLEEPS_7/11/15 (or any other export) from another
// module — e.g. scripts/fix-property-content.ts — can never trigger this
// seed run as an unintended side effect. Only fires when this file is
// executed directly.
if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
