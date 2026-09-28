/**
 * GA4 (gtag.js) browser helpers. Every event goes through track().
 *
 * WHERE analytics may run is decided by the pure rules in analytics-config.ts
 * (DEC-021): production hostname allowlist, never on /admin, and the explicit
 * `?ga_debug=1` opt-in. When those say no, track() is a no-op — nothing is
 * queued and nothing is sent. Devices that have opened the admin panel carry a
 * marker and are tagged `traffic_type: 'internal'` so GA4's Internal Traffic
 * filter can exclude them.
 *
 * gtag.js itself is loaded lazily by src/components/Analytics.tsx. ensureGtag()
 * installs the standard dataLayer stub first, so events tracked before the
 * library arrives are queued rather than dropped.
 */
import {
  DEBUG_OPT_IN_KEY,
  GA_DISABLE_KEY,
  GA_MEASUREMENT_ID,
  INTERNAL_MARKER_KEY,
  INTERNAL_QUERY_PARAM,
  buildEventParams,
  buildGtagConfig,
  isTrackedPath,
  readDebugParam,
  resolveAnalyticsContext,
  type AnalyticsContext,
} from "@/lib/analytics-config";
import { parseStayMatchArrival, stripStayMatchParams } from "@/lib/stay-match-arrival";

type GtagParams = Record<string, unknown>;

// Storage can throw (Safari private mode, blocked cookies) — analytics must never break the page.
function storageGet(kind: "localStorage" | "sessionStorage", key: string): string | null {
  try {
    return window[kind].getItem(key);
  } catch {
    return null;
  }
}
function storageSet(kind: "localStorage" | "sessionStorage", key: string, value: string | null): void {
  try {
    if (value === null) window[kind].removeItem(key);
    else window[kind].setItem(key, value);
  } catch {
    /* ignore */
  }
}

/**
 * Current gating decision, read fresh from the browser on every call. A
 * `?ga_debug=` param in the current URL wins over the stored opt-in, so the
 * first page of a debug session is covered before applyUrlOptIns() persists it.
 */
export function readAnalyticsContext(pathname?: string): AnalyticsContext {
  if (typeof window === "undefined") return { enabled: false, debug: false, internal: false };
  return resolveAnalyticsContext({
    hostname: window.location.hostname,
    pathname: pathname ?? window.location.pathname,
    vercelEnv: process.env.NEXT_PUBLIC_VERCEL_ENV,
    debugOptIn:
      readDebugParam(window.location.search) ??
      storageGet("sessionStorage", DEBUG_OPT_IN_KEY) === "1",
    internal: storageGet("localStorage", INTERNAL_MARKER_KEY) === "1",
  });
}

/** Whether this host/build may run GA at all, ignoring the current path. */
export function isAnalyticsAllowedOnThisHost(): boolean {
  return readAnalyticsContext("/").enabled;
}

export function track(event: string, params: GtagParams = {}): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  const ctx = readAnalyticsContext();
  if (!ctx.enabled) return;
  window.gtag("event", event, buildEventParams(ctx, params));
}

/** Persist `?ga_debug=1|0` for the tab and honour `?hil_internal=0`. */
export function applyUrlOptIns(search: string): void {
  const debug = readDebugParam(search);
  if (debug !== null) storageSet("sessionStorage", DEBUG_OPT_IN_KEY, debug ? "1" : null);
  if (new URLSearchParams(search).get(INTERNAL_QUERY_PARAM) === "0") {
    storageSet("localStorage", INTERNAL_MARKER_KEY, null);
  }
}

export function markInternalDevice(): void {
  storageSet("localStorage", INTERNAL_MARKER_KEY, "1");
}

/**
 * Sets gtag's official kill switch for the current path. Called during render
 * and on popstate so it is in place BEFORE gtag's enhanced-measurement history
 * listener sees the URL change into /admin (Next pushes history in an
 * insertion effect, ahead of any useEffect/useLayoutEffect).
 */
export function syncGaDisable(pathname: string): void {
  if (typeof window === "undefined") return;
  window[GA_DISABLE_KEY] = !isTrackedPath(pathname);
}

let configured = false;
let configuredInternal = false;

/** Installs the gtag stub and sends `js` + `config` once; no-op when disabled. */
export function ensureGtag(): void {
  if (typeof window === "undefined") return;
  const ctx = readAnalyticsContext();
  if (!ctx.enabled) return;
  if (!configured) {
    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== "function") {
      window.gtag = function gtag() {
        // gtag.js requires the Arguments object itself, not an array copy.
        // eslint-disable-next-line prefer-rest-params
        window.dataLayer!.push(arguments);
      };
    }
    window.gtag("js", new Date());
    window.gtag("config", GA_MEASUREMENT_ID, buildGtagConfig(ctx, window.location.href));
    configured = true;
    configuredInternal = ctx.internal;
  } else if (ctx.internal && !configuredInternal) {
    // Marker appeared after config (SPA visit to /admin and back) — tag the rest of this page life.
    window.gtag!("set", { traffic_type: "internal" });
    configuredInternal = true;
  }
}

/**
 * Fires `stay_match_arrival` once for a Stay Match landing, then strips the
 * params from the address bar (whether or not analytics is enabled) so they
 * don't linger in shares or bookmarks.
 */
export function reportStayMatchArrival(): void {
  if (typeof window === "undefined") return;
  const href = window.location.href;
  const cleaned = stripStayMatchParams(href);
  if (cleaned === null) return;
  const arrival = parseStayMatchArrival(href);
  if (arrival) track("stay_match_arrival", { ...arrival });
  // `null` state is the documented way to let the Next.js router adopt the new URL.
  window.history.replaceState(null, "", cleaned);
}

/** Test-only: reset module state between cases. */
export function __resetAnalyticsForTests(): void {
  configured = false;
  configuredInternal = false;
}
