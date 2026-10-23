import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getPublicListings } from "@/lib/listings";
import { getChatProvider, type ProviderMessage } from "./provider";
import { getToolDefinitions, runHavenTool } from "./tools";
import { buildHavenSystemPrompt, type HavenLang } from "./system-prompt";
import { maskPii } from "./masking";
import { resolveDates, buildStayLabel, todayContextNote, manilaYear, type ResolvedDates } from "./dates";
import {
  buildPropertyContextNote,
  dropUnknownPropertyClaims,
  resolveGuestPropertyMentionAcrossTurns,
} from "./property-resolver";
import {
  extractAllowedLinks,
  stripBareUrls,
  collectToolAmounts,
  enforcePriceClaims,
  collectBasePrices,
  collectDatedQuoteAmounts,
  ensureFromPrefix,
  collectBookingLinks,
  dedupeLinks,
  ensureHandoffLink,
  limitToOneProvisional,
  ensureBatanguenoMarker,
  enforceTermsOfAddress,
  shortenPropertyNamesInText,
  shortPropertyLabels,
  fixDadalawPhrasing,
  replaceTuklasinFamily,
  simplifyDeepTagalogWords,
  stripSystemMentions,
  fixBellaVitaMiscount,
  isEnglishContext,
  stripTagalogWordsInEnglish,
  firstResolvedDateRange,
  ensureDatesStated,
  fixStayRangeEndDate,
  dropDateReconfirmationQuestions,
  dropWhatYearQuestions,
  ensureSingleNightNudge,
  needsAmenityHandoff,
  stripBatanguenoFromTagalog,
  MESSENGER_HREF,
  type LinkButton,
  type ToolExchange,
} from "./post-process";
import { isPropertyOverviewMessage } from "./overview-intent";
import {
  OWNER_FACT_ALLOWED_AMOUNTS,
  stripBudgetQuestions,
  removeKidsFreeClaims,
  replaceBannedAffordPhrasing,
  needsCapacityHandoff,
  ensureCapacityHandoffLink,
  buildCapacityContextNote,
  isLargeGroupMessage,
  isLargeGroupToolCall,
  buildLargeGroupHandoffReply,
  parseGuestCount,
} from "./owner-facts";
import {
  isWifiOrAccessRequest,
  buildAccessGuardReply,
  containsAccessLeak,
  scrubAccessLeak,
  ensureAccessHandoffLink,
} from "./access-guard";
import { checkRateLimit, checkMonthlyCapAndAlert, hashIp } from "./rate-limit";
import {
  havenAiActive,
  costUsd as priceOf,
  HAVEN_AI_MODEL,
  HAVEN_AI_PROVIDER,
  MAX_ASSISTANT_MESSAGE_CHARS,
  MAX_MESSAGE_CHARS,
  MAX_MESSAGES,
  MAX_OUTPUT_TOKENS,
  MAX_TOOL_ROUNDS,
} from "./config";

// `user` messages keep the hard 600-char cap (the guest's own typing); `assistant` history
// (Haven's own prior replies, echoed back by the client) gets a much longer allowance since
// a multi-option list easily clears 600 chars — see normalizeIncomingMessages below, which
// truncates rather than lets a long turn reject the whole request.
const messageSchema = z.discriminatedUnion("role", [
  z.object({ role: z.literal("user"), content: z.string().min(1).max(MAX_MESSAGE_CHARS) }),
  z.object({ role: z.literal("assistant"), content: z.string().min(1).max(MAX_ASSISTANT_MESSAGE_CHARS) }),
]);

export const chatRequestSchema = z.object({
  sessionId: z.string().min(8).max(100),
  lang: z.enum(["en", "tl", "btg", "auto"]),
  messages: z.array(messageSchema).min(1).max(MAX_MESSAGES),
});

export type ChatRequestBody = z.infer<typeof chatRequestSchema>;

interface RawMessageLike {
  role?: unknown;
  content?: unknown;
}

