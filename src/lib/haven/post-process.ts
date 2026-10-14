import "server-only";
import { formatStayRangeShort } from "@/lib/dates";
import { buildShortNames } from "@/lib/listings";

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

// ── Price guard: whole-sentence / whole-bullet-line replacement ────────────────

const PESO_AMOUNT_SOURCE = String.raw`(?:₱|PHP\s?)\s?\d[\d,]*(?:\.\d{1,2})?`;
/** Fresh global regex per use — avoids `lastIndex` state bugs from a shared `/g` instance. */
function pesoAmountRegex(): RegExp {
  return new RegExp(PESO_AMOUNT_SOURCE, "gi");
}

export const FALLBACK_TOTAL_TEXT = "You'll see the exact total at checkout.";
export const FALLBACK_FEE_TEXT = `For that fee, please ask us via Messenger (${MESSENGER_HREF}).`;

/** Rate/fee language (vs. a stay total) — decides which fallback sentence fits. */
const FEE_CONTEXT = /\/\s*(?:hour|hr|night|day|guest)\b|\bper\s+(?:hour|hr|night|day|guest)\b|\bfee\b|\bcharges?\b|\bcharged\b/i;

function classifyFallback(unit: string): string {
  return FEE_CONTEXT.test(unit) ? FALLBACK_FEE_TEXT : FALLBACK_TOTAL_TEXT;
}

function unitHasDisallowedAmount(unit: string, allowedAmounts: Set<number>): boolean {
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

/** Strips a leading "[DEVDB]"-style bracket tag (dev-DB test data convention). */
function stripBracketPrefix(name: string): string {
  return name.replace(/^\s*(\[[^\]]*\]\s*)+/, "").trim();
}

/** Strips a leading bracket tag, then cuts at the first " | " or "•". */
function stripToBaseName(name: string): string {
  return stripBracketPrefix(name).split(/\s*\|\s*|\s*•\s*/)[0].trim();
}

/**
 * Short, guest-facing display names for every property referenced in this turn's tool
 * results — reuses buildShortNames' "same base name → keep the distinguishing second
 * segment" disambiguation (e.g. the three "Mickey in Lipa" configurations), but first
 * strips a dev-DB bracket tag and cuts at a bare "•" for names with no "|" segment at all.
 */
function shortPropertyLabels(pairs: { slug: string; name: string }[]): Map<string, string> {
  const uniqueBySlug = new Map(pairs.map((p) => [p.slug, p.name]));
  const prepped = [...uniqueBySlug].map(([slug, name]) => ({ slug, name: stripBracketPrefix(name) }));
  const short = buildShortNames(prepped);
  return new Map([...short].map(([slug, label]) => [slug, stripToBaseName(label)]));
}

/**
 * Link buttons for every booking link a tool actually produced this turn (get_quote,
 * find_stay, …) — independent of whether the model wrote one into its prose. Still run
 * through the same href allowlist as model-written links. `find_stay` options are labeled
 * "Option N: <name> (<guests> guests)", in the same order the options array (and therefore
 * the reply prose built from it) lists them. Capped at 6, deduped by href — which already
 * encodes property + dates + guests, so the same property/guest pairing is never repeated.
 */
export function collectBookingLinks(exchanges: ToolExchange[], max = 6): LinkButton[] {
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
      r.options.forEach((option, optionIndex) => {
        const properties = asRecord(option).properties;
        if (!Array.isArray(properties)) return;
        for (const property of properties) {
          const p = asRecord(property);
          if (typeof p.bookingLink !== "string" || typeof p.slug !== "string") continue;
          const label = shortNames.get(p.slug) ?? (typeof p.name === "string" ? stripToBaseName(p.name) : "this property");
          const guests = typeof p.guests === "number" ? p.guests : undefined;
          links.push({ label: optionLabel(optionIndex, label, guests), href: p.bookingLink });
        }
      });
    }
  }

  return dedupeLinks(links.filter((l) => isAllowedHref(l.href))).slice(0, max);
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
  return text
    .replace(PROVISIONAL_RE, (match) => {
      if (seen) return "";
      seen = true;
      return match;
    })
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+([.,!?;:])/g, "$1");
}

// ── Batangueño marker check ──────────────────────────────────────────────────

const BATANGUENO_MARKER = /ala eh|aba'y|\bga\b|\bnga\b|\bari\b|\bare\b/i;

/**
 * A `btg`-mode reply should always carry at least one natural Batangueño marker (see
 * system-prompt.ts). If the model's reply has none, prepend a short, natural opener rather
 * than silently shipping a reply indistinguishable from plain Tagalog.
 */
export function ensureBatanguenoMarker(text: string): string {
  if (BATANGUENO_MARKER.test(text)) return text;
  return `Ala eh, ${text}`;
}
