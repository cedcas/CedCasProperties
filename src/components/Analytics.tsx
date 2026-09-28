"use client";
import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { GA_MEASUREMENT_ID, isInternalMarkerPath, isTrackedPath } from "@/lib/analytics-config";
import {
  applyUrlOptIns,
  ensureGtag,
  isAnalyticsAllowedOnThisHost,
  markInternalDevice,
  reportStayMatchArrival,
  syncGaDisable,
} from "@/lib/analytics";

// Host, build env and opt-in don't change within a page life, so there is
// nothing to subscribe to. Server snapshot is `false`: the gate is decided in
// the browser, never at build or render time.
const noopSubscribe = () => () => {};
const serverSnapshot = () => false;

/**
 * Loads GA4 only where DEC-021 allows it (production host, never /admin), keeps
 * gtag's kill switch in step with client-side navigation, marks admin devices
 * as internal traffic, and reports Stay Match landings. Mounted once in the
 * root layout; renders nothing but the gtag.js <Script>.
 */
export default function Analytics() {
  const pathname = usePathname();
  const hostAllowed = useSyncExternalStore(noopSubscribe, isAnalyticsAllowedOnThisHost, serverSnapshot);

  // Render-phase on purpose: must precede Next's history push (see syncGaDisable).
  syncGaDisable(pathname);

  useEffect(() => {
    applyUrlOptIns(window.location.search);
    const onPop = () => syncGaDisable(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    syncGaDisable(pathname); // re-assert the committed path after any abandoned render
    if (isInternalMarkerPath(pathname)) markInternalDevice();
    ensureGtag();
    reportStayMatchArrival();
  }, [pathname]);

  // Once loaded, gtag.js stays in memory across SPA navigation into /admin —
  // the kill switch above is what silences it there.
  if (!hostAllowed || !isTrackedPath(pathname)) return null;
  return (
    <Script
      src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      strategy="lazyOnload"
    />
  );
}
