"use client";

import { useState } from "react";
import Link from "next/link";
import { TEMPLATE_VARS } from "@/lib/templates";
import { smsLength } from "@/lib/sms-length";
import { parsePropertyIds } from "@/lib/promo";

type PropertyLite = { id: number; name: string; type: string };

type Anchor = "checkIn" | "checkOut" | "confirmation";
type Channel = "email" | "sms";

type QuickReply = {
  id: number;
  name: string;
  propertyIds: string | null; // JSON array of property ids; null/empty = all properties
  subject: string;
  bodyTemplate: string;
  trigger: "auto" | "manual";
  channel: Channel;
  anchor: Anchor | null;
  offsetHours: number | null;
  skipIfPastAnchor: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type FormState = {
  id?: number;
  name: string;
  propertyIds: number[];
  subject: string;
  bodyTemplate: string;
  trigger: "auto" | "manual";
  channel: Channel;
  anchor: Anchor;
  offsetHours: number;
  skipIfPastAnchor: boolean;
  isActive: boolean;
};

const ANCHOR_LABELS: Record<Anchor, string> = {
  checkIn: "check-in",
  checkOut: "check-out",
  confirmation: "booking confirmation",
};

const blankForm: FormState = {
  name: "",
  propertyIds: [],
  subject: "",
  bodyTemplate: "",
  trigger: "manual",
  channel: "email",
  anchor: "checkIn",
  offsetHours: -5,
  skipIfPastAnchor: false,
  isActive: true,
};

function formatTrigger(r: QuickReply): string {
  if (r.trigger === "manual") return "Manual";
  const hrs = r.offsetHours ?? 0;
  const anchor = ANCHOR_LABELS[r.anchor ?? "checkIn"];
  if (hrs === 0) {
    return r.anchor === "confirmation" ? "Immediately on confirmation" : `At ${anchor}`;
  }
  if (hrs < 0) return `${Math.abs(hrs)}h before ${anchor}`;
  return `${hrs}h after ${anchor}`;
}

export default function QuickRepliesManager({
  initialReplies,
  properties,
}: {
  initialReplies: QuickReply[];
  properties: PropertyLite[];
}) {
  const [replies, setReplies] = useState<QuickReply[]>(initialReplies);
  const [form, setForm] = useState<FormState | null>(null);
  const [scope, setScope] = useState<"all" | "specific">("all");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const propLabel = (ids: number[]): string => {
    if (ids.length === 0) return "All properties";
    const names = ids
      .map((id) => properties.find((p) => p.id === id)?.name)
      .filter((n): n is string => !!n);
    if (names.length === 0) return "All properties";
    if (names.length <= 2) return names.join(", ");
    return `${names.slice(0, 2).join(", ")} +${names.length - 2} more`;
  };

  const togglePropertyId = (id: number) => {
    if (!form) return;
    const has = form.propertyIds.includes(id);
    setForm({
      ...form,
      propertyIds: has ? form.propertyIds.filter((x) => x !== id) : [...form.propertyIds, id],
    });
  };

  const startCreate = () => {
    setError(null);
    setScope("all");
    setForm({ ...blankForm });
  };

  const startEdit = (r: QuickReply) => {
    setError(null);
    const ids = parsePropertyIds(r.propertyIds);
    setScope(ids.length > 0 ? "specific" : "all");
    setForm({
      id: r.id,
      name: r.name,
      propertyIds: ids,
      subject: r.subject,
      bodyTemplate: r.bodyTemplate,
      trigger: r.trigger,
      channel: r.channel ?? "email",
      anchor: r.anchor ?? "checkIn",
      offsetHours: r.offsetHours ?? -5,
      skipIfPastAnchor: r.skipIfPastAnchor,
      isActive: r.isActive,
    });
  };

  const refresh = async () => {
    const res = await fetch("/api/admin/quick-replies");
    if (res.ok) setReplies(await res.json());
  };

  const save = async () => {
    if (!form) return;
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name,
      propertyIds: scope === "all" ? [] : form.propertyIds,
      subject: form.subject,
      bodyTemplate: form.bodyTemplate,
      trigger: form.trigger,
      channel: form.channel,
      anchor: form.trigger === "auto" ? form.anchor : null,
      offsetHours: form.trigger === "auto" ? form.offsetHours : null,
      skipIfPastAnchor: form.skipIfPastAnchor,
      isActive: form.isActive,
    };
    try {
      const res = await fetch(
        form.id ? `/api/admin/quick-replies/${form.id}` : "/api/admin/quick-replies",
        {
          method: form.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) throw new Error((await res.json()).error ?? "Save failed");
      await refresh();
      setForm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (r: QuickReply) => {
    await fetch(`/api/admin/quick-replies/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !r.isActive }),
    });
    refresh();
  };

  const del = async (r: QuickReply) => {
    if (!confirm(`Delete Quick Reply "${r.name}"? This cannot be undone.`)) return;
    await fetch(`/api/admin/quick-replies/${r.id}`, { method: "DELETE" });
    refresh();
  };

  const insertVar = (varName: string) => {
    if (!form) return;
    setForm({ ...form, bodyTemplate: form.bodyTemplate + `{{${varName}}}` });
  };

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto">
      <Link href="/admin/messages" className="text-forest text-[12.5px] font-semibold hover:underline inline-flex items-center gap-1.5 mb-3">
        <i className="fa-solid fa-chevron-left text-[10px]" /> Back to Messages
      </Link>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif font-semibold text-charcoal text-[1.8rem]">Quick Replies</h1>
          <p className="text-charcoal/45 text-[13px] mt-0.5">Reusable message templates — can be automated or sent manually.</p>
        </div>
        <button
          onClick={startCreate}
          className="px-4 py-2.5 rounded-[10px] bg-forest text-white text-[13px] font-semibold hover:bg-forest/90 flex items-center gap-2"
        >
          <i className="fa-solid fa-plus text-[11px]" /> New Quick Reply
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {replies.length === 0 ? (
          <div className="bg-white rounded-[14px] py-16 text-center border border-black/[.04]">
            <i className="fa-solid fa-comments text-charcoal/20 text-[2.4rem] mb-3 block" />
            <p className="text-charcoal/45 text-[13.5px]">No Quick Replies yet. Create your first template to start automating guest messages.</p>
          </div>
        ) : (
          replies.map((r) => (
            <div key={r.id} className={`bg-white rounded-[14px] p-5 border ${r.isActive ? "border-black/[.04]" : "border-charcoal/10 bg-charcoal/[.02]"}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-charcoal text-[15px] truncate">{r.name}</span>
                    {!r.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-charcoal/10 text-charcoal/50 uppercase tracking-wide">Inactive</span>}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-wide ${r.trigger === "auto" ? "bg-forest/10 text-forest" : "bg-[#C4A862]/15 text-[#8a7233]"}`}>
                      {r.trigger}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-wide flex items-center gap-1 ${r.channel === "sms" ? "bg-blue-50 text-blue-700" : "bg-charcoal/5 text-charcoal/60"}`}>
                      <i className={`fa-solid ${r.channel === "sms" ? "fa-comment-sms" : "fa-envelope"} text-[9px]`} />
                      {r.channel ?? "email"}
                    </span>
                  </div>
                  <div className="text-[12.5px] text-charcoal/55 mb-1">
                    {propLabel(parsePropertyIds(r.propertyIds))}
                    <span className="text-charcoal/25 mx-2">·</span>
                    {formatTrigger(r)}
                  </div>
                  <div className="text-[13px] text-charcoal/70 truncate">{r.subject}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => toggleActive(r)} className="text-[12px] font-semibold text-charcoal/55 hover:text-forest hover:underline">
                    {r.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button onClick={() => startEdit(r)} className="text-[12px] font-semibold text-forest hover:underline">Edit</button>
                  <button onClick={() => del(r)} className="text-[12px] font-semibold text-red-600 hover:underline">Delete</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {form && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center py-8 px-4 overflow-y-auto">
          <div className="bg-white rounded-[16px] w-full max-w-2xl my-auto shadow-2xl">
            <div className="px-6 py-5 border-b border-black/[.06] flex items-center justify-between">
              <h2 className="font-serif font-semibold text-charcoal text-[1.2rem]">
                {form.id ? "Edit Quick Reply" : "New Quick Reply"}
              </h2>
              <button onClick={() => setForm(null)} className="text-charcoal/45 hover:text-charcoal">
                <i className="fa-solid fa-xmark text-[18px]" />
              </button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
              {error && <div className="text-[12.5px] text-red-600 bg-red-50 border border-red-200 rounded-[8px] px-3 py-2">{error}</div>}

              <div>
                <label className="block text-[12px] font-semibold text-charcoal/70 mb-1.5 uppercase tracking-wide">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Welcome — 2BR"
                  className="w-full px-3 py-2.5 rounded-[8px] border border-black/[.1] text-[14px] focus:outline-none focus:border-forest/40"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-charcoal/70 mb-1.5 uppercase tracking-wide">Applies to</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setScope("all")}
                    className={`px-4 py-2 rounded-[8px] text-[13px] font-semibold border transition-colors ${scope === "all" ? "bg-forest text-white border-forest" : "bg-white text-charcoal/65 border-black/10 hover:border-forest"}`}
                  >
                    All properties
                  </button>
                  <button
                    type="button"
                    onClick={() => setScope("specific")}
                    className={`px-4 py-2 rounded-[8px] text-[13px] font-semibold border transition-colors ${scope === "specific" ? "bg-forest text-white border-forest" : "bg-white text-charcoal/65 border-black/10 hover:border-forest"}`}
                  >
                    Specific properties
                  </button>
                </div>
                {scope === "specific" && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {properties.length === 0 && (
                      <p className="text-charcoal/40 text-[13px]">No active properties to choose from.</p>
                    )}
                    {properties.map((p) => (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => togglePropertyId(p.id)}
                        className={`px-3 py-1.5 rounded-full text-[13px] font-medium border transition-colors ${form.propertyIds.includes(p.id) ? "bg-forest text-white border-forest" : "bg-white text-charcoal/65 border-black/10 hover:border-forest"}`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-charcoal/70 mb-1.5 uppercase tracking-wide">Channel</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, channel: "email" })}
                    className={`px-4 py-2 rounded-[8px] text-[13px] font-semibold flex items-center gap-2 ${form.channel === "email" ? "bg-forest text-white" : "bg-cream text-charcoal/65 hover:bg-charcoal/5"}`}
                  >
                    <i className="fa-solid fa-envelope text-[11px]" /> Email
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, channel: "sms" })}
                    className={`px-4 py-2 rounded-[8px] text-[13px] font-semibold flex items-center gap-2 ${form.channel === "sms" ? "bg-forest text-white" : "bg-cream text-charcoal/65 hover:bg-charcoal/5"}`}
                  >
                    <i className="fa-solid fa-comment-sms text-[11px]" /> SMS
                  </button>
                </div>
                {form.channel === "sms" && (
                  <p className="text-[11.5px] text-charcoal/50 mt-1.5">
                    SMS templates use only the body — Subject is shown only in the admin thread, not sent. Foreign numbers auto-fall-back to email.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-charcoal/70 mb-1.5 uppercase tracking-wide">Trigger</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, trigger: "manual" })}
                    className={`px-4 py-2 rounded-[8px] text-[13px] font-semibold ${form.trigger === "manual" ? "bg-forest text-white" : "bg-cream text-charcoal/65 hover:bg-charcoal/5"}`}
                  >
                    Manual
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, trigger: "auto" })}
                    className={`px-4 py-2 rounded-[8px] text-[13px] font-semibold ${form.trigger === "auto" ? "bg-forest text-white" : "bg-cream text-charcoal/65 hover:bg-charcoal/5"}`}
                  >
                    Automatic
                  </button>
                </div>
              </div>

              {form.trigger === "auto" && (
                <div className="bg-cream/40 rounded-[10px] p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-[13.5px] text-charcoal/80 flex-wrap">
                    <span>Send</span>
                    <input
                      type="number"
                      value={Math.abs(form.offsetHours)}
                      onChange={(e) => {
                        const abs = Math.max(0, Number(e.target.value) || 0);
                        const signed = form.offsetHours < 0 ? -abs : abs;
                        setForm({ ...form, offsetHours: signed });
                      }}
                      className="w-20 px-2 py-1.5 rounded-[6px] border border-black/[.1] text-[13.5px] focus:outline-none focus:border-forest/40"
                    />
                    <span>hours</span>
                    <select
                      value={form.offsetHours < 0 ? "before" : "after"}
                      onChange={(e) => {
                        const abs = Math.abs(form.offsetHours);
                        setForm({ ...form, offsetHours: e.target.value === "before" ? -abs : abs });
                      }}
                      disabled={form.anchor === "confirmation"}
                      className="px-2 py-1.5 rounded-[6px] border border-black/[.1] bg-white text-[13.5px] focus:outline-none focus:border-forest/40 disabled:bg-charcoal/5 disabled:text-charcoal/50"
                    >
                      {form.anchor !== "confirmation" && <option value="before">before</option>}
                      <option value="after">after</option>
                    </select>
                    <select
                      value={form.anchor}
                      onChange={(e) => {
                        const next = e.target.value as Anchor;
                        // When switching to "confirmation", default to 0h/after — matches "send immediately"
                        setForm({
                          ...form,
                          anchor: next,
                          offsetHours: next === "confirmation" && form.offsetHours < 0 ? 0 : form.offsetHours,
                        });
                      }}
                      className="px-2 py-1.5 rounded-[6px] border border-black/[.1] bg-white text-[13.5px] focus:outline-none focus:border-forest/40"
                    >
                      <option value="checkIn">check-in</option>
                      <option value="checkOut">check-out</option>
                      <option value="confirmation">booking confirmation</option>
                    </select>
                  </div>
                  {form.anchor !== "confirmation" && (
                    <label className="flex items-center gap-2 text-[13px] text-charcoal/70">
                      <input
                        type="checkbox"
                        checked={form.skipIfPastAnchor}
                        onChange={(e) => setForm({ ...form, skipIfPastAnchor: e.target.checked })}
                      />
                      Skip if the anchor event has already passed (useful for pre-stay reminders on late bookings)
                    </label>
                  )}
                  {form.anchor === "confirmation" && (
                    <div className="text-[12px] text-charcoal/50 italic">
                      Materialized at the moment the booking is confirmed. Offset 0h fires immediately.
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-[12px] font-semibold text-charcoal/70 mb-1.5 uppercase tracking-wide">Subject</label>
                <input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="e.g. Welcome to {{propertyName}}"
                  className="w-full px-3 py-2.5 rounded-[8px] border border-black/[.1] text-[14px] focus:outline-none focus:border-forest/40"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[12px] font-semibold text-charcoal/70 uppercase tracking-wide">Message Body</label>
                  <div className="text-[11px] text-charcoal/40">Click a variable to insert</div>
                </div>
                <textarea
                  value={form.bodyTemplate}
                  onChange={(e) => setForm({ ...form, bodyTemplate: e.target.value })}
                  placeholder="Hi {{guestFirstName}}, your stay at {{propertyName}} is coming up…"
                  rows={form.channel === "sms" ? 4 : 8}
                  className="w-full px-3 py-2.5 rounded-[8px] border border-black/[.1] text-[13.5px] leading-[1.6] font-mono focus:outline-none focus:border-forest/40 resize-y"
                />
                {form.channel === "sms" && (() => {
                  const len = smsLength(form.bodyTemplate);
                  const segWarn = len.segments > 1;
                  return (
                    <div className={`text-[11.5px] mt-1.5 ${segWarn ? "text-amber-700" : "text-charcoal/50"}`}>
                      {len.chars} chars · {len.encoding} · {len.segments} segment{len.segments === 1 ? "" : "s"}
                      {segWarn && <span> — multi-segment SMS bills per segment. Variables expand at send time, so actual length may differ.</span>}
                    </div>
                  );
                })()}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {TEMPLATE_VARS.map((v) => (
                    <button
                      key={v.name}
                      type="button"
                      onClick={() => insertVar(v.name)}
                      title={v.desc}
                      className="text-[11px] px-2 py-1 rounded-full bg-cream hover:bg-forest hover:text-white text-charcoal/65 font-mono transition-colors"
                    >
                      {`{{${v.name}}}`}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 text-[13px] text-charcoal/70">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                Active
              </label>
            </div>

            <div className="px-6 py-4 border-t border-black/[.06] flex justify-end gap-2">
              <button
                onClick={() => setForm(null)}
                className="px-4 py-2 rounded-[8px] text-[13px] font-semibold text-charcoal/65 hover:bg-charcoal/5"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving || !form.name.trim() || !form.subject.trim() || !form.bodyTemplate.trim() || (scope === "specific" && form.propertyIds.length === 0)}
                className="px-5 py-2 rounded-[8px] bg-forest text-white text-[13px] font-semibold hover:bg-forest/90 disabled:opacity-40"
              >
                {saving ? "Saving…" : form.id ? "Save Changes" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
