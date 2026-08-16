/**
 * Shared definition of "a listing the public can see", plus the display helpers
 * that go with it.
 *
 * Prisma-free on purpose (the gate is a plain `where` object) so this can be
 * imported anywhere without pulling a client in.
 */

/**
 * The public gate: active AND priced.
 *
 * `pricePerNight` of 0 means "not yet configured" — publishing it would put a ₱0
 * rate on a page, and such a listing's /book URL redirects straight back to the
 * property page anyway (src/app/properties/[slug]/book/page.tsx).
 *
 * The same predicate is currently inlined in three older surfaces — the homepage
 * grid (src/components/sections/Properties.tsx), the sitemap
 * (src/app/sitemap.ts) and the feed (src/app/api/properties.json/route.ts).
 * They are byte-identical to this; anything new should import from here instead
 * of adding a fifth copy, and those three can adopt it whenever they're next
 * touched.
 */
export const PUBLIC_LISTING_GATE = { isActive: true, pricePerNight: { gt: 0 } } as const;

/** Newest first — the order every public surface lists properties in. */
export const PUBLIC_LISTING_ORDER = { createdAt: "desc" } as const;

/**
 * Display names for prose contexts (a sentence, a table cell, a bulleted list).
 *
 * `Property.name` carries an SEO suffix after a pipe — "Cozy 1BR Haven | Solar
 * Power•Netflix•Wi-Fi•5 Pax" — which reads badly mid-sentence. The first segment
 * is the human name, except where several listings share one: the three Mickey
 * configurations are all "Mickey in Lipa" and need their second segment
 * ("Full Family House") to stay distinguishable.
 *
 * Derived rather than hardcoded so renaming a listing in admin can't leave a
 * stale label behind on a page that never learns about the change.
 */
export function buildShortNames(props: { slug: string; name: string }[]): Map<string, string> {
  const segmentsOf = (name: string) => name.split("|").map((s) => s.trim()).filter(Boolean);

  const firstSegmentCounts = new Map<string, number>();
  for (const p of props) {
    const base = segmentsOf(p.name)[0] ?? p.name;
    firstSegmentCounts.set(base, (firstSegmentCounts.get(base) ?? 0) + 1);
  }

  return new Map(
    props.map((p) => {
      const segments = segmentsOf(p.name);
      const base = segments[0] ?? p.name;
      const ambiguous = (firstSegmentCounts.get(base) ?? 0) > 1 && segments[1];
      return [p.slug, ambiguous ? `${base} — ${segments[1]}` : base];
    }),
  );
}

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

/** "five" for 5, falling back to digits past ten. */
export const numberWord = (n: number) => NUMBER_WORDS[n] ?? String(n);

/** `plural(1, "bedroom")` → "bedroom"; `plural(2, "bedroom")` → "bedrooms". */
export const plural = (n: number, word: string) => (n === 1 ? word : `${word}s`);
