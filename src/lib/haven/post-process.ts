import "server-only";
import { formatStayRangeShort, toUtcMidnight, addUtcDays } from "@/lib/dates";
import { buildShortNames } from "@/lib/listings";
import { HOURLY_FEE_RATE } from "@/lib/hourly-fee";
import type { HavenLang } from "./system-prompt";
import type { StayLabel } from "./dates";

/**
 * Guardrails applied to the model's text AFTER it's generated, on every turn — the model's
 * own instructions (system-prompt.ts) are not trusted alone. Independent checks:
 *   1. Link allowlist — only relative site paths, haveninlipa.com, or m.me/haveninlipa survive.
 *   2. Price post-check — any ₱/PHP amount not traceable to a tool result this turn causes the
 *      WHOLE sentence/bullet line containing it to be replaced, never just the number.
 *   3. Booking-link collection — a link button for every booking link a tool actually produced
 *      this turn, regardless of whether the model wrote it into its prose.
 *   4. Handoff safety net — if the reply mentions the Messenger handoff but the model didn't
 *      format it as a link, a button is added anyway (off-topic/unknown questions must always
 *      surface a way to reach a human).
 *   5. "Provisional" dedupe — the word may appear at most once per reply (see system-prompt.ts).
 */

export interface LinkButton {
  label: string;
  href: string;
}

const MARKDOWN_LINK = /\[([^\]]+)\]\(([^)]+)\)/g;

export const MESSENGER_HREF = "https://m.me/haveninlipa";
const MESSENGER_HREF_RE = /^m\.me\/haveninlipa\/?$/i;

export function isAllowedHref(href: string): boolean {
  const trimmed = href.trim();
  if (trimmed.startsWith("/")) return true;
  if (trimmed === "m.me/haveninlipa" || trimmed === MESSENGER_HREF) return true;
  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    return url.hostname === "haveninlipa.com" || url.hostname === "www.haveninlipa.com";
  } catch {
    return false;
  }
}

/** A scheme-less "m.me/haveninlipa" renders as a broken relative link in the widget — always emit the https form. */
export function normalizeHref(href: string): string {
  const trimmed = href.trim();
  return MESSENGER_HREF_RE.test(trimmed) ? MESSENGER_HREF : trimmed;
}

/** Strips disallowed links down to their label text; allowed ones are returned as buttons. */
export function extractAllowedLinks(text: string): { reply: string; links: LinkButton[] } {
  const links: LinkButton[] = [];
  const reply = text.replace(MARKDOWN_LINK, (_match, label: string, href: string) => {
    if (isAllowedHref(href)) links.push({ label, href: normalizeHref(href) });
    return label;
  });
  return { reply, links };
}

/** De-duplicate link buttons by href, keeping the first occurrence's label. */
export function dedupeLinks(links: LinkButton[]): LinkButton[] {
  const seen = new Set<string>();
  const out: LinkButton[] = [];
  for (const link of links) {
    if (seen.has(link.href)) continue;
    seen.add(link.href);
    out.push(link);
  }
  return out;
}

/** Every numeric value in this turn's tool results, as plain numbers (peso amounts live among them). */
export function collectToolAmounts(toolResults: unknown[]): Set<number> {
  const amounts = new Set<number>();
  const round2 = (n: number) => Math.round(n * 100) / 100;
  function walk(value: unknown): void {
    if (typeof value === "number" && Number.isFinite(value)) amounts.add(round2(value));
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object") Object.values(value as Record<string, unknown>).forEach(walk);
  }
  toolResults.forEach(walk);
  return amounts;
}

/**
 * Every `pricePerNight` value in this turn's tool results — the base/listing nightly rate
 * (list_properties, a property rundown), as distinct from a dated get_quote/find_stay
 * total (see `collectDatedQuoteAmounts`). Used by `ensureFromPrefix` below (Owner guardrail,
 * Cedric 2026-10-15): a base rate can change, so it must always read "from ₱X/night", never
 * a bare number.
 */
export function collectBasePrices(toolResults: unknown[]): Set<number> {
  const amounts = new Set<number>();
  const round2 = (n: number) => Math.round(n * 100) / 100;
  function walk(value: unknown): void {
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (value && typeof value === "object") {
      for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
        if (key === "pricePerNight" && typeof v === "number" && Number.isFinite(v)) amounts.add(round2(v));
        else walk(v);
      }
    }
  }
  toolResults.forEach(walk);
  return amounts;
}

/**
 * Every numeric value in this turn's tool results that is NOT under a `pricePerNight` key
 * — a dated quote's `total`/`nightlyTotal`/`perNight` rate, an `extraGuestFee`, etc. Lets
 * `ensureFromPrefix` tell apart a bare base rate from an exact dated-quote figure that
 * happens to equal it (e.g. a single night at the base rate with no extra fees) — the
 * latter must stay exactly as the tool returned it, with no "from"/"simula" prefix.
 */
export function collectDatedQuoteAmounts(toolResults: unknown[]): Set<number> {
  const amounts = new Set<number>();
  const round2 = (n: number) => Math.round(n * 100) / 100;
  function walk(value: unknown): void {
    if (typeof value === "number" && Number.isFinite(value)) {
      amounts.add(round2(value));
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (value && typeof value === "object") {
      for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
        if (key === "pricePerNight") continue;
        walk(v);
      }
    }
  }
  toolResults.forEach(walk);
  return amounts;
}

// ── Price guard: whole-sentence / whole-bullet-line replacement ────────────────

