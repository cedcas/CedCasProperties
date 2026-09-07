/**
 * Seed long-form SEO content onto the two existing properties from the
 * May 8 2026 SEO audit deliverables (HavenInLipa_Full_SEO_Strategy_Report_May8.docx,
 * 050826/2br-property-page-rewrite.md and 050826/1br-property-page-rewrite.md).
 *
 * Idempotent — safe to re-run. Updates by slug; does not create new properties.
 *
 * Run:   npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-property-seo.ts
 */
import { PrismaClient } from "@prisma/client";
import { TWO_BR, ONE_BR, type PropertySeoContent } from "./property-content/b34-content";

const prisma = new PrismaClient();

async function applySeo(content: PropertySeoContent) {
  const existing = await prisma.property.findUnique({
    where: { slug: content.slug },
    select: { id: true, name: true },
  });
  if (!existing) {
    console.warn(`! Skipping ${content.slug} — no Property row found.`);
    return;
  }
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
      aggregateReviewCount: content.aggregateReviewCount,
      aggregateReviewRating: content.aggregateReviewRating,
    },
  });
  console.log(`✓ Updated ${content.slug} (${existing.name})`);
}

async function main() {
  console.log("Seeding property SEO content from May 8 audit deliverables...");
  await applySeo(TWO_BR);
  await applySeo(ONE_BR);
  console.log("Done.");
}

// Guarded so importing TWO_BR/ONE_BR (or any other export) from another
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
