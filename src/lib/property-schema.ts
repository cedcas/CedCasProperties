import type { Property, Testimonial } from "@prisma/client";

const BASE_URL = process.env.NEXTAUTH_URL || "https://www.haveninlipa.com";

// Business contact number, used to satisfy Google's recommended `telephone`
// field on VacationRental / LocalBusiness / Organization schemas. Stored in
// E.164 format.
const CONTACT_PHONE = "+639066554415";

// Default geo for Lipa City center — used when a property has no explicit
// coordinates. Both current properties are inside gated villages in Lipa
// City; a city-level fallback is acceptable to satisfy Google's VacationRental
// geo requirement without disclosing exact addresses.
const LIPA_CITY_GEO = { latitude: 13.9411, longitude: 121.1638 };

// Per-property bed configuration. Google's VacationRental rich result accepts
// BedDetails entries to describe what guests will actually sleep on. With only
// two units today this lookup is intentionally simple; if/when a third
// property is added, lift this into a Property column.
// `typeOfBed` values are drawn from schema.org's BedType enum where one
// applies (QueenBed, SofaBed, Bunkbed); otherwise free text.
const BEDS_BY_SLUG: Record<string, Array<{ count: number; type: string }>> = {
  "cozy-1-bedroom": [
    { count: 1, type: "QueenBed" },
    { count: 1, type: "SofaBed" },
    { count: 1, type: "Floor mattress" },
  ],
  "spacious-2-bedroom": [
    { count: 1, type: "QueenBed" },
    { count: 1, type: "SofaBed" },
    { count: 2, type: "Floor mattress" },
    { count: 1, type: "Bunkbed" },
  ],
};

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

type HousePolicies = {
  checkInTime?: string;
  checkOutTime?: string;
  maxGuests?: number;
  smoking?: string;
  parties?: string;
  pets?: string;
  notes?: string[];
};

// Convert human-readable time strings ("2:00 PM onwards", "12:00 PM (noon)",
// "14:00") to ISO 8601 time-of-day ("14:00:00"). Returns null when the input
// doesn't clearly match — we'd rather omit than emit a wrong value.
function parseTimeToIso(raw?: string): string | null {
  if (!raw) return null;
  const ampm = raw.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (ampm) {
    let hours = parseInt(ampm[1], 10);
    const minutes = parseInt(ampm[2], 10);
    if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return null;
    const meridiem = ampm[3].toUpperCase();
    if (meridiem === "PM" && hours !== 12) hours += 12;
    if (meridiem === "AM" && hours === 12) hours = 0;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
  }
  const h24 = raw.match(/(?:^|\s)(\d{1,2}):(\d{2})(?!\s*(AM|PM))/i);
  if (h24) {
    const hours = parseInt(h24[1], 10);
    const minutes = parseInt(h24[2], 10);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
  }
  return null;
}

// Infer a boolean from a freeform policy string (e.g. property.housePolicies.pets).
// Conservative: returns null when the wording is ambiguous (both allow and deny
// signals present, like "No smoking inside, OK on balcony") so the schema field
// is simply omitted rather than emitted incorrectly.
function parsePolicyToBool(raw?: string): boolean | null {
  if (!raw) return null;
  const s = raw.toLowerCase().trim();
  if (!s) return null;

  const denyPatterns = [
    /\bno\s+(smoking|pets|smoke|pet|animals)\b/,
    /\bnot\s+allowed\b/,
    /\bnot\s+permitted\b/,
    /\bprohibited\b/,
    /\bsmoke-free\b/,
    /\bpet-free\b/,
    /\bstrictly\s+no\b/,
  ];
  const allowPatterns = [/\ballowed\b/, /\bwelcome\b/, /\bpermitted\b/];

  const hasDeny = denyPatterns.some((re) => re.test(s));
  const hasAllow = allowPatterns.some((re) => re.test(s));

  if (hasDeny && hasAllow) return null;
  if (hasDeny) return false;
  if (hasAllow) return true;
  return null;
}

