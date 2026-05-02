"use client";
import { useState } from "react";
import { useQrIntegrity } from "@/hooks/useQrIntegrity";

const HASH_MAP: Record<string, string | undefined> = {
  gcash: process.env.NEXT_PUBLIC_QR_HASH_GCASH,
  bpi: process.env.NEXT_PUBLIC_QR_HASH_BPI,
};

interface Props {
  paymentMethod: "gcash" | "bpi";
  qrSrc: string;
  totalFormatted: string;
}

type SaveOutcome = "shared" | "downloaded" | "longpress";

function isIOSSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIOS && isSafari;
}

function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  // Definitive mobile/tablet UAs
  if (/Android|iPhone|iPod/i.test(ua)) return true;
  if (/iPad/.test(ua)) return true;
  // iPadOS 13+ Safari uses Mac-like UA by default; disambiguate via touch points
  if (/Macintosh/.test(ua) && (navigator.maxTouchPoints ?? 0) > 1) return true;
  // Primary pointer is coarse — covers Android tablets with non-mobile UA strings.
  // Intentionally NOT falling back to maxTouchPoints alone: Windows laptops with
  // touchscreens report maxTouchPoints > 0 even when the user is driving with
  // mouse + keyboard, which would route them into the share sheet incorrectly.
  return window.matchMedia?.("(pointer: coarse)").matches ?? false;
}

function filenameFor(method: "gcash" | "bpi", src: string): string {
  const ext = src.split(".").pop()?.toLowerCase() || "png";
  return `haveninlipa-${method}-qr.${ext}`;
}

