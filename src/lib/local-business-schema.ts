/**
 * Site-wide `LodgingBusiness` JSON-LD — the business-level graph node (root
 * layout + the `worksFor` reference on /about), distinct from the
 * per-property `VacationRental` graph built in src/lib/property-schema.ts.
 *
 * 2026-10-10: aligned against the verified Google Business Profile ("Haven in
 * Lipa", 4.6 from 11 reviews, phone +63 906 655 4415, website
 * haveninlipa.com, kgmid /g/11vcxkyhh4) — `hasMap` and `geo` now point at the
 * exact GBP pin instead of carrying no map reference at all. `telephone` was
 * already identical to the GBP's number (E.164 vs the GBP's PH-formatted
 * display are the same number). No `aggregateRating` is added here: a
 * business-level rating snapshotted from GBP would drift the moment a new
 * Google review lands, the same staleness DEC-007 exists to prevent for
 * prose — the live number is already one tap away via `hasMap`/Google
 * Search, so duplicating it here would just be a second, decaying copy.
 *
 * `@type` is `LodgingBusiness` (a more specific schema.org subtype of
 * `LocalBusiness`) rather than the previous bare `LocalBusiness` — accurate
 * for a short-term rental operator and still valid wherever a `LocalBusiness`
 * was expected, since every `LocalBusiness` property is inherited.
 */

export const BUSINESS_BASE_URL = process.env.NEXTAUTH_URL || "https://haveninlipa.com";

export const BUSINESS_PHONE = "+639066554415";

/** Exact pin for the verified GBP listing ("Haven in Lipa", kgmid /g/11vcxkyhh4). */
export const GBP_MAP_URL =
  "https://www.google.com/maps/place/Haven+in+Lipa/@13.9050606,121.1687456,17z/data=!3m1!4b1!4m6!3m5!1s0x33bd13260aaaa909:0xc11538afb2b80043!8m2!3d13.9050606!4d121.1687456!16s%2Fg%2F11vcxkyhh4";

export const GBP_GEO = { latitude: 13.9050606, longitude: 121.1687456 };

/**
 * Matches the blog's Organization `sameAs` (`hil-seo` 1.1.8,
 * content/seo/runs/100426/hil-seo-plugin/includes/schema.php) for Facebook,
 * Instagram and TikTok. The Airbnb listing link is kept as-is pending an
 * explicit Owner decision (see docs/HIL_COMPLETION_LOG.md, 2026-10-10 entry)
 * — the blog's Organization graph does not carry it, so the two sites are
 * NOT yet fully aligned on this one entry.
 */
export const BUSINESS_SAME_AS: readonly string[] = [
  "https://www.facebook.com/haveninlipa",
  "https://www.instagram.com/haven_inlipa/",
  "https://www.tiktok.com/@haven_inlipa",
  "https://airbnb.com/h/fullhousebellavita",
];

export function buildLocalBusinessJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    "@id": BUSINESS_BASE_URL,
    name: "Haven in Lipa",
    description: "Short-term vacation rentals in Lipa City, Batangas, Philippines.",
    url: BUSINESS_BASE_URL,
    email: "customerservice@haveninlipa.com",
    telephone: BUSINESS_PHONE,
    image: `${BUSINESS_BASE_URL}/brand-assets/Logo.png`,
    logo: `${BUSINESS_BASE_URL}/brand-assets/Logo.png`,
    priceRange: "₱₱",
    openingHours: "Mo-Su 00:00-23:59",
    address: {
      "@type": "PostalAddress",
      streetAddress: "BellaVita Subdivision",
      addressLocality: "Lipa City",
      addressRegion: "Batangas",
      postalCode: "4217",
      addressCountry: "PH",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: GBP_GEO.latitude,
      longitude: GBP_GEO.longitude,
    },
    hasMap: GBP_MAP_URL,
    contactPoint: {
      "@type": "ContactPoint",
      telephone: BUSINESS_PHONE,
      email: "customerservice@haveninlipa.com",
      contactType: "customer service",
      availableLanguage: ["English", "Filipino"],
      hoursAvailable: "Mo-Su 00:00-23:59",
    },
    sameAs: [...BUSINESS_SAME_AS],
  };
}
