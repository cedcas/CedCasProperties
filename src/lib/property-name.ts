import { CANONICAL_PROPERTY_DISPLAY } from "./property-display";

/**
 * Pure, framework-free name helpers shared by both a server component
 * (src/app/properties/[slug]/page.tsx) and a client component (PropertyGallery.tsx) — kept
 * out of src/lib/listings.ts (which imports the Prisma client) and src/lib/haven/post-process.ts
 * (server-only) so neither pulls Node-only code into a client bundle.
 *
 * `Property.name` carries an SEO/Airbnb-style suffix — "Cozy 1BR Haven | Solar
 * Power•Netflix•Wi-Fi•5 Pax" — not fit for an <h1> or an image alt attribute (October SEO
 * review: property H1s should name the home and Lipa City, not the Airbnb listing title).
 */
export function basePropertyName(name: string): string {
  return name.replace(/^\s*(\[[^\]]*\]\s*)+/, "").trim().split(/\s*\|\s*|\s*•\s*/)[0].trim();
}

/** First comma-separated segment of `Property.location` (e.g. "Lipa City, Batangas" → "Lipa City"). */
export function cityFromLocation(location: string): string {
  return location.split(",")[0].trim();
}

/**
 * e.g. "Spacious 2BR Getaway in Lipa City" — names the home and the city, never the
 * Airbnb-style listing title. Takes `slug` so a DEC-034 canonical name (the only way to
 * disambiguate the three same-first-segment Mickey configurations, e.g. "Mickey in Lipa —
 * Full Family House") wins over the plain first-pipe-segment fallback used for a slug with
 * no canonical entry.
 */
export function buildPropertyPageH1(name: string, location: string, slug?: string): string {
  const base = (slug && CANONICAL_PROPERTY_DISPLAY[slug]?.name) || basePropertyName(name);
  return `${base} in ${cityFromLocation(location)}`;
}
