"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Property = { id: number; name: string };

export default function AddTestimonialForm({ properties }: { properties: Property[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ propertyId: String(properties[0]?.id ?? ""), name: "", location: "", rating: "5", message: "" });
  const [saving, setSaving] = useState(false);

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/admin/testimonials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setOpen(false);
    setForm({ propertyId: String(properties[0]?.id ?? ""), name: "", location: "", rating: "5", message: "" });
    router.refresh();
  };

  const inputCls = "w-full px-4 py-2.5 rounded-[10px] border border-black/[.10] bg-[#F8F9FA] text-[14px] focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/10 transition-all duration-200";

  return (
    <div className="bg-white rounded-[16px] shadow-[0_2px_12px_rgba(44,44,44,.07)] border border-black/[.04] overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-[#FAFAFA] transition-colors">
        <span className="font-serif font-semibold text-charcoal">Add New Testimonial</span>
        <i className={`fa-solid fa-chevron-${open ? "up" : "down"} text-charcoal/40 text-[12px]`} />
      </button>
      {open && (
        <form onSubmit={handleSubmit} className="px-6 pb-6 border-t border-black/[.06] pt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="text-[11px] font-semibold text-charcoal/50 uppercase tracking-wide mb-1.5 block">Property *</label>
            <select name="propertyId" required value={form.propertyId} onChange={handle} className={inputCls}>
              {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div><label className="text-[11px] font-semibold text-charcoal/50 uppercase tracking-wide mb-1.5 block">Guest Name *</label>
            <input name="name" required value={form.name} onChange={handle} placeholder="Maria Santos" className={inputCls} /></div>
          <div><label className="text-[11px] font-semibold text-charcoal/50 uppercase tracking-wide mb-1.5 block">Location *</label>
            <input name="location" required value={form.location} onChange={handle} placeholder="Manila, NCR" className={inputCls} /></div>
          <div><label className="text-[11px] font-semibold text-charcoal/50 uppercase tracking-wide mb-1.5 block">Rating</label>
            <select name="rating" value={form.rating} onChange={handle} className={inputCls}>
              {[5,4,3,2,1].map((r) => <option key={r} value={r}>{r} Stars</option>)}
            </select></div>
          <div className="sm:col-span-2"><label className="text-[11px] font-semibold text-charcoal/50 uppercase tracking-wide mb-1.5 block">Message *</label>
            <textarea name="message" required value={form.message} onChange={handle} rows={3} placeholder="Guest review…" className={`${inputCls} resize-none`} /></div>
          <div className="sm:col-span-2 flex gap-3">
            <button type="submit" disabled={saving}
              className="px-6 py-2.5 rounded-full text-[13px] font-semibold text-white disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,#FF5371,#E03D5A)" }}>
              {saving ? "Saving…" : "Add Testimonial"}
            </button>
            <button type="button" onClick={() => setOpen(false)}
              className="px-6 py-2.5 rounded-full text-[13px] font-semibold text-charcoal/50 border border-black/[.12] hover:bg-black/[.04]">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
