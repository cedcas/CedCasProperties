/**
 * Canonical public display name + one-line "best for" per listing, keyed by
 * slug — not derived from `Property.name`, which still carries an
 * Airbnb-style keyword suffix in production (e.g. "Spacious 2BR Getaway |
 * Netflix•Wi-Fi•9Pax•Parking"). Keying by slug (stable across environments)
 * rather than by name means this renders the plain name on every public
 * surface immediately, with no DB write required — including on
 * `dev.haveninlipa.com`, where `Property.name` additionally carries a
 * "[DEVDB] " prefix.
 *
 * DEC-034 (2026-11-15): product-led positioning fix — plain names instead of
 * keyword-stuffed titles, each with a one-line "best for" so a visitor can
 * place themselves without reading five full descriptions. Admin screens
 * keep showing the raw stored `Property.name` (DEC-012 route below only
 * affects it, never this display layer).
 */
export type PropertyDisplay = {
  /** Plain public name — no pipe-delimited keyword suffix. */
  name: string;
  /** One-line "best for" shown near the title on cards and listing heroes. */
  bestFor: string;
};

export const CANONICAL_PROPERTY_DISPLAY: Record<string, PropertyDisplay> = {
  "cozy-1-bedroom": {
    name: "Cozy 1BR Haven",
    bestFor: "For couples and remote workers — sleeps 5",
  },
  "spacious-2-bedroom": {
    name: "Spacious 2BR Getaway",
    bestFor: "For barkadas and two families — up to 9",
  },
  "mickey-in-lipa--family-staycation--sleeps-7": {
    name: "Mickey in Lipa — Family Staycation",
    bestFor: "For families with kids — up to 7",
  },
  "mickey-in-lipa--family-house--sleeps-11": {
    name: "Mickey in Lipa — Family House",
    bestFor: "For big groups — up to 11",
  },
  "mickey-in-lipa--full-family-house--sleeps-15": {
    name: "Mickey in Lipa — Full Family House",
    bestFor: "For everyone — up to 15",
  },
};

/** Plain public name for a slug, falling back to `fallbackName` for an unmapped slug. */
export function getDisplayName(slug: string, fallbackName: string): string {
  return CANONICAL_PROPERTY_DISPLAY[slug]?.name ?? fallbackName;
}

/** One-line "best for", or `undefined` for a slug with no canonical entry. */
export function getBestFor(slug: string): string | undefined {
  return CANONICAL_PROPERTY_DISPLAY[slug]?.bestFor;
}
