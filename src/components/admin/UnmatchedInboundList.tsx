"use client";

import { useState } from "react";

type Row = {
  id: number;
  channel: string;
  fromNumber: string;
  body: string;
  receivedAt: string;
};

type BookingHit = {
  id: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkIn: string;
  checkOut: string;
  status: string;
  property: { name: string; type: string };
};

function fmt(d: string): string {
  return new Date(d).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function UnmatchedInboundList({ initialRows }: { initialRows: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<BookingHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openRethread = (id: number) => {
    setActiveId(id);
    setSearch("");
    setResults([]);
    setError(null);
  };

  const runSearch = async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    const res = await fetch(`/api/admin/bookings/search?q=${encodeURIComponent(q)}`);
    if (res.ok) setResults(await res.json());
  };

  const rethread = async (rowId: number, bookingId: number) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/unmatched-inbound/${rowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      setRows(rows.filter((r) => r.id !== rowId));
      setActiveId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const dismiss = async (rowId: number) => {
    if (!confirm("Dismiss this message? It will no longer appear in the inbox.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/unmatched-inbound/${rowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dismiss: true }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      setRows(rows.filter((r) => r.id !== rowId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-[14px] py-16 text-center border border-black/[.04]">
        <i className="fa-solid fa-inbox text-charcoal/20 text-[2.4rem] mb-3 block" />
        <p className="text-charcoal/45 text-[13.5px]">No unmatched messages.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <div className="text-[12.5px] text-red-600 bg-red-50 border border-red-200 rounded-[8px] px-3 py-2">{error}</div>}
      {rows.map((r) => (
        <div key={r.id} className="bg-white rounded-[14px] p-5 border border-black/[.04]">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <i className="fa-solid fa-comment-sms text-blue-600 text-[13px]" />
                <span className="font-semibold text-charcoal text-[14px]">{r.fromNumber}</span>
                <span className="text-[11px] text-charcoal/40">{fmt(r.receivedAt)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => openRethread(r.id)} className="text-[12px] font-semibold text-forest hover:underline">Re-thread</button>
              <button onClick={() => dismiss(r.id)} disabled={busy} className="text-[12px] font-semibold text-charcoal/55 hover:text-red-600 hover:underline disabled:opacity-50">Dismiss</button>
            </div>
          </div>
          <div className="text-[13.5px] text-charcoal/75 whitespace-pre-wrap">{r.body}</div>

          {activeId === r.id && (
            <div className="mt-4 pt-4 border-t border-black/[.06]">
              <label className="block text-[12px] font-semibold text-charcoal/70 mb-1.5 uppercase tracking-wide">Find booking by guest name, email, or phone</label>
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); runSearch(e.target.value); }}
                placeholder="e.g. Maria, maria@gmail.com, +639171234567"
                className="w-full px-3 py-2 rounded-[8px] border border-black/[.1] text-[14px] focus:outline-none focus:border-forest/40"
                autoFocus
              />
              {results.length > 0 && (
                <div className="mt-2 flex flex-col gap-1.5 max-h-56 overflow-y-auto">
                  {results.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => rethread(r.id, b.id)}
                      disabled={busy}
                      className="text-left px-3 py-2 rounded-[8px] hover:bg-cream border border-transparent hover:border-forest/20 disabled:opacity-50"
                    >
                      <div className="text-[13px] font-semibold text-charcoal">{b.guestName} — {b.property.name}</div>
                      <div className="text-[11.5px] text-charcoal/50">{b.guestEmail} · {b.guestPhone} · {new Date(b.checkIn).toLocaleDateString()}–{new Date(b.checkOut).toLocaleDateString()} · {b.status}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