/**
 * Runs BEFORE zod validation so an oversized/over-long request degrades gracefully instead
 * of being rejected outright (the live bug: a long assistant turn in history, or more than
 * 12 turns of back-and-forth, used to fail validation -> static fallback -> the client
 * injecting the English root greeting mid-conversation). Trims history to the most recent
 * MAX_MESSAGES turns and truncates any `assistant` message down to its last
 * MAX_ASSISTANT_MESSAGE_CHARS characters (keeping the tail — the end of a message is more
 * often the actionable part, e.g. the actual list of options). Never touches `user` content;
 * that's handled separately by `clampLastUserMessage` so an oversized latest user message
 * can get its own friendly reply instead of silently losing content.
 */
function normalizeIncomingMessages(rawBody: unknown): unknown {
  if (!rawBody || typeof rawBody !== "object") return rawBody;
  const body = rawBody as { messages?: unknown };
  if (!Array.isArray(body.messages)) return rawBody;

  const trimmed = body.messages.slice(-MAX_MESSAGES);
  const normalized = trimmed.map((m) => {
    const msg = m as RawMessageLike;
    if (msg.role === "assistant" && typeof msg.content === "string" && msg.content.length > MAX_ASSISTANT_MESSAGE_CHARS) {
      return { ...msg, content: msg.content.slice(-MAX_ASSISTANT_MESSAGE_CHARS) };
    }
    return m;
  });
  return { ...body, messages: normalized };
}

/** True when the LAST message is from the guest and exceeds the user-message cap — the one
 * case that gets a friendly AI-mode reply (see `handleHavenChat`) rather than the normal
 * static/error fallback, since it's guest-triggered and easy to recover from in-conversation. */
function lastMessageIsOversizedUser(messages: unknown[]): boolean {
  const last = messages[messages.length - 1] as RawMessageLike | undefined;
  return !!last && last.role === "user" && typeof last.content === "string" && last.content.length > MAX_MESSAGE_CHARS;
}

/** Clamps only the last message's content so the rest of the body can still be validated
 * normally (sessionId/lang/history shape) while we build the oversized-message reply. */
function withClampedLastUserMessage(messages: RawMessageLike[]): RawMessageLike[] {
  if (messages.length === 0) return messages;
  const lastIdx = messages.length - 1;
  const last = messages[lastIdx];
  return [...messages.slice(0, lastIdx), { ...last, content: String(last.content).slice(0, MAX_MESSAGE_CHARS) }];
}

const OVERSIZED_USER_MESSAGE_REPLY = {
  en: `That message was a bit long for me to read in one go — could you shorten it to a sentence or two? You can also message us directly on Messenger: ${MESSENGER_HREF}.`,
  tl: `Mahaba masyado yung message mo para mabasa ko agad — pwede mo bang paikliin sa isa o dalawang sentence? Pwede mo rin kaming i-message diretso sa Messenger: ${MESSENGER_HREF}.`,
  btg: `Ala eh, mahaba masyado yung message mo — pwede paikliin sa isa o dalawang sentence? Pwede mo rin kaming i-message diretso sa Messenger: ${MESSENGER_HREF}.`,
} as const;

/** Mirrors `buildLargeGroupHandoffReply`'s language selection (owner-facts.ts) — `btg` is
 * always explicit, everything else follows the guest's own words for `auto`. */
function buildOversizedUserMessageReply(lang: HavenLang, guestMessages: string): string {
  if (lang === "btg") return OVERSIZED_USER_MESSAGE_REPLY.btg;
  return isEnglishContext(lang, guestMessages) ? OVERSIZED_USER_MESSAGE_REPLY.en : OVERSIZED_USER_MESSAGE_REPLY.tl;
}

export interface HavenChatResponse {
  mode: "ai" | "static";
  reply?: string;
  links?: LinkButton[];
  reason?: "cap" | "error" | "rate_limit";
}

const NO_ANSWER_FALLBACK =
  "Let me get you to a real person for this one — message us at https://m.me/haveninlipa, or use the contact page.";

function lastUserMessage(messages: ChatRequestBody["messages"]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") return messages[i].content;
  }
  return messages[messages.length - 1]?.content ?? "";
}

