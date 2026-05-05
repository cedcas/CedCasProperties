"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Channel = "email" | "sms";

type Booking = {
  id: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkIn: string;
  checkOut: string;
  status: string;
  optedOutAt: string | null;
  property: { id: number; name: string; type: string };
};

type GuestMessage = {
  id: number;
  subject: string;
  body: string;
  trigger: "auto" | "manual";
  channel: Channel;
  direction: "outbound" | "inbound";
  status: string;
  notes: string | null;
  fromNumber: string | null;
  toNumber: string | null;
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
  channel: Channel;
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
  const [freeChannel, setFreeChannel] = useState<Channel>("email");
  const [sourceQuickReplyId, setSourceQuickReplyId] = useState<number | null>(null);
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
      setFreeChannel(r.channel ?? "email");
      setSourceQuickReplyId(r.id);
      setPicking(false);
      setError(null);
    }
  };

  const sendFreeText = async () => {
    if (!freeText.trim()) return;
    if (freeChannel === "email" && !freeSubject.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/guest-messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          subject: freeSubject || (freeChannel === "sms" ? "SMS" : ""),
          body: freeText,
          channel: freeChannel,
          ...(sourceQuickReplyId !== null ? { sourceQuickReplyId } : {}),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Send failed");
      setFreeText("");
      setFreeSubject("");
      setFreeChannel("email");
      setSourceQuickReplyId(null);
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
        <div className="text-[13px] text-charcoal/55 mt-1 flex items-center gap-2 flex-wrap">
          <span>{booking.guestName}</span>
          <span className="text-charcoal/25">·</span>
          <a href={`mailto:${booking.guestEmail}`} className="hover:underline">{booking.guestEmail}</a>
          {booking.guestPhone && (
            <>
              <span className="text-charcoal/25">·</span>
              <a href={`tel:${booking.guestPhone}`} className="hover:underline">{booking.guestPhone}</a>
            </>
          )}
          <span className="text-charcoal/25">·</span>
          <span>{booking.property.name}</span>
          <span className="text-charcoal/25">·</span>
          <span className="capitalize">{booking.status}</span>
          {booking.optedOutAt && (
            <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 uppercase tracking-wide font-semibold">
              SMS opted out
            </span>
          )}
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto bg-cream/30 px-6 lg:px-10 py-6">
        <div className="max-w-2xl mx-auto flex flex-col gap-3">
          {messages.length === 0 ? (
            <div className="text-center text-charcoal/40 text-[13px] py-12">No messages sent yet.</div>
          ) : (
            messages.map((m) => {
              const inbound = m.direction === "inbound";
              const channel = m.channel ?? "email";
              return (
                <div
                  key={m.id}
                  className={
                    inbound
                      ? "self-start max-w-[85%] bg-white border border-black/[.06] text-charcoal rounded-[16px] px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,.04)]"
                      : "self-end max-w-[85%] bg-[#2C2C2C] text-white rounded-[16px] px-4 py-3 shadow-[0_2px_8px_rgba(44,44,44,.12)]"
                  }
                >
                  <div className={`text-[11px] mb-1 flex items-center gap-2 ${inbound ? "text-charcoal/45" : "text-white/55"}`}>
                    <span>{fmtTime(m.sentAt)}</span>
                    <span
                      className={
                        "text-[10px] px-1.5 py-px rounded uppercase tracking-wide flex items-center gap-1 " +
                        (inbound ? "bg-charcoal/5 text-charcoal/55" : "bg-white/10")
                      }
                    >
                      <i className={`fa-solid ${channel === "sms" ? "fa-comment-sms" : "fa-envelope"} text-[9px]`} />
                      {channel}
                    </span>
                    {!inbound && m.trigger === "auto" && (
                      <span className="text-[10px] px-1.5 py-px rounded bg-white/10 uppercase tracking-wide">Auto</span>
                    )}
                    {inbound && (
                      <span className="text-[10px] px-1.5 py-px rounded bg-blue-50 text-blue-700 uppercase tracking-wide">Reply</span>
                    )}
                    {m.status === "failed" && (
                      <span
                        className={
                          "text-[10px] px-1.5 py-px rounded uppercase tracking-wide " +
                          (inbound ? "bg-red-50 text-red-700" : "bg-red-500/30 text-red-200")
                        }
                      >
                        Failed
                      </span>
                    )}
                  </div>
                  {channel === "email" && m.subject && (
                    <div className="text-[13px] font-semibold mb-1">{m.subject}</div>
                  )}
                  <div className="text-[13.5px] leading-[1.6] whitespace-pre-wrap">{m.body}</div>
                  {m.notes && (
                    <div className={`text-[11px] mt-2 italic ${inbound ? "text-charcoal/40" : "text-white/45"}`}>
                      <i className="fa-solid fa-circle-info text-[10px] mr-1" />
                      {m.notes}
                    </div>
                  )}
                </div>
              );
            })
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
                  {replies.map((r) => {
                    const ch = r.channel ?? "email";
                    return (
                      <button
                        key={r.id}
                        onClick={() => handlePickReply(r)}
                        disabled={sending}
                        className="text-left px-3 py-2.5 rounded-[10px] hover:bg-white border border-transparent hover:border-forest/20 disabled:opacity-50 transition-all"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[13.5px] font-semibold text-charcoal truncate">{r.name}</div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span
                              className={
                                "text-[10px] uppercase tracking-wide px-1.5 py-px rounded flex items-center gap-1 " +
                                (ch === "sms" ? "bg-blue-50 text-blue-700" : "bg-charcoal/5 text-charcoal/60")
                              }
                            >
                              <i className={`fa-solid ${ch === "sms" ? "fa-comment-sms" : "fa-envelope"} text-[9px]`} />
                              {ch}
                            </span>
                            <span
                              className={
                                "text-[10px] uppercase tracking-wide px-1.5 py-px rounded " +
                                (r.trigger === "auto"
                                  ? "bg-forest/10 text-forest"
                                  : "bg-charcoal/10 text-charcoal/70")
                              }
                            >
                              {r.trigger === "auto" ? "Send now" : "Edit & send"}
                            </span>
                          </div>
                        </div>
                        <div className="text-[12px] text-charcoal/50 truncate">{ch === "sms" ? r.bodyTemplate : r.subject}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-[12px]">
                <button
                  type="button"
                  onClick={() => setFreeChannel("email")}
                  disabled={sending}
                  className={`px-3 py-1 rounded-full font-semibold flex items-center gap-1.5 transition-colors ${freeChannel === "email" ? "bg-forest text-white" : "bg-cream/80 text-charcoal/60 hover:bg-charcoal/5"}`}
                >
                  <i className="fa-solid fa-envelope text-[10px]" /> Email
                </button>
                <button
                  type="button"
                  onClick={() => setFreeChannel("sms")}
                  disabled={sending || !!booking.optedOutAt}
                  title={booking.optedOutAt ? "Guest opted out of SMS" : ""}
                  className={`px-3 py-1 rounded-full font-semibold flex items-center gap-1.5 transition-colors ${freeChannel === "sms" ? "bg-forest text-white" : "bg-cream/80 text-charcoal/60 hover:bg-charcoal/5"} disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <i className="fa-solid fa-comment-sms text-[10px]" /> SMS
                </button>
                {sourceQuickReplyId !== null && (
                  <span className="text-[11px] text-charcoal/45 italic ml-1">
                    Editing from template
                    <button
                      onClick={() => { setSourceQuickReplyId(null); setFreeText(""); setFreeSubject(""); }}
                      className="ml-2 text-charcoal/40 hover:text-charcoal underline"
                    >
                      clear
                    </button>
                  </span>
                )}
              </div>
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
                  {freeChannel === "email" && (
                    <input
                      value={freeSubject}
                      onChange={(e) => setFreeSubject(e.target.value)}
                      placeholder="Subject"
                      disabled={sending}
                      className="w-full px-4 py-2.5 rounded-[10px] bg-cream/60 border border-transparent focus:border-forest/30 focus:bg-white text-[13.5px] text-charcoal placeholder:text-charcoal/35 focus:outline-none disabled:opacity-50"
                    />
                  )}
                  <textarea
                    value={freeText}
                    onChange={(e) => setFreeText(e.target.value)}
                    placeholder={freeChannel === "sms" ? "Write an SMS… (160 chars per segment)" : "Write a message…  (supports {{guestFirstName}} etc.)"}
                    rows={freeChannel === "sms" ? 2 : 3}
                    disabled={sending}
                    className="w-full px-4 py-2.5 rounded-[10px] bg-cream/60 border border-transparent focus:border-forest/30 focus:bg-white text-[13.5px] text-charcoal placeholder:text-charcoal/35 focus:outline-none resize-none disabled:opacity-50"
                  />
                </div>
                <button
                  onClick={sendFreeText}
                  disabled={sending || !freeText.trim() || (freeChannel === "email" && !freeSubject.trim())}
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
