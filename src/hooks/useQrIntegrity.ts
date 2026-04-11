"use client";
import { useState, useEffect } from "react";

type QrStatus = "loading" | "verified" | "tampered" | "error";

/**
 * Fetches a QR image as a blob, computes its SHA-256 hash via the Web Crypto
 * API, and compares it against an expected hash to detect tampering.
 */
export function useQrIntegrity(
  imageSrc: string,
  expectedHash: string | undefined,
): { status: QrStatus } {
  const [status, setStatus] = useState<QrStatus>("loading");

  useEffect(() => {
    if (!expectedHash) {
      // No hash configured — can't verify
      setStatus("error");
      return;
    }

    let cancelled = false;

    async function verify() {
      try {
        const res = await fetch(imageSrc);
        if (!res.ok) {
          if (!cancelled) setStatus("error");
          return;
        }

        const buf = await res.arrayBuffer();
        const hashBuf = await crypto.subtle.digest("SHA-256", buf);
        const base64 = btoa(String.fromCharCode(...new Uint8Array(hashBuf)));
        const computed = `sha256-${base64}`;

        if (cancelled) return;

        if (computed === expectedHash) {
          setStatus("verified");
        } else {
          setStatus("tampered");
          // Fire security alert to server (best-effort)
          fetch("/api/security-alert", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event: "qr_tamper_detected",
              url: imageSrc,
              expected: expectedHash,
              computed,
              timestamp: new Date().toISOString(),
            }),
          }).catch(() => {});
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    verify();
    return () => {
      cancelled = true;
    };
  }, [imageSrc, expectedHash]);

  return { status };
}