/**
 * Recognizes ₱/PHP-prefixed amounts, plus the other formats guests and the owner-fact
 * prompt sometimes use for the SAME number — a bare "P" prefix right before a digit
 * (never mid-word, via the negative lookbehind, so "Top200" doesn't match) and a
 * "<number> pesos" suffix with no symbol at all (e.g. "P200", "200 pesos").
 */
const PESO_PREFIX = String.raw`(?:₱|PHP\s?|(?<![A-Za-z])P(?=\d))`;
const PESO_AMOUNT_SOURCE = String.raw`${PESO_PREFIX}\s?\d[\d,]*(?:\.\d{1,2})?|\d[\d,]*(?:\.\d{1,2})?\s*pesos?\b`;
/** Fresh global regex per use — avoids `lastIndex` state bugs from a shared `/g` instance. */
function pesoAmountRegex(): RegExp {
  return new RegExp(PESO_AMOUNT_SOURCE, "gi");
}

/**
 * The model showing its own multiplication/sum ("₱2,800 × 2 = ₱5,600") is never allowed,
 * even on the rare chance the resulting number happens to be right — Haven may only ever
 * relay a total `get_quote`/`find_stay` returned, never arithmetic it performed itself
 * (see system-prompt.ts and the DEC-029 "a Thu→Sat total read as nights × one rate" bug).
 * No `g` flag, so this is safe to keep as a shared module-level instance.
 */
const PRICE_ARITHMETIC_RE = new RegExp(`(?:${PESO_AMOUNT_SOURCE})\\s*[x×*]\\s*\\d+`, "i");

export const FALLBACK_TOTAL_TEXT = "You'll see the exact total at checkout.";
export const FALLBACK_FEE_TEXT = `For that fee, please ask us via Messenger (${MESSENGER_HREF}).`;
/**
 * Unlike `FALLBACK_FEE_TEXT`, this fee is a published owner fact Haven always knows the
 * answer to (see owner-facts.ts) — a hallucinated number for an early check-in/late
 * checkout question should fall back to restating the real rate, never to "ask us via
 * Messenger", which wrongly implies Haven doesn't know.
 */
export const FALLBACK_HOURLY_FEE_TEXT = `Early check-in and late checkout are ₱${HOURLY_FEE_RATE}/hour, subject to availability and confirmation with the team.`;

/** Rate/fee language (vs. a stay total) — decides which fallback sentence fits. */
const FEE_CONTEXT = /\/\s*(?:hour|hr|night|day|guest)\b|\bper\s+(?:hour|hr|night|day|guest)\b|\bfee\b|\bcharges?\b|\bcharged\b/i;
/** Early check-in/late checkout context, in any of the owner-approved phrasings. */
const HOURLY_FEE_CONTEXT_RE =
  /\/\s*(?:hr|hour)\b|\bper\s+hour\b|\ban\s+hour\b|\bkada\s+oras\b|\bbawat\s+oras\b|\bearly\s*check-?in\b|\blate\s*check-?out\b|\bmaagang\s+check-?in\b/i;

function classifyFallback(unit: string): string {
  if (HOURLY_FEE_CONTEXT_RE.test(unit)) return FALLBACK_HOURLY_FEE_TEXT;
  return FEE_CONTEXT.test(unit) ? FALLBACK_FEE_TEXT : FALLBACK_TOTAL_TEXT;
}

function unitHasDisallowedAmount(unit: string, allowedAmounts: Set<number>): boolean {
  if (PRICE_ARITHMETIC_RE.test(unit)) return true;
  let disallowed = false;
  unit.replace(pesoAmountRegex(), (match) => {
    const numeric = Number(match.replace(/[^\d.]/g, ""));
    if (!Number.isFinite(numeric) || !allowedAmounts.has(Math.round(numeric * 100) / 100)) disallowed = true;
    return match;
  });
  return disallowed;
}

/**
 * Splits a line of prose into sentence-sized pieces, each KEEPING its trailing punctuation
 * + whitespace so re-joining with "" reproduces the original line. A `.` immediately
 * followed by a digit (the decimal point in "₱4,500.75") never counts as a sentence
 * boundary, so a peso amount with centavos is never split in half.
 */
const SENTENCE_BODY = String.raw`(?:[^.!?]|\.(?=\d))*`;
const SENTENCE_SPLIT_RE = new RegExp(`${SENTENCE_BODY}[.!?]+\\s*|${SENTENCE_BODY}$`, "g");

function splitSentences(line: string): string[] {
  const pieces = (line.match(SENTENCE_SPLIT_RE) ?? []).filter((p) => p.length > 0);
  return pieces.length > 0 ? pieces : [line];
}

function processSentencePiece(piece: string, allowedAmounts: Set<number>): string {
  const trailingWs = piece.match(/\s+$/)?.[0] ?? "";
  const core = trailingWs ? piece.slice(0, -trailingWs.length) : piece;
  if (!pesoAmountRegex().test(core)) return piece;
  if (!unitHasDisallowedAmount(core, allowedAmounts)) return piece;
  return classifyFallback(core) + trailingWs;
}

const BULLET_LINE = /^(\s*(?:[-*•]|\d+[.)])\s+)(.*)$/;

function processLine(line: string, allowedAmounts: Set<number>): string {
  const bulletMatch = line.match(BULLET_LINE);
  if (bulletMatch) {
    const [, marker, rest] = bulletMatch;
    if (!pesoAmountRegex().test(rest)) return line;
    if (!unitHasDisallowedAmount(rest, allowedAmounts)) return line;
    return marker + classifyFallback(rest);
  }
  return splitSentences(line)
    .map((piece) => processSentencePiece(piece, allowedAmounts))
    .join("");
}

/**
 * Replace the WHOLE sentence/clause (or bullet line) containing any ₱/PHP amount that
 * can't be traced to this turn's tool results — never just the number — so a hallucinated
 * figure never leaves a dangling, grammatically broken fragment behind.
 */
