import type { Property } from "@prisma/client";

const BASE_URL = process.env.NEXTAUTH_URL || "https://www.haveninlipa.com";

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

type PropertyFaq = { question: string; answer: string };

/**
 * Build a combined VacationRental + FAQPage JSON-LD graph for a property page.
 * Returns the JSON-LD object — caller is responsible for serialising into a
 * <script type="application/ld+json"> tag.
 */
export function buildPropertyJsonLd(property: Property) {
  const url = `${BASE_URL}/properties/${property.slug}`;
  const amenities: string[] = safeJsonParse(property.amenities, []);
  const propertyFaqs: PropertyFaq[] = safeJsonParse(property.propertyFaqs, []);
  const featuredImage = property.featuredImage ?? undefined;

  const vacationRental: Record<string, unknown> = {
    "@type": "VacationRental",
    name: property.name,
    description: property.heroSummary || property.description,
    url,
    address: {
      "@type": "PostalAddress",
      addressLocality: property.location || "Lipa City",
      addressRegion: "Batangas",
      addressCountry: "PH",
    },
    occupancy: { "@type": "QuantitativeValue", value: property.maxGuests },
    numberOfBedrooms: property.bedrooms,
    numberOfBathroomsTotal: property.bathrooms,
    amenityFeature: amenities.map((name) => ({
      "@type": "LocationFeatureSpecification",
      name,
    })),
  };

  if (featuredImage) {
    vacationRental.image = featuredImage.startsWith("http")
      ? featuredImage
      : `${BASE_URL}${featuredImage.startsWith("/") ? "" : "/"}${featuredImage}`;
  }

  if (property.aggregateReviewCount && property.aggregateReviewRating) {
    vacationRental.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: property.aggregateReviewRating.toFixed(1),
      reviewCount: property.aggregateReviewCount,
    };
  }

  const graph: Record<string, unknown>[] = [vacationRental];

  if (propertyFaqs.length > 0) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: propertyFaqs.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: f.answer,
        },
      })),
    });
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}
