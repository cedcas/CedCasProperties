"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import type { ChatNode } from "@/lib/chat/chat-tree";
import ChatMessage from "./ChatMessage";
import ChatOptions from "./ChatOptions";

interface Message {
  id: string;
  role: "haven" | "user";
  text: string;
}

interface ChatWidgetProps {
  tree: Record<string, ChatNode>;
}

const STORAGE_KEY = "haven-chat";

export default function ChatWidget({ tree }: ChatWidgetProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentNodeId, setCurrentNodeId] = useState("root");
  const [initialized, setInitialized] = useState(false);
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
          setMessages(parsed.messages);
          setCurrentNodeId(parsed.currentNodeId || "root");
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
    setInitialized(true);
  }, [tree, isAdmin]);

  // ── Save to sessionStorage on change ──
  useEffect(() => {
    if (!initialized || isAdmin) return;
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ messages, currentNodeId })
      );
    } catch { /* quota exceeded — ignore */ }
  }, [messages, currentNodeId, initialized, isAdmin]);

  // ── Auto-scroll to bottom ──
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  // ── Close on Escape ──
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  // ── Handle option selection ──
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
  }, [tree]);

  // Don't render on admin pages or before hydration
  if (isAdmin || !initialized) return null;

  return (
    <>
      {/* ── Floating Bubble ── */}
      <button
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

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-0"
          >
            {messages.map((msg) => (
              <ChatMessage key={msg.id} role={msg.role} text={msg.text} />
            ))}

            {/* Options for current node */}
            {currentNode?.options && currentNode.options.length > 0 && (
              <ChatOptions
                options={currentNode.options}
                onSelect={handleSelect}
              />
            )}

            {/* CTA link for current node */}
            {currentNode?.link && (
              <div className="pl-9 mb-3">
                <Link
                  href={currentNode.link.href}
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-coral text-white text-[12.5px] font-semibold hover:bg-coral-dark transition-colors shadow-coral active:scale-[.97]"
                >
                  {currentNode.link.label}
                  <i className="fa-solid fa-arrow-right text-[10px]" />
                </Link>
              </div>
            )}
          </div>

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