export function enforcePriceClaims(text: string, allowedAmounts: Set<number>): string {
  return text
    .split("\n")
    .map((line) => processLine(line, allowedAmounts))
    .join("\n");
}

/** A preceding "from"/"simula"/"starting at" right before the match — never double it up. */
const FROM_OR_SIMULA_PRECEDING_RE = /\b(?:from|simula|starting at)\s*$/i;

/**
 * Owner guardrail (Cedric, 2026-10-15): whenever Haven states a base/listing nightly rate
 * (a property's own `pricePerNight`, via `list_properties` or a property rundown) the peso
 * amount must always read "from ₱X/night" (en) / "simula ₱X" (tl/btg) — never a bare
 * number — because rates change. A dated get_quote/find_stay quote line (an exact total or
 * per-night breakdown for the guest's own dates) is untouched even when the number happens
 * to match a base rate (`datedAmounts` wins over `basePrices` — see `collectDatedQuoteAmounts`).
 * Independent backstop for the same instruction in system-prompt.ts.
 */
export function ensureFromPrefix(
  text: string,
  basePrices: Set<number>,
  datedAmounts: Set<number>,
  isEnglish: boolean
): string {
  if (basePrices.size === 0) return text;
  const lead = isEnglish ? "from " : "simula ";
  return text.replace(pesoAmountRegex(), (match: string, offset: number, full: string) => {
    const numeric = Number(match.replace(/[^\d.]/g, ""));
    const rounded = Math.round(numeric * 100) / 100;
    if (!basePrices.has(rounded) || datedAmounts.has(rounded)) return match;
    const before = full.slice(Math.max(0, offset - 20), offset);
    if (FROM_OR_SIMULA_PRECEDING_RE.test(before)) return match;
    return lead + match;
  });
}

/**
 * Generic version of the sentence/bullet-line replacement `enforcePriceClaims` uses,
 * for any other owner-guardrail that must swap out a WHOLE matching sentence or bullet
 * line rather than a substring (e.g. `owner-facts.ts`'s budget-question and kids/babies
 * "don't count" guards). `replacement` of `""` drops the sentence entirely — the caller
 * is responsible for tidying up any resulting blank lines.
 */
export function replaceMatchingSentences(text: string, test: RegExp, replacement: string): string {
  function processPiece(piece: string): string {
    const trailingWs = piece.match(/\s+$/)?.[0] ?? "";
    const core = trailingWs ? piece.slice(0, -trailingWs.length) : piece;
    test.lastIndex = 0;
    return test.test(core) ? replacement + trailingWs : piece;
  }
  function processGenericLine(line: string): string {
    const bulletMatch = line.match(BULLET_LINE);
    if (bulletMatch) {
      const [, marker, rest] = bulletMatch;
      test.lastIndex = 0;
      return test.test(rest) ? marker + replacement : line;
    }
    return splitSentences(line).map(processPiece).join("");
  }
  return text.split("\n").map(processGenericLine).join("\n");
}

// ── Booking-link collection ─────────────────────────────────────────────────

export interface ToolExchange {
  name: string;
  input: unknown;
  result: unknown;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function bookingDatesLabel(input: Record<string, unknown>): string {
  const { checkIn, checkOut } = input;
  if (typeof checkIn !== "string" || typeof checkOut !== "string") return "";
  try {
    return formatStayRangeShort(checkIn, checkOut);
  } catch {
    return "";
  }
}

function bookLabel(name: string, dates: string): string {
  return dates ? `Book ${name} · ${dates}` : `Book ${name}`;
}

function optionLabel(optionIndex: number, name: string, guests: number | undefined): string {
  const prefix = `Option ${optionIndex + 1}: ${name}`;
  return typeof guests === "number" ? `${prefix} (${guests} guest${guests === 1 ? "" : "s"})` : prefix;
}

/**
 * When find_stay offers exactly one property with no alternatives (not a combo, not a
 * choice among options), the "Option N:" prefix is noise — there's nothing to number.
 */
function singlePropertyLabel(name: string, guests: number | undefined): string {
  const prefix = `Book ${name}`;
  return typeof guests === "number" ? `${prefix} (${guests} guest${guests === 1 ? "" : "s"})` : prefix;
}

/** Strips a leading "[DEVDB]"-style bracket tag (dev-DB test data convention). */
export function stripBracketPrefix(name: string): string {
  return name.replace(/^\s*(\[[^\]]*\]\s*)+/, "").trim();
}

/** Strips a leading bracket tag, then cuts at the first " | " or "•". */
export function stripToBaseName(name: string): string {
  return stripBracketPrefix(name).split(/\s*\|\s*|\s*•\s*/)[0].trim();
}

/**
 * Short, guest-facing display names for every property referenced in this turn's tool
 * results — reuses buildShortNames' "same base name → keep the distinguishing second
 * segment" disambiguation (e.g. the three "Mickey in Lipa" configurations), but first
 * strips a dev-DB bracket tag and cuts at a bare "•" for names with no "|" segment at all.
 *
 * A pair may carry its own `shortName` (e.g. `list_properties`/`get_property_details`
 * results — tools.ts computes those against the FULL public-listing set, so they're
 * already correctly disambiguated even when only one of several same-base-name listings
 * is mentioned this turn, which the turn-scoped computation below can't guarantee) — an
 * explicit `shortName` always wins over the computed fallback.
 */
