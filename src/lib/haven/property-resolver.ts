import { buildShortNames } from "@/lib/listings";
import { isEnglishContext, replaceMatchingSentences, shortPropertyLabels, stripToBaseName } from "./post-process";
import type { HavenLang } from "./system-prompt";

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

export interface ResolvableListing {
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
    "pinakamalaking",
    "malaki",
    "malaking",
    "biggest",
    "largest",
    "big",
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

// ── Server-side pre-resolution (DEC-029 live-retest fix, 2026-10-15) ───────────
//
// `resolveSlugFallback` in tools.ts only ever runs AFTER a tool call already missed — so
// it never helps on a turn where the model answers free-text without calling a tool at
// all (the live bug: Haiku replied "hindi ko alam ang property na 'yan" / asked for the
// exact name instead of using the guest's own wording). The functions below run on the
// guest's latest message BEFORE the model is ever called (same pattern as
// chat-service.ts's `dateContextNote` and owner-facts.ts's `buildCapacityContextNote`),
// so an identity (or a clarifying question) is already available on turn one.

export interface PropertyMentionOption {
  slug: string;
  label: string;
  maxGuests: number;
}

export type PropertyMentionResolution =
  | { status: "none" }
  | { status: "unique"; slug: string; label: string }
  | { status: "ambiguous"; options: PropertyMentionOption[] };

/**
 * Resolves the guest's latest message against the public listings, the same way
 * `resolveSlugFallback` resolves a model-supplied slug — but pure and listing-set aware,
 * so `label` is always the properly disambiguated short name (e.g. "Mickey in Lipa — Full
 * Family House"), not just whatever a single tool result happened to carry this turn.
 */
export function resolveGuestPropertyMention(
  guestMessage: string,
  listings: ResolvableListing[]
): PropertyMentionResolution {
  const resolved = resolvePropertyMatch(guestMessage, listings);
  if (resolved.status === "none") return { status: "none" };

  const shortNames = shortPropertyLabels(listings.map((l) => ({ slug: l.slug, name: l.name })));

  if (resolved.status === "ambiguous") {
    const options = resolved.candidates.map((c) => {
      const listing = listings.find((l) => l.slug === c.slug);
      return {
        slug: c.slug,
        label: shortNames.get(c.slug) ?? stripToBaseName(c.name),
        maxGuests: listing?.maxGuests ?? 0,
      };
    });
    return { status: "ambiguous", options };
  }

  return {
    status: "unique",
    slug: resolved.slug,
    label: shortNames.get(resolved.slug) ?? stripToBaseName(resolved.name),
  };
}

export interface PropertyContextDates {
  checkIn?: string;
  checkOut?: string;
  guests?: number | null;
}

/**
 * Server-resolved context note for the model, appended to the system prompt (same pattern
 * as `dateContextNote`/`buildCapacityContextNote`). A unique match tells the model which
 * slug to use and forbids asking for the name again; an ambiguous match hands it the exact
 * short-named candidate list to turn into a clarifying question, never a claim the
 * property is unknown. When the dates and guest count are ALSO already known this turn, a
 * unique match additionally tells the model to call `get_quote` immediately rather than
 * asking the guest to repeat information it already gave.
 */
export function buildPropertyContextNote(
  resolution: PropertyMentionResolution,
  dates: PropertyContextDates = {}
): string {
  if (resolution.status === "none") return "";

  if (resolution.status === "ambiguous") {
    const list = resolution.options.map((o) => `${o.label} (sleeps up to ${o.maxGuests})`).join("; ");
    return (
      "\n\nContext (already detected by the system, not a guest claim): the guest's latest " +
      `message could mean more than one property: ${list}. Ask the guest which one they mean, ` +
      "in their active language, naming these options — never say the property is unknown, " +
      "not in our system, or that you don't recognize it."
    );
  }

  let note =
    "\n\nContext (already resolved by the system, not a guest claim): the guest's latest " +
    `message refers to "${resolution.label}" (slug ${resolution.slug}). Use this exact slug ` +
    "for any tool call about this property this turn, and do not ask the guest to name or " +
    "confirm the property.";

  if (dates.checkIn && dates.checkOut && typeof dates.guests === "number" && dates.guests > 0) {
    note +=
      ` The guest's dates (checkIn=${dates.checkIn}, checkOut=${dates.checkOut}) and guest ` +
      `count (${dates.guests}) are also already known this turn — call get_quote now with ` +
      `slug=${resolution.slug}, checkIn=${dates.checkIn}, checkOut=${dates.checkOut}, ` +
      `guests=${dates.guests} instead of asking again.`;
  }
  return note;
}

/**
 * Backstop for the same guardrail: independent of whatever the system prompt instructs,
 * drop any sentence/bullet line claiming the property is unknown or not in the system
 * whenever the server itself already found a match or an ambiguity list — replacing it
 * with a clarifying "did you mean ...?" question instead of leaving a contradictory claim
 * in the reply (the model resolved nothing, so it must never SAY it found nothing).
 */
const UNKNOWN_PROPERTY_CLAIM_RE =
  /hindi ko alam ang property|hindi ko alam (?:ang|yung) (?:bahay|unit)|not in our system|isn['’]?t in our (?:system|listings)|don['’]?t recognize (?:that|this) propert(?:y|ies)|isn['’]?t coming up|not coming up/i;

function joinOptionLabels(labels: string[], english: boolean): string {
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0];
  const head = labels.slice(0, -1).join(", ");
  const last = labels[labels.length - 1];
  return english ? `${head}, or ${last}` : `${head}, o ${last}`;
}

function unknownPropertyReplacement(
  resolution: PropertyMentionResolution,
  lang: HavenLang,
  guestMessages: string
): string {
  const english = isEnglishContext(lang, guestMessages);
  if (resolution.status === "ambiguous") {
    const list = joinOptionLabels(resolution.options.map((o) => o.label), english);
    return english ? `Did you mean ${list}?` : `Alin po sa ${list} ang sinasabi n'yo?`;
  }
  if (resolution.status === "unique") {
    return english ? `Did you mean ${resolution.label}?` : `Ang ${resolution.label} po ba ang sinasabi n'yo?`;
  }
  return "";
}

export function dropUnknownPropertyClaims(
  text: string,
  resolution: PropertyMentionResolution,
  lang: HavenLang,
  guestMessages: string
): string {
  if (resolution.status === "none") return text;
  const replacement = unknownPropertyReplacement(resolution, lang, guestMessages);
  if (!replacement) return text;
  return replaceMatchingSentences(text, UNKNOWN_PROPERTY_CLAIM_RE, replacement);
}
