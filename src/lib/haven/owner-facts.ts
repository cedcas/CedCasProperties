import "server-only";
import { HOURLY_FEE_RATE } from "@/lib/hourly-fee";
import { MESSENGER_HREF, type LinkButton, type ToolExchange, replaceMatchingSentences, isEnglishContext } from "./post-process";
import type { HavenLang } from "./system-prompt";

/**
 * Owner-approved guardrails and facts, confirmed by Cedric (the Owner) on 2026-10-14.
 * Single server-side source of truth, injected into the system prompt
 * (`buildOwnerFactsPrompt`) AND enforced independently in post-processing below — the
 * same tool-only-facts philosophy as DEC-029: a prompt instruction alone is guidance,
 * not an enforcement boundary.
 */

export const OWNER_FACTS_SOURCE = "Owner-confirmed facts (Cedric, 2026-10-14)";

/** The largest group HIL can ever host in one combined booking, both houses together. */
export const MAX_TOTAL_CAPACITY = 24;

/**
 * Amounts the price guard (`post-process.ts`'s `enforcePriceClaims`) allows even when no
 * tool call happened to return them this turn — figures the Owner has confirmed are fixed,
 * published facts rather than something that could vary per property or stay.
 */
export const OWNER_FACT_ALLOWED_AMOUNTS: Set<number> = new Set([HOURLY_FEE_RATE]);

export function buildOwnerFactsPrompt(): string {
  return [
    `Owner-approved facts (${OWNER_FACTS_SOURCE}) — state these directly, they are not tool-only numbers:`,
    "- Never ask a guest about their budget, or how much they're willing/planning to spend. If the guest hasn't given a group size or dates, ask for those instead.",
    `- Capacity: the largest bookable combination, across both houses on the same dates, is ${MAX_TOTAL_CAPACITY} guests, and that count includes adults. For a group of ${MAX_TOTAL_CAPACITY} or more, or any question about squeezing in extra people, extra beds/mattresses beyond a listing's stated capacity, or whether kids/babies count toward the cap, do NOT promise flexibility — say the team will confirm directly and point to Messenger (${MESSENGER_HREF}).`,
    "- There is no documented age policy for babies or kids — never claim they don't count toward capacity or stay free. Say the team will confirm via Messenger instead.",
    "- Payment: full payment is due at the time of booking. There is no half payment and no down payment/deposit to reserve dates — the guest's full total is charged/paid up front via GCash, BPI InstaPay, or card, per the site's own payment methods.",
    `- Early check-in / late checkout: ₱${HOURLY_FEE_RATE} per hour, the same rate for every listing, always subject to availability and confirmation with the team (never a guaranteed yes). Use the property's own standard check-in/check-out time when you have it from a tool result.`,
    "- Quiet hours are 10:00 PM to 8:00 AM at every listing — the same house rule everywhere, so answer it directly without asking which house. Other rules that are the same everywhere: no pets, no smoking inside, no parties/events without host approval. When a rule genuinely differs by house (e.g. check-in time), say so and name the difference instead of asking which house first.",
    "- Karaoke/videoke/pool/grill and other specific equipment: call find_amenity with the item — it searches every property's amenities/amenityDetails for you, so never ask the guest which house first. Marketing phrases like \"a karaoke-and-lechon dinner\" describe an experience, not confirmed equipment — never infer equipment from that kind of copy, even when find_amenity comes up empty. If find_amenity finds it, say which propert(y/ies) have it. If it finds nothing anywhere, say it's not listed in our amenities and the team will confirm via Messenger, and remind the guest quiet hours still apply.",
    `- (Cedric, 2026-10-15; amended same day) Our Welcome Book's restaurants and things-to-do lists apply to EVERY public listing, including the Mickey in Lipa (B38) houses — use \`get_property_details\`'s \`welcomeBook\` field or call \`get_local_guide\` for ANY property, and say these are "from our Welcome Book". Combine them with that property's own \`neighborhoodPlaces\` tool data when present, and never look up or invent a named restaurant/place online or from general knowledge for ANY property. The Welcome Book's HOUSE RULES, HOW-TOs, and CHECK-OUT STEPS stay scoped ONLY to the two B34 listings (\`cozy-1-bedroom\`, \`spacious-2-bedroom\`) — NEVER generalize those three to a Mickey in Lipa (B38) listing or any other property; for a B38 listing, point the guest to the printed "Welcome Book" inside that house for those. Fixed facts you may state directly for any property: there's an Alfamart right outside the subdivision, plus minimarts around the property. For anything the Welcome Book doesn't cover, offer the Messenger handoff (${MESSENGER_HREF}).`,
    `- (Cedric, 2026-10-15) Never ask or say anything that reads as questioning whether the guest can afford a stay — banned phrasing includes "Kaya mo na ba?", "Kaya n'yo ba?", "Can you afford it?", "within your budget", and "kaya ba ng budget". After stating a quote, close with a booking nudge instead: "Want me to help you book it?" (Tagalog: "Gusto n'yo na bang i-book?"; Batangueño: "Gusto n'yo na ga i-book?").`,
    `- (Cedric, 2026-10-15) Never share a Wi-Fi name/password, or any door/gate/lock/keybox code or other access detail, under any circumstance. For a Wi-Fi question, say the details are posted inside the property. For an access/code question, say the team sends check-in instructions closer to the stay, and point to Messenger (${MESSENGER_HREF}).`,
  ].join("\n");
}