export function shortPropertyLabels(pairs: { slug: string; name: string; shortName?: string }[]): Map<string, string> {
  const uniqueBySlug = new Map(pairs.map((p) => [p.slug, p]));
  const explicit = new Map<string, string>();
  const needsComputed: { slug: string; name: string }[] = [];
  for (const [slug, p] of uniqueBySlug) {
    if (typeof p.shortName === "string" && p.shortName.length > 0) explicit.set(slug, p.shortName);
    else needsComputed.push({ slug, name: stripBracketPrefix(p.name) });
  }
  const computed = buildShortNames(needsComputed);
  const result = new Map<string, string>();
  for (const [slug] of uniqueBySlug) {
    result.set(slug, explicit.get(slug) ?? stripToBaseName(computed.get(slug) ?? ""));
  }
  return result;
}

/**
 * Link buttons for every booking link a tool actually produced this turn (get_quote,
 * find_stay, …) — independent of whether the model wrote one into its prose. Still run
 * through the same href allowlist as model-written links. `find_stay` options are labeled
 * "Option N: <name> (<guests> guests)", in the same order the options array (and therefore
 * the reply prose built from it) lists them. Deduped only WITHIN a single option — the same
 * property+guests link legitimately reappears under a different option (e.g. a property that
 * fits both a 2-property and a 3-property combo), so dedup must not collapse those across
 * options. Capped at 8, in reply order.
 */
export function collectBookingLinks(exchanges: ToolExchange[], max = 8): LinkButton[] {
  const pairs: { slug: string; name: string }[] = [];
  for (const { name: toolName, input, result } of exchanges) {
    const i = asRecord(input);
    const r = asRecord(result);
    if (toolName === "get_quote" && typeof i.slug === "string" && typeof r.name === "string") {
      pairs.push({ slug: i.slug, name: r.name });
    } else if (toolName === "find_stay" && Array.isArray(r.options)) {
      for (const option of r.options) {
        const properties = asRecord(option).properties;
        if (!Array.isArray(properties)) continue;
        for (const property of properties) {
          const p = asRecord(property);
          if (typeof p.slug === "string" && typeof p.name === "string") pairs.push({ slug: p.slug, name: p.name });
        }
      }
    }
  }
  const shortNames = shortPropertyLabels(pairs);

  const links: LinkButton[] = [];
  for (const { name: toolName, input, result } of exchanges) {
    const i = asRecord(input);
    const r = asRecord(result);
    const dates = bookingDatesLabel(i);

    if (toolName === "get_quote" && typeof r.bookingLink === "string" && typeof i.slug === "string") {
      const label = shortNames.get(i.slug) ?? (typeof r.name === "string" ? stripToBaseName(r.name) : "this property");
      links.push({ label: bookLabel(label, dates), href: r.bookingLink });
    } else if (toolName === "find_stay" && Array.isArray(r.options)) {
      const isSingleOffer = r.options.length === 1 && Array.isArray(asRecord(r.options[0]).properties) &&
        (asRecord(r.options[0]).properties as unknown[]).length === 1;
      r.options.forEach((option, optionIndex) => {
        const properties = asRecord(option).properties;
        if (!Array.isArray(properties)) return;
        const seenInOption = new Set<string>();
        for (const property of properties) {
          const p = asRecord(property);
          if (typeof p.bookingLink !== "string" || typeof p.slug !== "string") continue;
          if (seenInOption.has(p.bookingLink)) continue;
          seenInOption.add(p.bookingLink);
          const label = shortNames.get(p.slug) ?? (typeof p.name === "string" ? stripToBaseName(p.name) : "this property");
          const guests = typeof p.guests === "number" ? p.guests : undefined;
          const buttonLabel = isSingleOffer ? singlePropertyLabel(label, guests) : optionLabel(optionIndex, label, guests);
          links.push({ label: buttonLabel, href: p.bookingLink });
        }
      });
    }
  }

  return links.filter((l) => isAllowedHref(l.href)).slice(0, max);
}

// ── Short property names in reply TEXT (not just link labels) ──────────────

/**
 * Every {slug, name} pair a tool returned this turn, across every tool shape that can
 * mention a property name — not just the booking-link-producing ones `collectBookingLinks`
 * covers, so a plain `list_properties`/`get_property_details` answer also gets shortened.
 */
export function collectPropertyNamePairs(exchanges: ToolExchange[]): { slug: string; name: string; shortName?: string }[] {
  const pairs: { slug: string; name: string; shortName?: string }[] = [];
  for (const { name: toolName, input, result } of exchanges) {
    const i = asRecord(input);
    const r = asRecord(result);
    if (toolName === "list_properties" && Array.isArray(result)) {
      for (const item of result) {
        const p = asRecord(item);
        if (typeof p.slug === "string" && typeof p.name === "string") {
          pairs.push({ slug: p.slug, name: p.name, shortName: typeof p.shortName === "string" ? p.shortName : undefined });
        }
      }
    } else if (toolName === "get_property_details" && typeof r.slug === "string" && typeof r.name === "string") {
      pairs.push({ slug: r.slug, name: r.name, shortName: typeof r.shortName === "string" ? r.shortName : undefined });
    } else if (toolName === "get_quote" && typeof i.slug === "string" && typeof r.name === "string") {
      pairs.push({ slug: i.slug, name: r.name });
    } else if (toolName === "find_stay" && Array.isArray(r.options)) {
      for (const option of r.options) {
        const properties = asRecord(option).properties;
        if (!Array.isArray(properties)) continue;
        for (const property of properties) {
          const p = asRecord(property);
          if (typeof p.slug === "string" && typeof p.name === "string") pairs.push({ slug: p.slug, name: p.name });
        }
      }
    }
  }
  return pairs;
}

