"use client";
import { useState } from "react";
import { AMBASSADOR_GUIDELINES } from "@/lib/ambassador";

const EMPTY = {
  name: "",
  phone: "",
  email: "",
  facebookUrl: "",
  otherSocials: "",
  audienceSize: "",
  city: "",
  occupation: "",
  motivation: "",
  promotionPlan: "",
  gcashNumber: "",
};

export default function AmbassadorForm() {
  const [form, setForm] = useState(EMPTY);
  const [agreed, setAgreed] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) return;
    setStatus("sending");
    setErrorMsg("");
    try {
      const res = await fetch("/api/ambassadors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, agreedToTerms: agreed }),
      });
      if (res.ok) {
        setStatus("success");
        setForm(EMPTY);
        setAgreed(false);
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(
          res.status === 409
            ? "You've already applied with this email. We'll be in touch soon!"
            : data.error || "Something went wrong. Please try again."
        );
        setStatus("error");
      }
    } catch {
      setErrorMsg("Something went wrong. Please try again or email us directly.");
      setStatus("error");
    }
  };

  const inputCls =
    "w-full px-4 py-3 rounded-[10px] border border-black/[.10] bg-offwhite text-[14px] text-charcoal placeholder-charcoal/30 focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/10 transition-all duration-200";
  const labelCls =
    "text-[12.5px] font-semibold text-charcoal/70 tracking-wide uppercase";

  return (
    <form
      onSubmit={handleSubmit}
      id="apply"
      className="bg-white rounded-[20px] p-8 sm:p-9 shadow-[0_4px_24px_rgba(44,44,44,.08)] border border-black/[.04] scroll-mt-28"
    >
      {/* Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="amb-name" className={labelCls}>Full Name <span className="text-red-500">*</span></label>
          <input id="amb-name" type="text" name="name" required value={form.name} onChange={handleChange} placeholder="Juan dela Cruz" className={inputCls} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="amb-phone" className={labelCls}>Mobile Number <span className="text-red-500">*</span></label>
          <input id="amb-phone" type="tel" name="phone" required value={form.phone} onChange={handleChange} placeholder="+63 9XX XXX XXXX" className={inputCls} />
        </div>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="amb-email" className={labelCls}>Email <span className="text-red-500">*</span></label>
          <input id="amb-email" type="email" name="email" required value={form.email} onChange={handleChange} placeholder="you@example.com" className={inputCls} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="amb-city" className={labelCls}>City <span className="text-red-500">*</span></label>
          <input id="amb-city" type="text" name="city" required value={form.city} onChange={handleChange} placeholder="Lipa City" className={inputCls} />
        </div>
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="amb-fb" className={labelCls}>Facebook Profile <span className="text-red-500">*</span></label>
          <input id="amb-fb" type="text" name="facebookUrl" required value={form.facebookUrl} onChange={handleChange} placeholder="facebook.com/yourprofile" className={inputCls} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="amb-socials" className={labelCls}>Instagram / TikTok / YouTube</label>
          <input id="amb-socials" type="text" name="otherSocials" value={form.otherSocials} onChange={handleChange} placeholder="@handle (optional)" className={inputCls} />
        </div>
      </div>

      {/* Row 4 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="amb-occupation" className={labelCls}>Occupation <span className="text-red-500">*</span></label>
          <input id="amb-occupation" type="text" name="occupation" required value={form.occupation} onChange={handleChange} placeholder="Content creator, café owner…" className={inputCls} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="amb-audience" className={labelCls}>Audience / Following Size</label>
          <input id="amb-audience" type="text" name="audienceSize" value={form.audienceSize} onChange={handleChange} placeholder="e.g. ~5k IG followers (optional)" className={inputCls} />
        </div>
      </div>

      {/* Motivation */}
      <div className="flex flex-col gap-1.5 mb-5">
        <label htmlFor="amb-motivation" className={labelCls}>Why do you want to partner with Haven in Lipa? <span className="text-red-500">*</span></label>
        <textarea id="amb-motivation" name="motivation" required rows={3} value={form.motivation} onChange={handleChange} placeholder="Tell us what draws you to Lipa City and our properties…" className={`${inputCls} resize-none`} />
      </div>

      {/* Promotion plan */}
      <div className="flex flex-col gap-1.5 mb-5">
        <label htmlFor="amb-plan" className={labelCls}>How do you plan to promote us? <span className="text-red-500">*</span></label>
        <textarea id="amb-plan" name="promotionPlan" required rows={3} value={form.promotionPlan} onChange={handleChange} placeholder="e.g. Instagram reels, blog posts, word of mouth to wedding clients…" className={`${inputCls} resize-none`} />
      </div>

      {/* GCash */}
      <div className="flex flex-col gap-1.5 mb-6">
        <label htmlFor="amb-gcash" className={labelCls}>GCash Number <span className="text-red-500">*</span></label>
        <input id="amb-gcash" type="tel" name="gcashNumber" required value={form.gcashNumber} onChange={handleChange} placeholder="For reward payouts" className={`${inputCls} sm:max-w-[50%]`} />
      </div>

      {/* Guidelines + agree */}
      <div className="mb-6">
        <div className="text-[12.5px] font-semibold text-charcoal/70 tracking-wide uppercase mb-2">Ambassador Guidelines</div>
        <div className="max-h-44 overflow-y-auto rounded-[10px] border border-black/[.10] bg-offwhite p-4">
          <ul className="flex flex-col gap-2.5">
            {AMBASSADOR_GUIDELINES.map((g) => (
              <li key={g} className="flex items-start gap-2.5 text-[13px] text-charcoal/70 leading-[1.6]">
                <i className="fa-solid fa-circle-check text-forest text-[13px] mt-0.5 flex-shrink-0" />
                <span>{g}</span>
              </li>
            ))}
          </ul>
        </div>
        <label className="flex items-start gap-3 mt-4 cursor-pointer select-none">
          <input
            type="checkbox"
            required
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-forest cursor-pointer"
          />
          <span className="text-[13.5px] text-charcoal/75 leading-[1.6]">
            I have read and agree to the Ambassador Guidelines. <span className="text-red-500">*</span>
          </span>
        </label>
      </div>

      {status === "success" && (
        <div className="mb-5 p-4 rounded-[10px] bg-green-50 border border-green-200 text-green-700 text-[14px] flex items-center gap-2">
          <i className="fa-solid fa-circle-check" /> Application received! We&apos;ll review it and get back to you within 3–5 days.
        </div>
      )}
      {status === "error" && (
        <div className="mb-5 p-4 rounded-[10px] bg-red-50 border border-red-200 text-red-600 text-[14px] flex items-center gap-2">
          <i className="fa-solid fa-circle-exclamation" /> {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={status === "sending" || !agreed}
        className="w-full inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full text-[14px] font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        style={{ background: "linear-gradient(135deg,#FF5371,#E03D5A)", boxShadow: "0 4px 20px rgba(255,83,113,.35)" }}
      >
        <i className={`fa-solid ${status === "sending" ? "fa-spinner fa-spin" : "fa-paper-plane"}`} />
        {status === "sending" ? "Submitting…" : "Submit Application"}
      </button>

      <p className="text-center text-[12px] text-charcoal/35 mt-4">
        Fields marked <span className="text-red-400">*</span> are required. We typically reply within 3–5 days.
      </p>
    </form>
  );
}