interface ToolLoopResult {
  reply: string;
  links: LinkButton[];
  toolNames: string[];
  inputTokens: number;
  outputTokens: number;
  toolCalls: number;
  outcome: "ai" | "handoff";
}

const MESSENGER_BUTTON: LinkButton = { label: "Message us on Messenger", href: MESSENGER_HREF };

/** The deterministic 24+ guest reply, skipping the model entirely (see owner-facts.ts). */
function largeGroupHandoffResult(
  lang: HavenLang,
  guestMessages: string,
  partial: { toolNames: string[]; inputTokens: number; outputTokens: number; toolCalls: number }
): ToolLoopResult {
  return {
    reply: buildLargeGroupHandoffReply(lang, guestMessages),
    links: [MESSENGER_BUTTON],
    outcome: "handoff",
    ...partial,
  };
}

/**
 * Most recent prior turns (both roles), oldest first, excluding the guest's latest
 * message — the "recent conversation context" the Owner's rules 2 and 3 (2026-10-16) ask
 * Haven to fall back on: a month name mentioned earlier (for a bare day-range like "19 to
 * 21") and a property named earlier (for a follow-up turn carrying only dates/guests).
 */
const HISTORY_LOOKBACK_TURNS = 6;

function recentHistoryMessages(messages: ChatRequestBody["messages"]): string[] {
  return messages.slice(0, -1).slice(-HISTORY_LOOKBACK_TURNS).map((m) => m.content);
}

/**
 * Runs the same server-side date resolver the `resolve_dates` tool uses (dates.ts) on the
 * guest's latest message BEFORE the model is called. The model is instructed to always call
 * `resolve_dates` itself, but live testing showed it sometimes skips that and asks the guest
 * "2024 o 2025?" instead — this pre-resolves whatever date phrase is already detectable and
 * hands the model the answer directly, so it never needs to ask for the year at all (a
 * detected phrase always resolves to the next upcoming occurrence, never the past).
 */
function dateContextNote(resolved: ResolvedDates | null): string {
  if (!resolved) return "";
  return (
    "\n\nContext (already resolved here, not a guest claim): the guest's most " +
    `recent message contains a date phrase that resolves to checkIn=${resolved.checkIn}, ` +
    `checkOut=${resolved.checkOut} (${resolved.interpreted}). If this is the date range the ` +
    "guest means, use these exact dates for any tool call or reply about this request " +
    "instead of asking again. These are already the next upcoming occurrence of that phrase " +
    "— never ask the guest what year they mean. If you state this range, copy it verbatim " +
    `from stayLabel — English: "${resolved.stayLabel.en}"; Tagalog/Batangueño: ` +
    `"${resolved.stayLabel.tl}" — the end date is always the check-out date, never the last ` +
    "occupied night."
  );
}

/** Slug prefix for the three Mickey in Lipa configurations — the rest (Cozy 1BR, Spacious
 * 2BR) are the "Original Haven in Lipa" group (Cedric, 2026-10-23 grouping correction). */
const MICKEY_SLUG_PREFIX = "mickey-in-lipa";

/**
 * "Public listings (authoritative)" context note — built every turn from the listings
 * already fetched above (`getPublicListings()`), never from the model's own memory. Fixes
 * the live bug (Oct 22 2026): asked a plain "what properties do you have?", Haven sometimes
 * skipped `list_properties` and invented an answer — only the two B34 units, with wrong
 * capacities. This note gives the model the real data directly, and `system-prompt.ts`'s
 * rule tells it to use this note (or call `list_properties`) rather than ever answer an
 * overview question from memory. Kept small: one line per listing, grouped under the two
 * guest-facing group headings (never "Bella Vita properties" — see the Owner correction
 * below). When the fetch failed or returned nothing, says so plainly and tells the model to
 * call `list_properties` itself.
 *
 * Owner correction (Cedric, 2026-10-23): Haven had been saying "2 Bella Vita properties" /
 * "two in the Bella Vita subdivision", implying only some of the 5 listings share that
 * subdivision. All 5 are in Bella Vita. The note now groups listings by slug prefix — the
 * three `mickey-in-lipa-*` configurations as "3 Mickey in Lipa listings", the rest (Cozy
 * 1BR, Spacious 2BR) as "2 Original Haven in Lipa listings" — and states plainly that both
 * groups are in Bella Vita, never naming either group "Bella Vita properties".
 */
