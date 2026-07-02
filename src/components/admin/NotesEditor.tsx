"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Reusable admin free-form notes editor. PATCHes a single field to `endpoint`
 * and shows a "Saved" indicator. Used for booking Stay notes, booking
 * Additional-Charges notes, and customer notes.
 */
export default function NotesEditor({
  endpoint,
  field,
  initialValue,
  label,
  placeholder = "Add a comment…",
  rows = 3,
}: {
  endpoint: string;
  field: string;
  initialValue: string | null;
  label: string;
  placeholder?: string;
  rows?: number;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = value !== (initialValue ?? "");

  const save = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Save failed");
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <label className="block text-[11px] font-semibold text-charcoal/50 uppercase tracking-wide mb-2">{label}</label>
      <textarea
        value={value}
        onChange={(e) => { setValue(e.target.value); setSaved(false); }}
        rows={rows}
        placeholder={placeholder}
        disabled={saving}
        className="w-full px-4 py-2.5 rounded-[10px] bg-cream/60 border border-transparent focus:border-forest/30 focus:bg-white text-[13.5px] text-charcoal placeholder:text-charcoal/35 focus:outline-none resize-y disabled:opacity-50"
      />
      <div className="mt-2 flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="text-[12.5px] font-semibold px-3.5 py-1.5 rounded-full bg-forest text-white hover:bg-forest/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {saved && !saving && !dirty && (
          <span className="text-[12px] text-green-600 font-medium"><i className="fa-solid fa-check mr-1" />Saved</span>
        )}
        {error && <span className="text-[12px] text-red-600">{error}</span>}
      </div>
    </div>
  );
}