export default function PaymentQR({ paymentMethod, qrSrc, totalFormatted }: Props) {
  const expectedHash = HASH_MAP[paymentMethod];
  const { status, blob } = useQrIntegrity(qrSrc, expectedHash);

  const [copied, setCopied] = useState(false);
  const [saveOutcome, setSaveOutcome] = useState<SaveOutcome | null>(null);
  const [saving, setSaving] = useState(false);

  const label = paymentMethod === "gcash" ? "GCash" : "BPI";

  async function handleCopyAmount() {
    try {
      const numeric = totalFormatted.replace(/[^\d.]/g, "");
      await navigator.clipboard.writeText(numeric);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable — silent fail; user can still read the chip
    }
  }

  async function handleSave() {
    if (!blob || saving) return;
    setSaving(true);
    setSaveOutcome(null);

    const filename = filenameFor(paymentMethod, qrSrc);
    const file = new File([blob], filename, { type: blob.type || "image/png" });

    try {
      // 1. Web Share API with files — only on touch devices (phones/tablets).
      //    Desktop Safari/Chrome can also report canShare=true, but their share
      //    sheets don't include "Save to Photos" — users expect a plain download.
      if (
        isTouchDevice() &&
        typeof navigator !== "undefined" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] }) &&
        typeof navigator.share === "function"
      ) {
        await navigator.share({
          files: [file],
          title: `${label} Payment QR`,
          text: `Haven in Lipa — ${label} Payment QR`,
        });
        setSaveOutcome("shared");
        return;
      }

      // 2. Programmatic <a download> — works reliably on Android/desktop, flaky on iOS Safari
      if (!isIOSSafari()) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        setSaveOutcome("downloaded");
        return;
      }

      // 3. iOS Safari with no Share API — instruct long-press
      setSaveOutcome("longpress");
    } catch (err) {
      // User-cancelled share is a DOMException with name "AbortError" — don't treat as failure
      if ((err as DOMException)?.name !== "AbortError") {
        setSaveOutcome("longpress");
      }
    } finally {
      setSaving(false);
    }
  }

  const steps =
    paymentMethod === "gcash"
      ? [
          "Save the QR to your Photos using the button above",
          <>Open <strong>GCash</strong> → <strong>Pay QR</strong> → tap the gallery icon</>,
          <>Select the saved QR, enter <strong>{totalFormatted}</strong>, add your name in the message</>,
          <>Return here and tap <strong>I&apos;ve Paid</strong></>,
        ]
      : [
          "Save the QR to your Photos using the button above",
          <>Open <strong>BPI</strong> → <strong>Transfer</strong> → <strong>QR</strong> → <strong>Upload QR</strong></>,
          <>Select the saved QR, enter <strong>{totalFormatted}</strong>, add your name in the remarks</>,
          <>Return here and tap <strong>I&apos;ve Paid</strong></>,
        ];

  const showActions = status !== "tampered";

  return (
    <div className="bg-white rounded-[16px] p-6 border border-black/[.06] shadow-[0_2px_12px_rgba(44,44,44,.07)] mb-5 text-center">
      <p className="text-[12px] font-semibold text-charcoal/40 uppercase tracking-wider mb-4">
        Pay via {label}
      </p>

      {/* Loading state */}
      {status === "loading" && (
        <div className="w-56 h-56 mx-auto rounded-[8px] bg-gray-100 animate-pulse flex items-center justify-center">
          <i className="fa-solid fa-spinner fa-spin text-charcoal/30 text-xl" />
        </div>
      )}

      {/* Verified — show QR with badge */}
      {status === "verified" && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrSrc} alt={`${label} QR Code`} className="w-56 h-auto mx-auto rounded-[8px]" />
          <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
            <i className="fa-solid fa-shield-check" /> Payment QR Verified
          </div>
        </>
      )}

      {/* Tampered — hide QR, show alert */}
      {status === "tampered" && (
        <div className="p-4 bg-red-50 border-2 border-red-400 rounded-[12px] text-left">
          <div className="flex items-start gap-3">
            <i className="fa-solid fa-triangle-exclamation text-red-600 text-xl mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-800 text-[14px] mb-1">Security Alert</p>
              <p className="text-[13px] text-red-700 leading-relaxed">
                The payment QR code could not be verified and may have been tampered with.
                <strong> Do not send any payment.</strong> Please contact us directly at{" "}
                <a href="mailto:customerservice@haveninlipa.com" className="underline font-medium">
                  customerservice@haveninlipa.com
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error — verification unavailable */}
      {status === "error" && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrSrc} alt={`${label} QR Code`} className="w-56 h-auto mx-auto rounded-[8px]" />
          <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
            <i className="fa-solid fa-circle-exclamation" /> Verify recipient details manually before paying
          </div>
        </>
      )}

      {showActions && (
        <>
          {/* Tap-to-copy amount chip */}
          <button
            type="button"
            onClick={handleCopyAmount}
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full bg-forest/5 border border-forest/20 text-forest text-[13px] font-semibold active:scale-95 transition-transform"
          >
            <span className="text-charcoal/50 text-[11px] uppercase tracking-wider">Amount</span>
            <span>{totalFormatted}</span>
            <i className={`fa-solid ${copied ? "fa-check" : "fa-copy"} text-[11px] opacity-70`} />
            <span className="sr-only">{copied ? "Copied" : "Tap to copy amount"}</span>
          </button>
          {copied && (
            <p className="mt-1.5 text-[11px] text-green-700">Copied — paste it in the app</p>
          )}

          {/* Save QR primary action */}
          <button
            type="button"
            onClick={handleSave}
            disabled={status !== "verified" || saving}
            className="w-full mt-4 py-3.5 rounded-full text-[14px] font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg,#335238,#1e3c25)" }}
          >
            <i className={`fa-solid ${saving ? "fa-spinner fa-spin" : "fa-download"}`} />
            {saving ? "Preparing…" : "Save QR to Photos"}
          </button>

          {/* Save outcome hints */}
          {saveOutcome === "downloaded" && (
            <p className="mt-2 text-[12px] text-charcoal/60">
              <i className="fa-solid fa-circle-check text-green-600 mr-1" />
              QR saved. Check your Downloads or Photos.
            </p>
          )}
          {saveOutcome === "longpress" && (
            <p className="mt-2 text-[12px] text-amber-800 bg-amber-50 border border-amber-200 rounded-[8px] px-3 py-2">
              <i className="fa-solid fa-hand-pointer mr-1" />
              Couldn&apos;t auto-save. Tap and hold the QR above, then choose <strong>Save to Photos</strong>.
            </p>
          )}

          {/* Numbered step-by-step instructions */}
          <ol className="mt-5 text-left space-y-3">
            {steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-[13px] text-charcoal/80 leading-relaxed">
                <span
                  className="flex-shrink-0 w-6 h-6 rounded-full bg-forest text-white text-[12px] font-semibold flex items-center justify-center"
                  aria-hidden
                >
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