// ── Banned "can you afford it" phrasing → booking nudge guard ───────────────

/**
 * Banned closing phrasing (Cedric, 2026-10-15): never a question or statement that reads
 * as "can you afford it" — "Kaya mo na ba?", "Kaya n'yo ba?", "Can you afford it?", "within
 * your budget", "kaya ba ng budget" and reorderings of the same Tagalog idiom. Run BEFORE
 * `stripBudgetQuestions` in the post-process pipeline (chat-service.ts) — "within your
 * budget"/"kaya ba ng budget" would otherwise also match `BUDGET_QUESTION_RE` below and get
 * dropped silently instead of replaced with the booking nudge.
 */
const BANNED_AFFORD_RE =
  /\bafford\b|\bwithin\s+your\s+budget\b|\bkaya\s+(?:mo|n['’]?yo|ninyo|niyo)\s+(?:na\s+)?ba\b|\bkaya\s+ba\s+(?:mo|n['’]?yo|ninyo|niyo|ng\s+budget)\b/i;

type SafeLangKey = "en" | "tl" | "btg";

const BOOKING_NUDGE: Record<SafeLangKey, string> = {
  en: "Want me to help you book it?",
  tl: "Gusto n'yo na bang i-book?",
  btg: "Gusto n'yo na ga i-book?",
};

/** Mirrors `buildLargeGroupHandoffReply`'s language selection — `btg` is always explicit;
 * everything else follows `isEnglishContext` for `"auto"`. */
function pickBookingNudge(lang: HavenLang, guestMessages: string): string {
  if (lang === "btg") return BOOKING_NUDGE.btg;
  return isEnglishContext(lang, guestMessages) ? BOOKING_NUDGE.en : BOOKING_NUDGE.tl;
}

/**
 * Replaces any sentence/bullet line reading as "can you afford it" (or the banned Tagalog/
 * Batangueño "kaya ...ba" idiom, or "within your budget") with a booking nudge in the
 * active language, instead of leaving it in or silently dropping it.
 */
export function replaceBannedAffordPhrasing(text: string, lang: HavenLang, guestMessages: string): string {
  return replaceMatchingSentences(text, BANNED_AFFORD_RE, pickBookingNudge(lang, guestMessages));
}

// ── Budget question guard ───────────────────────────────────────────────────

const BUDGET_QUESTION_RE = /budget|magkano.*budget|how much.*(?:willing|planning) to spend/i;

/** Drops any sentence/bullet line in which Haven asks the guest about their budget. */
export function stripBudgetQuestions(text: string): string {
  return tidyAfterDrop(replaceMatchingSentences(text, BUDGET_QUESTION_RE, ""));
}

// ── Kids/babies "don't count" / "free" claim guard ──────────────────────────

const KIDS_WORDS = `(?:kids?|babies|baby|infants?|bata|sanggol)`;
const FREE_OR_UNCOUNTED = `(?:don'?t count|doesn'?t count|not counted|hindi kasama sa bilang|free of charge|for free|walang bayad)`;
const KIDS_FREE_CLAIM_RE = new RegExp(
  `\\b${KIDS_WORDS}\\b[\\s\\S]{0,60}${FREE_OR_UNCOUNTED}|${FREE_OR_UNCOUNTED}[\\s\\S]{0,60}\\b${KIDS_WORDS}\\b`,
  "i"
);

const MESSENGER_CONFIRM_SENTENCE: Record<HavenLang, string> = {
  en: `We don't have a documented age policy for that — our team will confirm directly, message us at ${MESSENGER_HREF}.`,
  tl: `Walang itinakdang patakaran kami para diyan — kukumpirmahin namin agad, i-message n'yo kami sa ${MESSENGER_HREF}.`,
  btg: `Ala eh, walang itinakdang patakaran kami para diyan — kukumpirmahin namin agad, i-message n'yo kami sa ${MESSENGER_HREF}.`,
  auto: `We don't have a documented age policy for that — our team will confirm directly, message us at ${MESSENGER_HREF}.`,
};

