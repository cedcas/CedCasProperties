"use client";
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

export default function PaymentQR({ paymentMethod, qrSrc, totalFormatted }: Props) {
  const expectedHash = HASH_MAP[paymentMethod];
  const { status } = useQrIntegrity(qrSrc, expectedHash);

  const label = paymentMethod === "gcash" ? "GCash" : "BPI";

  return (
    <div className="bg-white rounded-[16px] p-6 border border-black/[.06] shadow-[0_2px_12px_rgba(44,44,44,.07)] mb-5 text-center">
      <p className="text-[12px] font-semibold text-charcoal/40 uppercase tracking-wider mb-4">
        Scan to Pay via {label}
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

      {/* Payment instructions — only when QR is visible */}
      {status !== "tampered" && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-[8px] text-[12px] text-amber-800">
          <i className="fa-solid fa-circle-info mr-1.5" />
          Please transfer exactly <strong>{totalFormatted}</strong> using the QR code above.
          Add your name in the payment remarks so we can confirm faster.
        </div>
      )}
    </div>
  );
}
