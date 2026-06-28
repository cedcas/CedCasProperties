"use client";
import { useEffect, useState } from "react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import PaymentQR from "@/components/booking/PaymentQR";

const STRIPE_FEE_RATE = 0.06;
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
  description: string;
  amount: number;
  guestFirstName: string;
}

type Method = "gcash" | "bpi" | "stripe";
const QR_SRC: Record<Exclude<Method, "stripe">, string> = { gcash: "/qr/gcash.jpg", bpi: "/qr/bpi.png" };

// ── Stripe inner form ────────────────────────────────────────────────────────
function StripeChargeForm({
  total,
  submitting,
  setSubmitting,
  onSuccess,
  onError,
}: {
  total: number;
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
        className="w-full mt-5 py-4 rounded-full text-[15px] font-semibold text-white disabled:opacity-60 hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
        style={{ background: "linear-gradient(135deg,#635BFF,#4B44D0)" }}
      >
        {submitting ? <><i className="fa-solid fa-spinner fa-spin" /> Processing…</> : <><i className="fa-solid fa-lock" /> Pay {peso(total)}</>}
      </button>
    </form>
  );
}

export default function ChargePaymentClient({ token, description, amount, guestFirstName }: Props) {
  const [method, setMethod] = useState<Method>("gcash");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<null | "claimed" | "paid">(null);

  // Stripe state
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripeInstance, setStripeInstance] = useState<ReturnType<typeof loadStripe> | null>(() => cachedStripePromise);
  const [stripeUnavailable, setStripeUnavailable] = useState(false);

  const cardTotal = Math.round(amount * (1 + STRIPE_FEE_RATE) * 100) / 100;
  const cardFee = Math.round(amount * STRIPE_FEE_RATE * 100) / 100;

  // Fetch a payment intent when the guest switches to card.
  useEffect(() => {
    if (method !== "stripe" || clientSecret) return;
    let cancelled = false;
    fetch("/api/stripe/payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: cardTotal, metadata: { kind: "additional_charge", token, description } }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setStripeUnavailable(true);
          return;
        }
        setStripeInstance(getOrCreateStripePromise(data.publishableKey));
        setClientSecret(data.clientSecret);
      })
      .catch(() => !cancelled && setStripeUnavailable(true));
    return () => {
      cancelled = true;
    };
  }, [method, clientSecret, cardTotal, token, description]);

  const submitPaid = async (paymentMethod: Method, stripePaymentIntentId?: string) => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/charges/${token}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod, stripePaymentIntentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
      setDone(paymentMethod === "stripe" ? "paid" : "claimed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="bg-white rounded-[16px] p-8 border border-black/[.06] shadow-[0_2px_12px_rgba(44,44,44,.07)] text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-4">
          <i className="fa-solid fa-circle-check text-green-600 text-2xl" />
        </div>
        {done === "paid" ? (
          <>
            <h2 className="font-serif text-[1.3rem] text-charcoal font-semibold mb-2">Payment received</h2>
            <p className="text-[14px] text-charcoal/65 leading-relaxed">
              Thank you, {guestFirstName}! Your card payment of <strong>{peso(cardTotal)}</strong> for {description} has been
              confirmed. A receipt is on its way to your email.
            </p>
          </>
        ) : (
          <>
            <h2 className="font-serif text-[1.3rem] text-charcoal font-semibold mb-2">Thanks — we&apos;re confirming it</h2>
            <p className="text-[14px] text-charcoal/65 leading-relaxed">
              We&apos;ve let the host know you paid <strong>{peso(amount)}</strong> for {description}. They&apos;ll verify
              receipt shortly. No further action needed.
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Method picker */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {(["gcash", "bpi", "stripe"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMethod(m);
              setError("");
            }}
            className={`py-3 rounded-[12px] border text-[13px] font-semibold transition-all ${
              method === m ? "border-forest bg-forest/5 text-forest" : "border-black/10 text-charcoal/60 hover:border-forest/40"
            }`}
          >
            {m === "gcash" ? "GCash" : m === "bpi" ? "BPI" : "Card"}
            {m === "stripe" && <span className="block text-[10px] font-normal text-charcoal/40">+6% fee</span>}
          </button>
        ))}
      </div>

      {/* QR methods */}
      {method !== "stripe" && (
        <>
          <PaymentQR paymentMethod={method} qrSrc={QR_SRC[method]} totalFormatted={peso(amount)} />
          {error && <p className="text-red-600 text-[13px] text-center mb-3">{error}</p>}
          <button
            type="button"
            onClick={() => submitPaid(method)}
            disabled={submitting}
            className="w-full py-4 rounded-full text-[15px] font-semibold text-white disabled:opacity-60 hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg,#335238,#1e3c25)" }}
          >
            {submitting ? <><i className="fa-solid fa-spinner fa-spin" /> Submitting…</> : <><i className="fa-solid fa-check" /> I&apos;ve Paid</>}
          </button>
        </>
      )}

      {/* Card */}
      {method === "stripe" && (
        <div className="bg-white rounded-[16px] p-6 border border-black/[.06] shadow-[0_2px_12px_rgba(44,44,44,.07)]">
          <table className="w-full text-[13.5px] mb-5">
            <tbody>
              <tr><td className="py-1 text-charcoal/55">{description}</td><td className="py-1 text-right text-charcoal/80">{peso(amount)}</td></tr>
              <tr><td className="py-1 text-charcoal/55">Card fee (6%)</td><td className="py-1 text-right text-charcoal/80">{peso(cardFee)}</td></tr>
              <tr className="border-t border-black/[.08]"><td className="pt-2 font-semibold text-charcoal">Total</td><td className="pt-2 text-right font-bold text-charcoal">{peso(cardTotal)}</td></tr>
            </tbody>
          </table>

          {stripeUnavailable ? (
            <p className="text-[13px] text-amber-800 bg-amber-50 border border-amber-200 rounded-[8px] px-3 py-2">
              Card payments are temporarily unavailable. Please use GCash or BPI above.
            </p>
          ) : !clientSecret ? (
            <div className="text-center py-6 text-charcoal/40">
              <i className="fa-solid fa-spinner fa-spin text-xl" />
            </div>
          ) : (
            <>
              {error && <p className="text-red-600 text-[13px] mb-3">{error}</p>}
              <Elements stripe={stripeInstance} options={{ clientSecret, appearance: { theme: "stripe" } }}>
                <StripeChargeForm
                  total={cardTotal}
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