/**
 * Replaces every raw DB property name (dev-DB bracket tag, SEO `|`/`•` suffix and all)
 * that appears verbatim in the reply text with its short guest-facing form — the same
 * shortener `collectBookingLinks` already applies to link labels. The model reads the raw
 * name straight from a tool result and often echoes it into prose verbatim, so this is a
 * literal substring swap, not a regex guess.
 */
export function shortenPropertyNamesInText(text: string, exchanges: ToolExchange[]): string {
  const pairs = collectPropertyNamePairs(exchanges);
  if (pairs.length === 0) return text;
  const shortNames = shortPropertyLabels(pairs);
  const rawNameBySlug = new Map(pairs.map((p) => [p.slug, p.name]));
  let out = text;
  for (const [slug, rawName] of rawNameBySlug) {
    const short = shortNames.get(slug);
    if (!short || rawName === short || !out.includes(rawName)) continue;
    out = out.split(rawName).join(short);
  }
  return out;
}

/**
 * True when a `find_amenity` call this turn came back empty — the independent backstop
 * for the amenity rule in owner-facts.ts: if nothing was found anywhere, Haven must always
 * surface the Messenger handoff rather than leaving the guest with no next step.
 */
export function needsAmenityHandoff(exchanges: ToolExchange[]): boolean {
  return exchanges.some(({ name, result }) => {
    if (name !== "find_amenity") return false;
    return asRecord(result).found === false;
  });
}

// ── Messenger handoff safety net ────────────────────────────────────────────

const MESSENGER_MENTION = /m\.me\/haveninlipa/i;

/**
 * Off-topic/unknown questions must always surface a way to reach a human. The system
 * prompt tells the model to mention m.me/haveninlipa in that case, but the model may write
 * it as plain text rather than a markdown link (which extractAllowedLinks wouldn't turn
 * into a button). This guarantees a button whenever the reply mentions it, however phrased.
 */
export function ensureHandoffLink(originalText: string, links: LinkButton[]): LinkButton[] {
  if (!MESSENGER_MENTION.test(originalText)) return links;
  if (links.some((l) => MESSENGER_MENTION.test(l.href))) return links;
  return [...links, { label: "Message us on Messenger", href: MESSENGER_HREF }];
}

// ── "Provisional" dedupe ─────────────────────────────────────────────────────

/**
 * Matches "provisional" wrapped in its own markdown emphasis run — **provisional**,
 * *provisional*, _provisional_ — before the bare word, so removing a repeat occurrence
 * takes its emphasis markers with it instead of leaving them behind empty (e.g. the
 * "**Option 2** — ** total ₱10,525" regression, where only the word was stripped).
 */
const PROVISIONAL_RE = /\*\*provisional\*\*|\*provisional\*|__provisional__|_provisional_|\bprovisional\b/gi;

/** Keeps only the first occurrence of the word "provisional" per reply (see system-prompt.ts). */
export function limitToOneProvisional(text: string): string {
  let seen = false;
  const deduped = text.replace(PROVISIONAL_RE, (match) => {
    if (seen) return "";
    seen = true;
    return match;
  });
  return cleanupStrippedPunctuation(deduped);
}

/**
 * Cleans up the punctuation debris a word/phrase removal can leave behind — e.g. stripping
 * "provisional" out of "(provisional total: ₱10,525)" leaves "( total: ₱10,525)". Order
 * matters: empty parens are removed whole before the leading-whitespace/separator passes,
 * so "(  )" collapses to nothing rather than to a lone "(".
 */
function cleanupStrippedPunctuation(text: string): string {
  return text
    .replace(/[ \t]*\(\s*[-—,;:]*\s*\)/g, "") // "()" / "( )" / "(-)" — fully empty parens, plus a leading space
    .replace(/\(\s*[-—,;:]+\s*/g, "(") // stray leading separator right after "("
    .replace(/\(\s+/g, "(") // "( " -> "("
    .replace(/\s+\)/g, ")") // " )" -> ")"
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+([.,!?;:])/g, "$1");
}

// ── Batangueño marker check ──────────────────────────────────────────────────

/**
 * "ga"/"baga" are ONLY valid as the yes/no question particle ("Ilan ga kayo?", "Totoo
 * baga?") — "Oo ga" ("yes ga") is a common misuse (a bare affirmation, not a question) and
 * must NOT count as a genuine marker, hence the negative lookbehind on both.
 */
const BATANGUENO_MARKER = /ala eh|aba'y|\bire\b|\bnga\b|\bari\b|\bare\b|(?<!\boo\s)\bga\b|(?<!\boo\s)\bbaga\b/i;

/**
 * A `btg`-mode reply should always carry at least one natural Batangueño marker (see
 * system-prompt.ts). If the model's reply has none, prepend a short, natural opener rather
 * than silently shipping a reply indistinguishable from plain Tagalog.
 */
export function ensureBatanguenoMarker(text: string): string {
  if (BATANGUENO_MARKER.test(text)) return text;
  return `Ala eh, ${text}`;
}

// ── Tagalog-mode Batangueño-particle guard ──────────────────────────────────

/**
 * "ga"/"baga" as a yes/no question particle, and "ari"/"ire" as "this/here", are
 * Batangueño-specific markers (see system-prompt.ts's LANGUAGE_RULES.btg) that must stay
 * confined to `btg` mode — a plain Tagalog reply (`lang: "tl"`, or `"auto"` mirroring a
 * Tagalog-speaking guest) must not read as Batangueño. The "Oo ga"/"Oo baga" misuse
 * (a bare affirmation, not a question) is left alone here, same as the btg-mode marker
 * check — converting it would produce the nonsensical "Oo ba".
 */
