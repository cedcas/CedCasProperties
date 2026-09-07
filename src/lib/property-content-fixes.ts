// Pure detection/assertion logic for the one-time Owner-approved production
// content correction (Mt. Maculot removal, internet-speed figures, parking
// wording) — see scripts/fix-property-content.ts, which is the only caller
// that touches Prisma or the database. This module stays free of both so it
// can be unit tested against small fixtures, never real production content.

export type ContentFieldName =
  | "description"
  | "seoTitle"
  | "seoDescription"
  | "tagline"
  | "heroSummary"
  | "bestForSegments"
  | "amenityDetails"
  | "neighborhoodPlaces"
  | "propertyFaqs"
  | "imageAlts";

export const CONTENT_FIELDS: ContentFieldName[] = [
  "description",
  "seoTitle",
  "seoDescription",
  "tagline",
  "heroSummary",
  "bestForSegments",
  "amenityDetails",
  "neighborhoodPlaces",
  "propertyFaqs",
  "imageAlts",
];

export type PropertyTarget = { id: number; slug: string };

// The 5 properties this script is scoped to, by immutable ID with slug as an
// additional assertion. A mismatch on either aborts the whole run.
export const EXPECTED_PROPERTIES: PropertyTarget[] = [
  { id: 1, slug: "cozy-1-bedroom" },
  { id: 2, slug: "spacious-2-bedroom" },
  { id: 3, slug: "mickey-in-lipa--family-staycation--sleeps-7" },
  { id: 4, slug: "mickey-in-lipa--family-house--sleeps-11" },
  { id: 5, slug: "mickey-in-lipa--full-family-house--sleeps-15" },
];

// The exact set of fields each property is expected to still carry stale
// content in, derived from the PR #16 seed-file correction diff. A stale
// pattern found in a field OUTSIDE this set is "unexpected content" — the
// whole run refuses to write rather than guess at it.
export const EXPECTED_STALE_FIELDS: Record<string, ContentFieldName[]> = {
  "cozy-1-bedroom": [
    "description",
    "heroSummary",
    "seoTitle",
    "seoDescription",
    "bestForSegments",
    "amenityDetails",
    "neighborhoodPlaces",
    "propertyFaqs",
    "imageAlts",
  ],
  "spacious-2-bedroom": ["description", "bestForSegments", "amenityDetails", "neighborhoodPlaces", "propertyFaqs"],
  "mickey-in-lipa--family-staycation--sleeps-7": [
    "description",
    "heroSummary",
    "seoDescription",
    "tagline",
    "amenityDetails",
    "neighborhoodPlaces",
    "propertyFaqs",
  ],
  "mickey-in-lipa--family-house--sleeps-11": [
    "description",
    "heroSummary",
    "seoDescription",
    "tagline",
    "bestForSegments",
    "amenityDetails",
    "neighborhoodPlaces",
    "propertyFaqs",
  ],
  "mickey-in-lipa--full-family-house--sleeps-15": [
    "description",
    "heroSummary",
    "seoDescription",
    "tagline",
    "bestForSegments",
    "amenityDetails",
    "neighborhoodPlaces",
    "propertyFaqs",
  ],
};

export const STALE_PATTERNS: { name: string; re: RegExp }[] = [
  { name: "maculot", re: /maculot/i },
  { name: "stale-mbps", re: /400 ?mbps|500\+? ?mbps/i },
  { name: "parking-incident", re: /never had.{0,10}parking|parking incident/i },
];

export function detectStalePatterns(raw: string): string[] {
  return STALE_PATTERNS.filter((p) => p.re.test(raw)).map((p) => p.name);
}

export function detectStaleFields(
  fields: Partial<Record<ContentFieldName, string>>
): ContentFieldName[] {
  const stale: ContentFieldName[] = [];
  for (const field of CONTENT_FIELDS) {
    const value = fields[field];
    if (value && detectStalePatterns(value).length > 0) stale.push(field);
  }
  return stale;
}

export class UnexpectedContentError extends Error {}

// Safety gate 1: every stale field found must already be on the pre-approved
// list for that property, or the run refuses to write anything.
export function assertStaleFieldsAreExpected(
  slug: string,
  staleFields: ContentFieldName[]
): void {
  const expected = new Set(EXPECTED_STALE_FIELDS[slug] ?? []);
  const unexpected = staleFields.filter((f) => !expected.has(f));
  if (unexpected.length > 0) {
    throw new UnexpectedContentError(
      `${slug}: unexpected stale field(s) found: ${unexpected.join(", ")} — not on the pre-approved fix list. Refusing to write.`
    );
  }
}

// Safety gate 2: a proposed replacement value must itself be free of every
// stale pattern before it's trusted — catches a fix list that's gone stale.
export function assertFixedValueIsClean(
  slug: string,
  field: ContentFieldName,
  newValue: string
): void {
  const remaining = detectStalePatterns(newValue);
  if (remaining.length > 0) {
    throw new UnexpectedContentError(
      `${slug}.${field}: proposed replacement still contains stale pattern(s): ${remaining.join(", ")}. Refusing to write.`
    );
  }
}

// Trims the shared prefix/suffix between an old and new string so a report
// line shows only the differing fragment, not a full field dump. Caps each
// side's length so array/object fields don't flood the console.
export function excerptDiff(
  oldStr: string,
  newStr: string,
  maxLen = 240
): { old: string; new: string } {
  let prefix = 0;
  const maxPrefix = Math.min(oldStr.length, newStr.length);
  while (prefix < maxPrefix && oldStr[prefix] === newStr[prefix]) prefix++;

  let suffix = 0;
  const maxSuffix = Math.min(oldStr.length, newStr.length) - prefix;
  while (
    suffix < maxSuffix &&
    oldStr[oldStr.length - 1 - suffix] === newStr[newStr.length - 1 - suffix]
  ) {
    suffix++;
  }

  const cap = (s: string) => (s.length > maxLen ? `${s.slice(0, maxLen)}…` : s);
  return {
    old: cap(oldStr.slice(prefix, oldStr.length - suffix)) || "(unchanged)",
    new: cap(newStr.slice(prefix, newStr.length - suffix)) || "(unchanged)",
  };
}
