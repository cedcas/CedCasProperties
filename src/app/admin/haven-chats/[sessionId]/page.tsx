import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  HAVEN_CHAT_LANG_LABELS,
  parseToolNames,
  isQaSession,
  formatManilaDateTime,
} from "@/lib/haven-chats";
import { renderMarkdownBold } from "@/lib/chat/render-markdown-bold";

export const dynamic = "force-dynamic";

export default async function HavenChatDetailPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;

  const [messages, usageRows] = await Promise.all([
    prisma.havenChatTranscript.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.havenChatUsage.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (messages.length === 0) notFound();

  const totalCost = usageRows.reduce((sum, u) => sum + Number(u.costUsd), 0);
  const totalInputTokens = usageRows.reduce((sum, u) => sum + u.inputTokens, 0);
  const totalOutputTokens = usageRows.reduce((sum, u) => sum + u.outputTokens, 0);
  const lang = messages.find((m) => m.role === "user")?.lang ?? messages[0].lang;

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/haven-chats" className="text-[13px] font-semibold text-forest hover:underline">
          ← Back to Haven Chats
        </Link>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="font-serif font-semibold text-charcoal text-[1.6rem] font-mono break-all">{sessionId}</h1>
          {isQaSession(sessionId) && (
            <span className="text-[11px] font-sans font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">QA traffic</span>
          )}
        </div>
        <p className="text-charcoal/45 text-[14px] mt-1">
          {HAVEN_CHAT_LANG_LABELS[lang] ?? lang} · {messages.length} message{messages.length !== 1 ? "s" : ""} ·{" "}
          {formatManilaDateTime(messages[0].createdAt)} – {formatManilaDateTime(messages[messages.length - 1].createdAt)}
        </p>
      </div>

      {/* Session cost summary */}
      <div className="bg-white rounded-[16px] shadow-[0_2px_12px_rgba(44,44,44,.07)] border border-black/[.04] p-5 mb-6 flex flex-wrap gap-6">
        <div>
          <div className="text-[11px] font-semibold text-charcoal/50 uppercase tracking-wide">Cost</div>
          <div className="text-[18px] font-semibold text-charcoal mt-0.5">${totalCost.toFixed(4)}</div>
        </div>
        <div>
          <div className="text-[11px] font-semibold text-charcoal/50 uppercase tracking-wide">Turns</div>
          <div className="text-[18px] font-semibold text-charcoal mt-0.5">{usageRows.length}</div>
        </div>
        <div>
          <div className="text-[11px] font-semibold text-charcoal/50 uppercase tracking-wide">Input Tokens</div>
          <div className="text-[18px] font-semibold text-charcoal mt-0.5">{totalInputTokens.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-[11px] font-semibold text-charcoal/50 uppercase tracking-wide">Output Tokens</div>
          <div className="text-[18px] font-semibold text-charcoal mt-0.5">{totalOutputTokens.toLocaleString()}</div>
        </div>
      </div>

      {/* Chat transcript */}
      <div className="flex flex-col gap-4">
        {messages.map((m) => {
          const isUser = m.role === "user";
          const tools = parseToolNames(m.toolNames);
          return (
            <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-[14px] px-4 py-3 ${isUser ? "bg-forest text-white" : "bg-white border border-black/[.06]"}`}>
                <div className={`text-[11px] mb-1.5 ${isUser ? "text-white/60" : "text-charcoal/40"}`}>
                  {isUser ? "Guest" : "Haven"} · {formatManilaDateTime(m.createdAt)}
                </div>
                {/* Markdown bold (**text**) renders via safe React elements — same
                    renderMarkdownBold the live chat bubble uses — never
                    dangerouslySetInnerHTML, so there's no HTML-injection surface even though
                    this is stored, untrusted conversation content. Without this, a reply like
                    "...via **Messenger**" showed literal asterisks here (the owner reviews
                    transcripts on this page). */}
                <p className={`text-[13.5px] leading-[1.6] ${isUser ? "text-white" : "text-charcoal/85"}`}>
                  {renderMarkdownBold(m.content)}
                </p>
                {!isUser && tools.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-black/[.06] flex flex-wrap gap-1.5">
                    {tools.map((t) => (
                      <span key={t} className="text-[10px] font-mono font-semibold text-forest bg-forest/10 px-1.5 py-0.5 rounded-full">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
