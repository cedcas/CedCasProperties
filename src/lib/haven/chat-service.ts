import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getChatProvider, type ProviderMessage } from "./provider";
import { getToolDefinitions, runHavenTool } from "./tools";
import { buildHavenSystemPrompt, type HavenLang } from "./system-prompt";
import { maskPii } from "./masking";
import { resolveDates } from "./dates";
import {
  extractAllowedLinks,
  collectToolAmounts,
  enforcePriceClaims,
  collectBookingLinks,
  dedupeLinks,
  ensureHandoffLink,
  limitToOneProvisional,
  ensureBatanguenoMarker,
  enforceTermsOfAddress,
  shortenPropertyNamesInText,
  fixDadalawPhrasing,
  isEnglishContext,
  stripTagalogWordsInEnglish,
  firstResolvedDateRange,
  ensureDatesStated,
  type LinkButton,
  type ToolExchange,
} from "./post-process";
import {
  OWNER_FACT_ALLOWED_AMOUNTS,
  stripBudgetQuestions,
  removeKidsFreeClaims,
  needsCapacityHandoff,
  ensureCapacityHandoffLink,
} from "./owner-facts";
import { checkRateLimit, checkMonthlyCapAndAlert, hashIp } from "./rate-limit";
import {
  havenAiActive,
  costUsd as priceOf,
  HAVEN_AI_MODEL,
  HAVEN_AI_PROVIDER,
  MAX_MESSAGE_CHARS,
  MAX_MESSAGES,
  MAX_OUTPUT_TOKENS,
  MAX_TOOL_ROUNDS,
} from "./config";

export const chatRequestSchema = z.object({
  sessionId: z.string().min(8).max(100),
  lang: z.enum(["en", "tl", "btg", "auto"]),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(MAX_MESSAGE_CHARS),
      })
    )
    .min(1)
    .max(MAX_MESSAGES),
});

export type ChatRequestBody = z.infer<typeof chatRequestSchema>;

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
}

/**
 * Runs the same server-side date resolver the `resolve_dates` tool uses (dates.ts) on the
 * guest's latest message BEFORE the model is called. The model is instructed to always call
 * `resolve_dates` itself, but live testing showed it sometimes skips that and asks the guest
 * "2024 o 2025?" instead — this pre-resolves whatever date phrase is already detectable and
 * hands the model the answer directly, so it never needs to ask for the year at all (a
 * detected phrase always resolves to the next upcoming occurrence, never the past).
 */
function dateContextNote(latestUserMessage: string, now: Date): string {
  const resolved = resolveDates(latestUserMessage, now);
  if (!resolved) return "";
  return (
    "\n\nContext (already resolved by the system, not a guest claim): the guest's most " +
    `recent message contains a date phrase that resolves to checkIn=${resolved.checkIn}, ` +
    `checkOut=${resolved.checkOut} (${resolved.interpreted}). If this is the date range the ` +
    "guest means, use these exact dates for any tool call or reply about this request " +
    "instead of asking again. These are already the next upcoming occurrence of that phrase " +
    "— never ask the guest what year they mean."
  );
}

/**
 * Drives the model <-> tool exchange for one guest message. All provider calls within this
 * loop count as ONE HavenChatUsage row (see rate-limit.ts: a row is a guest message, not a
 * model call) — usage is summed across rounds by the caller.
 */
async function runToolLoop(body: ChatRequestBody, now: Date): Promise<ToolLoopResult> {
  const provider = getChatProvider();
  const system = buildHavenSystemPrompt(body.lang as HavenLang) + dateContextNote(lastUserMessage(body.messages), now);
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
    const result = await provider.chat({ system, messages, tools, maxTokens: MAX_OUTPUT_TOKENS });
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
  }

  if (!text.trim()) text = NO_ANSWER_FALLBACK;

  const lang = body.lang as HavenLang;
  const guestMessages = body.messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join(" ");
  const latestGuestMessage = lastUserMessage(body.messages);
  const englishMode = isEnglishContext(lang, guestMessages);

  const allowedAmounts = collectToolAmounts(toolResultsThisTurn);
  OWNER_FACT_ALLOWED_AMOUNTS.forEach((amount) => allowedAmounts.add(amount));

  const named = shortenPropertyNamesInText(text, toolExchangesThisTurn);
  const noBudgetAsk = stripBudgetQuestions(named);
  const kidsClaimFixed = removeKidsFreeClaims(noBudgetAsk, lang);
  const dadalawFixed = fixDadalawPhrasing(kidsClaimFixed, lang);
  const priceChecked = limitToOneProvisional(enforcePriceClaims(dadalawFixed, allowedAmounts));
  const termsChecked = enforceTermsOfAddress(priceChecked, guestMessages, lang);
  const { reply: strippedReply, links: modelLinks } = extractAllowedLinks(termsChecked);
  const englishClean = englishMode ? stripTagalogWordsInEnglish(strippedReply) : strippedReply;
  const datesStated = ensureDatesStated(englishClean, firstResolvedDateRange(toolExchangesThisTurn), englishMode);
  const reply = lang === "btg" ? ensureBatanguenoMarker(datesStated) : datesStated;

  const bookingLinks = collectBookingLinks(toolExchangesThisTurn);
  // bookingLinks may legitimately repeat the same href across different find_stay options —
  // only dedupe the model's own prose links against each other and against bookingLinks,
  // never bookingLinks against itself.
  const bookingHrefs = new Set(bookingLinks.map((l) => l.href));
  const dedupedModelLinks = dedupeLinks(modelLinks).filter((l) => !bookingHrefs.has(l.href));
  const handoffLinks = ensureHandoffLink(termsChecked, [...dedupedModelLinks, ...bookingLinks]);
  const links = ensureCapacityHandoffLink(handoffLinks, needsCapacityHandoff(latestGuestMessage, toolExchangesThisTurn));

  return { reply, links, toolNames: [...toolNames], inputTokens, outputTokens, toolCalls };
}

async function logUsage(opts: {
  sessionId: string;
  ipHash: string;
  inputTokens: number;
  outputTokens: number;
  toolCalls: number;
  outcome: "ai" | "error";
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

  const parsed = chatRequestSchema.safeParse(rawBody);
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

  try {
    const result = await runToolLoop(body, now);
    await logUsage({
      sessionId: body.sessionId,
      ipHash,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      toolCalls: result.toolCalls,
      outcome: "ai",
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
