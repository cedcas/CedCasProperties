"use client";
import { useState, useEffect } from "react";
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
    airbnbIcsUrl:   (property as Property & { airbnbIcsUrl?: string | null })?.airbnbIcsUrl ?? "",
    propertyRules:  (property as Property & { propertyRules?: string | null })?.propertyRules ?? "",
  });
  const [exportUrl, setExportUrl] = useState("");
  const [amenities, setAmenities] = useState<string[]>(
    property ? JSON.parse(property.amenities || "[]") : []
  );
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [copied, setCopied]   = useState(false);

  useEffect(() => {
    if (isEdit && property?.slug) {
      setExportUrl(`${window.location.origin}/api/calendar/${property.slug}.ics`);
    }
  }, [isEdit, property?.slug]);

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
      // Don't send `images` on edit — images are managed by ImageManager separately
      const body = isEdit
        ? { ...form, amenities: JSON.stringify(amenities) }
        : { ...form, amenities: JSON.stringify(amenities), images: "[]" };
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
        <h3 className="font-serif font-semibold text-charcoal mb-5">Property Rules</h3>
        <div>
          <label className={labelCls}>House Rules & Policies</label>
          <textarea
            name="propertyRules"
            value={form.propertyRules}
            onChange={handle}
            rows={6}
            placeholder="Enter house rules, check-in/check-out policies, cancellation terms, pet policies, smoking rules, etc..."
            className={`${inputCls} resize-none`}
          />
          <p className="text-[11px] text-charcoal/45 mt-2">
            These rules will be displayed to guests during booking and must be agreed to before proceeding.
          </p>
        </div>
      </div>

      {/* ── iCal / Airbnb Sync ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-[16px] p-6 shadow-[0_2px_12px_rgba(44,44,44,.07)] border border-black/[.04]">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-serif font-semibold text-charcoal">Airbnb iCal Sync</h3>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-[#FF5A5F]/10 text-[#FF5A5F] px-2 py-0.5 rounded-full">Airbnb</span>
        </div>
        <p className="text-[12px] text-charcoal/45 mb-5">
          Keep CedCas and Airbnb calendars in sync so double-bookings never happen.
        </p>

        {/* Export URL (CedCas → Airbnb) */}
        {isEdit && exportUrl && (
          <div className="mb-5 p-4 rounded-[12px] bg-[#F0F7EA] border border-[#3B5323]/15">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#3B5323]/70 mb-2">
              <i className="fa-solid fa-arrow-up-right-from-square mr-1.5" />
              Step 1 — Paste this URL into Airbnb (Export)
            </p>
            <p className="text-[11.5px] text-charcoal/55 mb-3 leading-[1.6]">
              Go to Airbnb → Listing → Availability → Export Calendar, then paste this URL. Airbnb will poll it every few hours.
            </p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={exportUrl}
                className="flex-1 px-3 py-2 rounded-[8px] border border-[#3B5323]/20 bg-white text-[12px] text-charcoal/70 font-mono select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={() => { navigator.clipboard.writeText(exportUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className="flex-shrink-0 px-3 py-2 rounded-[8px] text-[12px] font-semibold border transition-all duration-200"
                style={copied ? { background: "#3B5323", color: "#fff", borderColor: "#3B5323" } : { background: "#fff", color: "#3B5323", borderColor: "#3B5323" }}
              >
                {copied ? <><i className="fa-solid fa-check mr-1" />Copied</> : <><i className="fa-regular fa-copy mr-1" />Copy</>}
              </button>
            </div>
          </div>
        )}

        {/* Airbnb Import URL (Airbnb → CedCas) */}
        <div>
          <label className={labelCls}>
            <i className="fa-solid fa-arrow-down-to-line mr-1.5" />
            {isEdit ? "Step 2 — " : ""}Airbnb Calendar URL (Import)
          </label>
          <p className="text-[11.5px] text-charcoal/45 mb-2 leading-[1.5]">
            In Airbnb, go to Listing → Availability → Import Calendar and copy the .ics link they give you. Paste it here so CedCas knows when Airbnb is booked.
          </p>
          <input
            name="airbnbIcsUrl"
            value={form.airbnbIcsUrl}
            onChange={handle}
            placeholder="https://www.airbnb.com/calendar/ical/XXXXXXX.ics"
            className={inputCls}
          />
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