/**
 * Replaces any sentence claiming kids/babies don't count toward capacity, or stay free,
 * with the Messenger confirmation sentence — there is no documented age policy to back
 * either claim (see `buildOwnerFactsPrompt`).
 */
export function removeKidsFreeClaims(text: string, lang: HavenLang): string {
  return replaceMatchingSentences(text, KIDS_FREE_CLAIM_RE, MESSENGER_CONFIRM_SENTENCE[lang]);
}

/** Tidies the whitespace a dropped sentence/bullet line leaves behind. */
function tidyAfterDrop(text: string): string {
  return text
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+([.,!?;:])/g, "$1")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n")
    .trim();
}

// ── Capacity/kids-count Messenger-handoff trigger ───────────────────────────

const KIDS_CAPACITY_CONTEXT_RE = new RegExp(
  `\\b${KIDS_WORDS}\\b[\\s\\S]{0,60}\\b(?:capacity|count|counted|guest|guests|bilang|tao)\\b|` +
    `\\b(?:capacity|count|counted|guest|guests|bilang|tao)\\b[\\s\\S]{0,60}\\b${KIDS_WORDS}\\b`,
  "i"
);

const SQUEEZE_RE = /\bsqueeze\b|\bextra\s+(?:bed|mattress|person|people)\b|\bdagdag\s+(?:tao|kama|higaan)\b/i;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

/**
 * True when the guest's own message claims a group at or over the combined-houses cap —
 * shared by `needsCapacityHandoff` below and the deterministic large-group script in
 * `chat-service.ts` (skip the model entirely rather than let it ask clarifying questions).
 */
export function isLargeGroupMessage(guestMessage: string): boolean {
  const parsedCount = parseGuestCount(guestMessage);
  return parsedCount !== null && parsedCount >= MAX_TOTAL_CAPACITY;
}

/** True when a `find_stay`/`get_quote` call this turn was made for 24+ guests — the case
 * where the guest's own wording didn't parse as a count, but the model's tool call did. */
export function isLargeGroupToolCall(exchanges: ToolExchange[]): boolean {
  return exchanges.some(({ name, input }) => {
    if (name !== "find_stay" && name !== "get_quote") return false;
    const guests = asRecord(input).guests;
    return typeof guests === "number" && guests >= MAX_TOTAL_CAPACITY;
  });
}

/**
 * True when this turn should force the Messenger handoff link for a capacity reason:
 * a 24+ guest group (message or tool call), or the guest's own message asking about
 * kids/babies counting toward capacity, or squeezing in extra people/beds. See
 * `buildOwnerFactsPrompt` — Haven must never promise flexibility in either case.
 */
export function needsCapacityHandoff(guestMessage: string, exchanges: ToolExchange[]): boolean {
  if (isLargeGroupToolCall(exchanges) || isLargeGroupMessage(guestMessage)) return true;
  return KIDS_CAPACITY_CONTEXT_RE.test(guestMessage) || SQUEEZE_RE.test(guestMessage);
}

// ── 24+ guest deterministic handoff script ──────────────────────────────────

/**
 * Fixed, warm reply for a 24+ guest group — deliberately NOT generated by the model.
 * Live testing showed the model's own wording for this case drifted (clarifying
 * questions, "exactly max"/"might fit" hedging) even with the Messenger link forced on;
 * `chat-service.ts` returns this verbatim and skips the model call entirely whenever
 * `isLargeGroupMessage`/`isLargeGroupToolCall` fires, so the wording is always exactly
 * this, in every language (Cedric, 2026-10-14).
 */
const LARGE_GROUP_HANDOFF_REPLY = {
  en: "What a big group! For 24 or more guests, our team will plan it with you personally — tap below to message us on Messenger.",
  tl: "Ang saya, ang dami ninyo! Para sa 24 o higit pang bisita, ang team namin mismo ang tutulong sa inyo — i-tap lang sa ibaba para mag-message sa Messenger.",
  btg: "Aba'y ang dami ninyo, ala eh ang saya! Para sa 24 o higit pa, ang team namin mismo ang aasikaso sa inyo — pindutin lang sa ibaba para mag-message sa Messenger.",
} as const;

