"use client";
import { useState, useMemo, useEffect, useRef } from "react";
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

  // Always start empty — never pre-fill from browser cache
  const [checkIn, setCheckIn]   = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [availability, setAvailability] = useState<"idle" | "checking" | "available" | "unavailable">("idle");
  const [dateError, setDateError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  // Force-clear date inputs on every mount so browser autofill can't inject stale values
  const checkInRef  = useRef<HTMLInputElement>(null);
  const checkOutRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (checkInRef.current)  checkInRef.current.value  = "";
    if (checkOutRef.current) checkOutRef.current.value = "";
  }, []);

  const { nights, total } = useMemo(() => {
    if (!checkIn || !checkOut) return { nights: 0, total: 0 };
    const n = Math.max(1, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000));
    return { nights: n, total: n * pricePerNight };
  }, [checkIn, checkOut, pricePerNight]);

  // Check availability whenever both dates are valid
  useEffect(() => {
    if (!checkIn || !checkOut || new Date(checkOut) <= new Date(checkIn)) {
      setAvailability("idle");
      return;
    }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setAvailability("checking");
    fetch(`/api/availability/${slug}?checkIn=${checkIn}&checkOut=${checkOut}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((data) => setAvailability(data.available ? "available" : "unavailable"))
      .catch(() => setAvailability("idle"));
  }, [checkIn, checkOut, slug]);

  const handleBook = () => {
    // Require both dates before proceeding
    if (!checkIn && !checkOut) {
      setDateError("Please select your check-in and check-out dates to continue.");
      return;
    }
    if (!checkIn) {
      setDateError("Please select a check-in date.");
      return;
    }
    if (!checkOut) {
      setDateError("Please select a check-out date.");
      return;
    }
    if (availability === "unavailable") return;
    setDateError("");
    const params = new URLSearchParams({ checkIn, checkOut });
    router.push(`/properties/${slug}/book?${params.toString()}`);
  };

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
        <div className={`border rounded-[12px] overflow-hidden divide-y ${dateError ? "border-red-400 divide-red-200" : "border-black/[.10] divide-black/[.08]"}`}>
          {/* Check-in */}
          <div className="px-4 py-3">
            <label className="text-[10px] font-bold text-charcoal/40 uppercase tracking-wider block mb-1">
              <i className="fa-regular fa-calendar mr-1.5" />Check-in <span className="text-red-400">*</span>
            </label>
            <input
              ref={checkInRef}
              type="date"
              min={today}
              value={checkIn}
              autoComplete="off"
              onChange={(e) => {
                setCheckIn(e.target.value);
                setDateError("");
                if (checkOut && e.target.value >= checkOut) setCheckOut("");
              }}
              className="w-full text-[14px] font-medium text-charcoal bg-transparent focus:outline-none cursor-pointer"
            />
          </div>
          {/* Check-out */}
          <div className="px-4 py-3">
            <label className="text-[10px] font-bold text-charcoal/40 uppercase tracking-wider block mb-1">
              <i className="fa-regular fa-calendar-check mr-1.5" />Check-out <span className="text-red-400">*</span>
            </label>
            <input
              ref={checkOutRef}
              type="date"
              min={checkIn || today}
              value={checkOut}
              autoComplete="off"
              onChange={(e) => {
                setCheckOut(e.target.value);
                setDateError("");
              }}
              className="w-full text-[14px] font-medium text-charcoal bg-transparent focus:outline-none cursor-pointer"
            />
          </div>
        </div>

        {/* Missing-date error */}
        {dateError && (
          <div className="mt-2.5 flex items-start gap-2 text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-[10px] px-3 py-2.5">
            <i className="fa-solid fa-circle-exclamation mt-0.5 flex-shrink-0" />
            <span>{dateError}</span>
          </div>
        )}

        {/* Nights summary / availability feedback */}
        {!dateError && nights > 0 && availability !== "unavailable" && (
          <div className="flex items-center justify-between mt-3 px-1 text-[13px]">
            <span className="text-charcoal/50">{nights} night{nights !== 1 ? "s" : ""} × ₱{pricePerNight.toLocaleString()}</span>
            {availability === "checking"
              ? <span className="text-charcoal/40 text-[12px]"><i className="fa-solid fa-circle-notch fa-spin mr-1" />Checking…</span>
              : <span className="font-bold text-charcoal">₱{total.toLocaleString()}</span>
            }
          </div>
        )}
        {availability === "unavailable" && (
          <div className="mt-3 flex items-start gap-2 text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-[10px] px-3 py-2.5">
            <i className="fa-solid fa-calendar-xmark mt-0.5 flex-shrink-0" />
            <span>We apologize, your selected dates are not available. Please select another date range.</span>
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
        disabled={availability === "unavailable" || availability === "checking"}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full text-[14px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none"
        style={{ background: availability === "unavailable" ? "#9CA3AF" : "linear-gradient(135deg,#C4A862,#A8893F)" }}
      >
        <i className={`fa-solid ${availability === "checking" ? "fa-circle-notch fa-spin" : "fa-calendar-check"}`} />
        {availability === "unavailable" ? "Dates Not Available" : nights > 0 ? `Book — ₱${total.toLocaleString()}` : "Book this Property"}
      </button>

      {availability === "available" && (
        <p className="text-center text-[11px] text-green-600 mt-3">
          <i className="fa-solid fa-circle-check mr-1" />These dates are available!
        </p>
      )}

      <div className="mt-4 pt-4 border-t border-black/[.06] flex items-center justify-center gap-4 text-[11.5px] text-charcoal/40">
        <span><i className="fa-solid fa-shield-halved mr-1 text-forest" /> Trusted host</span>
        <span><i className="fa-solid fa-broom mr-1 text-forest" /> Spotlessly clean</span>
      </div>
    </div>
  );
}
