import type { NextConfig } from "next";

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
    ];
  },

  async headers() {
    return [
      {
        // The /properties inventory index is `force-dynamic` (it must not run
        // its Prisma query at build time — see the note in
        // src/app/properties/page.tsx), which otherwise means Next serves it
        // with `no-store`. An App Router page can't set its own response
        // headers, so the edge cache is declared here instead: same one-hour
        // s-maxage as /api/properties.json, so the DB sees ~one hit an hour
        // while a transient error costs one request rather than an hour of
        // them. Listed before the catch-all so this Cache-Control is the one
        // that lands on the route.
        source: "/properties",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        // Same deal for /about: its homes section reads live inventory, so the
        // page is `force-dynamic` and would otherwise be served `no-store`.
        source: "/about",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
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

              // Prevent this site from being embedded in iframes
              "frame-ancestors 'none'",
            ].join("; "),
          },
          // Prevent MIME-type sniffing — blocks serving QR as wrong content type
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Duplicate frame-ancestors for older browsers
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
