/**
 * Read-only grouping/filtering for the admin Haven Chats viewer (`/admin/haven-chats`).
 *
 * `HavenChatTranscript` has one row per message (guest or Haven); a "conversation" is every
 * row sharing a `sessionId`, which is a client-generated UUID — not a FK, so it must be
 * grouped at read time. `HavenChatUsage` has one row per guest message that reached the
 * model (a "turn") and is summed per session for a rough cost figure. Both tables are
 * additive-only (DEC-029/chat-service.ts); nothing here writes to either.
 */

export const HAVEN_CHATS_PAGE_SIZE = 25;
export const FIRST_QUESTION_MAX_CHARS = 140;

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface HavenChatsFilters {
  /** Asia/Manila calendar day, inclusive, `YYYY-MM-DD`. */
  from?: string;
  /** Asia/Manila calendar day, inclusive, `YYYY-MM-DD`. */
  to?: string;
  search: string;
  page: number;
}

type RawSearchParams = Record<string, string | string[] | undefined>;

function firstValue(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/**
 * Parses `/admin/haven-chats`'s URL search params into validated filters. This is a
 * read-only filter bar, not a form submission — any malformed value (a bad date, a
 * non-numeric page) is dropped silently and falls back to "no filter" rather than erroring.
 */
export function parseHavenChatsParams(sp: RawSearchParams): HavenChatsFilters {
  const rawFrom = firstValue(sp.from);
  const rawTo = firstValue(sp.to);
  const rawSearch = firstValue(sp.search);
  const rawPage = firstValue(sp.page);

  const from = rawFrom && DATE_KEY_RE.test(rawFrom) ? rawFrom : undefined;
  const to = rawTo && DATE_KEY_RE.test(rawTo) ? rawTo : undefined;
  const search = (rawSearch ?? "").trim().slice(0, 200);
  const parsedPage = Number.parseInt(rawPage ?? "1", 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  return { from, to, search, page };
}

/**
 * A Manila (UTC+8, no DST — see `src/lib/dates.ts`) calendar day as a half-open UTC instant
 * range `[start, end)`. Chat timestamps are real instants (`DateTime @default(now())`), not
 * the UTC-midnight-anchored calendar dates stays use, so this does its own conversion rather
 * than reusing `toUtcMidnight`.
 */
export function manilaDayRangeUtc(dateKey: string): { start: Date; end: Date } {
  const start = new Date(`${dateKey}T00:00:00+08:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

/**
 * `createdAt` bounds shared by the session-grouping query and the per-session stats query,
 * so a date-range filter narrows what counts as "in this conversation" the same way in both
 * places. Loosely typed (`Record<string, unknown>`) to match this codebase's other
 * hand-built Prisma `where` objects (e.g. `src/app/api/admin/logs/route.ts`) and because the
 * same shape is spread into both `HavenChatTranscript` and `HavenChatUsage` where clauses.
 */
export function buildDateRangeWhere(filters: Pick<HavenChatsFilters, "from" | "to">): Record<string, unknown> {
  const createdAt: { gte?: Date; lt?: Date } = {};
  if (filters.from) createdAt.gte = manilaDayRangeUtc(filters.from).start;
  if (filters.to) createdAt.lt = manilaDayRangeUtc(filters.to).end;
  return Object.keys(createdAt).length > 0 ? { createdAt } : {};
}

/**
 * Adds the free-text search (session id or message content) on top of the date range.
 * Used only to decide which sessions appear in the list — per-session stats always use
 * {@link buildDateRangeWhere} alone, so a message count or "first question" isn't skewed by
 * which single row happened to match the search term.
 */
export function buildListWhere(filters: HavenChatsFilters): Record<string, unknown> {
  const where = buildDateRangeWhere(filters);
  if (!filters.search) return where;
  return {
    ...where,
    OR: [{ sessionId: { contains: filters.search } }, { content: { contains: filters.search } }],
  };
}

/** Truncates to `max` chars, trimming whitespace first, with a trailing ellipsis when cut. */
export function truncate(text: string, max: number = FIRST_QUESTION_MAX_CHARS): string {
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

/** QA/test traffic convention (2026-10-23): a sessionId starting "hilpm-" is not a real guest. */
export function isQaSession(sessionId: string): boolean {
  return sessionId.startsWith("hilpm-");
}

/** Safely parses the JSON-array `toolNames` column; never throws on bad/missing data. */
export function parseToolNames(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** "Tue, Oct 13, 2026, 9:30 PM" in Lipa time, whatever the server's own timezone. */
export function formatManilaDateTime(d: Date): string {
  return d.toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export interface ConversationOrderRow {
  sessionId: string;
  lastMessageAt: Date;
}
export interface MessageCountRow {
  sessionId: string;
  count: number;
}
export interface FirstMessageRow {
  sessionId: string;
  lang: string;
  content: string;
}
export interface UsageSumRow {
  sessionId: string;
  costUsd: number | null;
  turnCount: number;
}

export interface HavenChatConversationSummary {
  sessionId: string;
  lastMessageAt: Date;
  lang: string;
  messageCount: number;
  firstGuestQuestion: string;
  costUsd: number | null;
  turnCount: number;
  isQaSession: boolean;
}

/**
 * Combines the page's ordered session ids (from the `groupBy`/`ORDER BY` latest-message
 * query) with the separately-fetched per-session stats. A session absent from one of the
 * stats arrays (e.g. no `HavenChatUsage` row because every turn was a static-mode/handoff
 * reply) still renders, with sane defaults, rather than being dropped from the page.
 */
export function buildConversationSummaries(
  order: ConversationOrderRow[],
  messageCounts: MessageCountRow[],
  firstMessages: FirstMessageRow[],
  usageSums: UsageSumRow[]
): HavenChatConversationSummary[] {
  const countBySession = new Map(messageCounts.map((r) => [r.sessionId, r.count]));
  const firstBySession = new Map(firstMessages.map((r) => [r.sessionId, r]));
  const usageBySession = new Map(usageSums.map((r) => [r.sessionId, r]));

  return order.map((o) => {
    const first = firstBySession.get(o.sessionId);
    const usage = usageBySession.get(o.sessionId);
    return {
      sessionId: o.sessionId,
      lastMessageAt: o.lastMessageAt,
      lang: first?.lang ?? "auto",
      messageCount: countBySession.get(o.sessionId) ?? 0,
      firstGuestQuestion: first ? truncate(first.content) : "",
      costUsd: usage?.costUsd ?? null,
      turnCount: usage?.turnCount ?? 0,
      isQaSession: isQaSession(o.sessionId),
    };
  });
}

export const HAVEN_CHAT_LANG_LABELS: Record<string, string> = {
  en: "English",
  tl: "Tagalog",
  btg: "Batangueño",
  auto: "Auto",
};