/**
 * Build a combined VacationRental + FAQPage JSON-LD graph for a property
 * page. Conforms to Google's Vacation rental rich-result requirements:
 * https://developers.google.com/search/docs/appearance/structured-data/vacation-rental
 *
 * Required fields covered: identifier, name, description, image, address,
 * geo, containsPlace (Accommodation with bedrooms/bathrooms/occupancy/
 * amenityFeature). Recommended: aggregateRating + per-review Review
 * entities, additionalType, FAQPage graph entry.
 */
export function buildPropertyJsonLd(property: Property, testimonials: Testimonial[] = []) {
  const url = `${BASE_URL}/properties/${property.slug}`;
  const amenities: string[] = safeJsonParse(property.amenities, []);
  const propertyFaqs: PropertyFaq[] = safeJsonParse(property.propertyFaqs, []);
  const rawImages: string[] = safeJsonParse(property.images, []);
  const housePolicies: HousePolicies = safeJsonParse(property.housePolicies, {});
  const checkinTimeIso = parseTimeToIso(housePolicies.checkInTime);
  const checkoutTimeIso = parseTimeToIso(housePolicies.checkOutTime);
  const petsAllowed = parsePolicyToBool(housePolicies.pets);

  // Build a deduped, absolute-URL image list — featured image first, then the
  // rest. Google recommends 8+ images for richest results.
  const imageUrls = Array.from(
    new Set(
      [property.featuredImage, ...rawImages]
        .filter((u): u is string => Boolean(u))
        .map(absoluteImageUrl),
    ),
  );

  const beds = BEDS_BY_SLUG[property.slug] ?? [];

  const accommodation: Record<string, unknown> = {
    "@type": "Accommodation",
    additionalType: "https://schema.org/House",
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

  if (beds.length > 0) {
    accommodation.bed = beds.map((b) => ({
      "@type": "BedDetails",
      numberOfBeds: b.count,
      typeOfBed: b.type,
    }));
  }

  const vacationRental: Record<string, unknown> = {
    "@type": "VacationRental",
    additionalType: "https://schema.org/House",
    identifier: property.slug,
    name: property.name,
    description: property.heroSummary || property.description,
    url,
    address: {
      "@type": "PostalAddress",
      streetAddress: "BellaVita Subdivision",
      addressLocality: property.location || "Lipa City",
      addressRegion: "Batangas",
      postalCode: "4217",
      addressCountry: "PH",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: LIPA_CITY_GEO.latitude,
      longitude: LIPA_CITY_GEO.longitude,
    },
    containsPlace: accommodation,
    brand: {
      "@type": "Organization",
      name: "Haven in Lipa",
      url: BASE_URL,
    },
    tourBookingPage: `${url}/book`,
    priceRange: `₱${property.pricePerNight}`,
    knowsLanguage: ["en", "fil"],
    telephone: CONTACT_PHONE,
  };

  if (imageUrls.length > 0) {
    vacationRental.image = imageUrls;
  }

  if (checkinTimeIso) {
    vacationRental.checkinTime = checkinTimeIso;
  }
  if (checkoutTimeIso) {
    vacationRental.checkoutTime = checkoutTimeIso;
  }
  if (petsAllowed !== null) {
    vacationRental.petsAllowed = petsAllowed;
  }

  if (property.aggregateReviewCount && property.aggregateReviewRating) {
    vacationRental.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: property.aggregateReviewRating.toFixed(1),
      reviewCount: property.aggregateReviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  // Per-review entities — pull from Testimonial records (Google clears the
  // optional `review` warning when ≥1 Review object is present).
  if (testimonials.length > 0) {
    vacationRental.review = testimonials.slice(0, 8).map((t) => ({
      "@type": "Review",
      reviewRating: {
        "@type": "Rating",
        ratingValue: t.rating,
        bestRating: 5,
        worstRating: 1,
      },
      author: {
        "@type": "Person",
        name: t.name,
      },
      reviewBody: t.message,
      datePublished: t.createdAt.toISOString().slice(0, 10),
    }));
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
