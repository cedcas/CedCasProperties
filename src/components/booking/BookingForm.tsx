"use client";
import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Props {
  propertyId: number;
  propertyName: string;
  propertyType: string;
  pricePerNight: number;
  maxGuests: number;
  bedrooms: number;
  slug: string;
  initialCheckIn?: string;
  initialCheckOut?: string;
}

// QR code map — keyed by payment method only
// These are static assets committed to the repo and cannot be changed without a new deployment
const QR: Record<string, string> = {
  gcash: "/qr/gcash.jpg",
  bpi:   "/qr/bpi.png",
};
const AIRBNB_FEE_RATE = 0.142; // ~14.2% Airbnb service fee

export default function BookingForm({ propertyId, propertyName, propertyType, pricePerNight, maxGuests, bedrooms, slug, initialCheckIn = "", initialCheckOut = "" }: Props) {
  const router = useRouter();

  const [form, setForm] = useState({
    guestName: "", guestEmail: "", guestPhone: "",
    checkIn: initialCheckIn, checkOut: initialCheckOut, guests: "1", notes: "",
  });
  const [paymentMethod, setPaymentMethod] = useState<"gcash" | "bpi">("gcash");
  const [step, setStep] = useState<"form" | "payment" | "done">("form");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [availabilityError, setAvailabilityError] = useState("");

  const checkAvailability = useCallback(async (checkIn: string, checkOut: string) => {
    if (!checkIn || !checkOut || new Date(checkOut) <= new Date(checkIn)) return;
    try {
      const res = await fetch(`/api/availability/${slug}?checkIn=${checkIn}&checkOut=${checkOut}`);
      const data = await res.json();
      if (!data.available) {
        setAvailabilityError("These dates are not available. Please select different dates.");
      } else {
        setAvailabilityError("");
      }
    } catch {
      // silently ignore — server will recheck on submit
    }
  }, [slug]);

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((p) => {
      const next = { ...p, [name]: value };
      if (name === "checkIn" || name === "checkOut") {
        const ci = name === "checkIn"  ? value : p.checkIn;
        const co = name === "checkOut" ? value : p.checkOut;
        checkAvailability(ci, co);
      }
      return next;
    });
  };

  const { nights, total, airbnbTotal, savings } = useMemo(() => {
    if (!form.checkIn || !form.checkOut) return { nights: 0, total: 0, airbnbTotal: 0, savings: 0 };
    const n = Math.max(1, Math.ceil((new Date(form.checkOut).getTime() - new Date(form.checkIn).getTime()) / 86400000));
    const t = n * pricePerNight;
    const at = t * (1 + AIRBNB_FEE_RATE);
    return { nights: n, total: t, airbnbTotal: at, savings: at - t };
  }, [form.checkIn, form.checkOut, pricePerNight]);

  const todayStr = new Date().toISOString().split("T")[0];

  const handleProceed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.checkIn || !form.checkOut) { setError("Please select check-in and check-out dates."); return; }
    if (new Date(form.checkOut) <= new Date(form.checkIn)) { setError("Check-out must be after check-in."); return; }
    if (availabilityError) { setError(availabilityError); return; }
    setError("");
    setStep("payment");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePaid = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, ...form, totalPrice: total, paymentMethod }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Booking failed");
      }
      setStep("done");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again or contact us directly.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "w-full px-4 py-3 rounded-[10px] border border-black/[.10] bg-white text-[14px] text-charcoal focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/10 transition-colors";
  const labelCls = "text-[11.5px] font-semibold text-charcoal/55 tracking-wide uppercase mb-1.5 block";

  // ── Done state ──
  if (step === "done") {
    return (
      <div className="text-center py-16 px-6">
        <div className="w-20 h-20 rounded-full bg-forest/10 flex items-center justify-center mx-auto mb-5">
          <i className="fa-solid fa-circle-check text-forest text-[2.5rem]" />
        </div>
        <h2 className="font-serif font-semibold text-charcoal text-[1.6rem] mb-3">Booking Received!</h2>
        <p className="text-charcoal/55 text-[15px] leading-[1.8] max-w-sm mx-auto mb-2">
          Thank you, <strong>{form.guestName}</strong>! We&apos;ve received your booking request for <strong>{propertyName}</strong>.
        </p>
        <p className="text-charcoal/45 text-[14px] mb-8">
          A confirmation will be sent to <strong>{form.guestEmail}</strong> once we verify your {paymentMethod === "gcash" ? "GCash" : "BPI"} payment (usually within a few hours).
        </p>
        <a href="/" className="inline-flex items-center gap-2 px-7 py-3 rounded-full text-[14px] font-semibold text-white"
          style={{ background: "linear-gradient(135deg,#C4A862,#A8893F)" }}>
          <i className="fa-solid fa-house" /> Back to Homepage
        </a>
      </div>
    );
  }

  // ── Payment step ──
  if (step === "payment") {
    const qrSrc = QR[paymentMethod];
    return (
      <div className="max-w-lg mx-auto">
        {/* Back */}
        <button onClick={() => setStep("form")} className="flex items-center gap-2 text-[13px] text-charcoal/45 hover:text-forest transition-colors mb-6">
          <i className="fa-solid fa-arrow-left text-[11px]" /> Back to details
        </button>

        {/* Booking summary */}
        <div className="bg-white rounded-[16px] p-5 border border-black/[.06] shadow-[0_2px_12px_rgba(44,44,44,.07)] mb-5">
          <div className="flex items-start justify-between gap-3 mb-4 pb-4 border-b border-black/[.06]">
            <div>
              <div className="font-serif font-semibold text-charcoal">{propertyName}</div>
              <div className="text-[12px] text-charcoal/45">{propertyType} · {nights} night{nights !== 1 ? "s" : ""}</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-charcoal text-[1.25rem]">₱{total.toLocaleString()}</div>
              <div className="text-[11px] text-charcoal/40">total</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-[13px] text-charcoal/55">
            <div><span className="text-charcoal/35 text-[11px] block">CHECK-IN</span>{new Date(form.checkIn).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</div>
            <div><span className="text-charcoal/35 text-[11px] block">CHECK-OUT</span>{new Date(form.checkOut).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</div>
            <div><span className="text-charcoal/35 text-[11px] block">GUEST</span>{form.guestName}</div>
            <div><span className="text-charcoal/35 text-[11px] block">GUESTS</span>{form.guests} pax</div>
          </div>
        </div>

        {/* Payment method toggle */}
        <div className="mb-5">
          <p className={labelCls}>Select Payment Method</p>
          <div className="grid grid-cols-2 gap-3">
            {(["gcash", "bpi"] as const).map((m) => (
              <button key={m} type="button" onClick={() => setPaymentMethod(m)}
                className={`py-3 rounded-[12px] font-semibold text-[14px] border-2 transition-all duration-200 ${paymentMethod === m ? "border-forest bg-forest/5 text-forest" : "border-black/[.10] text-charcoal/50 hover:border-charcoal/20"}`}>
                {m === "gcash" ? "💙 GCash" : "🏦 BPI Bank"}
              </button>
            ))}
          </div>
        </div>

        {/* QR Code */}
        <div className="bg-white rounded-[16px] p-6 border border-black/[.06] shadow-[0_2px_12px_rgba(44,44,44,.07)] mb-5 text-center">
          <p className="text-[12px] font-semibold text-charcoal/40 uppercase tracking-wider mb-4">
            Scan to Pay via {paymentMethod === "gcash" ? "GCash" : "BPI"}
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrSrc} alt={`${paymentMethod.toUpperCase()} QR Code`} className="w-56 h-auto mx-auto rounded-[8px]" />
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-[8px] text-[12px] text-amber-800">
            <i className="fa-solid fa-circle-info mr-1.5" />
            Transfer exactly <strong>₱{total.toLocaleString()}</strong> using the QR above. Include your name in the remarks.
          </div>
        </div>

        {error && (
          <div className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-[8px] px-3 py-2 mb-4">
            {error}
          </div>
        )}

        {/* I Paid button */}
        <button onClick={handlePaid} disabled={submitting}
          className="w-full py-4 rounded-full text-[15px] font-semibold text-white disabled:opacity-60 hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg,#3B5323,#2d4820)" }}>
          {submitting
            ? <><i className="fa-solid fa-spinner fa-spin" /> Processing…</>
            : <><i className="fa-solid fa-check-circle" /> I Paid — Submit Booking</>}
        </button>
        <p className="text-center text-[11px] text-charcoal/35 mt-3">
          Your booking will be confirmed once payment is verified (usually within a few hours).
        </p>
      </div>
    );
  }

  // ── Form step ──
  return (
    <div className="max-w-lg mx-auto">
      {/* Value proposition */}
      <div className="rounded-[14px] overflow-hidden mb-7" style={{ background: "linear-gradient(135deg,#1e3310,#3B5323)" }}>
        <div className="px-6 py-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[#C4A862] text-[11px] font-bold uppercase tracking-wider">💰 Book Direct &amp; Save</span>
          </div>
          <h3 className="text-white font-serif font-semibold text-[1.1rem] leading-snug mb-2">
            Skip the Airbnb fees. Pay only the nightly rate.
          </h3>
          <p className="text-white/65 text-[13px] leading-[1.6]">
            Booking on Airbnb adds a ~14% service fee on top of the nightly rate — money that goes to the platform, not to your stay.
            Book directly with CedCas and that fee stays in your pocket.
          </p>
          {nights > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-2 pt-4 border-t border-white/10">
              <div className="text-center">
                <div className="text-white/50 text-[10px] uppercase tracking-wide">Direct price</div>
                <div className="text-white font-bold text-[1rem]">₱{total.toLocaleString()}</div>
              </div>
              <div className="text-center">
                <div className="text-white/50 text-[10px] uppercase tracking-wide">Airbnb price</div>
                <div className="text-white/60 font-bold text-[1rem] line-through">₱{Math.round(airbnbTotal).toLocaleString()}</div>
              </div>
              <div className="text-center">
                <div className="text-[#C4A862] text-[10px] uppercase tracking-wide font-bold">You save</div>
                <div className="text-[#C4A862] font-bold text-[1rem]">₱{Math.round(savings).toLocaleString()}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleProceed} className="space-y-5">

        {/* Guest info */}
        <div className="bg-white rounded-[16px] p-6 border border-black/[.06] shadow-[0_2px_12px_rgba(44,44,44,.07)]">
          <h3 className="font-serif font-semibold text-charcoal mb-4">Your Information</h3>
          <div className="space-y-4">
            <div><label className={labelCls}>Full Name *</label><input name="guestName" required value={form.guestName} onChange={handle} placeholder="Maria Santos" className={inputCls} /></div>
            <div><label className={labelCls}>Email Address *</label><input name="guestEmail" type="email" required value={form.guestEmail} onChange={handle} placeholder="maria@example.com" className={inputCls} /></div>
            <div><label className={labelCls}>Phone Number *</label><input name="guestPhone" type="tel" required value={form.guestPhone} onChange={handle} placeholder="+63 9XX XXX XXXX" className={inputCls} /></div>
          </div>
        </div>

        {/* Stay details */}
        <div className="bg-white rounded-[16px] p-6 border border-black/[.06] shadow-[0_2px_12px_rgba(44,44,44,.07)]">
          <h3 className="font-serif font-semibold text-charcoal mb-4">Stay Details</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div><label className={labelCls}>Check-in *</label><input name="checkIn" type="date" required min={todayStr} value={form.checkIn} onChange={handle} className={inputCls} /></div>
            <div><label className={labelCls}>Check-out *</label><input name="checkOut" type="date" required min={form.checkIn || todayStr} value={form.checkOut} onChange={handle} className={inputCls} /></div>
          </div>
          {availabilityError && (
            <div className="flex items-start gap-2 text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-[8px] px-3 py-2.5 mb-4">
              <i className="fa-solid fa-calendar-xmark mt-0.5 flex-shrink-0" />
              <span>{availabilityError}</span>
            </div>
          )}
          <div className="mb-4"><label className={labelCls}>Number of Guests *</label>
            <select name="guests" value={form.guests} onChange={handle} className={inputCls}>
              {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n} {n === 1 ? "guest" : "guests"}</option>
              ))}
            </select>
          </div>
          <div><label className={labelCls}>Special Requests <span className="normal-case font-normal text-charcoal/30">(optional)</span></label>
            <textarea name="notes" value={form.notes} onChange={handle} rows={2} placeholder="Early Check-in, Late Checkout, Directions, etc." className={`${inputCls} resize-none`} />
          </div>

          {nights > 0 && (
            <div className="mt-4 pt-4 border-t border-black/[.06] flex items-center justify-between">
              <span className="text-[13px] text-charcoal/55">{nights} night{nights !== 1 ? "s" : ""} × ₱{pricePerNight.toLocaleString()}</span>
              <span className="font-bold text-charcoal text-[1.1rem]">₱{total.toLocaleString()}</span>
            </div>
          )}
        </div>

        {error && (
          <div className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-[8px] px-3 py-2">{error}</div>
        )}

        <button type="submit"
          className="w-full py-4 rounded-full text-[15px] font-semibold text-white hover:-translate-y-0.5 transition-all duration-200"
          style={{ background: "linear-gradient(135deg,#C4A862,#A8893F)" }}>
          Continue to Payment <i className="fa-solid fa-arrow-right ml-1.5 text-[13px]" />
        </button>
      </form>
    </div>
  );
}
