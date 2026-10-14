"use client";

import { useState, useEffect, useRef, useCallback, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import type { ChatNode } from "@/lib/chat/chat-tree";
import { track } from "@/lib/analytics";
import ChatMessage from "./ChatMessage";
import ChatOptions from "./ChatOptions";

type HavenLang = "auto" | "en" | "tl" | "btg";

interface ChatLink {
  label: string;
  href: string;
}

interface Message {
  id: string;
  role: "haven" | "user";
  text: string;
  /** AI-mode only — rendered as buttons under the message. */
  links?: ChatLink[];
}

interface ChatWidgetProps {
  tree: Record<string, ChatNode>;
  /** HAVEN_AI_ENABLED minus the HAVEN_AI_KILL kill switch — decided server-side. */
  aiEnabled: boolean;
}

const STORAGE_KEY = "haven-chat";

const LANG_OPTIONS: { value: HavenLang; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "en", label: "English" },
  { value: "tl", label: "Tagalog" },
  { value: "btg", label: "Batangueño" },
];

function newSessionId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

/** `/properties/<slug>/book...` -> `<slug>`, for the haven_ai_booking_link_click event. */
function slugFromBookingLink(href: string): string | null {
  const match = href.match(/^\/properties\/([^/]+)\/book/);
  return match ? match[1] : null;
}

