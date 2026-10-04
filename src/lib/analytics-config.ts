/**
 * GA4 gating rules — the single source of truth for WHERE analytics may run.
 *
 * Pure functions only (no window access), so the rules are unit-tested in
 * src/lib/__tests__/analytics-config.test.ts. The browser-side wiring lives in
 * src/lib/analytics.ts (track / ensureGtag) and src/components/Analytics.tsx.
 *
 * Decision record: DEC-021 in docs/HIL_DECISIONS.md.
 */

export const GA_MEASUREMENT_ID = "G-2SV2PXYB7T";

/** gtag.js's official per-property kill switch, checked on every hit. */
export const GA_DISABLE_KEY = `ga-disable-${GA_MEASUREMENT_ID}` as const;

/**
 * Exact-match hostname allowlist. Checked at runtime in the browser, so it holds
 * regardless of build env vars — `dev.haveninlipa.com` (a Vercel Preview
 * deployment on a custom domain), `*.vercel.app`, localhost and LAN machine
 * hostnames are all excluded simply by not being listed.
 * `www.` 308s to the apex today; listed so a future change can't silently
 * drop production traffic.
 */
export const ANALYTICS_HOSTS: readonly string[] = ["haveninlipa.com", "www.haveninlipa.com"];

/** localStorage key set on devices that have opened the admin panel. */
export const INTERNAL_MARKER_KEY = "hil_internal";
/**
 * Cookie twin of the marker, set by middleware on every signed-in `/admin`
 * request. A server-set cookie outlives Safari's 7-day cap on script-written
 * storage, which silently untagged an owner phone that hadn't opened admin
 * that week. Not HttpOnly — the browser-side gate has to read it.
 */
export const INTERNAL_COOKIE_NAME = "hil_internal";
/** 400 days: the longest lifetime browsers accept. Renewed on each admin request. */
export const INTERNAL_COOKIE_MAX_AGE = 400 * 24 * 60 * 60;
/** sessionStorage key for the explicit DebugView opt-in (`?ga_debug=1`). */
export const DEBUG_OPT_IN_KEY = "hil_ga_debug";
export const DEBUG_QUERY_PARAM = "ga_debug";
/** `?hil_internal=0` clears the internal-traffic marker on the current device. */
export const INTERNAL_QUERY_PARAM = "hil_internal";

export function isAnalyticsHost(hostname: string): boolean {
  return ANALYTICS_HOSTS.includes(hostname.toLowerCase());
}

/** True for `/<segment>` itself and anything beneath it — never for `/<segment>foo`. */
function isUnder(pathname: string, segment: string): boolean {
  return pathname === segment || pathname.startsWith(`${segment}/`);
}

/**
 * Owner/staff-only route trees. `/admin` covers the dashboard, login and every
 * admin page. `/api` never renders a page, but is listed so the rule is
 * complete if one ever did.
 */
const UNTRACKED_PREFIXES = ["/admin", "/api"];

export function isTrackedPath(pathname: string): boolean {
  return !UNTRACKED_PREFIXES.some((p) => isUnder(pathname, p));
}

/**
 * Pages whose rendering proves the visitor is signed in to the admin panel:
 * middleware redirects every unauthenticated `/admin/*` request to
 * `/admin/login`, so anything under `/admin` except the login page itself.
 */
export function isInternalMarkerPath(pathname: string): boolean {
  return isUnder(pathname, "/admin") && !isUnder(pathname, "/admin/login");
}

/** True when a `document.cookie` / `Cookie` header string carries the internal marker. */
export function hasInternalCookie(cookies: string): boolean {
  return cookies.split(";").some((c) => c.trim() === `${INTERNAL_COOKIE_NAME}=1`);
}

export interface AnalyticsEnv {
  hostname: string;
  pathname: string;
  /** `process.env.NEXT_PUBLIC_VERCEL_ENV` — may be undefined if not exposed. */
  vercelEnv?: string;
  /** Explicit `?ga_debug=1` opt-in for DebugView testing (any host). */
  debugOptIn: boolean;
  /** Device carries the internal-traffic marker. */
  internal: boolean;
}

export interface AnalyticsContext {
  enabled: boolean;
  debug: boolean;
  internal: boolean;
}

/**
 * Production = allowlisted host AND not a Vercel preview build. The debug
 * opt-in lets a non-production host send (flagged `debug_mode`, so the GA4
 * Developer-traffic filter drops it) — but never on an untracked path.
 */
export function resolveAnalyticsContext(env: AnalyticsEnv): AnalyticsContext {
  const production = isAnalyticsHost(env.hostname) && env.vercelEnv !== "preview";
  const enabled = isTrackedPath(env.pathname) && (production || env.debugOptIn);
  return { enabled, debug: enabled && env.debugOptIn, internal: enabled && env.internal };
}

/** `?ga_debug=1` → true, `?ga_debug=0` → false, absent → null (keep stored value). */
export function readDebugParam(search: string): boolean | null {
  const v = new URLSearchParams(search).get(DEBUG_QUERY_PARAM);
  if (v === "1") return true;
  if (v === "0") return false;
  return null;
}

/**
 * `/pay/<token>` URLs are bearer links to a guest's charge — the token must not
 * be sent to GA4 as part of page_location. The page stays tracked (it is
 * guest-facing), with the token replaced by a placeholder.
 */
export function redactPageLocation(href: string): string | null {
  const url = new URL(href);
  if (!/^\/pay\/[^/]+/.test(url.pathname)) return null;
  url.pathname = url.pathname.replace(/^\/pay\/[^/]+/, "/pay/[token]");
  url.search = "";
  url.hash = "";
  return url.toString();
}

/** Parameters for `gtag('config', GA_MEASUREMENT_ID, …)`. */
export function buildGtagConfig(ctx: AnalyticsContext, href: string): Record<string, unknown> {
  const config: Record<string, unknown> = {};
  if (ctx.internal) config.traffic_type = "internal";
  if (ctx.debug) config.debug_mode = true;
  const redacted = redactPageLocation(href);
  if (redacted) config.page_location = redacted;
  return config;
}

/** Event payload: caller params plus the context flags (context wins). */
export function buildEventParams(
  ctx: AnalyticsContext,
  params: Record<string, unknown>
): Record<string, unknown> {
  return {
    ...params,
    ...(ctx.internal ? { traffic_type: "internal" } : {}),
    ...(ctx.debug ? { debug_mode: true } : {}),
  };
}