/**
 * `lang: "btg"` always gets the Batangueño script; everything else falls back to the same
 * English-vs-Tagalog detection `isEnglishContext` already uses for `"auto"` (explicit `en`
 * is English by definition, explicit `tl` is never English, `"auto"` mirrors the guest's
 * own words) — there's no reliable way to detect Batangueño from the guest's own text, so
 * `"auto"` never produces the `btg` script, only an explicit toggle does.
 */
export function buildLargeGroupHandoffReply(lang: HavenLang, guestMessages: string): string {
  if (lang === "btg") return LARGE_GROUP_HANDOFF_REPLY.btg;
  return isEnglishContext(lang, guestMessages) ? LARGE_GROUP_HANDOFF_REPLY.en : LARGE_GROUP_HANDOFF_REPLY.tl;
}

/** Forces the Messenger handoff button on when `shouldForce`, without duplicating it. */
export function ensureCapacityHandoffLink(links: LinkButton[], shouldForce: boolean): LinkButton[] {
  if (!shouldForce) return links;
  if (links.some((l) => l.href === MESSENGER_HREF)) return links;
  return [...links, { label: "Message us on Messenger", href: MESSENGER_HREF }];
}

// ── Guest-count parser ──────────────────────────────────────────────────────

/**
 * Nouns that mean "people" in English/Tagalog, used to recognize a guest-count phrase
 * without being confused by an unrelated number (a date, a price, a night count). A bare
 * number is NEVER treated as a guest count — it must sit next to one of these words.
 */
const PEOPLE_NOUN = String.raw`(?:adults?|guests?|pax|persons?|people|bisita|matatanda|kids?|children|bata|tao|katao)`;

const NUMBER_PEOPLE_RE = new RegExp(String.raw`(\d{1,3})\s*(?:na\s+)?${PEOPLE_NOUN}\b`, "gi");

/** "Kami ay 24" ("we are 24") — a common Tagalog group-count idiom with no trailing noun. */
const KAMI_AY_RE = /\bkami\s+ay\s+(\d{1,3})\b/i;

/** "4 kami" ("we're 4") — the same idiom with the number leading instead of after "ay",
 * e.g. "Nobyembre 19 hanggang 21, 4 kami" (Owner fixture, 2026-10-16). */
const NUMBER_KAMI_RE = /\b(\d{1,3})\s*(?:na\s+)?kami\b/i;

/**
 * Parses a guest-count claim out of a free-text message, in English or Tagalog —
 * "24 people/pax/guests/adults", "kami ay 24", "4 kami", "24 na tao", "24 katao", or a
 * split group like "8 adults + 4 kids" (summed). A bare number next to a date, time, or
 * price (no people-noun adjacent) is never picked up. Returns `null` when no guest count
 * is found.
 */
export function parseGuestCount(message: string): number | null {
  const text = message.toLowerCase();

  const matches = [...text.matchAll(NUMBER_PEOPLE_RE)];
  if (matches.length > 0) {
    const sum = matches.reduce((total, m) => total + parseInt(m[1], 10), 0);
    return sum > 0 ? sum : null;
  }

  const kamiAy = text.match(KAMI_AY_RE);
  if (kamiAy) {
    const n = parseInt(kamiAy[1], 10);
    return n > 0 ? n : null;
  }

  const numberKami = text.match(NUMBER_KAMI_RE);
  if (numberKami) {
    const n = parseInt(numberKami[1], 10);
    return n > 0 ? n : null;
  }

  return null;
}

/**
 * Server-resolved context note for the model (same pattern as chat-service.ts's
 * `dateContextNote`): when the guest's latest message itself claims a group of
 * `MAX_TOTAL_CAPACITY` or more, tell the model directly — don't wait for it to call
 * `find_stay`/`get_quote` with that guest count first (live testing showed it sometimes
 * asks a clarifying question like "how many nights?" instead of recognizing the group
 * is over capacity). `needsCapacityHandoff` above is the independent enforcement that
 * forces the Messenger button on regardless of whether the model follows this note.
 */
export function buildCapacityContextNote(guestMessage: string): string {
  const count = parseGuestCount(guestMessage);
  if (count === null || count < MAX_TOTAL_CAPACITY) return "";
  return (
    "\n\nContext (already detected here, not a guest claim to verify): the guest's " +
    `most recent message indicates a group of ${count}. The largest bookable combination, ` +
    `across both houses on the same dates, is ${MAX_TOTAL_CAPACITY} adults. Do not ask how many ` +
    "nights or for more details before handing off, and do not promise flexibility or guess " +
    `whether the group fits — tell the guest directly that the team will confirm via Messenger ` +
    `(${MESSENGER_HREF}).`
  );
}
