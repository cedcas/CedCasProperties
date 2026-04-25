"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Booking = {
  id: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkIn: string;
  checkOut: string;
  status: string;
  property: { id: number; name: string; type: string };
};

type GuestMessage = {
  id: number;
  subject: string;
  body: string;
  trigger: "auto" | "manual";
  status: string;
  sentAt: string;
  quickReplyId: number | null;
};

type QuickReply = {
  id: number;
  name: string;
  subject: string;
  bodyTemplate: string;
  propertyId: number | null;
  trigger: "auto" | "manual";
  isActive: boolean;
};

function fmtShortDate(d: string | Date): string {
  return new Date(d).toLocaleDateString("en-PH", { month: "numeric", day: "numeric" });
}

function fmtTime(d: string | Date): string {
  return new Date(d).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] ?? full;
}

export default function ThreadDetail({ bookingId }: { bookingId: number }) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [messages, setMessages] = useState<GuestMessage[]>([]);
  const [replies, setReplies] = useState<QuickReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [picking, setPicking] = useState(false);
  const [freeText, setFreeText] = useState("");
  const [freeSubject, setFreeSubject] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const feedEnd = useRef<HTMLDivElement>(null);

  const load = async () => {
    const [threadRes, repliesRes] = await Promise.all([
      fetch(`/api/admin/guest-messages/${bookingId}`),
      fetch(`/api/admin/quick-replies`),
    ]);
    if (!threadRes.ok) {
      setError("Thread not found");
      setLoading(false);
      return;
    }
    const thread = await threadRes.json();
    const allReplies: QuickReply[] = await repliesRes.json();
    setBooking(thread.booking);
    setMessages(thread.messages);
    setReplies(
      allReplies
        .filter(
          (r) => r.isActive && (r.propertyId === null || r.propertyId === thread.booking.property.id),
        )
        .sort((a, b) => {
          if (a.trigger !== b.trigger) return a.trigger === "manual" ? -1 : 1;
          return a.name.localeCompare(b.name);
        }),
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  useEffect(() => {
    feedEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const sendTemplate = async (quickReplyId: number) => {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/guest-messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, quickReplyId }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Send failed");
      setPicking(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  };

  // Auto templates send immediately; manual templates load into the composer
  // so the admin can edit (e.g. fill in a SmartLock code) before sending.
  const handlePickReply = (r: QuickReply) => {
    if (r.trigger === "auto") {
      sendTemplate(r.id);
    } else {
      setFreeSubject(r.subject);
      setFreeText(r.bodyTemplate);
      setPicking(false);
      setError(null);
    }
  };

  const sendFreeText = async () => {
    if (!freeSubject.trim() || !freeText.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/guest-messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, subject: freeSubject, body: freeText }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Send failed");
      setFreeText("");
      setFreeSubject("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-10 max-w-3xl mx-auto text-charcoal/40 text-[13px]">Loading thread…</div>
    );
  }
  if (!booking) {
    return (
      <div className="p-6 lg:p-10 max-w-3xl mx-auto">
        <Link href="/admin/messages" className="text-forest text-[13px] hover:underline">← Back to Messages</Link>
        <div className="mt-6 text-charcoal/50 text-[14px]">Thread not found.</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-0px)]">
      {/* Header */}
      <div className="px-6 lg:px-10 pt-6 pb-4 border-b border-black/[.06] bg-white">
        <Link href="/admin/messages" className="text-forest text-[12.5px] font-semibold hover:underline inline-flex items-center gap-1.5 mb-3">
          <i className="fa-solid fa-chevron-left text-[10px]" /> Back to Messages
        </Link>
        <h1 className="font-serif font-semibold text-charcoal text-[1.5rem] truncate">
          {firstName(booking.guestName)}, {booking.property.type}, {fmtShortDate(booking.checkIn)}–{fmtShortDate(booking.checkOut)}
        </h1>
        <div className="text-[13px] text-charcoal/55 mt-1">
          <span>{booking.guestName}</span>
          <span className="text-charcoal/25 mx-2">·</span>
          <a href={`mailto:${booking.guestEmail}`} className="hover:underline">{booking.guestEmail}</a>
          <span className="text-charcoal/25 mx-2">·</span>
          <span>{booking.property.name}</span>
          <span className="text-charcoal/25 mx-2">·</span>
          <span className="capitalize">{booking.status}</span>
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto bg-cream/30 px-6 lg:px-10 py-6">
        <div className="max-w-2xl mx-auto flex flex-col gap-3">
          {messages.length === 0 ? (
            <div className="text-center text-charcoal/40 text-[13px] py-12">No messages sent yet.</div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className="self-end max-w-[85%] bg-[#2C2C2C] text-white rounded-[16px] px-4 py-3 shadow-[0_2px_8px_rgba(44,44,44,.12)]">
                <div className="text-[11px] text-white/55 mb-1 flex items-center gap-2">
                  <span>{fmtTime(m.sentAt)}</span>
                  {m.trigger === "auto" && <span className="text-[10px] px-1.5 py-px rounded bg-white/10 uppercase tracking-wide">Auto</span>}
                  {m.status === "failed" && <span className="text-[10px] px-1.5 py-px rounded bg-red-500/30 text-red-200 uppercase tracking-wide">Failed</span>}
                </div>
                <div className="text-[13px] font-semibold mb-1">{m.subject}</div>
                <div className="text-[13.5px] leading-[1.6] whitespace-pre-wrap">{m.body}</div>
              </div>
            ))
          )}
          <div ref={feedEnd} />
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-black/[.06] bg-white px-6 lg:px-10 py-4">
        <div className="max-w-2xl mx-auto">
          {error && <div className="mb-3 text-[12.5px] text-red-600">{error}</div>}

          {picking ? (
            <div className="bg-cream/60 rounded-[14px] p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] font-semibold text-charcoal">Choose a Quick Reply</span>
                <button onClick={() => setPicking(false)} className="text-charcoal/45 hover:text-charcoal text-[13px]" aria-label="Close">
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
              {replies.length === 0 ? (
                <div className="text-[13px] text-charcoal/50 py-4 text-center">
                  No active Quick Replies apply to this property.{" "}
                  <Link href="/admin/messages/quick-replies" className="text-forest font-semibold hover:underline">Create one</Link>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto">
                  {replies.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => handlePickReply(r)}
                      disabled={sending}
                      className="text-left px-3 py-2.5 rounded-[10px] hover:bg-white border border-transparent hover:border-forest/20 disabled:opacity-50 transition-all"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[13.5px] font-semibold text-charcoal truncate">{r.name}</div>
                        <span
                          className={
                            "text-[10px] uppercase tracking-wide px-1.5 py-px rounded flex-shrink-0 " +
                            (r.trigger === "auto"
                              ? "bg-forest/10 text-forest"
                              : "bg-charcoal/10 text-charcoal/70")
                          }
                        >
                          {r.trigger === "auto" ? "Send now" : "Edit & send"}
                        </span>
                      </div>
                      <div className="text-[12px] text-charcoal/50 truncate">{r.subject}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <button
                onClick={() => setPicking(true)}
                disabled={sending}
                title="Send from template"
                className="w-10 h-10 rounded-full bg-cream hover:bg-forest hover:text-white text-charcoal flex items-center justify-center flex-shrink-0 disabled:opacity-50 transition-colors"
              >
                <i className="fa-solid fa-plus text-[14px]" />
              </button>
              <div className="flex-1 flex flex-col gap-2">
                <input
                  value={freeSubject}
                  onChange={(e) => setFreeSubject(e.target.value)}
                  placeholder="Subject"
                  disabled={sending}
                  className="w-full px-4 py-2.5 rounded-[10px] bg-cream/60 border border-transparent focus:border-forest/30 focus:bg-white text-[13.5px] text-charcoal placeholder:text-charcoal/35 focus:outline-none disabled:opacity-50"
                />
                <textarea
                  value={freeText}
                  onChange={(e) => setFreeText(e.target.value)}
                  placeholder="Write a message…  (supports {{guestFirstName}} etc.)"
                  rows={3}
                  disabled={sending}
                  className="w-full px-4 py-2.5 rounded-[10px] bg-cream/60 border border-transparent focus:border-forest/30 focus:bg-white text-[13.5px] text-charcoal placeholder:text-charcoal/35 focus:outline-none resize-none disabled:opacity-50"
                />
              </div>
              <button
                onClick={sendFreeText}
                disabled={sending || !freeSubject.trim() || !freeText.trim()}
                className="w-10 h-10 rounded-full bg-forest text-white flex items-center justify-center flex-shrink-0 disabled:opacity-40 hover:bg-forest/90 transition-colors"
                aria-label="Send"
              >
                {sending ? (
                  <i className="fa-solid fa-spinner fa-spin text-[13px]" />
                ) : (
                  <i className="fa-solid fa-arrow-up text-[13px]" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