function listingsContextNote(listings: Awaited<ReturnType<typeof getPublicListings>>): string {
  if (!Array.isArray(listings) || listings.length === 0) {
    return (
      "\n\nContext (public listings unavailable this turn): the server's own listings fetch " +
      "failed or returned none. Do not guess what properties exist — call list_properties " +
      "yourself before answering any question about what properties/listings we have."
    );
  }
  const shortNames = shortPropertyLabels(listings.map((p) => ({ slug: p.slug, name: p.name })));
  const lineFor = (p: (typeof listings)[number]) => {
    const shortName = shortNames.get(p.slug) ?? p.name;
    const price = Number(p.pricePerNight);
    const priceText = Number.isFinite(price) ? `from ₱${price.toLocaleString("en-US")}/night` : "price unavailable";
    return `- ${shortName} (slug ${p.slug}): ${p.bedrooms} bed, sleeps up to ${p.maxGuests}, ${priceText}`;
  };
  const mickeyLines = listings.filter((p) => p.slug.startsWith(MICKEY_SLUG_PREFIX)).map(lineFor);
  const originalHavenLines = listings.filter((p) => !p.slug.startsWith(MICKEY_SLUG_PREFIX)).map(lineFor);
  return (
    "\n\nContext (public listings, authoritative — already fetched this turn, not a guest " +
    "claim): this is the COMPLETE list of every current public listing. ALL of these are in " +
    "the Bella Vita subdivision, Lipa City — never say only some, or only 2, are there, and " +
    "never call either group below \"Bella Vita properties\". For any overview question " +
    '("what properties do you have", "anong property meron kayo", "list your properties", ' +
    "etc.), name every one of these — never only some of them, never from memory, and never " +
    "a name/capacity/price not in this list:\n" +
    `Mickey in Lipa listings (${mickeyLines.length}):\n${mickeyLines.join("\n")}\n` +
    `Original Haven in Lipa listings (${originalHavenLines.length}):\n${originalHavenLines.join("\n")}`
  );
}

/**
 * Every listing's own `pricePerNight`, from the listings already fetched this turn — allowed
 * through the price guard the same way a `list_properties` tool call's result would be, since
 * this is the identical server-fetched figure (see `listingsContextNote` above and
 * `enforcePriceClaims`/`ensureFromPrefix` in post-process.ts). Without this, a reply built
 * from the context note rather than an actual tool call this turn would have its own correct
 * "from ₱X/night" price wrongly treated as unverified.
 */
function basePricesFromListings(listings: Awaited<ReturnType<typeof getPublicListings>>): Set<number> {
  const amounts = new Set<number>();
  if (!Array.isArray(listings)) return amounts;
  for (const p of listings) {
    const price = Number(p.pricePerNight);
    if (Number.isFinite(price)) amounts.add(Math.round(price * 100) / 100);
  }
  return amounts;
}

/**
 * Drives the model <-> tool exchange for one guest message. All provider calls within this
 * loop count as ONE HavenChatUsage row (see rate-limit.ts: a row is a guest message, not a
 * model call) — usage is summed across rounds by the caller.
 */
