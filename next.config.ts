import type { NextConfig } from "next";
import { buildBlogSlugRedirects } from "./src/lib/blog-redirect-slugs";

/**
 * Shared CSP directives for every route. `frameAncestors` is the one directive that
 * differs for /embed/haven (the blog-embed iframe route, haven-chat-usage-2026-11-09.md
 * #5) — everywhere else stays `'none'`. Modern browsers that support `frame-ancestors`
 * ignore `X-Frame-Options` for framing decisions (CSP3 §6.3), so the site-wide
 * `X-Frame-Options: DENY` below doesn't need a parallel per-route override.
 */
function buildCsp(frameAncestors: string): string {
  return [
    // Only allow images from own origin + Vercel Blob (property photos)
    "img-src 'self' https://*.public.blob.vercel-storage.com data:",

    // Scripts: own origin + Google Analytics + Stripe + inline for gtag/ld+json
    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://js.stripe.com",

    // Styles: own origin + Font Awesome CDN + inline (Tailwind)
    "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",

    // Fonts: own origin + Font Awesome CDN
    "font-src 'self' https://cdnjs.cloudflare.com",

    // Connections: own origin + GA + Stripe + Vercel Blob.
    // GA4 does NOT post hits to www.google-analytics.com only. It fans out
    // across four hosts, and missing any one blocks collection at the
    // network layer — gtag() runs without error and the beacon is silently
    // refused, so GA4 reports "No stream data detected" for every event:
    //   *.google-analytics.com   regional endpoints (region1, …)
    //   analytics.google.com     BARE host — a CSP wildcard requires a
    //                            leading label, so *.analytics.google.com
    //                            does NOT match it; *.google.com does
    //   www.google.com           second /g/collect endpoint + the
    //                            /measurement/conversion linker ping
    //   *.googletagmanager.com   gtag.js fetches its remote config here
    // If Google Ads is ever wired up, country domains (google.com.ph, …)
    // and *.g.doubleclick.net may need adding too.
    // Admin image upload is a CLIENT-SIDE upload — the browser PUTs the
    // file directly to the Vercel Blob API (vercel.com/api/blob, which
    // may redirect to *.public.blob.vercel-storage.com). Without these
    // in connect-src the browser blocks the fetch; Safari reports it as
    // "Load failed", the Blob SDK treats it as a network error and
    // retries 10× with exponential backoff (~10 min) → stuck "Uploading…".
    "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://*.google.com https://*.googletagmanager.com https://api.stripe.com https://m.stripe.com https://m.stripe.network https://vercel.com https://*.public.blob.vercel-storage.com",

    // Frames: Stripe for 3D-Secure + OpenStreetMap for the property map
    "frame-src https://js.stripe.com https://www.openstreetmap.org",

    `frame-ancestors ${frameAncestors}`,
  ].join("; ");
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },

  // Routing is owned here: `vercel.json` is an empty object and the middleware
  // matcher is scoped to `/admin/:path*`, so this is the only layer that sees
  // these paths.
  async redirects() {
    return [
      {
        // `/contact` was a hard 404 while looking like a real path. Five blog
        // articles linked it until 2026-08-16 (since repointed to `/#contact`),
        // but the GBP profile, old social posts and external sites still point
        // at it and can't be edited.
        //
        // The contact form is a homepage section (id="contact" in
        // src/components/sections/ContactForm.tsx) — there is no /contact page
        // and this redirect is not a step toward one.
        //
        // `permanent: true` emits 308, which Google treats identically to 301
        // for consolidation. The fragment survives in the Location header; the
        // browser does the scroll, since fragments never reach the server.
        source: "/contact",
        destination: "/#contact",
        permanent: true,
      },
      // `haveninlipa.com/<blog-slug>` -> `blog.haveninlipa.com/<slug>/` (October SEO
      // review #8 — these were a hard 404; real visitors and old blog-internal links
      // were landing on the main site instead of the post). Source list is every post
      // slug that exists today (src/lib/blog-redirect-slugs.ts); must not shadow any
      // top-level app route — checked in blog-redirect-slugs.test.ts.
      ...buildBlogSlugRedirects(),
    ];
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: buildCsp("'none'") },
          // Prevent MIME-type sniffing — blocks serving QR as wrong content type
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Duplicate frame-ancestors for older browsers
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      {
        // The blog embed's chat-only route (haven-chat-usage-2026-11-09.md #5): framed
        // from blog.haveninlipa.com only. This entry is matched in addition to the
        // general one above for this exact path, and Next.js lets a later-defined
        // header win over an earlier one for the same key on the same path — so only
        // this route's Content-Security-Policy differs; every other path (including
        // X-Frame-Options here, superseded by frame-ancestors per the comment above)
        // keeps the site-wide policy untouched.
        source: "/embed/haven",
        headers: [
          {
            key: "Content-Security-Policy",
            value: buildCsp("https://blog.haveninlipa.com"),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
