import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  HAVEN_CHATS_PAGE_SIZE,
  HAVEN_CHAT_LANG_LABELS,
  parseHavenChatsParams,
  buildDateRangeWhere,
  buildListWhere,
  buildConversationSummaries,
  formatManilaDateTime,
  type HavenChatsFilters,
} from "@/lib/haven-chats";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

function pageHref(filters: HavenChatsFilters, page: number): string {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.search) params.set("search", filters.search);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/admin/haven-chats?${qs}` : "/admin/haven-chats";
}

export default async function HavenChatsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const filters = parseHavenChatsParams(sp);
  const listWhere = buildListWhere(filters);
  const dateWhere = buildDateRangeWhere(filters);
  const skip = (filters.page - 1) * HAVEN_CHATS_PAGE_SIZE;

  const [pageGroups, allSessionIds] = await Promise.all([
    prisma.havenChatTranscript.groupBy({
      by: ["sessionId"],
      where: listWhere,
      _max: { createdAt: true },
      orderBy: { _max: { createdAt: "desc" } },
      skip,
      take: HAVEN_CHATS_PAGE_SIZE,
    }),
    prisma.havenChatTranscript.findMany({
      where: listWhere,
      distinct: ["sessionId"],
      select: { sessionId: true },
    }),
  ]);

  const order = pageGroups
    .filter((g) => g._max.createdAt)
    .map((g) => ({ sessionId: g.sessionId, lastMessageAt: g._max.createdAt as Date }));
  const sessionIds = order.map((o) => o.sessionId);

  const [messageCountGroups, firstMessages, usageGroups] =
    sessionIds.length === 0
      ? [[], [], []]
      : await Promise.all([
          prisma.havenChatTranscript.groupBy({
            by: ["sessionId"],
            where: { sessionId: { in: sessionIds }, ...dateWhere },
            _count: { _all: true },
          }),
          prisma.havenChatTranscript.findMany({
            where: { sessionId: { in: sessionIds }, role: "user", ...dateWhere },
            orderBy: { createdAt: "asc" },
            distinct: ["sessionId"],
            select: { sessionId: true, lang: true, content: true },
          }),
          prisma.havenChatUsage.groupBy({
            by: ["sessionId"],
            where: { sessionId: { in: sessionIds } },
            _sum: { costUsd: true },
            _count: { _all: true },
          }),
        ]);

  const messageCounts = messageCountGroups.map((g) => ({ sessionId: g.sessionId, count: g._count._all }));
  const usageSums = usageGroups.map((g) => ({
    sessionId: g.sessionId,
    costUsd: g._sum.costUsd ? Number(g._sum.costUsd) : null,
    turnCount: g._count._all,
  }));

  const conversations = buildConversationSummaries(order, messageCounts, firstMessages, usageSums);

  const total = allSessionIds.length;
  const totalPages = Math.max(1, Math.ceil(total / HAVEN_CHATS_PAGE_SIZE));

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="font-serif font-semibold text-charcoal text-[1.8rem]">Haven Chats</h1>
        <p className="text-charcoal/45 text-[14px] mt-1">
          {total.toLocaleString()} conversation{total !== 1 ? "s" : ""} · read-only transcript viewer
        </p>
      </div>

      {/* Filters — GET form, state lives entirely in the URL */}
      <form
        method="get"
        className="bg-white rounded-[16px] shadow-[0_2px_12px_rgba(44,44,44,.07)] border border-black/[.04] p-5 mb-6 flex flex-wrap gap-3 items-end"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="from" className="text-[11px] font-semibold text-charcoal/50 uppercase tracking-wide">From</label>
          <input
            type="date"
            id="from"
            name="from"
            defaultValue={filters.from ?? ""}
            className="border border-black/[.1] rounded-[8px] px-3 py-2 text-[13px] text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/30"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="to" className="text-[11px] font-semibold text-charcoal/50 uppercase tracking-wide">To</label>
          <input
            type="date"
            id="to"
            name="to"
            defaultValue={filters.to ?? ""}
            className="border border-black/[.1] rounded-[8px] px-3 py-2 text-[13px] text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/30"
          />
        </div>
        <div className="flex-1 min-w-[220px] flex flex-col gap-1">
          <label htmlFor="search" className="text-[11px] font-semibold text-charcoal/50 uppercase tracking-wide">Search</label>
          <input
            type="text"
            id="search"
            name="search"
            placeholder="Message content or session id…"
            defaultValue={filters.search}
            className="w-full border border-black/[.1] rounded-[8px] px-3 py-2 text-[13px] text-charcoal placeholder-charcoal/35 focus:outline-none focus:ring-2 focus:ring-forest/30"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 rounded-[8px] text-[13px] font-semibold text-white bg-forest hover:bg-forest/90 transition-colors"
        >
          Filter
        </button>
        <Link
          href="/admin/haven-chats"
          className="px-4 py-2 rounded-[8px] text-[13px] text-charcoal/50 hover:text-charcoal border border-black/[.1] hover:bg-black/[.03] transition-colors"
        >
          Clear
        </Link>
      </form>

      {/* Table */}
      <div className="bg-white rounded-[16px] shadow-[0_2px_12px_rgba(44,44,44,.07)] border border-black/[.04] overflow-hidden">
        {conversations.length === 0 ? (
          <div className="py-20 text-center">
            <i className="fa-solid fa-comments text-charcoal/20 text-[3rem] mb-4 block" />
            <p className="text-charcoal/40 text-[15px]">No conversations found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-black/[.06] bg-[#F8F9FA]">
                  {["Date/Time (Manila)", "Language", "Messages", "First Guest Question", "Cost"].map((h) => (
                    <th key={h} className="text-left px-5 py-3.5 text-[11px] font-semibold text-charcoal/50 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[.05]">
                {conversations.map((c) => (
                  <tr key={c.sessionId} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-5 py-4">
                      <Link href={`/admin/haven-chats/${encodeURIComponent(c.sessionId)}`} className="group">
                        <div className="font-medium text-charcoal text-[13.5px] group-hover:text-forest transition-colors whitespace-nowrap">
                          {formatManilaDateTime(c.lastMessageAt)}
                        </div>
                        <div className="text-charcoal/40 text-[11px] font-mono flex items-center gap-1.5">
                          {c.sessionId}
                          {c.isQaSession && (
                            <span className="text-[10px] font-sans font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">QA</span>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-[13px] text-charcoal/70">{HAVEN_CHAT_LANG_LABELS[c.lang] ?? c.lang}</td>
                    <td className="px-5 py-4 text-[13px] text-charcoal/70 text-center">{c.messageCount}</td>
                    <td className="px-5 py-4 text-[13px] text-charcoal/80 max-w-[360px]">{c.firstGuestQuestion || "—"}</td>
                    <td className="px-5 py-4 text-[13px] text-charcoal/70 whitespace-nowrap">
                      {c.costUsd !== null ? `$${c.costUsd.toFixed(4)}` : "—"}
                      {c.turnCount > 0 && <span className="text-charcoal/40"> · {c.turnCount} turn{c.turnCount !== 1 ? "s" : ""}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-black/[.05]">
            <span className="text-[12px] text-charcoal/40">
              Page {filters.page} of {totalPages}
            </span>
            <div className="flex gap-2">
              {filters.page > 1 ? (
                <Link href={pageHref(filters, filters.page - 1)} className="px-3 py-1.5 rounded-[7px] text-[12px] border border-black/[.1] text-charcoal/60 hover:bg-black/[.03] transition-colors">
                  Previous
                </Link>
              ) : (
                <span className="px-3 py-1.5 rounded-[7px] text-[12px] border border-black/[.1] text-charcoal/30 cursor-not-allowed">Previous</span>
              )}
              {filters.page < totalPages ? (
                <Link href={pageHref(filters, filters.page + 1)} className="px-3 py-1.5 rounded-[7px] text-[12px] border border-black/[.1] text-charcoal/60 hover:bg-black/[.03] transition-colors">
                  Next
                </Link>
              ) : (
                <span className="px-3 py-1.5 rounded-[7px] text-[12px] border border-black/[.1] text-charcoal/30 cursor-not-allowed">Next</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
