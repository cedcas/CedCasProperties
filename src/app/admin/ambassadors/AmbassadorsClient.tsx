"use client";
import { useState } from "react";
import type { Ambassador } from "@prisma/client";

interface Props {
  initialAmbassadors: Ambassador[];
}

type StatusFilter = "all" | "pending" | "approved" | "rejected";

const STATUS_STYLES: Record<string, string> = {
  pending:  "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-gray-100 text-gray-500",
};

export default function AmbassadorsClient({ initialAmbassadors }: Props) {
  const [list, setList] = useState<Ambassador[]>(initialAmbassadors);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const counts = {
    all: list.length,
    pending: list.filter((a) => a.status === "pending").length,
    approved: list.filter((a) => a.status === "approved").length,
    rejected: list.filter((a) => a.status === "rejected").length,
  };

  const visible = filter === "all" ? list : list.filter((a) => a.status === filter);

  const patch = async (id: number, payload: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/ambassadors/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const updated = await res.json();
      setList((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      return true;
    }
    return false;
  };

  const setStatus = async (a: Ambassador, status: string) => {
    setBusyId(a.id);
    await patch(a.id, { status });
    setBusyId(null);
  };

  const toggleExpand = (a: Ambassador) => {
    if (expandedId === a.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(a.id);
    setNotesDraft(a.notes ?? "");
  };

  const saveNotes = async (a: Ambassador) => {
    setSavingNotes(true);
    await patch(a.id, { notes: notesDraft });
    setSavingNotes(false);
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this application permanently?")) return;
    const res = await fetch(`/api/admin/ambassadors/${id}`, { method: "DELETE" });
    if (res.ok) {
      setList((prev) => prev.filter((a) => a.id !== id));
      if (expandedId === id) setExpandedId(null);
    }
  };

  const fmtDate = (d: Date | string) =>
    new Date(d).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });

  const inputCls = "w-full px-3 py-2 rounded-[8px] border border-black/10 text-[14px] text-gray-800 focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/10";
  const labelCls = "text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block";

  const FILTERS: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
  ];

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-[1.6rem] font-serif font-semibold text-charcoal">Ambassadors</h1>
        <p className="text-gray-500 text-[14px] mt-1">Review and triage Ambassador Program applications.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-full text-[13px] font-semibold border transition-colors ${
              filter === f.key ? "bg-forest text-white border-forest" : "bg-white text-gray-600 border-black/10 hover:border-forest"
            }`}
          >
            {f.label} <span className="opacity-60">({counts[f.key]})</span>
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex flex-col gap-4">
        {visible.length === 0 && (
          <div className="bg-white rounded-[16px] border border-black/[.08] shadow-sm px-5 py-12 text-center text-gray-400 text-[14px]">
            No applications{filter !== "all" ? ` with status "${filter}"` : ""} yet.
          </div>
        )}

        {visible.map((a) => (
          <div key={a.id} className="bg-white rounded-[16px] border border-black/[.08] shadow-sm overflow-hidden">
            {/* Header row */}
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <button onClick={() => toggleExpand(a)} className="flex items-center gap-3 text-left min-w-0">
                <i className={`fa-solid ${expandedId === a.id ? "fa-chevron-down" : "fa-chevron-right"} text-gray-300 text-[12px] flex-shrink-0`} />
                <div className="min-w-0">
                  <div className="font-semibold text-charcoal truncate">{a.name}</div>
                  <div className="text-gray-400 text-[12.5px] truncate">{a.city} · {a.occupation} · {fmtDate(a.createdAt)}</div>
                </div>
              </button>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${STATUS_STYLES[a.status] ?? "bg-gray-100 text-gray-500"}`}>{a.status}</span>
                <button onClick={() => remove(a.id)} className="text-red-300 hover:text-red-600 transition-colors text-[13px]" title="Delete">
                  <i className="fa-solid fa-trash" />
                </button>
              </div>
            </div>

            {/* Expanded detail */}
            {expandedId === a.id && (
              <div className="border-t border-black/[.06] bg-gray-50/60 px-5 py-5">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-[13.5px] mb-5">
                  <Field label="Email" value={<a href={`mailto:${a.email}`} className="text-forest hover:underline">{a.email}</a>} />
                  <Field label="Mobile" value={a.phone} />
                  <Field label="Facebook" value={a.facebookUrl} />
                  <Field label="Other Socials" value={a.otherSocials || "—"} />
                  <Field label="Audience Size" value={a.audienceSize || "—"} />
                  <Field label="GCash" value={a.gcashNumber} />
                </dl>
                <div className="mb-4">
                  <span className={labelCls}>Why partner with us?</span>
                  <p className="text-[13.5px] text-gray-700 whitespace-pre-wrap leading-[1.6]">{a.motivation}</p>
                </div>
                <div className="mb-5">
                  <span className={labelCls}>How they plan to promote us</span>
                  <p className="text-[13.5px] text-gray-700 whitespace-pre-wrap leading-[1.6]">{a.promotionPlan}</p>
                </div>

                {/* Status controls */}
                <div className="flex flex-wrap items-center gap-2 mb-5">
                  <span className={labelCls + " !mb-0 mr-1"}>Set status:</span>
                  {["pending", "approved", "rejected"].map((s) => (
                    <button
                      key={s}
                      disabled={busyId === a.id || a.status === s}
                      onClick={() => setStatus(a, s)}
                      className={`px-3 py-1.5 rounded-[8px] text-[12.5px] font-semibold border transition-colors capitalize disabled:opacity-50 ${
                        a.status === s ? "bg-forest text-white border-forest" : "bg-white text-gray-600 border-black/10 hover:border-forest"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                {/* Notes */}
                <div>
                  <label className={labelCls}>Admin notes</label>
                  <textarea
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    rows={2}
                    placeholder="Vetting notes, follow-ups, assigned promo code…"
                    className={`${inputCls} resize-y`}
                  />
                  <button
                    onClick={() => saveNotes(a)}
                    disabled={savingNotes}
                    className="mt-2 px-4 py-1.5 bg-forest text-white rounded-[8px] text-[13px] font-semibold hover:bg-forest/90 disabled:opacity-50 transition-colors"
                  >
                    {savingNotes ? "Saving…" : "Save notes"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block">{label}</span>
      <span className="text-gray-800 break-words">{value}</span>
    </div>
  );
}
