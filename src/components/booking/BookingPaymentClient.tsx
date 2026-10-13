"use client";
import { useEffect, useRef, useState } from "react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import PaymentQR from "@/components/booking/PaymentQR";
import { track } from "@/lib/analytics";
import { trackPurchaseOnce } from "@/lib/ga4-purchase";

/**
 * Payment for an approved booking request (/pay/booking/[token]) — GCash, BPI or card.
 * Modelled on ChargePaymentClient. The server prices everything from the booking behind
 * the token; the amounts passed in here are for display only.
 */

const peso = (n: number) => `₱${Number(n).toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;

const buildTimeStripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
let cachedStripePromise: ReturnType<typeof loadStripe> | null = buildTimeStripeKey ? loadStripe(buildTimeStripeKey) : null;
function getOrCreateStripePromise(runtimeKey?: string): ReturnType<typeof loadStripe> | null {
  if (cachedStripePromise) return cachedStripePromise;
  const key = runtimeKey ?? buildTimeStripeKey;
  if (key) cachedStripePromise = loadStripe(key);
  return cachedStripePromise;
}

interface Props {
  token: string;
  /** GCash/BPI amount — the booking's stored total. */
  amount: number;
  cardFee: number;
  cardTotal: number;
  propertyName: string;
  propertySlug: string;
  guestFirstName: string;
}

type Method = "gcash" | "bpi" | "stripe";
const QR_SRC: Record<Exclude<Method, "stripe">, string> = { gcash: "/qr/gcash.jpg", bpi: "/qr/bpi.png" };

interface PaidResult {
  status: "pending" | "confirmed";
  bookingId: number;
  total: number;
  propertySlug: string;
  propertyName: string;
  nights: number;
}

function StripeBookingForm({
  total,
  slug,
  submitting,
  setSubmitting,
  onSuccess,
  onError,
}: {
  total: number;
  slug: string;
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
  onSuccess: (paymentIntentId: string) => void;
  onError: (msg: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    const { error, paymentIntent } = await stripe.confirmPayment({ elements, redirect: "if_required" });
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
      <PaymentElement options={{ defaultValues: { billingDetails: { address: { country: "PH" } } } }} />
      <button
        type="submit"
        disabled={!stripe || !elements || submitting}
        data-analytics="book_click"
        data-property={slug}
        className="w-full mt-5 py-4 rounded-full text-[15px] font-semibold text-white disabled:opacity-60 hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
        style={{ background: "linear-gradient(135deg,#635BFF,#4B44D0)" }}
      >
        {submitting ? <><i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> Processing…</> : <><i className="fa-solid fa-lock" aria-hidden="true" /> Pay {peso(total)}</>}
      </button>
    </form>
  );
}

export default function BookingPaymentClient({ token, amount, cardFee, cardTotal, propertyName, propertySlug, guestFirstName }: Props) {
  const [method, setMethod] = useState<Method>("gcash");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<PaidResult | null>(null);

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripeInstance, setStripeInstance] = useState<ReturnType<typeof loadStripe> | null>(() => cachedStripePromise);
  const [cardError, setCardError] = useState("");

  // GA4 funnel step, as on the booking form's payment screen.
  useEffect(() => {
    track("add_payment_info", {
      property: propertySlug,
      payment_type: method,
      value: Math.round(method === "stripe" ? cardTotal : amount),
      currency: "PHP",
    });
  }, [method, propertySlug, amount, cardTotal]);

  // Create the PaymentIntent when the guest picks card. The server looks the booking up
  // by token, checks the dates are still free, and prices the card total itself.
  useEffect(() => {
    if (method !== "stripe" || clientSecret || cardError) return;
    let cancelled = false;
    fetch("/api/stripe/payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "booking_payment", token }),
    })
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (!ok) {
          // Dates gone or link expired is the guest's answer; anything else is a card outage.
          setCardError(
            data.code === "unavailable" || data.code === "not_payable"
              ? data.error
              : "Card payments are temporarily unavailable. Please use GCash or BPI above."
          );
          return;
        }
        setStripeInstance(getOrCreateStripePromise(data.publishableKey));
        setClientSecret(data.clientSecret);
      })
      .catch(() => !cancelled && setCardError("Card payments are temporarily unavailable. Please use GCash or BPI above."));
    return () => {
      cancelled = true;
    };
  }, [method, clientSecret, cardError, token]);

  const submitPaid = async (paymentMethod: Method, stripePaymentIntentId?: string) => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/bookings/pay/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod, stripePaymentIntentId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please contact us before paying again.");
      setDone(data as PaidResult);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please contact us before paying again.");
      setSubmitting(false);
    }
  };

  // GA4 conversion — the same two events the booking form fires for an instant booking,
  // sent here because this is where an approved request is actually paid.
  const trackedRef = useRef(false);
  useEffect(() => {
    if (!done || trackedRef.current) return;
    trackedRef.current = true;
    track("booking_confirmed", {
      property: done.propertySlug || propertySlug,
      value: Math.round(Number(done.total)),
      currency: "PHP",
      transaction_id: `HIL-${done.bookingId}`,
    });
    trackPurchaseOnce(track, {
      bookingId: done.bookingId,
      propertySlug: done.propertySlug || propertySlug,
      propertyName: done.propertyName || propertyName,
      total: Number(done.total),
      nights: done.nights,
    });
  }, [done, propertySlug, propertyName]);

  if (done) {
    return (
      <div role="status" className="bg-white rounded-[16px] p-8 border border-black/[.06] shadow-[0_2px_12px_rgba(44,44,44,.07)] text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-4">
          <i className="fa-solid fa-circle-check text-green-600 text-2xl" aria-hidden="true" />
        </div>
        {done.status === "confirmed" ? (
          <>
            <h2 className="font-serif text-[1.3rem] text-charcoal font-semibold mb-2">Your stay is confirmed</h2>
            <p className="text-[14px] text-charcoal/65 leading-relaxed">
              Thank you, {guestFirstName}! Your card payment of <strong>{peso(done.total)}</strong> went through and your booking at{" "}
              {propertyName} is confirmed. A confirmation email is on its way.
            </p>
          </>
        ) : (
          <>
            <h2 className="font-serif text-[1.3rem] text-charcoal font-semibold mb-2">Thank you. We&apos;re verifying your payment</h2>
            <p className="text-[14px] text-charcoal/65 leading-relaxed">
              Your dates at {propertyName} are now held, {guestFirstName}. We will email your confirmation once we have verified your
              payment of <strong>{peso(done.total)}</strong>. Please do not pay again.
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 mb-5" role="group" aria-label="Payment method">
        {(["gcash", "bpi", "stripe"] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={method === m}
            onClick={() => {
              setMethod(m);
              setError("");
            }}
            className={`py-3 rounded-[12px] border text-[13px] font-semibold transition-all ${
              method === m ? "border-forest bg-forest/5 text-forest" : "border-black/10 text-charcoal/60 hover:border-forest/40"
            }`}
          >
            {m === "gcash" ? "GCash" : m === "bpi" ? "BPI" : "Card"}
            <span className="block text-[10px] font-normal text-charcoal/40">{m === "stripe" ? "+6% fee" : "No fee"}</span>
          </button>
        ))}
      </div>

      {method !== "stripe" && (
        <>
          <PaymentQR paymentMethod={method} qrSrc={QR_SRC[method]} totalFormatted={peso(amount)} />
          {error && <p role="alert" className="text-red-700 text-[13px] text-center mb-3">{error}</p>}
          <button
            type="button"
            onClick={() => submitPaid(method)}
            disabled={submitting}
            data-analytics="book_click"
            data-property={propertySlug}
            className="w-full py-4 rounded-full text-[15px] font-semibold text-white disabled:opacity-60 hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg,#335238,#1e3c25)" }}
          >
            {submitting ? <><i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> Submitting…</> : <><i className="fa-solid fa-check" aria-hidden="true" /> I&apos;ve Paid — Hold My Dates</>}
          </button>
          <p className="text-center text-[11px] text-charcoal/45 mt-3">
            Tap this only after you have sent the payment. We&apos;ll confirm your booking once we&apos;ve verified it.
          </p>
        </>
      )}

      {method === "stripe" && (
        <div className="bg-white rounded-[16px] p-6 border border-black/[.06] shadow-[0_2px_12px_rgba(44,44,44,.07)]">
          <table className="w-full text-[13.5px] mb-5">
            <tbody>
              <tr><td className="py-1 text-charcoal/55">Your stay</td><td className="py-1 text-right text-charcoal/80">{peso(amount)}</td></tr>
              <tr><td className="py-1 text-charcoal/55">Card processing fee (6%)</td><td className="py-1 text-right text-charcoal/80">{peso(cardFee)}</td></tr>
              <tr className="border-t border-black/[.08]"><td className="pt-2 font-semibold text-charcoal">Total</td><td className="pt-2 text-right font-bold text-charcoal">{peso(cardTotal)}</td></tr>
            </tbody>
          </table>

          {cardError ? (
            <p role="alert" className="text-[13px] text-amber-900 bg-amber-50 border border-amber-200 rounded-[8px] px-3 py-2">{cardError}</p>
          ) : !clientSecret ? (
            <div className="text-center py-6 text-charcoal/40" role="status" aria-label="Setting up secure payment">
              <i className="fa-solid fa-spinner fa-spin text-xl" aria-hidden="true" />
            </div>
          ) : (
            <>
              {error && <p role="alert" className="text-red-700 text-[13px] mb-3">{error}</p>}
              <Elements stripe={stripeInstance} options={{ clientSecret, appearance: { theme: "stripe" } }}>
                <StripeBookingForm
                  total={cardTotal}
                  slug={propertySlug}
                  submitting={submitting}
                  setSubmitting={setSubmitting}
                  onSuccess={(piId) => submitPaid("stripe", piId)}
                  onError={(msg) => setError(msg)}
                />
              </Elements>
            </>
          )}
        </div>
      )}
    </div>
  );
}
