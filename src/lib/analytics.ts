/**
 * GA4 (gtag.js) event helper.
 *
 * gtag.js is loaded in src/app/layout.tsx with strategy="lazyOnload", so
 * window.gtag may not exist yet on early calls — every send is guarded.
 *
 * Non-production hostnames (localhost, *.vercel.app previews) get debug_mode,
 * which makes the event visible in GA4 DebugView while GA4's "Developer
 * Traffic" data filter keeps it out of the reports.
 */

type GtagParams = Record<string, unknown>;

const PROD_HOSTS = ["haveninlipa.com", "blog.haveninlipa.com"];

export function track(event: string, params: GtagParams = {}): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  const isProd = PROD_HOSTS.includes(window.location.hostname);
  window.gtag("event", event, {
    ...params,
    ...(isProd ? {} : { debug_mode: true }),
  });
}