const GA_QUESTION_PARTICLE_RE = /(?<!\boo\s)\bga\b/gi;
const BAGA_RE = /(?<!\boo\s)\bbaga\b/gi;
const ARI_IRE_RE = /\b(?:ari|ire)\b/gi;

/**
 * Converts a leaked Batangueño particle back to standard Tagalog when the effective reply
 * language is plain Tagalog — `lang: "tl"` always, or `"auto"` whenever the turn isn't in
 * English (`isEnglish`, the same test `stripTagalogWordsInEnglish` is gated on). A no-op
 * for `"en"` and `"btg"` (where these markers are correct, see `ensureBatanguenoMarker`).
 */
export function stripBatanguenoFromTagalog(text: string, lang: HavenLang, isEnglish: boolean): string {
  if (lang === "btg" || lang === "en") return text;
  if (lang === "auto" && isEnglish) return text;
  return text
    .replace(BAGA_RE, (m) => capitalizeLike(m, "ba"))
    .replace(GA_QUESTION_PARTICLE_RE, (m) => capitalizeLike(m, "ba"))
    .replace(ARI_IRE_RE, (m) => capitalizeLike(m, "ito"));
}

// ── Terms-of-address guard ───────────────────────────────────────────────────

const BANNED_ADDRESS_TERMS = ["partner", "pare", "bro", "sis", "dude"];

function capitalizeLike(sample: string, replacement: string): string {
  const firstChar = sample.charAt(0);
  return firstChar !== firstChar.toLowerCase() && firstChar === firstChar.toUpperCase()
    ? replacement.charAt(0).toUpperCase() + replacement.slice(1)
    : replacement;
}

/**
 * Bans "partner"/"pare"/"bro"/"sis"/"dude" as a term of address UNLESS the guest used that
 * exact word themselves earlier in the conversation — the system prompt tells the model
 * this, but this is the independent backstop. Replaces (never just deletes, so the sentence
 * stays grammatical) with "kaibigan", or "friend" in English mode.
 */
export function enforceTermsOfAddress(text: string, guestMessages: string, lang: HavenLang): string {
  const guestLower = guestMessages.toLowerCase();
  const replacement = lang === "en" ? "friend" : "kaibigan";
  let result = text;
  for (const term of BANNED_ADDRESS_TERMS) {
    if (new RegExp(`\\b${term}\\b`, "i").test(guestLower)) continue;
    result = result.replace(new RegExp(`\\b${term}\\b`, "gi"), (match) => capitalizeLike(match, replacement));
  }
  return result;
}

// ── "Dadalaw" phrasing guard (Tagalog/Batangueño) ───────────────────────────

/**
 * "Dadalaw" means to visit — asking "ilang guests ang dadalaw" reads as "how many guests
 * will visit", which is confusing for a STAYING guest count. The correct ask is "Ilang tao
 * kayo?" / "Ilang guests kayo?" (btg: "Ilan ga kayo?").
 */
const DADALAW_RE = /ilang\s+(?:guests?|tao)\s+(?:ang\s+)?(?:(?:ay\s+)?dadalaw)[^?]*\?/gi;

export function fixDadalawPhrasing(text: string, lang: HavenLang): string {
  const replacement = lang === "btg" ? "Ilan ga kayo?" : "Ilang guests kayo?";
  return text.replace(DADALAW_RE, replacement);
}

// ── "The system" mention guard ───────────────────────────────────────────────

/**
 * Haven must never tell a guest she's checking "the system" / "ang system" / "sa system" /
 * "our system" — it reads as a bot describing its own backend, not a real local host. The
 * article/possessive is required immediately before "system" so an unrelated phrase (e.g.
 * a hypothetical "the sound system") is never caught. Whole sentence/bullet line is dropped
 * (see `replaceMatchingSentences`) rather than rephrased in place — these are always a
 * throwaway "let me check..." filler, never a sentence carrying guest-facing information on
 * its own.
 */
const SYSTEM_MENTION_RE = /\b(?:the|our)\s+system\b|\bang\s+system\b|\bsa\s+system\b/i;

/** A bullet marker with nothing left after it — the whole line's content was dropped. */
const EMPTY_BULLET_LINE = /^\s*(?:[-*•]|\d+[.)])\s*$/;

/** Tidies the whitespace/blank lines a dropped sentence or bullet line leaves behind. */
export function tidyAfterSentenceDrop(text: string): string {
  return text
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+([.,!?;:])/g, "$1")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !EMPTY_BULLET_LINE.test(line))
    .join("\n")
    .trim();
}

/** Drops any sentence/bullet line referring to "the system"/"ang system"/"sa system"/
 * "our system" — independent backstop for the same rule in system-prompt.ts. */
export function stripSystemMentions(text: string): string {
  return tidyAfterSentenceDrop(replaceMatchingSentences(text, SYSTEM_MENTION_RE, ""));
}

// ── English-mode guard: no stray Tagalog words ──────────────────────────────

/** Common Tagalog function words — their presence in the guest's own message means the
 * conversation isn't really in English, even under `lang: "auto"`. */
const TAGALOG_MARKER_WORDS =
  /\b(?:ba|po|ng|mga|ang|ko|sa|ito|hindi|oo|salamat|kayo|tayo|natin|kami|siya|paano|magkano|pwede|gusto|opo|kumusta)\b/i;

/** True when Haven should reply English-only this turn: explicit `en`, or `auto` with an
 * English-looking guest message (no detectable Tagalog marker word). */
export function isEnglishContext(lang: HavenLang, guestMessages: string): boolean {
  if (lang === "en") return true;
  if (lang !== "auto") return false;
  return guestMessages.trim().length > 0 && !TAGALOG_MARKER_WORDS.test(guestMessages);
}

