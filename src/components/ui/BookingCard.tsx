"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

interface Props {
  slug: string;
  pricePerNight: number;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  location: string;
  type: string;
}

export default function BookingCard({ slug, pricePerNight, maxGuests, bedrooms, bathrooms, location, type }: Props) {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];

  const [checkIn, setCheckIn]   = useState("");
  const [checkOut, setCheckOut] = useState("");

  const { nights, total } = useMemo(() => {
    if (!checkIn || !checkOut) return { nights: 0, total: 0 };
    const n = Math.max(1, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000));
    return { nights: n, total: n * pricePerNight };
  }, [checkIn, checkOut, pricePerNight]);

  const handleBook = () => {
    const params = new URLSearchParams();
    if (checkIn)  params.set("checkIn", checkIn);
    if (checkOut) params.set("checkOut", checkOut);
    const qs = params.toString();
    router.push(`/properties/${slug}/book${qs ? `?${qs}` : ""}`);
  };

  const inputCls = "w-full px-3 py-2.5 rounded-[10px] border border-black/[.10] bg-[#F8F9FA] text-[13px] text-charcoal focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/10 transition-colors";

  return (
    <div className="bg-white rounded-[20px] p-6 shadow-[0_8px_40px_rgba(44,44,44,.10)] border border-black/[.05]">

      {/* Price */}
      <div className="hidden sm:flex items-baseline gap-1.5 mb-1">
        <span className="font-bold text-charcoal text-[1.8rem]">₱{pricePerNight.toLocaleString()}</span>
        <span className="text-charcoal/40 text-[13px]">/ night</span>
      </div>
      <p className="hidden sm:block text-[12px] text-charcoal/35 mb-5">Entire unit · {type}</p>

      {/* Date pickers */}
      <div className="mb-4">
        <div className="border border-black/[.10] rounded-[12px] overflow-hidden divide-y divide-black/[.08]">
          {/* Check-in */}
          <div className="px-4 py-3">
            <label className="text-[10px] font-bold text-charcoal/40 uppercase tracking-wider block mb-1">
              <i className="fa-regular fa-calendar mr-1.5" />Check-in
            </label>
            <input
              type="date"
              min={today}
              value={checkIn}
              onChange={(e) => {
                setCheckIn(e.target.value);
                if (checkOut && e.target.value >= checkOut) setCheckOut("");
              }}
              className="w-full text-[14px] font-medium text-charcoal bg-transparent focus:outline-none cursor-pointer"
            />
          </div>
          {/* Check-out */}
          <div className="px-4 py-3">
            <label className="text-[10px] font-bold text-charcoal/40 uppercase tracking-wider block mb-1">
              <i className="fa-regular fa-calendar-check mr-1.5" />Check-out
            </label>
            <input
              type="date"
              min={checkIn || today}
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full text-[14px] font-medium text-charcoal bg-transparent focus:outline-none cursor-pointer"
            />
          </div>
        </div>

        {/* Nights summary */}
        {nights > 0 && (
          <div className="flex items-center justify-between mt-3 px-1 text-[13px]">
            <span className="text-charcoal/50">{nights} night{nights !== 1 ? "s" : ""} × ₱{pricePerNight.toLocaleString()}</span>
            <span className="font-bold text-charcoal">₱{total.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Property details */}
      <div className="space-y-2 mb-5">
        {[
          { icon: "users",        text: `Up to ${maxGuests} guests` },
          { icon: "bed",          text: `${bedrooms} bedroom${bedrooms !== 1 ? "s" : ""}` },
          { icon: "bath",         text: `${bathrooms} bathroom${bathrooms !== 1 ? "s" : ""}` },
          { icon: "location-dot", text: location },
        ].map(({ icon, text }) => (
          <div key={text} className="flex items-center gap-2.5 text-[13px] text-charcoal/55">
            <i className={`fa-solid fa-${icon} text-forest w-4 text-center text-[12px]`} />
            {text}
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={handleBook}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full text-[14px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
        style={{ background: "linear-gradient(135deg,#C4A862,#A8893F)" }}
      >
        <i className="fa-solid fa-calendar-check" />
        {nights > 0 ? `Book — ₱${total.toLocaleString()}` : "Book this Property"}
      </button>

      <p className="text-center text-[11px] text-charcoal/30 mt-3">
        We&apos;ll confirm availability within 24 hours
      </p>

      <div className="mt-4 pt-4 border-t border-black/[.06] flex items-center justify-center gap-4 text-[11.5px] text-charcoal/40">
        <span><i className="fa-solid fa-shield-halved mr-1 text-forest" /> Trusted host</span>
        <span><i className="fa-solid fa-broom mr-1 text-forest" /> Spotlessly clean</span>
      </div>
    </div>
  );
}
