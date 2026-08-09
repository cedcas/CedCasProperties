"use client";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import FeeBreakdown from "./FeeBreakdown";
import { calcExtraGuestFee } from "@/lib/pricing-core";
import { extraGuestFeeApplies } from "@/lib/occupancy";

interface Props {
  slug: string;
  pricePerNight: number;
  maxGuests: number;
  includedGuests: number;
  extraGuestFeePerNight: number;
  bedrooms: number;
  bathrooms: number;
  location: string;
  type: string;
  propertyRules?: string | null;
  /** Seeded from ?checkIn / ?checkOut / ?guests when a link carries dates forward. */
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialGuests?: string;
}

export default function BookingCard({
  slug,
  pricePerNight,
  maxGuests,
  includedGuests,
  extraGuestFeePerNight,
  bedrooms,
  bathrooms,
  location,
  type,
  propertyRules,
  initialCheckIn = "",
  initialCheckOut = "",
  initialGuests = "",
}: Props) {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];

  // Seeded only from an explicit URL param — never from browser cache/autofill.
  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [guests, setGuests] = useState(() => {
    const n = Number(initialGuests);
    if (!Number.isFinite(n) || n < 1) return 1;
    return Math.min(Math.trunc(n), maxGuests);
  });
  const [availability, setAvailability] = useState<"idle" | "checking" | "available" | "unavailable">("idle");
  const [dateError, setDateError] = useState("");
  const [rulesAgreed, setRulesAgreed] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // True nightly subtotal from /api/rates (weekday/weekend/override aware).
  // The per-night entries themselves are no longer needed here — FeeBreakdown
  // detects varied pricing by comparing the subtotal against the base rate.
  const [nightlyTotal, setNightlyTotal] = useState<number | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);

  // Force-clear date inputs on mount so browser autofill can't inject stale values.
  // Skipped when the URL supplied a date — that value is intentional.
  const checkInRef  = useRef<HTMLInputElement>(null);
  const checkOutRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!initialCheckIn && checkInRef.current)  checkInRef.current.value  = "";
    if (!initialCheckOut && checkOutRef.current) checkOutRef.current.value = "";
    // Mount-only: seeding is a one-shot from the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    return Math.max(1, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000));
  }, [checkIn, checkOut]);

  const computedNightlyTotal = nightlyTotal ?? nights * pricePerNight;

  // Same formula the booking API charges with, so the CTA total can't understate.
  const extraGuestFee = calcExtraGuestFee(guests, includedGuests, extraGuestFeePerNight, nights);
  const stayTotal = computedNightlyTotal + extraGuestFee;

  const feeApplies = extraGuestFeeApplies({ maxGuests, includedGuests, extraGuestFeePerNight });

  // Fetch actual daily rates (weekday/weekend/override) from the pricing API
  const fetchDailyRates = useCallback(async (ci: string, co: string) => {
    if (!ci || !co || new Date(co) <= new Date(ci)) {
      setNightlyTotal(null);
      return;
    }
    setRatesLoading(true);
    try {
      const res = await fetch(`/api/rates/${slug}?checkIn=${ci}&checkOut=${co}`);
      if (res.ok) {
        const data = await res.json();
        setNightlyTotal(data.nightlyTotal);
      }
    } catch {
      setNightlyTotal(null);
    } finally {
      setRatesLoading(false);
    }
  }, [slug]);

  // Check availability and fetch actual rates whenever both dates are valid
  useEffect(() => {
    if (!checkIn || !checkOut || new Date(checkOut) <= new Date(checkIn)) {
      setAvailability("idle");
      setNightlyTotal(null);
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
    fetchDailyRates(checkIn, checkOut);
  }, [checkIn, checkOut, slug, fetchDailyRates]);

  const notPriced = pricePerNight <= 0;

  const handleBook = () => {
    if (notPriced) return;
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

    // Check property rules agreement if rules exist
    if (propertyRules && !rulesAgreed) {
      setDateError("Please agree to the property rules to continue.");
      return;
    }

    setDateError("");
    const params = new URLSearchParams({ checkIn, checkOut, guests: String(guests) });
    router.push(`/properties/${slug}/book?${params.toString()}`);
  };

  const fieldFocus = "focus:outline-none focus:ring-2 focus:ring-forest/20 rounded-md";

  return (
    <div className="bg-white rounded-[20px] p-6 shadow-[0_8px_40px_rgba(44,44,44,.10)] border border-black/[.05]">

      {/* Price */}
      {pricePerNight > 0 ? (
        <div className="flex items-baseline gap-1.5 mb-1">
          <span className="font-bold text-charcoal text-[1.5rem] sm:text-[1.8rem]">From ₱{pricePerNight.toLocaleString()}</span>
          <span className="text-charcoal/40 text-[13px]">/ night</span>
        </div>
      ) : (
        <div className="font-bold text-charcoal text-[1.4rem] mb-1">Rate coming soon</div>
      )}
      <p className="text-[12px] text-charcoal/35 mb-5">Entire unit · {type}</p>

      {/* Date + guest pickers */}
      <div className="mb-4">
        <div className={`border rounded-[12px] overflow-hidden divide-y ${dateError ? "border-red-400 divide-red-200" : "border-black/[.10] divide-black/[.08]"}`}>
          {/* Check-in */}
          <div className="px-4 py-3">
            <label htmlFor="bc-checkin" className="text-[10px] font-bold text-charcoal/40 uppercase tracking-wider block mb-1">
              <i className="fa-regular fa-calendar mr-1.5" aria-hidden="true" />Check-in <span className="text-red-400">*</span>
            </label>
            <input
              id="bc-checkin"
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
              className={`w-full min-h-[28px] text-[14px] font-medium text-charcoal bg-transparent cursor-pointer ${fieldFocus}`}
            />
          </div>
          {/* Check-out */}
          <div className="px-4 py-3">
            <label htmlFor="bc-checkout" className="text-[10px] font-bold text-charcoal/40 uppercase tracking-wider block mb-1">
              <i className="fa-regular fa-calendar-check mr-1.5" aria-hidden="true" />Check-out <span className="text-red-400">*</span>
            </label>
            <input
              id="bc-checkout"
              ref={checkOutRef}
              type="date"
              min={checkIn || today}
              value={checkOut}
              autoComplete="off"
              onChange={(e) => {
                setCheckOut(e.target.value);
                setDateError("");
              }}
              className={`w-full min-h-[28px] text-[14px] font-medium text-charcoal bg-transparent cursor-pointer ${fieldFocus}`}
            />
          </div>
          {/* Guests — drives the extra-guest fee, and is carried through to /book */}
          <div className="px-4 py-3">
            <label htmlFor="bc-guests" className="text-[10px] font-bold text-charcoal/40 uppercase tracking-wider block mb-1">
              <i className="fa-solid fa-user-group mr-1.5" aria-hidden="true" />Guests
            </label>
            <select
              id="bc-guests"
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              aria-describedby={feeApplies ? "bc-guest-fee-note" : undefined}
              className={`w-full min-h-[28px] text-[14px] font-medium text-charcoal bg-transparent cursor-pointer ${fieldFocus}`}
            >
              {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} guest{n !== 1 ? "s" : ""}
                  {feeApplies && n > includedGuests ? " · +extra-guest fee" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Missing-date error */}
        {dateError && (
          <div className="mt-2.5 flex items-start gap-2 text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-[10px] px-3 py-2.5">
            <i className="fa-solid fa-circle-exclamation mt-0.5 flex-shrink-0" aria-hidden="true" />
            <span>{dateError}</span>
          </div>
        )}

        {/* Nights summary / availability feedback */}
        {!dateError && nights > 0 && availability !== "unavailable" && (ratesLoading || availability === "checking") && (
          <div className="mt-3 px-1 text-[12px] text-charcoal/40">
            <i className="fa-solid fa-circle-notch fa-spin mr-1" aria-hidden="true" />Checking…
          </div>
        )}
        {availability === "unavailable" && (
          <div className="mt-3 flex items-start gap-2 text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-[10px] px-3 py-2.5">
            <i className="fa-solid fa-calendar-xmark mt-0.5 flex-shrink-0" aria-hidden="true" />
            <span>We apologize, your selected dates are not available. Please select another date range.</span>
          </div>
        )}
      </div>

      {/* Itemized, DB-driven fee breakdown — static before dates, live after.
          Renders in the initial SSR HTML, so it needs no JS to be readable. */}
      <div id="bc-guest-fee-note" aria-live="polite">
        <FeeBreakdown
          className="mb-5"
          pricePerNight={pricePerNight}
          includedGuests={includedGuests}
          maxGuests={maxGuests}
          extraGuestFeePerNight={extraGuestFeePerNight}
          nights={availability === "unavailable" ? 0 : nights}
          guests={guests}
          nightlyTotal={nightlyTotal}
        />
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
            <i className={`fa-solid fa-${icon} text-forest w-4 text-center text-[12px]`} aria-hidden="true" />
            {text}
          </div>
        ))}
      </div>

      {/* Property Rules Agreement */}
      {propertyRules && (
        <div className="mb-4">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={rulesAgreed}
              onChange={(e) => setRulesAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-forest border-2 border-gray-300 rounded focus:ring-forest focus:ring-2"
            />
            <span className="text-[12px] text-charcoal/70 leading-[1.5]">
              I agree to the property rules and policies
            </span>
          </label>
        </div>
      )}

      {/* CTA */}
      <button
        onClick={handleBook}
        disabled={notPriced || availability === "unavailable" || availability === "checking" || (!!propertyRules && !rulesAgreed)}
        className="w-full flex items-center justify-center gap-2 py-3.5 min-h-[48px] rounded-full text-[14px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none"
        style={{ background: (notPriced || availability === "unavailable" || (propertyRules && !rulesAgreed)) ? "#9CA3AF" : "linear-gradient(135deg,#FF5371,#E03D5A)" }}
      >
        <i className={`fa-solid ${availability === "checking" ? "fa-circle-notch fa-spin" : "fa-calendar-check"}`} aria-hidden="true" />
        {notPriced ? "Not Available Yet" : availability === "unavailable" ? "Dates Not Available" : (propertyRules && !rulesAgreed) ? "Agree to Rules to Book" : nights > 0 ? `Book — ₱${Math.round(stayTotal).toLocaleString()}` : "Book this Property"}
      </button>

      {availability === "available" && (
        <p className="text-center text-[11px] text-green-600 mt-3">
          <i className="fa-solid fa-circle-check mr-1" aria-hidden="true" />These dates are available!
        </p>
      )}

      <div className="mt-4 pt-4 border-t border-black/[.06] flex items-center justify-center gap-4 text-[11.5px] text-charcoal/40">
        <span><i className="fa-solid fa-shield-halved mr-1 text-forest" aria-hidden="true" /> Trusted host</span>
        <span><i className="fa-solid fa-broom mr-1 text-forest" aria-hidden="true" /> Spotlessly clean</span>
      </div>
    </div>
  );
}