/** word -> English replacement, or "" to drop the word entirely (e.g. "po"). */
const TAGALOG_WORDS_IN_ENGLISH: Record<string, string> = {
  grupo: "group",
  kabayan: "friend",
  kaibigan: "friend",
  po: "",
};

/**
 * Backstop for English mode: strips a small set of Tagalog words the model sometimes
 * leaks into an otherwise-English reply (see `isEnglishContext`), independent of the
 * system prompt's own "reply in English" instruction.
 */
export function stripTagalogWordsInEnglish(text: string): string {
  let out = text;
  for (const [word, replacement] of Object.entries(TAGALOG_WORDS_IN_ENGLISH)) {
    out = out.replace(new RegExp(`\\b${word}\\b`, "gi"), (match) => (replacement ? capitalizeLike(match, replacement) : ""));
  }
  return cleanupStrippedPunctuation(out);
}

// ── Resolved-dates-stated guard ──────────────────────────────────────────────

/**
 * The first checkIn/checkOut pair this turn's tools resolved or were called with —
 * `resolve_dates`' own result, or any other tool's input (check_availability, get_quote,
 * find_stay, check_early_late all take explicit YYYY-MM-DD dates).
 */
export function firstResolvedDateRange(exchanges: ToolExchange[]): { checkIn: string; checkOut: string } | null {
  for (const { result } of exchanges) {
    const r = asRecord(result);
    if (typeof r.checkIn === "string" && typeof r.checkOut === "string") return { checkIn: r.checkIn, checkOut: r.checkOut };
  }
  for (const { input } of exchanges) {
    const i = asRecord(input);
    if (typeof i.checkIn === "string" && typeof i.checkOut === "string") return { checkIn: i.checkIn, checkOut: i.checkOut };
  }
  return null;
}

function weekdayMonthDay(d: Date): string {
  return d.toLocaleDateString("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric" });
}

function monthDay(d: Date): string {
  return d.toLocaleDateString("en-US", { timeZone: "UTC", month: "long", day: "numeric" });
}

/** "Saturday, November 14 → Sunday, November 15, 2026" — the explicit date line English
 * replies must carry whenever dates were resolved this turn (see `ensureDatesStated`). */
export function formatDateRangeArrow(checkIn: string, checkOut: string): string {
  const ci = toUtcMidnight(checkIn);
  const co = toUtcMidnight(checkOut);
  return `${weekdayMonthDay(ci)} → ${weekdayMonthDay(co)}, ${co.getUTCFullYear()}`;
}

/**
 * English replies must always state the resolved dates explicitly (system-prompt.ts
 * already instructs this; this is the independent backstop). If this turn resolved a
 * date range and the reply doesn't already mention it, prepend a "For <range>:" line
 * rather than leaving the dates implicit. `isEnglish` is the same English-context test
 * `stripTagalogWordsInEnglish` is gated on (`isEnglishContext`) — explicit `en`, or `auto`
 * with an English-looking guest message.
 *
 * `stayLabel` is checked FIRST (and takes precedence): the model is told to copy it
 * verbatim, which uses abbreviated month names ("Nov 19"), so a check for only the full
 * month name ("November 19") missed it — the doubled-header regression, where a reply
 * already reading "Thu, Nov 19 → Sat, Nov 21, 2026 (check-out) · 2 nights" still got "For
 * Thursday, November 19 → Saturday, November 21, 2026:" prepended on top. The full-month
 * check below stays as a fallback for a correct range the model composed in its own words
 * rather than copying stayLabel.
 */
export function ensureDatesStated(
  text: string,
  resolved: { checkIn: string; checkOut: string } | null,
  stayLabel: StayLabel | null,
  isEnglish: boolean
): string {
  if (!resolved || !isEnglish) return text;
  if (stayLabel && text.includes(stayLabel.en)) return text;
  const ci = toUtcMidnight(resolved.checkIn);
  if (isNaN(ci.getTime()) || text.toLowerCase().includes(monthDay(ci).toLowerCase())) return text;
  return `For ${formatDateRangeArrow(resolved.checkIn, resolved.checkOut)}:\n\n${text}`;
}

// ── Stay-range end-date guard (DEC-029: end date must be check-out, never the last night) ──

const EN_MONTH_FULL_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const EN_WEEKDAY_FULL_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const DATE_MENTION_SOURCE = String.raw`(?:(?:${EN_WEEKDAY_FULL_NAMES.join("|")}),?\s+)?(${EN_MONTH_FULL_NAMES.join(
  "|"
)})\s+(\d{1,2})(?:,\s*(\d{4}))?`;
const RANGE_SEP_SOURCE = String.raw`(?:→|-|–|\bto\b|\bhanggang\b)`;
const NIGHT_SUFFIX_SOURCE = String.raw`(?:\s*\(\s*\d+\s*(?:nights?|gabi)\s*\))?`;

/** Two English-worded date mentions joined by a range separator, with an optional trailing
 * "(N nights/gabi)" note absorbed into the match so it's replaced along with the range. */
const STAY_RANGE_RE = new RegExp(
  `${DATE_MENTION_SOURCE}\\s*${RANGE_SEP_SOURCE}\\s*${DATE_MENTION_SOURCE}${NIGHT_SUFFIX_SOURCE}`,
  "gi"
);