async function runToolLoop(body: ChatRequestBody, now: Date): Promise<ToolLoopResult> {
  const provider = getChatProvider();
  const latestMessage = lastUserMessage(body.messages);
  const lang = body.lang as HavenLang;
  const guestMessages = body.messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join(" ");

  // 24+ guests: a fixed script, not the model — see owner-facts.ts. Checked before the
  // model is ever called so a guest's own message never reaches it for this case at all.
  if (isLargeGroupMessage(latestMessage)) {
    return largeGroupHandoffResult(lang, guestMessages, { toolNames: [], inputTokens: 0, outputTokens: 0, toolCalls: 0 });
  }

  // Wi-Fi/access (door, gate, lock, keybox code) request: a fixed safe reply, not the
  // model — see access-guard.ts. Same reasoning as the 24+ guest handoff above: Haven must
  // never share these, so the guest's own message never even reaches the model for this.
  if (isWifiOrAccessRequest(latestMessage)) {
    return {
      reply: buildAccessGuardReply(lang, guestMessages, latestMessage),
      links: [MESSENGER_BUTTON],
      outcome: "handoff",
      toolNames: [],
      inputTokens: 0,
      outputTokens: 0,
      toolCalls: 0,
    };
  }

  // Property-name pre-resolution (DEC-029, 2026-10-15 live-retest fix): same pattern as
  // the date/capacity context notes above — resolved BEFORE the model is called, so an
  // identity (or a clarifying question) is available even on a turn where the model
  // answers free-text without calling a tool. See property-resolver.ts.
  let publicListings: Awaited<ReturnType<typeof getPublicListings>> = [];
  try {
    publicListings = await getPublicListings();
  } catch {
    publicListings = [];
  }
  const recentHistory = recentHistoryMessages(body.messages);
  // Owner rule 3 (2026-10-16): a follow-up turn carrying only dates/guests ("Nobyembre 19
  // hanggang 21, 4 kami") still resolves against a property named earlier — either the
  // guest's own prior message or one Haven itself listed — instead of asking again.
  const propertyResolution = resolveGuestPropertyMentionAcrossTurns(
    latestMessage,
    Array.isArray(publicListings) ? publicListings : [],
    recentHistory
  );
  // Owner rule 2 (2026-10-16): a bare day-range with no month attached ("19 to 21") uses
  // the month most recently named in conversation history when the latest message doesn't
  // carry one itself.
  const resolvedDates = resolveDates(latestMessage, now, recentHistory.join(" "));
  const guestCount = parseGuestCount(latestMessage);
  // DEC-029 overview-question fix (Oct 22 2026 incident): force list_properties on the
  // model's first round whenever the guest's latest message is a plain property-overview
  // question — see overview-intent.ts — so this specific question can never be answered
  // from memory, in addition to the listingsContextNote below and the system-prompt rule.
  const isOverviewQuestion = isPropertyOverviewMessage(latestMessage);

  const system =
    buildHavenSystemPrompt(lang) +
    "\n\n" +
    todayContextNote(now) +
    listingsContextNote(publicListings) +
    dateContextNote(resolvedDates) +
    buildCapacityContextNote(latestMessage) +
    buildPropertyContextNote(propertyResolution, {
      checkIn: resolvedDates?.checkIn,
      checkOut: resolvedDates?.checkOut,
      guests: guestCount,
    });
  const messages: ProviderMessage[] = body.messages.map((m) => ({ role: m.role, content: m.content }));
  const tools = getToolDefinitions();

  let inputTokens = 0;
  let outputTokens = 0;
  let toolCalls = 0;
  const toolResultsThisTurn: unknown[] = [];
  const toolExchangesThisTurn: ToolExchange[] = [];
  const toolNames = new Set<string>();
  let text = "";

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const forceToolName = round === 0 && isOverviewQuestion ? "list_properties" : undefined;
    const result = await provider.chat({ system, messages, tools, maxTokens: MAX_OUTPUT_TOKENS, forceToolName });
    inputTokens += result.usage.inputTokens;
    outputTokens += result.usage.outputTokens;
    text = result.text;

    if (result.stopReason !== "tool_use" || result.toolCalls.length === 0) break;

    toolCalls += result.toolCalls.length;
    messages.push({ role: "assistant", content: result.text, toolCalls: result.toolCalls });
    for (const call of result.toolCalls) {
      toolNames.add(call.name);
      const toolResult = await runHavenTool(call.name, call.input);
      toolResultsThisTurn.push(toolResult);
      toolExchangesThisTurn.push({ name: call.name, input: call.input, result: toolResult });
      messages.push({ role: "tool", toolCallId: call.id, name: call.name, content: JSON.stringify(toolResult) });
    }

    // Caught here, not just from the guest's own wording above, for a tool call the model
    // itself made with guests >= 24 (e.g. ambiguous phrasing the parser above missed).
    if (isLargeGroupToolCall(toolExchangesThisTurn)) {
      return largeGroupHandoffResult(lang, guestMessages, { toolNames: [...toolNames], inputTokens, outputTokens, toolCalls });
    }
  }

  if (!text.trim()) text = NO_ANSWER_FALLBACK;

  const englishMode = isEnglishContext(lang, guestMessages);

  const listingBasePrices = basePricesFromListings(publicListings);
  const allowedAmounts = collectToolAmounts(toolResultsThisTurn);
  OWNER_FACT_ALLOWED_AMOUNTS.forEach((amount) => allowedAmounts.add(amount));
  // A reply built from listingsContextNote's data (rather than an actual list_properties
  // call this turn) states the identical server-fetched pricePerNight — allow it through the
  // guard the same way a tool-result price would be (see basePricesFromListings above).
  listingBasePrices.forEach((amount) => allowedAmounts.add(amount));

  const named = shortenPropertyNamesInText(text, toolExchangesThisTurn);
  const propertyKnown = dropUnknownPropertyClaims(named, propertyResolution, lang, guestMessages);
  // Run before stripBudgetQuestions — "within your budget"/"kaya ba ng budget" would
  // otherwise also match its broader "budget" regex and get silently dropped instead of
  // replaced with the booking nudge (see owner-facts.ts).
  const affordFixed = replaceBannedAffordPhrasing(propertyKnown, lang, guestMessages);
  const noBudgetAsk = stripBudgetQuestions(affordFixed);
  const kidsClaimFixed = removeKidsFreeClaims(noBudgetAsk, lang);
  const dadalawFixed = fixDadalawPhrasing(kidsClaimFixed, lang);
  // Owner incident (2026-10-16): ban deep/literary Tagalog ("tutuklasin ng tama sa
  // checkout") in favor of Haven's plain, conversational voice — independent backstop for
  // system-prompt.ts's PLAIN_LANGUAGE_RULE.
  const tuklasinFixed = replaceTuklasinFamily(dadalawFixed, englishMode);
  const plainLanguageFixed = simplifyDeepTagalogWords(tuklasinFixed);
  // Haven must never describe her own backend to a guest ("the system"/"ang system"/
  // "sa system"/"our system") — independent backstop for the rule in system-prompt.ts.
  const systemMentionsStripped = stripSystemMentions(plainLanguageFixed);
  // Owner correction (2026-10-23): independent backstop for the "2 Bella Vita properties" /
  // "two in the Bella Vita subdivision" miscount — see post-process.ts.
  const bellaVitaFixed = fixBellaVitaMiscount(systemMentionsStripped);
  // Independent backstop (access-guard.ts): whatever the model wrote, scrub any leaked
  // Wi-Fi/password/door-code-like text before any other guard runs on it. Detected against
  // the pre-scrub text so the Messenger button can still be forced on below.
  const accessLeakDetected = containsAccessLeak(bellaVitaFixed);
  const accessScrubbed = scrubAccessLeak(bellaVitaFixed, lang, guestMessages);
  const priceChecked = limitToOneProvisional(enforcePriceClaims(accessScrubbed, allowedAmounts));
  const basePrices = collectBasePrices(toolResultsThisTurn);
  listingBasePrices.forEach((amount) => basePrices.add(amount));
  const datedAmounts = collectDatedQuoteAmounts(toolResultsThisTurn);
  const fromPrefixed = ensureFromPrefix(priceChecked, basePrices, datedAmounts, englishMode);
  const termsChecked = enforceTermsOfAddress(fromPrefixed, guestMessages, lang);
  const resolvedRange = firstResolvedDateRange(toolExchangesThisTurn);
  const stayLabel = resolvedRange ? buildStayLabel(resolvedRange.checkIn, resolvedRange.checkOut) : null;
  // Independent backstop for the DEC-029 "Thu→Sat read back as Thu→Fri" bug: whatever range
  // the model composed itself, if its end date matches the last occupied night instead of
  // the check-out date, swap the whole range for the correct stayLabel (see post-process.ts).
  const rangeFixed = fixStayRangeEndDate(termsChecked, resolvedRange, stayLabel, englishMode);
  // Owner rule 1 (2026-10-16): never let Haven re-question nights/dates the server already
  // resolved, whether that resolution came from a tool call this turn (resolvedRange) or
  // the pre-resolved date context note from the guest's own latest message (resolvedDates).
  const effectiveStayLabel = stayLabel ?? resolvedDates?.stayLabel ?? null;
  const datesResolvedThisTurn = Boolean(resolvedDates) || Boolean(resolvedRange);
  const reconfirmFixed = dropDateReconfirmationQuestions(rangeFixed, datesResolvedThisTurn, effectiveStayLabel, englishMode);
  const yearQuestionFixed = dropWhatYearQuestions(reconfirmFixed, manilaYear(now));
  const { reply: strippedReply, links: modelLinks } = extractAllowedLinks(yearQuestionFixed);
  // A bare (non-markdown) URL the model wrote straight into prose slips past
  // extractAllowedLinks entirely — including an invented domain (see post-process.ts).
  const bareUrlsStripped = stripBareUrls(strippedReply);
  const englishClean = englishMode ? stripTagalogWordsInEnglish(bareUrlsStripped) : bareUrlsStripped;
  const datesStated = ensureDatesStated(englishClean, resolvedRange, stayLabel, englishMode);
  // Owner rule (2026-10-16 / 2026-10-19): once dates are resolved this turn, never let a
  // single-date default (e.g. "10/24") get re-questioned as "1 night lang ba?" — and always
  // invite the guest to add nights instead.
  const singleNightNudged = ensureSingleNightNudge(
    datesStated,
    Boolean(resolvedDates?.singleDateDefault),
    lang,
    englishMode
  );
  const batanguenoFixed = stripBatanguenoFromTagalog(singleNightNudged, lang, englishMode);
  const reply = lang === "btg" ? ensureBatanguenoMarker(batanguenoFixed) : batanguenoFixed;

  const bookingLinks = collectBookingLinks(toolExchangesThisTurn);
  // bookingLinks may legitimately repeat the same href across different find_stay options —
  // only dedupe the model's own prose links against each other and against bookingLinks,
  // never bookingLinks against itself.
  const bookingHrefs = new Set(bookingLinks.map((l) => l.href));
  const dedupedModelLinks = dedupeLinks(modelLinks).filter((l) => !bookingHrefs.has(l.href));
  const handoffLinks = ensureHandoffLink(termsChecked, [...dedupedModelLinks, ...bookingLinks]);
  const forceHandoff =
    needsCapacityHandoff(latestMessage, toolExchangesThisTurn) || needsAmenityHandoff(toolExchangesThisTurn);
  const links = ensureAccessHandoffLink(ensureCapacityHandoffLink(handoffLinks, forceHandoff), accessLeakDetected);

  return { reply, links, toolNames: [...toolNames], inputTokens, outputTokens, toolCalls, outcome: "ai" };
}

