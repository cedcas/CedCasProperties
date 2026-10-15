import { buildShortNames } from "@/lib/listings";
import { stripToBaseName } from "./post-process";

/**
 * Fuzzy property-name resolution for every Haven tool that takes a `slug` (DEC-029 —
 * this only ever maps a guest's wording to an EXISTING public listing's slug; it never
 * invents, prices, or decides availability for one). Fixes the live bug where a guest's
 * informal phrasing ("the Mickey Full Family House") didn't match the exact DB slug and
 * Haven wrongly said the property "isn't in our system" — this is the fallback `tools.ts`
 * calls only after an exact-slug lookup already missed.
 */

export interface PropertyCandidate {
  slug: string;
  name: string;
}

export type ResolveResult =
  | { status: "unique"; slug: string; name: string }
  | { status: "ambiguous"; candidates: PropertyCandidate[] }
  | { status: "none" };

interface ResolvableListing {
  slug: string;
  name: string;
  maxGuests: number;
}

/**
 * Words that carry no identifying signal in a property-name query, in English and
 * Tagalog — stripped from both the guest's query and every listing's own name/slug/alias
 * tokens before scoring, so e.g. "the 1BR" and "yung malaking bahay" aren't penalized for
 * carrying filler words no listing's name would ever match on.
 */
const STOP_WORDS = new Set(["house", "bahay", "yung", "sa", "ang", "the"]);

/** Bonus added when the query names an exact guest count that equals a listing's maxGuests
 * ("mickey 15" should prefer the 15-pax configuration over its 7/11-pax siblings even though
 * all three otherwise share the same "mickey" token). */
const CAPACITY_BONUS = 2;

/**
 * Owner-confirmed aliases for informal names guests actually use (Cedric, 2026-10-14) — the
 * same "published fact, not derived from a DB column" pattern as owner-facts.ts, since block
 * numbers and nicknames like "pinakamalaki" live in guest conversation and FAQ copy
 * (src/lib/faqs.ts), not in any Property field. Keyed by slug; update here if a listing's
 * slug ever changes.
 */
const PROPERTY_ALIASES: Record<string, string[]> = {
  "cozy-1-bedroom": ["b34", "cozy 1br", "1 bedroom", "studio"],
  "spacious-2-bedroom": ["b34", "spacious 2br", "2 bedroom", "2br"],
  "mickey-in-lipa--family-staycation--sleeps-7": ["b38", "mickey", "family staycation", "sleeps 7"],
  "mickey-in-lipa--family-house--sleeps-11": ["b38", "mickey", "family house", "sleeps 11"],
  "mickey-in-lipa--full-family-house--sleeps-15": [
    "b38",
    "mickey",
    "full family house",
    "sleeps 15",
    "15 pax",
    "pinakamalaki",
    "malaki",
    "malaking",
  ],
};

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Lowercase, accent-stripped, punctuation-free tokens with stop words removed. */
function tokenize(raw: string): string[] {
  return stripAccents(raw)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((t) => t.length > 0 && !STOP_WORDS.has(t));
}

function buildMatchTokens(listing: ResolvableListing): Set<string> {
  const tokens = new Set<string>();
  for (const t of tokenize(stripToBaseName(listing.name))) tokens.add(t);
  for (const t of listing.slug.split("-")) if (t) tokens.add(t.toLowerCase());
  for (const alias of PROPERTY_ALIASES[listing.slug] ?? []) {
    for (const t of tokenize(alias)) tokens.add(t);
  }
  return tokens;
}

function scoreListing(queryTokens: string[], listing: ResolvableListing): number {
  const matchTokens = buildMatchTokens(listing);
  let score = 0;
  for (const t of queryTokens) if (matchTokens.has(t)) score++;
  if (queryTokens.some((t) => /^\d+$/.test(t) && Number(t) === listing.maxGuests)) score += CAPACITY_BONUS;
  return score;
}

/**
 * Resolves a guest's (or the model's) property reference against the public listings.
 * An exact slug match always wins outright. Otherwise, every listing is scored by token
 * overlap (name/slug/alias) plus a capacity-number bonus; the highest-scoring listing(s)
 * win. Two or more tied at the top score come back `ambiguous` so the caller can ask a
 * short clarifying question naming them — this never guesses between, say, the three
 * "Mickey" configurations. Pure and DB-free so it's testable without Prisma; `tools.ts`
 * supplies the listings from `getPublicListings()`.
 */
export function resolvePropertyMatch(query: string, listings: ResolvableListing[]): ResolveResult {
  const trimmed = query.trim();
  const exact = listings.find((l) => l.slug === trimmed);
  if (exact) return { status: "unique", slug: exact.slug, name: exact.name };

  const queryTokens = tokenize(trimmed);
  if (queryTokens.length === 0) return { status: "none" };

  const scored = listings
    .map((listing) => ({ listing, score: scoreListing(queryTokens, listing) }))
    .filter(({ score }) => score > 0);
  if (scored.length === 0) return { status: "none" };

  const topScore = Math.max(...scored.map((s) => s.score));
  const top = scored.filter((s) => s.score === topScore);
  if (top.length === 1) return { status: "unique", slug: top[0].listing.slug, name: top[0].listing.name };

  const shortNames = buildShortNames(top.map(({ listing }) => ({ slug: listing.slug, name: listing.name })));
  return {
    status: "ambiguous",
    candidates: top.map(({ listing }) => ({ slug: listing.slug, name: shortNames.get(listing.slug) ?? listing.name })),
  };
}