export default function ChatWidget({ tree, aiEnabled }: ChatWidgetProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentNodeId, setCurrentNodeId] = useState("root");
  const [initialized, setInitialized] = useState(false);
  const [lang, setLang] = useState<HavenLang>("auto");
  const [sessionId, setSessionId] = useState("");
  const [freeText, setFreeText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentNode = tree[currentNodeId];
  const isAdmin = pathname.startsWith("/admin");

  // ── Load from sessionStorage ──
  useEffect(() => {
    if (isAdmin) return;
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.messages?.length) {
          // One-time restore of a guest's chat session from sessionStorage on mount.
          setMessages(parsed.messages);
          setCurrentNodeId(parsed.currentNodeId || "root");
          setLang(parsed.lang || "auto");
          setSessionId(parsed.sessionId || newSessionId());
          setInitialized(true);
          return;
        }
      }
    } catch { /* ignore */ }

    // First visit — show root message
    const rootNode = tree.root;
    if (rootNode) {
      setMessages([{ id: "init", role: "haven", text: rootNode.message }]);
    }
    setSessionId(newSessionId());
    setInitialized(true);
  }, [tree, isAdmin]);

  // ── Save to sessionStorage on change ──
  useEffect(() => {
    if (!initialized || isAdmin) return;
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ messages, currentNodeId, lang, sessionId })
      );
    } catch { /* quota exceeded — ignore */ }
  }, [messages, currentNodeId, lang, sessionId, initialized, isAdmin]);

  // ── Auto-scroll to bottom ──
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open, aiLoading]);

  // ── Close on Escape ──
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  // ── Handle option selection (static tree — unchanged, works alongside AI mode) ──
  const handleSelect = useCallback(
    (nodeId: string, label: string) => {
      const nextNode = tree[nodeId];
      if (!nextNode) return;

      setMessages((prev) => [
        ...prev,
        { id: `u-${Date.now()}`, role: "user", text: label },
        { id: `h-${Date.now() + 1}`, role: "haven", text: nextNode.message },
      ]);
      setCurrentNodeId(nodeId);
    },
    [tree]
  );

  // ── Reset conversation ──
  const handleReset = useCallback(() => {
    const rootNode = tree.root;
    setMessages([{ id: "init", role: "haven", text: rootNode.message }]);
    setCurrentNodeId("root");
    setSessionId(newSessionId());
  }, [tree]);

  const handleLangChange = useCallback((next: HavenLang) => {
    setLang(next);
    track("haven_ai_lang_select", { lang: next });
  }, []);

  // ── Free-text submit (AI mode) ──
  const handleFreeTextSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const text = freeText.trim();
      if (!text || aiLoading) return;

      setFreeText("");
      const userMessage: Message = { id: `u-${Date.now()}`, role: "user", text };
      const historySource = [...messages, userMessage];
      setMessages(historySource);
      setAiLoading(true);
      track("haven_ai_message", { lang });

      const fallbackToTree = (reason: string) => {
        track("haven_ai_fallback", { reason });
        setMessages((prev) => [...prev, { id: `h-${Date.now()}`, role: "haven", text: tree.root.message }]);
        setCurrentNodeId("root");
      };

      try {
        const payload = {
          sessionId,
          lang,
          messages: historySource.slice(-12).map((m) => ({
            role: m.role === "haven" ? ("assistant" as const) : ("user" as const),
            content: m.text,
          })),
        };
        const res = await fetch("/api/haven/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();

        if (data.mode === "ai" && typeof data.reply === "string") {
          const links: ChatLink[] | undefined = Array.isArray(data.links) ? data.links : undefined;
          setMessages((prev) => [...prev, { id: `h-${Date.now()}`, role: "haven", text: data.reply, links }]);
          const bookingLinkCount = (links ?? []).filter((l) => slugFromBookingLink(l.href)).length;
          if (bookingLinkCount > 0) {
            track("haven_ai_availability_checked", { available: bookingLinkCount });
          }
        } else {
          fallbackToTree(typeof data.reason === "string" ? data.reason : "unknown");
        }
      } catch {
        fallbackToTree("error");
      } finally {
        setAiLoading(false);
      }
    },
    [freeText, aiLoading, messages, lang, sessionId, tree]
  );

  const handleLinkClick = useCallback((href: string) => {
    const slug = slugFromBookingLink(href);
    if (slug) track("haven_ai_booking_link_click", { slug });
    if (href.startsWith("/")) setOpen(false);
  }, []);

  // Don't render on admin pages or before hydration
  if (isAdmin || !initialized) return null;

  return (
    <>
      {/* ── Floating Bubble ── */}
      <button
        id="chat-fab"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Chat with Haven"}
        className={`fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 cursor-pointer ${
          open
            ? "bg-charcoal hover:bg-charcoal/90"
            : "bg-forest hover:bg-forest/90 animate-[haven-pulse_3s_ease-in-out_infinite]"
        }`}
      >
        {open ? (
          <i className="fa-solid fa-xmark text-white text-[20px]" />
        ) : (
          <i className="fa-solid fa-comment-dots text-white text-[22px]" />
        )}
      </button>

      {/* ── Chat Panel ── */}
      {open && (
        <div
          role="dialog"
          aria-label="Haven Chat Assistant"
          className="fixed z-50 bottom-22 right-5 w-[360px] max-w-[calc(100vw-2.5rem)] bg-offwhite rounded-[20px] shadow-[0_8px_40px_rgba(0,0,0,.15)] border border-black/[.06] flex flex-col overflow-hidden sm:h-[520px] h-[calc(100vh-8rem)] max-h-[520px]"
        >
          {/* Header */}
          <div className="bg-forest px-5 py-4 flex items-center gap-3 flex-shrink-0">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <i className="fa-solid fa-leaf text-white text-[15px]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-serif font-semibold text-white text-[15px] leading-tight">
                Haven
              </h3>
              <p className="text-white/60 text-[11px]">Virtual Assistant</p>
            </div>
            <button
              onClick={handleReset}
              aria-label="Restart conversation"
              title="Restart conversation"
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-arrow-rotate-left text-white/70 text-[12px]" />
            </button>
          </div>

          {/* Language toggle (AI mode only) */}
          {aiEnabled && (
            <div className="flex gap-1.5 px-4 py-2 border-b border-black/[.05] bg-white/40 flex-shrink-0 overflow-x-auto">
              {LANG_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleLangChange(opt.value)}
                  className={`text-[11px] font-medium rounded-full px-3 py-1 whitespace-nowrap transition-colors cursor-pointer ${
                    lang === opt.value
                      ? "bg-forest text-white"
                      : "bg-charcoal/[.06] text-charcoal/50 hover:bg-charcoal/[.10]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-0"
          >
            {messages.map((msg) => (
              <div key={msg.id}>
                <ChatMessage role={msg.role} text={msg.text} />
                {msg.links && msg.links.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3 pl-9">
                    {msg.links.map((link) =>
                      link.href.startsWith("/") ? (
                        <Link
                          key={link.href + link.label}
                          href={link.href}
                          onClick={() => handleLinkClick(link.href)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-coral text-white text-[12.5px] font-semibold hover:bg-coral-dark transition-colors shadow-coral active:scale-[.97]"
                        >
                          {link.label}
                          <i className="fa-solid fa-arrow-right text-[10px]" />
                        </Link>
                      ) : (
                        <a
                          key={link.href + link.label}
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => handleLinkClick(link.href)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-coral text-white text-[12.5px] font-semibold hover:bg-coral-dark transition-colors shadow-coral active:scale-[.97]"
                        >
                          {link.label}
                          <i className="fa-solid fa-arrow-right text-[10px]" />
                        </a>
                      )
                    )}
                  </div>
                )}
              </div>
            ))}

            {aiLoading && (
              <div className="flex justify-start mb-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-forest flex items-center justify-center mr-2 mt-0.5">
                  <i className="fa-solid fa-leaf text-white text-[11px]" />
                </div>
                <div className="rounded-[14px] px-4 py-3 bg-white border border-black/[.06] shadow-[0_1px_4px_rgba(0,0,0,.04)] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-charcoal/30 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-charcoal/30 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-charcoal/30 animate-bounce" />
                </div>
              </div>
            )}

            {/* Options for current node — topic buttons and "Talk to a Human" always remain */}
            {currentNode?.options && currentNode.options.length > 0 && (
              <ChatOptions
                options={currentNode.options}
                onSelect={handleSelect}
              />
            )}

            {/* CTA link for current node */}
            {currentNode?.link && (
              <div className="pl-9 mb-3">
                {currentNode.link.external ? (
                  <a
                    href={currentNode.link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-coral text-white text-[12.5px] font-semibold hover:bg-coral-dark transition-colors shadow-coral active:scale-[.97]"
                  >
                    {currentNode.link.label}
                    <i className="fa-solid fa-arrow-right text-[10px]" />
                  </a>
                ) : (
                  <Link
                    href={currentNode.link.href}
                    onClick={() => setOpen(false)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-coral text-white text-[12.5px] font-semibold hover:bg-coral-dark transition-colors shadow-coral active:scale-[.97]"
                  >
                    {currentNode.link.label}
                    <i className="fa-solid fa-arrow-right text-[10px]" />
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Free-text input (AI mode) */}
          {aiEnabled && (
            <div className="border-t border-black/[.05] bg-white/70 flex-shrink-0">
              <p className="text-[10.5px] text-charcoal/40 px-4 pt-2 leading-snug">
                Haven is an AI assistant. Chats are saved for 90 days to improve service, with
                phone numbers and emails hidden. Please don&apos;t share payment details.{" "}
                <Link href="/privacy" onClick={() => setOpen(false)} className="underline hover:text-charcoal/60">
                  Privacy
                </Link>
              </p>
              <form onSubmit={handleFreeTextSubmit} className="flex items-center gap-2 px-4 py-2.5">
                <input
                  type="text"
                  value={freeText}
                  onChange={(e) => setFreeText(e.target.value)}
                  placeholder="Ask Haven anything…"
                  maxLength={600}
                  disabled={aiLoading}
                  aria-label="Message Haven"
                  className="flex-1 min-w-0 text-[13px] rounded-full px-4 py-2 bg-charcoal/[.05] border border-black/[.06] focus:outline-none focus:border-forest/40 disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={aiLoading || !freeText.trim()}
                  aria-label="Send message"
                  className="w-9 h-9 flex-shrink-0 rounded-full bg-forest hover:bg-forest/90 disabled:opacity-40 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <i className="fa-solid fa-paper-plane text-white text-[13px]" />
                </button>
              </form>
            </div>
          )}

          {/* Footer */}
          <div className="px-4 py-3 border-t border-black/[.05] bg-white/50 flex-shrink-0">
            <p className="text-[11px] text-charcoal/35 text-center">
              Haven in Lipa &middot; Virtual Assistant
            </p>
          </div>
        </div>
      )}
    </>
  );
}
