"use client";
import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

interface DailyRateEntry {
  date: string;
  rate: number;
  note?: string | null;
}

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
  propertyRules?: string | null;
}

// QR code map — keyed by payment method
const QR: Record<string, string> = {
  gcash: "/qr/gcash.jpg",
  bpi:   "/qr/bpi.png",
};
const AIRBNB_FEE_RATE = 0.142;
const STRIPE_FEE_RATE = 0.06;

// ── Stripe payment inner component ──────────────────────────────────────────
function StripePaymentForm({
  clientSecret,
  total,
  onSuccess,
  onError,
  submitting,
  setSubmitting,
}: {
  clientSecret: string;
  total: number;
  onSuccess: (paymentIntentId: string) => void;
  onError: (msg: string) => void;
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (error) {
      onError(error.message ?? "Payment failed. Please try again.");
      setSubmitting(false);
    } else if (paymentIntent?.status === "succeeded") {
      onSuccess(paymentIntent.id);
    } else {
      onError("Payment was not completed. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <button
        type="submit"
        disabled={!stripe || !elements || submitting}
        className="w-full mt-5 py-4 rounded-full text-[15px] font-semibold text-white disabled:opacity-60 hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
        style={{ background: "linear-gradient(135deg,#635BFF,#4B44D0)" }}
      >
        {submitting
          ? <><i className="fa-solid fa-spinner fa-spin" /> Processing…</>
          : <><i className="fa-solid fa-lock" /> Pay ₱{Math.round(total).toLocaleString()}</>}
      </button>
    </form>
  );
}

export default function BookingForm({
  propertyId, propertyName, propertyType, pricePerNight, maxGuests, bedrooms, slug,
  initialCheckIn = "", initialCheckOut = "", propertyRules,
}: Props) {
  const [form, setForm] = useState({
    guestName: "", guestEmail: "", guestPhone: "",
    checkIn: initialCheckIn, checkOut: initialCheckOut, guests: "1", notes: "",
  });
  const [paymentMethod, setPaymentMethod] = useState<"gcash" | "bpi" | "stripe">("gcash");
  const [step, setStep] = useState<"form" | "payment" | "done">("form");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [availabilityError, setAvailabilityError] = useState("");
  const [rulesAgreed, setRulesAgreed] = useState(false);

  // Discount code state
  const [discountCodeInput, setDiscountCodeInput] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string; type: string; value: number; discountAmount: number; message: string;
  } | null>(null);
  const [discountError, setDiscountError] = useState("");
  const [discountLoading, setDiscountLoading] = useState(false);

  // Daily rates state
  const [dailyRates, setDailyRates] = useState<DailyRateEntry[]>([]);
  const [nightlyTotal, setNightlyTotal] = useState<number | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);

  // Stripe state
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [stripePaymentIntentId, setStripePaymentIntentId] = useState<string | null>(null);

  const checkAvailability = useCallback(async (checkIn: string, checkOut: string) => {
    if (!checkIn || !checkOut || new Date(checkOut) <= new Date(checkIn)) return;
    try {
      const res = await fetch(`/api/availability/${slug}?checkIn=${checkIn}&checkOut=${checkOut}`);
      const data = await res.json();
      if (!data.available) {
        setAvailabilityError("Those dates are already booked. Please choose different dates.");
      } else {
        setAvailabilityError("");
      }
    } catch {
      // silently ignore
    }
  }, [slug]);

  const fetchDailyRates = useCallback(async (checkIn: string, checkOut: string) => {
    if (!checkIn || !checkOut || new Date(checkOut) <= new Date(checkIn)) {
      setDailyRates([]);
      setNightlyTotal(null);
      return;
    }
    setRatesLoading(true);
    try {
      const res = await fetch(`/api/rates/${slug}?checkIn=${checkIn}&checkOut=${checkOut}`);
      if (res.ok) {
        const data = await res.json();
        setDailyRates(data.dailyRates);
        setNightlyTotal(data.nightlyTotal);
      }
    } catch {
      // fallback to default pricePerNight calculation
      setDailyRates([]);
      setNightlyTotal(null);
    } finally {
      setRatesLoading(false);
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
        fetchDailyRates(ci, co);
        // Reset discount when dates change
        setAppliedDiscount(null);
        setDiscountCodeInput("");
        setDiscountError("");
      }
      return next;
    });
  };

  const computedNightlyTotal = nightlyTotal ?? (
    form.checkIn && form.checkOut
      ? Math.max(1, Math.ceil((new Date(form.checkOut).getTime() - new Date(form.checkIn).getTime()) / 86400000)) * pricePerNight
      : 0
  );
  const nights = dailyRates.length || (
    form.checkIn && form.checkOut
      ? Math.max(1, Math.ceil((new Date(form.checkOut).getTime() - new Date(form.checkIn).getTime()) / 86400000))
      : 0
  );

  const discountAmount = appliedDiscount?.discountAmount ?? 0;
  const stripeFeePHP = paymentMethod === "stripe" ? Math.round((computedNightlyTotal - discountAmount) * STRIPE_FEE_RATE * 100) / 100 : 0;
  const total = computedNightlyTotal - discountAmount + stripeFeePHP;

  const { airbnbTotal, savings } = useMemo(() => {
    const at = computedNightlyTotal * (1 + AIRBNB_FEE_RATE);
    return { airbnbTotal: at, savings: at - computedNightlyTotal };
  }, [computedNightlyTotal]);

  const todayStr = new Date().toISOString().split("T")[0];

  // Clear Stripe client secret when switching away from Stripe
  useEffect(() => {
    if (paymentMethod !== "stripe") {
      setStripeClientSecret(null);
      setStripePaymentIntentId(null);
    }
  }, [paymentMethod]);

  // Fetch a payment intent when user switches to Stripe on the payment step
  // (handles the case where Stripe is selected after reaching the payment screen)
  useEffect(() => {
    if (paymentMethod !== "stripe" || step !== "payment" || stripeClientSecret) return;
    if (!stripePublishableKey) {
      setError("Card payments are not available right now. Please use GCash or BPI.");
      return;
    }
    let cancelled = false;
    setSubmitting(true);
    setError("");
    fetch("/api/stripe/payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: total,
        metadata: {
          propertyId: String(propertyId),
          guestName: form.guestName,
          checkIn: form.checkIn,
          checkOut: form.checkOut,
        },
      }),
    })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (!ok) throw new Error(data.error ?? "Payment setup failed");
        setStripeClientSecret(data.clientSecret);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Payment setup failed");
      })
      .finally(() => {
        if (!cancelled) setSubmitting(false);
      });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentMethod, step]);

  const applyDiscountCode = async () => {
    if (!discountCodeInput.trim()) return;
    if (computedNightlyTotal <= 0) {
      setDiscountError("Please choose your stay dates first so we can calculate your discount.");
      return;
    }
    setDiscountLoading(true);
    setDiscountError("");
    try {
      const res = await fetch("/api/discount-codes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: discountCodeInput.trim(), nightlyTotal: computedNightlyTotal }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDiscountError(data.error ?? "That code isn't valid. Please double-check and try again.");
        setAppliedDiscount(null);
      } else {
        setAppliedDiscount(data);
      }
    } catch {
      setDiscountError("We couldn't verify that code. Please try again.");
    } finally {
      setDiscountLoading(false);
    }
  };

  const handleProceed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.checkIn || !form.checkOut) { setError("Please select check-in and check-out dates."); return; }
    if (new Date(form.checkOut) <= new Date(form.checkIn)) { setError("Check-out must be after check-in."); return; }
    if (availabilityError) { setError(availabilityError); return; }
    if (propertyRules && !rulesAgreed) { setError("Please agree to the property rules to continue."); return; }

    // If Stripe selected, create a payment intent
    if (paymentMethod === "stripe") {
      setSubmitting(true);
      setError("");
      try {
        const res = await fetch("/api/stripe/payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: total,
            metadata: {
              propertyId: String(propertyId),
              guestName: form.guestName,
              checkIn: form.checkIn,
              checkOut: form.checkOut,
            },
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Payment setup failed");
        setStripeClientSecret(data.clientSecret);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Payment setup failed");
        setSubmitting(false);
        return;
      } finally {
        setSubmitting(false);
      }
    }

    setError("");
    setStep("payment");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submitBooking = async (overridePaymentIntentId?: string) => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          ...form,
          totalPrice: total,
          nightlyTotal: computedNightlyTotal,
          paymentMethod,
          stripePaymentIntentId: overridePaymentIntentId || stripePaymentIntentId || null,
          discountCode: appliedDiscount?.code || null,
          discountAmount: discountAmount || null,
        }),
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

  const handlePaid = () => submitBooking();

  const inputCls = "w-full px-4 py-3 rounded-[10px] border border-black/[.10] bg-white text-[14px] text-charcoal focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/10 transition-colors";
  const labelCls = "text-[11.5px] font-semibold text-charcoal/55 tracking-wide uppercase mb-1.5 block";

  const hasVariedRates = dailyRates.length > 1 && dailyRates.some((r) => r.rate !== dailyRates[0].rate);

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
          {paymentMethod === "stripe"
            ? <>Your card payment went through — a confirmation will be sent to <strong>{form.guestEmail}</strong> shortly.</>
            : <>A confirmation will be sent to <strong>{form.guestEmail}</strong> once we verify your{" "}
              {paymentMethod === "gcash" ? "GCash" : "BPI"} payment — usually within a few hours.</>
          }
        </p>
        <Link href="/" className="inline-flex items-center gap-2 px-7 py-3 rounded-full text-[14px] font-semibold text-white"
          style={{ background: "linear-gradient(135deg,#FF5371,#E03D5A)" }}>
          <i className="fa-solid fa-house" /> Back to Homepage
        </Link>
      </div>
    );
  }

  // ── Payment step ──
  if (step === "payment") {
    const qrSrc = QR[paymentMethod as "gcash" | "bpi"];
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
              <div className="font-bold text-charcoal text-[1.25rem]">₱{Math.round(total).toLocaleString()}</div>
              <div className="text-[11px] text-charcoal/40">total</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-[13px] text-charcoal/55 mb-4">
            <div><span className="text-charcoal/35 text-[11px] block">CHECK-IN</span>{new Date(form.checkIn).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</div>
            <div><span className="text-charcoal/35 text-[11px] block">CHECK-OUT</span>{new Date(form.checkOut).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</div>
            <div><span className="text-charcoal/35 text-[11px] block">GUEST</span>{form.guestName}</div>
            <div><span className="text-charcoal/35 text-[11px] block">GUESTS</span>{form.guests} pax</div>
          </div>
          {/* Price breakdown */}
          <div className="pt-3 border-t border-black/[.05] text-[13px] space-y-1.5">
            {hasVariedRates
              ? dailyRates.map((r) => (
                  <div key={r.date} className="flex justify-between text-charcoal/50">
                    <span>{new Date(r.date).toLocaleDateString("en-PH",{weekday:"short",month:"short",day:"numeric"})}</span>
                    <span>₱{r.rate.toLocaleString()}</span>
                  </div>
                ))
              : nights > 0 && (
                  <div className="flex justify-between text-charcoal/50">
                    <span>{nights} night{nights!==1?"s":""} × ₱{(dailyRates[0]?.rate ?? pricePerNight).toLocaleString()}</span>
                    <span>₱{Math.round(computedNightlyTotal).toLocaleString()}</span>
                  </div>
                )
            }
            {discountAmount > 0 && (
              <div className="flex justify-between text-green-700">
                <span>Promo ({appliedDiscount?.code})</span>
                <span>−₱{Math.round(discountAmount).toLocaleString()}</span>
              </div>
            )}
            {stripeFeePHP > 0 && (
              <div className="flex justify-between text-charcoal/50">
                <span>Card processing fee ({(STRIPE_FEE_RATE*100).toFixed(0)}%)</span>
                <span>₱{Math.round(stripeFeePHP).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-charcoal pt-1.5 border-t border-black/[.06]">
              <span>Total</span>
              <span>₱{Math.round(total).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Payment method toggle */}
        <div className="mb-5">
          <p className={labelCls}>How would you like to pay?</p>
          <div className="grid grid-cols-3 gap-2">
            {(["gcash", "bpi", "stripe"] as const).map((m) => (
              <button key={m} type="button" onClick={() => setPaymentMethod(m)}
                className={`py-3 rounded-[12px] font-semibold text-[13px] border-2 transition-all duration-200 relative ${paymentMethod === m ? "border-forest bg-forest/5 text-forest" : "border-black/[.10] text-charcoal/50 hover:border-charcoal/20"}`}>
                {m === "gcash" ? "💙 GCash" : m === "bpi" ? "🏦 BPI" : "💳 Card"}
                {m !== "stripe" && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-green-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">
                    No Fee
                  </span>
                )}
              </button>
            ))}
          </div>
          {paymentMethod === "stripe" && (
            <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-[8px] text-[12px] text-amber-800">
              <i className="fa-solid fa-circle-info mr-1" />
              Card payments include a 6% processing fee. Pay with GCash or BPI to avoid this charge.
            </div>
          )}
        </div>

        {/* Stripe loading state while payment intent is being created */}
        {paymentMethod === "stripe" && !stripeClientSecret && submitting && (
          <div className="bg-white rounded-[16px] p-6 border border-black/[.06] shadow-[0_2px_12px_rgba(44,44,44,.07)] mb-5 flex items-center justify-center gap-3 text-charcoal/50 text-[13px]">
            <i className="fa-solid fa-spinner fa-spin" />
            Setting up secure payment…
          </div>
        )}

        {/* Stripe payment form */}
        {paymentMethod === "stripe" && stripeClientSecret && (
          <div className="bg-white rounded-[16px] p-6 border border-black/[.06] shadow-[0_2px_12px_rgba(44,44,44,.07)] mb-5">
            <p className="text-[12px] font-semibold text-charcoal/40 uppercase tracking-wider mb-4">
              Pay Securely by Card
            </p>
            <Elements stripe={stripePromise} options={{ clientSecret: stripeClientSecret, appearance: { theme: "stripe" } }}>
              <StripePaymentForm
                clientSecret={stripeClientSecret}
                total={total}
                submitting={submitting}
                setSubmitting={setSubmitting}
                onSuccess={(piId) => {
                  setStripePaymentIntentId(piId);
                  submitBooking(piId);
                }}
                onError={(msg) => setError(msg)}
              />
            </Elements>
          </div>
        )}

        {/* QR Code for GCash/BPI */}
        {paymentMethod !== "stripe" && (
          <div className="bg-white rounded-[16px] p-6 border border-black/[.06] shadow-[0_2px_12px_rgba(44,44,44,.07)] mb-5 text-center">
            <p className="text-[12px] font-semibold text-charcoal/40 uppercase tracking-wider mb-4">
              Scan to Pay via {paymentMethod === "gcash" ? "GCash" : "BPI"}
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrSrc} alt={`${paymentMethod.toUpperCase()} QR Code`} className="w-56 h-auto mx-auto rounded-[8px]" />
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-[8px] text-[12px] text-amber-800">
              <i className="fa-solid fa-circle-info mr-1.5" />
              Please transfer exactly <strong>₱{Math.round(total).toLocaleString()}</strong> using the QR code above. Add your name in the payment remarks so we can confirm faster.
            </div>
          </div>
        )}

        {error && (
          <div className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-[8px] px-3 py-2 mb-4">
            {error}
          </div>
        )}

        {/* Property Rules (payment step) */}
        {propertyRules && (
          <div className="bg-white rounded-[16px] p-6 border border-black/[.06] shadow-[0_2px_12px_rgba(44,44,44,.07)] mb-5">
            <h3 className="font-serif font-semibold text-charcoal mb-4">House Rules</h3>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={rulesAgreed} onChange={(e) => setRulesAgreed(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-forest border-2 border-gray-300 rounded focus:ring-forest focus:ring-2" />
              <span className="text-[13px] text-charcoal/70 leading-[1.5]">I&apos;ve read and agree to the property rules</span>
            </label>
          </div>
        )}

        {/* I Paid button — only for GCash/BPI */}
        {paymentMethod !== "stripe" && (
          <button onClick={handlePaid} disabled={submitting}
            className="w-full py-4 rounded-full text-[15px] font-semibold text-white disabled:opacity-60 hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg,#335238,#1e3c25)" }}>
            {submitting
              ? <><i className="fa-solid fa-spinner fa-spin" /> Processing…</>
              : <><i className="fa-solid fa-check-circle" /> I&apos;ve Paid — Confirm My Booking</>}
          </button>
        )}
        <p className="text-center text-[11px] text-charcoal/35 mt-3">
          We&apos;ll confirm your booking once we&apos;ve verified your payment — usually within a few hours.
        </p>
      </div>
    );
  }

  // ── Form step ──
  return (
    <div className="max-w-lg mx-auto">
      {/* Value proposition */}
      <div className="rounded-[14px] overflow-hidden mb-7" style={{ background: "linear-gradient(135deg,#162a1c,#335238)" }}>
        <div className="px-6 py-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[#FF5371] text-[11px] font-bold uppercase tracking-wider">💰 Book Direct &amp; Save</span>
          </div>
          <h3 className="text-white font-serif font-semibold text-[1.1rem] leading-snug mb-2">
            Skip the Airbnb fees. Pay only the nightly rate.
          </h3>
          <p className="text-white/65 text-[13px] leading-[1.6]">
            Booking on Airbnb adds a ~14% service fee on top of the nightly rate — money that goes to the platform, not to your stay.
            Book directly with HavenInLipa and that fee stays in your pocket.
          </p>
          {nights > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-2 pt-4 border-t border-white/10">
              <div className="text-center">
                <div className="text-white/50 text-[10px] uppercase tracking-wide">Direct price</div>
                <div className="text-white font-bold text-[1rem]">₱{Math.round(computedNightlyTotal).toLocaleString()}</div>
              </div>
              <div className="text-center">
                <div className="text-white/50 text-[10px] uppercase tracking-wide">Airbnb price</div>
                <div className="text-white/60 font-bold text-[1rem] line-through">₱{Math.round(airbnbTotal).toLocaleString()}</div>
              </div>
              <div className="text-center">
                <div className="text-[#FF5371] text-[10px] uppercase tracking-wide font-bold">You save</div>
                <div className="text-[#FF5371] font-bold text-[1rem]">₱{Math.round(savings).toLocaleString()}</div>
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
          <div className="mb-4">
            <label className={labelCls}>Number of Guests *</label>
            <select name="guests" value={form.guests} onChange={handle} className={inputCls}>
              {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n} {n === 1 ? "guest" : "guests"}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Special Requests <span className="normal-case font-normal text-charcoal/30">(optional)</span></label>
            <textarea name="notes" value={form.notes} onChange={handle} rows={2} placeholder="Early Check-in, Late Checkout, Directions, etc." className={`${inputCls} resize-none`} />
          </div>

          {/* Price breakdown */}
          {nights > 0 && (
            <div className="mt-4 pt-4 border-t border-black/[.06] space-y-1.5 text-[13px]">
              {ratesLoading ? (
                <div className="text-charcoal/40 text-[12px]"><i className="fa-solid fa-spinner fa-spin mr-1" /> Checking rates…</div>
              ) : hasVariedRates ? (
                <>
                  {dailyRates.map((r) => (
                    <div key={r.date} className="flex items-center justify-between text-charcoal/55">
                      <span>{new Date(r.date).toLocaleDateString("en-PH",{weekday:"short",month:"short",day:"numeric"})}{r.note ? <span className="ml-1 text-[11px] text-charcoal/30">({r.note})</span> : null}</span>
                      <span>₱{r.rate.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-charcoal font-semibold pt-1 border-t border-black/[.06]">
                    <span>Subtotal ({nights} nights)</span>
                    <span>₱{Math.round(computedNightlyTotal).toLocaleString()}</span>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between text-charcoal/55">
                  <span>{nights} night{nights !== 1 ? "s" : ""} × ₱{(dailyRates[0]?.rate ?? pricePerNight).toLocaleString()}</span>
                  <span className="font-bold text-charcoal">₱{Math.round(computedNightlyTotal).toLocaleString()}</span>
                </div>
              )}
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Promo ({appliedDiscount?.code})</span>
                  <span>−₱{Math.round(discountAmount).toLocaleString()}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Discount code */}
        {nights > 0 && (
          <div className="bg-white rounded-[16px] p-6 border border-black/[.06] shadow-[0_2px_12px_rgba(44,44,44,.07)]">
            <h3 className="font-serif font-semibold text-charcoal mb-4">Have a Promo Code?</h3>
            {appliedDiscount ? (
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-[10px]">
                <div>
                  <span className="text-green-700 font-semibold text-[13px]">{appliedDiscount.code}</span>
                  <span className="text-green-600 text-[12px] ml-2">{appliedDiscount.message}</span>
                  <div className="text-green-700 font-bold text-[14px] mt-0.5">−₱{Math.round(appliedDiscount.discountAmount).toLocaleString()} off</div>
                </div>
                <button type="button" onClick={() => { setAppliedDiscount(null); setDiscountCodeInput(""); }}
                  className="text-green-600 hover:text-red-500 transition-colors text-[13px]">
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={discountCodeInput}
                  onChange={(e) => { setDiscountCodeInput(e.target.value.toUpperCase()); setDiscountError(""); }}
                  placeholder="Enter your code"
                  className={`${inputCls} flex-1`}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), applyDiscountCode())}
                />
                <button
                  type="button"
                  onClick={applyDiscountCode}
                  disabled={discountLoading || !discountCodeInput.trim()}
                  className="px-4 py-3 rounded-[10px] bg-forest text-white text-[13px] font-semibold disabled:opacity-50 hover:bg-forest/90 transition-colors whitespace-nowrap"
                >
                  {discountLoading ? <i className="fa-solid fa-spinner fa-spin" /> : "Apply"}
                </button>
              </div>
            )}
            {discountError && (
              <p className="text-[12px] text-red-600 mt-2">{discountError}</p>
            )}
          </div>
        )}

        {error && (
          <div className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-[8px] px-3 py-2">{error}</div>
        )}

        {/* Property Rules */}
        {propertyRules && (
          <div className="bg-white rounded-[16px] p-6 border border-black/[.06] shadow-[0_2px_12px_rgba(44,44,44,.07)]">
            <h3 className="font-serif font-semibold text-charcoal mb-4">House Rules</h3>
            <div className="text-charcoal/75 text-[14px] leading-[1.7] whitespace-pre-line mb-4">{propertyRules}</div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={rulesAgreed} onChange={(e) => setRulesAgreed(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-forest border-2 border-gray-300 rounded focus:ring-forest focus:ring-2" />
              <span className="text-[13px] text-charcoal/70 leading-[1.5]">I&apos;ve read and agree to the house rules</span>
            </label>
          </div>
        )}

        <button type="submit" disabled={submitting}
          className="w-full py-4 rounded-full text-[15px] font-semibold text-white hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg,#FF5371,#E03D5A)" }}>
          {submitting ? <><i className="fa-solid fa-spinner fa-spin" /> Preparing your booking…</> : <>Continue to Payment <i className="fa-solid fa-arrow-right ml-1.5 text-[13px]" /></>}
        </button>
      </form>
    </div>
  );
}
