"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

type Thread = {
  bookingId: number;
  lastSentAt: string;
  lastSubject: string;
  lastPreview: string;
  guestName: string;
  guestEmail: string;
  status: string;
  checkIn: string;
  checkOut: string;
  property: { id: number; name: string; type: string; featuredImage: string | null };
};

function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] ?? full;
}

function shortDate(d: string | Date): string {
  return new Date(d).toLocaleDateString("en-PH", { month: "numeric", day: "numeric" });
}

function relTime(d: string | Date): string {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d`;
  return new Date(d).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

function statusDot(status: string): string {
  if (status === "confirmed") return "bg-green-500";
  if (status === "pending") return "bg-amber-400";
  return "bg-charcoal/30";
}

export default function GuestMessageThreads() {
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const url = q ? `/api/admin/guest-messages/threads?q=${encodeURIComponent(q)}` : "/api/admin/guest-messages/threads";
    fetch(url, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => setThreads(data))
      .catch(() => { /* abort */ });
    return () => controller.abort();
  }, [q]);

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-serif font-semibold text-charcoal text-[1.4rem]">Guest Messages</h2>
          <p className="text-charcoal/45 text-[13px] mt-0.5">
            {threads === null ? "Loading…" : `${threads.length} thread${threads.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <Link
          href="/admin/messages/quick-replies"
          className="text-[12.5px] font-semibold text-forest hover:underline flex items-center gap-1.5"
        >
          <i className="fa-solid fa-gear text-[11px]" /> Quick Replies
        </Link>
      </div>

      <div className="relative mb-4">
        <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-charcoal/30 text-[13px]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search guest, property, or message text…"
          className="w-full pl-11 pr-4 py-3 rounded-[12px] bg-white border border-black/[.06] shadow-[0_2px_8px_rgba(44,44,44,.04)] text-[14px] text-charcoal placeholder:text-charcoal/35 focus:outline-none focus:border-forest/40"
        />
      </div>

      <div className="flex flex-col gap-2">
        {threads === null ? (
          <div className="bg-white rounded-[14px] py-12 text-center border border-black/[.04]">
            <div className="text-charcoal/40 text-[13px]">Loading threads…</div>
          </div>
        ) : threads.length === 0 ? (
          <div className="bg-white rounded-[14px] py-12 text-center border border-black/[.04]">
            <i className="fa-solid fa-comments text-charcoal/20 text-[2.2rem] mb-3 block" />
            <p className="text-charcoal/40 text-[13.5px]">
              {q ? "No threads match your search." : "No guest messages yet. They appear once a Quick Reply fires or you send one manually."}
            </p>
          </div>
        ) : (
          threads.map((t) => (
            <Link
              key={t.bookingId}
              href={`/admin/messages/${t.bookingId}`}
              className="bg-white rounded-[14px] p-4 border border-black/[.04] hover:border-forest/25 hover:shadow-[0_4px_16px_rgba(44,44,44,.06)] transition-all flex gap-4"
            >
              {t.property.featuredImage ? (
                <Image src={t.property.featuredImage} alt={t.property.name} width={56} height={56} className="w-14 h-14 rounded-[10px] object-cover flex-shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-[10px] bg-cream flex items-center justify-center flex-shrink-0">
                  <i className="fa-solid fa-house text-charcoal/25 text-[18px]" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3 mb-0.5">
                  <div className="font-semibold text-charcoal text-[14.5px] truncate">
                    {firstName(t.guestName)}, {t.property.type}, {shortDate(t.checkIn)}–{shortDate(t.checkOut)}
                  </div>
                  <div className="text-[11px] text-charcoal/40 flex-shrink-0">{relTime(t.lastSentAt)}</div>
                </div>
                <div className="text-[12.5px] text-charcoal/60 mb-1 truncate">{t.lastSubject}</div>
                <div className="text-[12.5px] text-charcoal/45 line-clamp-1">{t.lastPreview}</div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${statusDot(t.status)}`} />
                  <span className="text-[11px] text-charcoal/50 capitalize">{t.status}</span>
                  <span className="text-charcoal/20 text-[10px]">·</span>
                  <span className="text-[11px] text-charcoal/45 truncate">{t.property.name}</span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
