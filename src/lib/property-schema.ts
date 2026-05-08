import type { Property } from "@prisma/client";

const BASE_URL = process.env.NEXTAUTH_URL || "https://www.haveninlipa.com";

// Default geo for Lipa City center — used when a property has no explicit
// coordinates. Both current properties are inside gated villages in Lipa
// City; a city-level fallback is acceptable to satisfy Google's VacationRental
// geo requirement without disclosing exact addresses.
const LIPA_CITY_GEO = { latitude: 13.9411, longitude: 121.1638 };

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function absoluteImageUrl(url: string): string {
  if (url.startsWith("http")) return url;
  return `${BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

type PropertyFaq = { question: string; answer: string };

/**
 * Build a combined VacationRental + FAQPage JSON-LD graph for a property
 * page. Conforms to Google's Vacation rental rich-result requirements:
 * https://developers.google.com/search/docs/appearance/structured-data/vacation-rental
 *
 * Required fields covered: identifier, name, description, image, address,
 * geo, containsPlace (Accommodation with bedrooms/bathrooms/occupancy/
 * amenityFeature). Optional but valuable: aggregateRating.
 */
export function buildPropertyJsonLd(property: Property) {
  const url = `${BASE_URL}/properties/${property.slug}`;
  const amenities: string[] = safeJsonParse(property.amenities, []);
  const propertyFaqs: PropertyFaq[] = safeJsonParse(property.propertyFaqs, []);
  const rawImages: string[] = safeJsonParse(property.images, []);

  // Build a deduped, absolute-URL image list — featured image first, then the
  // rest. Google recommends 8+ images for richest results.
  const imageUrls = Array.from(
    new Set(
      [property.featuredImage, ...rawImages]
        .filter((u): u is string => Boolean(u))
        .map(absoluteImageUrl),
    ),
  );

  const accommodation = {
    "@type": "Accommodation",
    additionalType: "https://schema.org/HouseAndApartment",
    name: property.name,
    description: property.heroSummary || property.description,
    occupancy: { "@type": "QuantitativeValue", value: property.maxGuests },
    numberOfBedrooms: property.bedrooms,
    numberOfBathroomsTotal: property.bathrooms,
    amenityFeature: amenities.map((name) => ({
      "@type": "LocationFeatureSpecification",
      name,
      value: true,
    })),
  };

  const vacationRental: Record<string, unknown> = {
    "@type": "VacationRental",
    identifier: property.slug,
    name: property.name,
    description: property.heroSummary || property.description,
    url,
    address: {
      "@type": "PostalAddress",
      addressLocality: property.location || "Lipa City",
      addressRegion: "Batangas",
      addressCountry: "PH",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: LIPA_CITY_GEO.latitude,
      longitude: LIPA_CITY_GEO.longitude,
    },
    containsPlace: accommodation,
  };

  if (imageUrls.length > 0) {
    vacationRental.image = imageUrls;
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