async function logUsage(opts: {
  sessionId: string;
  ipHash: string;
  inputTokens: number;
  outputTokens: number;
  toolCalls: number;
  outcome: "ai" | "error" | "handoff";
  reason?: string;
}): Promise<void> {
  try {
    await prisma.havenChatUsage.create({
      data: {
        sessionId: opts.sessionId,
        ipHash: opts.ipHash,
        provider: HAVEN_AI_PROVIDER,
        model: HAVEN_AI_MODEL,
        inputTokens: opts.inputTokens,
        outputTokens: opts.outputTokens,
        costUsd: priceOf(HAVEN_AI_MODEL, opts.inputTokens, opts.outputTokens),
        toolCalls: opts.toolCalls,
        outcome: opts.outcome,
        reason: opts.reason ?? null,
      },
    });
  } catch (err) {
    console.error("[haven] failed to log usage:", err);
  }
}

async function persistTranscript(opts: {
  sessionId: string;
  lang: string;
  userText: string;
  assistantText?: string;
  toolNames?: string[];
}): Promise<void> {
  try {
    const rows = [
      {
        sessionId: opts.sessionId,
        lang: opts.lang,
        role: "user",
        content: maskPii(opts.userText),
        toolNames: null as string | null,
      },
      ...(opts.assistantText
        ? [
            {
              sessionId: opts.sessionId,
              lang: opts.lang,
              role: "assistant",
              content: maskPii(opts.assistantText),
              toolNames: opts.toolNames?.length ? JSON.stringify(opts.toolNames) : null,
            },
          ]
        : []),
    ];
    await prisma.havenChatTranscript.createMany({ data: rows });
  } catch (err) {
    console.error("[haven] failed to persist transcript:", err);
  }
}

