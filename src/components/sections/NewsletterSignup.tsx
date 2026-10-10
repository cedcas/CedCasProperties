"use client";
import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { track } from "@/lib/analytics";
import { HONEYPOT_FIELD, UTM_KEYS, type NewsletterSource, type UtmParams } from "@/lib/newsletter";

const UTM_STORAGE_KEY = "hil_newsletter_utm";

function readUtmFromLocation(): UtmParams {
  const params = new URLSearchParams(window.location.search);
  const utm: UtmParams = {};
  for (const key of UTM_KEYS) {
    const value = params.get(key);
    if (value) utm[key] = value;
  }
  return utm;
}

function readPersistedUtm(): UtmParams {
  try {
    const raw = sessionStorage.getItem(UTM_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UtmParams) : {};
  } catch {
    return {};
  }
}

function persistUtm(utm: UtmParams): void {
  if (Object.keys(utm).length === 0) return;
  try {
    sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utm));
  } catch {
    /* ignore — storage blocked (Safari private mode) is not fatal here */
  }
}

type Status = "idle" | "sending" | "success" | "error";

type Props = {
  /** "page" shows name/phone too; "strip" (homepage + footer) is email-only. */
  variant: "strip" | "page";
  source: NewsletterSource;
  /** Footer renders on a dark background; everywhere else is light. */
  theme?: "light" | "dark";
  className?: string;
};

export default function NewsletterSignup({ variant, source, theme = "light", className = "" }: Props) {
  const idBase = useId();
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState(""); // honeypot — never shown to real guests
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  // Capture UTM params on landing so a signup later in the same session
  // (e.g. the footer, after arriving via the newsletter page) still carries them.
  useEffect(() => {
    const current = readUtmFromLocation();
    if (Object.keys(current).length > 0) persistUtm(current);
  }, []);

  const sending = status === "sending";
  const muted = theme === "dark" ? "text-white/60" : "text-charcoal/55";
  const link = theme === "dark" ? "text-white/80 hover:text-white underline" : "text-forest hover:underline";

  const inputCls =
    "w-full px-4 py-3 rounded-[10px] border border-black/[.10] bg-offwhite text-[14px] text-charcoal placeholder-charcoal/30 focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/10 transition-all duration-200 disabled:opacity-60";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    setStatus("sending");
    setMessage("");

    const utm = { ...readPersistedUtm(), ...readUtmFromLocation() };

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          firstName: variant === "page" ? firstName : undefined,
          phone: variant === "page" ? phone : undefined,
          source,
          [HONEYPOT_FIELD]: company,
          utm,
          page: window.location.pathname,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.ok) {
        setStatus("success");
        setMessage(data.message || "Thanks for subscribing!");
        track("generate_lead", { method: "newsletter", lead_source: source });
        setEmail("");
        setFirstName("");
        setPhone("");
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className={className} noValidate>
      {/* Honeypot — hidden from sighted and screen-reader users, never from bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] top-auto w-px h-px overflow-hidden">
        <label htmlFor={`${idBase}-company`}>Company</label>
        <input
          id={`${idBase}-company`}
          type="text"
          name={HONEYPOT_FIELD}
          tabIndex={-1}
          autoComplete="off"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </div>

      {variant === "page" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${idBase}-firstName`} className="text-[12.5px] font-semibold text-charcoal/70 tracking-wide uppercase">
              First Name
            </label>
            <input
              id={`${idBase}-firstName`}
              type="text"
              name="firstName"
              disabled={sending}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Juan"
              className={inputCls}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${idBase}-phone`} className="text-[12.5px] font-semibold text-charcoal/70 tracking-wide uppercase">
              Mobile Number
            </label>
            <input
              id={`${idBase}-phone`}
              type="tel"
              name="phone"
              disabled={sending}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0917 123 4567 (optional)"
              className={inputCls}
            />
          </div>
        </div>
      )}

      <div className={variant === "page" ? "flex flex-col gap-1.5 mb-5" : "flex flex-col sm:flex-row gap-3"}>
        <div className={variant === "page" ? "flex flex-col gap-1.5" : "flex-1"}>
          <label
            htmlFor={`${idBase}-email`}
            className={variant === "page" ? "text-[12.5px] font-semibold text-charcoal/70 tracking-wide uppercase" : "sr-only"}
          >
            Email Address {variant === "page" && <span className="text-red-500">*</span>}
          </label>
          <input
            id={`${idBase}-email`}
            type="email"
            name="email"
            required
            disabled={sending}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputCls}
          />
        </div>

        {variant === "strip" && (
          <button
            type="submit"
            disabled={sending}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] rounded-full text-[14px] font-semibold text-white whitespace-nowrap transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            style={{ background: "linear-gradient(135deg,#FF5371,#E03D5A)", boxShadow: "0 4px 20px rgba(255,83,113,.35)" }}
          >
            <i className={`fa-solid ${sending ? "fa-spinner fa-spin" : "fa-paper-plane"}`} />
            {sending ? "Subscribing…" : "Subscribe"}
          </button>
        )}
      </div>

      {variant === "page" && (
        <button
          type="submit"
          disabled={sending}
          className="w-full inline-flex items-center justify-center gap-2.5 px-8 py-4 min-h-[44px] rounded-full text-[14px] font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 mb-4"
          style={{ background: "linear-gradient(135deg,#FF5371,#E03D5A)", boxShadow: "0 4px 20px rgba(255,83,113,.35)" }}
        >
          <i className={`fa-solid ${sending ? "fa-spinner fa-spin" : "fa-paper-plane"}`} />
          {sending ? "Subscribing…" : "Subscribe"}
        </button>
      )}

      <p className={`text-[12px] leading-[1.6] ${variant === "page" ? "" : "mt-3"} ${muted}`}>
        By subscribing you agree to receive emails (and SMS if you add your number) from Haven in Lipa about
        stays and offers. Unsubscribe anytime.{" "}
        <Link href="/privacy" className={link}>
          Privacy Policy
        </Link>
        .
      </p>

      {/* Reserved-height status slot so success/error text never shifts surrounding layout. */}
      <div className="min-h-[22px] mt-2" role="status" aria-live="polite">
        {message && (
          <span className={`text-[13px] flex items-center gap-1.5 ${status === "error" ? "text-red-500" : theme === "dark" ? "text-[#8BCDB8]" : "text-forest"}`}>
            <i className={`fa-solid ${status === "error" ? "fa-circle-exclamation" : "fa-circle-check"}`} />
            {message}
          </span>
        )}
      </div>
    </form>
  );
}