/**
 * Independent backstop for the live bug: Haven stated a Thu check-in/Sat check-out,
 * 2-night stay as "Thursday, November 19 hanggang Friday, November 20, 2026 (2 nights)" —
 * reading the LAST NIGHT (Friday) as the range's end instead of the check-out date
 * (Saturday). Whatever date-range text the model composed itself, if its end-date mention
 * matches this turn's resolved/quoted stay's last occupied night (checkOut − 1) AND its
 * start-date mention matches that stay's checkIn, the whole matched range (plus any
 * trailing night-count note) is replaced with the correct `stayLabel` — never just the
 * end date, so no dangling "(2 nights)" is left paired with the wrong end date. A per-night
 * breakdown line (one date, no range separator) never matches this pattern, so it's
 * untouched. English month/weekday words only — the only form the live bug ever produced,
 * including inside an otherwise Tagalog/Batangueño reply.
 */
export function fixStayRangeEndDate(
  text: string,
  resolved: { checkIn: string; checkOut: string } | null,
  stayLabel: StayLabel | null,
  isEnglish: boolean
): string {
  if (!resolved || !stayLabel) return text;
  const checkIn = toUtcMidnight(resolved.checkIn);
  const checkOut = toUtcMidnight(resolved.checkOut);
  if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) return text;
  const lastNight = addUtcDays(checkOut, -1);
  const label = isEnglish ? stayLabel.en : stayLabel.tl;

  return text.replace(
    STAY_RANGE_RE,
    (match: string, startMonth: string, startDay: string, startYear: string | undefined, endMonth: string, endDay: string, endYear: string | undefined) => {
      const startMonthIdx = EN_MONTH_FULL_NAMES.indexOf(startMonth);
      const endMonthIdx = EN_MONTH_FULL_NAMES.indexOf(endMonth);

      const startMatches =
        startMonthIdx === checkIn.getUTCMonth() &&
        Number(startDay) === checkIn.getUTCDate() &&
        (!startYear || Number(startYear) === checkIn.getUTCFullYear());
      const endMatches =
        endMonthIdx === lastNight.getUTCMonth() &&
        Number(endDay) === lastNight.getUTCDate() &&
        (!endYear || Number(endYear) === lastNight.getUTCFullYear());

      return startMatches && endMatches ? label : match;
    }
  );
}

// ── Date/nights re-confirmation guard (Owner rule, Cedric 2026-10-16) ──────────

/**
 * Industry standard: a range like "Nov 19 to 21", "Nov 19-21", or "Nobyembre 19 hanggang
 * 21" always means check-in the FIRST date, check-out the SECOND (nights = the
 * difference) — Haven must never re-question that once the server has already resolved a
 * range this turn. Live bug (dev, pre-#86): guest said "Nobyembre 19 hanggang 21, 4 kami"
 * and Haven asked whether that meant 1 night (Nov 19–20) or 2 nights (Nov 19–21) —
 * contradicting the range it had just correctly parsed. Each alternative below targets
 * one phrasing of that same mistake, in English or Tagalog/Batangueño. The "did you mean"
 * alternative is scoped to a sentence that ALSO mentions nights/dates, so it never
 * clobbers property-resolver.ts's own (legitimate) "Did you mean <property>?" question.
 */
const DATE_RECONFIRMATION_RE = new RegExp(
  [
    String.raw`\bjust to confirm\b`,
    String.raw`\bis that\s+\d+\s+nights?\s+or\s+\d+\b`,
    String.raw`\bdo you want\s+\d+\s+nights?\b`,
    String.raw`(?=.*\bdid you mean\b)(?=.*\b(?:nights?|dates?|check-?in|check-?out)\b)`,
    String.raw`\btotoo\s+(?:ba|ga)\s+na\s+isang\s+gabi\b`,
    String.raw`\bisang\s+gabi\s+lang\s+(?:ba|ga)\b`,
    String.raw`\bilang\s+gabi\b`,
    String.raw`\bsigurado\s+(?:ba|ga)\s+kayo\b`,
    String.raw`\b[a-z]+\.?\s+\d{1,2}\s*(?:[–-]|hanggang)\s*\d{1,2}\s+o\s+[a-z]+\.?\s+\d{1,2}\s*(?:[–-]|hanggang)\s*\d{1,2}\b`,
  ].join("|"),
  "i"
);

/**
 * Drops any sentence/bullet line re-questioning the guest's nights or dates, whenever a
 * date range was already resolved this turn (a `resolve_dates`/tool result, or the
 * pre-resolved date context note — see chat-service.ts). If dropping leaves the reply
 * completely empty (the live bug's reply was ENTIRELY this kind of question), restate the
 * resolved stayLabel with a booking nudge instead of sending a blank message.
 */
export function dropDateReconfirmationQuestions(
  text: string,
  datesResolvedThisTurn: boolean,
  stayLabel: StayLabel | null,
  isEnglish: boolean
): string {
  if (!datesResolvedThisTurn) return text;
  const dropped = tidyAfterSentenceDrop(replaceMatchingSentences(text, DATE_RECONFIRMATION_RE, ""));
  if (dropped.length > 0 || !stayLabel) return dropped;
  const label = isEnglish ? stayLabel.en : stayLabel.tl;
  return isEnglish ? `${label} — want me to help you book it?` : `${label} — gusto n'yo na bang i-book?`;
}

// ── "What year" guard ────────────────────────────────────────────────────────

/**
 * Haven must never ask a guest what year they mean — a detected date phrase always
 * resolves to the next upcoming occurrence (see dates.ts), so the question never needed
 * answering in the first place. Independent backstop for the same instruction in
 * system-prompt.ts and the per-turn date context note (chat-service.ts).
 */
const WHAT_YEAR_RE = /\bwhat year\b|\bwhich year\b|\banong\s+taon\b|\banong\s+year\b/i;

export function dropWhatYearQuestions(text: string): string {
  return tidyAfterSentenceDrop(replaceMatchingSentences(text, WHAT_YEAR_RE, ""));
}
