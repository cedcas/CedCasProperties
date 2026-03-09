"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Property } from "@prisma/client";

const AMENITY_OPTIONS = ["WiFi", "AC", "Parking", "TV", "Kitchen", "Pool", "Washer", "Coffee"];

export default function PropertyForm({ property }: { property?: Property }) {
  const router = useRouter();
  const isEdit = !!property;

  const [form, setForm] = useState({
    name:           property?.name          ?? "",
    slug:           property?.slug          ?? "",
    description:    property?.description   ?? "",
    type:           property?.type          ?? "",
    pricePerNight:  property?.pricePerNight?.toString() ?? "",
    location:       property?.location      ?? "Lipa City, Batangas",
    bedrooms:       property?.bedrooms?.toString() ?? "1",
    bathrooms:      property?.bathrooms?.toString() ?? "1",
    maxGuests:      property?.maxGuests?.toString()  ?? "2",
    isActive:       property?.isActive  ?? true,
    isFeatured:     property?.isFeatured ?? false,
  });
  const [amenities, setAmenities] = useState<string[]>(
    property ? JSON.parse(property.amenities || "[]") : []
  );
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm((p) => ({ ...p, [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value }));
    if (name === "name" && !isEdit) {
      setForm((p) => ({ ...p, slug: value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") }));
    }
  };

  const toggleAmenity = (a: string) =>
    setAmenities((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body = { ...form, amenities: JSON.stringify(amenities), images: "[]" };
      const url  = isEdit ? `/api/admin/properties/${property.id}` : "/api/admin/properties";
      const res  = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed"); }
      router.push("/admin/properties");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full px-4 py-2.5 rounded-[10px] border border-black/[.10] bg-[#F8F9FA] text-[14px] text-charcoal focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/10 transition-all duration-200";
  const labelCls = "text-[11.5px] font-semibold text-charcoal/60 tracking-wide uppercase mb-1.5 block";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 text-red-600 text-[13px] bg-red-50 border border-red-200 rounded-[8px] px-4 py-3">
          <i className="fa-solid fa-circle-exclamation" /> {error}
        </div>
      )}

      <div className="bg-white rounded-[16px] p-6 shadow-[0_2px_12px_rgba(44,44,44,.07)] border border-black/[.04]">
        <h3 className="font-serif font-semibold text-charcoal mb-5">Basic Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={labelCls}>Property Name *</label><input name="name" required value={form.name} onChange={handle} placeholder="The Lipa Retreat" className={inputCls} /></div>
          <div><label className={labelCls}>URL Slug *</label><input name="slug" required value={form.slug} onChange={handle} placeholder="the-lipa-retreat" className={inputCls} /></div>
          <div className="sm:col-span-2"><label className={labelCls}>Description *</label><textarea name="description" required value={form.description} onChange={handle} rows={4} placeholder="Describe the property…" className={`${inputCls} resize-none`} /></div>
          <div><label className={labelCls}>Property Type *</label><input name="type" required value={form.type} onChange={handle} placeholder="2BR / Studio / 3BR" className={inputCls} /></div>
          <div><label className={labelCls}>Location</label><input name="location" value={form.location} onChange={handle} className={inputCls} /></div>
        </div>
      </div>

      <div className="bg-white rounded-[16px] p-6 shadow-[0_2px_12px_rgba(44,44,44,.07)] border border-black/[.04]">
        <h3 className="font-serif font-semibold text-charcoal mb-5">Pricing & Capacity</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div><label className={labelCls}>Price / Night (₱) *</label><input name="pricePerNight" type="number" required value={form.pricePerNight} onChange={handle} placeholder="2500" className={inputCls} /></div>
          <div><label className={labelCls}>Bedrooms</label><input name="bedrooms" type="number" value={form.bedrooms} onChange={handle} min="0" className={inputCls} /></div>
          <div><label className={labelCls}>Bathrooms</label><input name="bathrooms" type="number" value={form.bathrooms} onChange={handle} min="0" className={inputCls} /></div>
          <div><label className={labelCls}>Max Guests</label><input name="maxGuests" type="number" value={form.maxGuests} onChange={handle} min="1" className={inputCls} /></div>
        </div>
      </div>

      <div className="bg-white rounded-[16px] p-6 shadow-[0_2px_12px_rgba(44,44,44,.07)] border border-black/[.04]">
        <h3 className="font-serif font-semibold text-charcoal mb-4">Amenities</h3>
        <div className="flex flex-wrap gap-2">
          {AMENITY_OPTIONS.map((a) => (
            <button type="button" key={a} onClick={() => toggleAmenity(a)}
              className={`px-4 py-1.5 rounded-full text-[13px] font-medium border transition-all duration-200 ${amenities.includes(a) ? "bg-forest text-white border-forest" : "bg-white text-charcoal/60 border-black/[.12] hover:border-forest hover:text-forest"}`}>
              {a}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[16px] p-6 shadow-[0_2px_12px_rgba(44,44,44,.07)] border border-black/[.04]">
        <h3 className="font-serif font-semibold text-charcoal mb-4">Visibility</h3>
        <div className="flex gap-8">
          {[{ name: "isActive", label: "Active (visible on site)" }, { name: "isFeatured", label: "Featured on homepage" }].map(({ name, label }) => (
            <label key={name} className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" name={name} checked={form[name as keyof typeof form] as boolean} onChange={handle} className="w-4 h-4 accent-[#3B5323]" />
              <span className="text-[14px] text-charcoal/70">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={saving}
          className="px-7 py-2.5 rounded-full text-[13.5px] font-semibold text-white disabled:opacity-60 hover:-translate-y-0.5 transition-all duration-200"
          style={{ background: "linear-gradient(135deg,#C4A862,#A8893F)" }}>
          {saving ? <span><i className="fa-solid fa-spinner fa-spin mr-2" />Saving…</span> : isEdit ? "Save Changes" : "Create Property"}
        </button>
        <button type="button" onClick={() => router.back()}
          className="px-7 py-2.5 rounded-full text-[13.5px] font-semibold text-charcoal/60 border border-black/[.12] hover:bg-black/[.04] transition-all duration-200">
          Cancel
        </button>
      </div>
    </form>
  );
}