/**
 * Entry point for POST /api/haven/chat. Never throws — every failure degrades to
 * `{mode: "static"}` (optionally with a `reason`) so the client's static tree always works.
 */
export async function handleHavenChat(rawBody: unknown, ip: string, now: Date = new Date()): Promise<HavenChatResponse> {
  if (!havenAiActive()) return { mode: "static" };

  const normalized = normalizeIncomingMessages(rawBody);
  const rawMessages = Array.isArray((normalized as { messages?: unknown })?.messages)
    ? ((normalized as { messages: RawMessageLike[] }).messages)
    : [];
  const oversizedUserMessage = lastMessageIsOversizedUser(rawMessages);

  // Validate against the clamped-last-message shape when the latest guest message is
  // oversized, so the rest of the body (sessionId/lang/history) still gets validated
  // normally — the oversized case gets its own friendly reply below instead of rejection.
  const validationBody = oversizedUserMessage
    ? { ...(normalized as object), messages: withClampedLastUserMessage(rawMessages) }
    : normalized;

  const parsed = chatRequestSchema.safeParse(validationBody);
  if (!parsed.success) return { mode: "static", reason: "error" };
  const body = parsed.data;

  const ipHash = hashIp(ip);

  try {
    const rate = await checkRateLimit(ipHash, now);
    if (!rate.allowed) return { mode: "static", reason: "rate_limit" };

    const overCap = await checkMonthlyCapAndAlert(now);
    if (overCap) return { mode: "static", reason: "cap" };
  } catch (err) {
    console.error("[haven] pre-flight check failed:", err);
    return { mode: "static", reason: "error" };
  }

  if (oversizedUserMessage) {
    const guestMessages = body.messages.filter((m) => m.role === "user").map((m) => m.content).join(" ");
    const reply = buildOversizedUserMessageReply(body.lang as HavenLang, guestMessages);
    await logUsage({ sessionId: body.sessionId, ipHash, inputTokens: 0, outputTokens: 0, toolCalls: 0, outcome: "handoff", reason: "oversized_message" });
    await persistTranscript({ sessionId: body.sessionId, lang: body.lang, userText: lastUserMessage(body.messages), assistantText: reply });
    return { mode: "ai", reply, links: [MESSENGER_BUTTON] };
  }

  try {
    const result = await runToolLoop(body, now);
    await logUsage({
      sessionId: body.sessionId,
      ipHash,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      toolCalls: result.toolCalls,
      outcome: result.outcome,
    });
    await persistTranscript({
      sessionId: body.sessionId,
      lang: body.lang,
      userText: lastUserMessage(body.messages),
      assistantText: result.reply,
      toolNames: result.toolNames,
    });
    return { mode: "ai", reply: result.reply, links: result.links };
  } catch (err) {
    console.error("[haven] chat error:", err);
    await logUsage({ sessionId: body.sessionId, ipHash, inputTokens: 0, outputTokens: 0, toolCalls: 0, outcome: "error", reason: "error" });
    return { mode: "static", reason: "error" };
  }
}
