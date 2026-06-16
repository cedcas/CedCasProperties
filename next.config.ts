import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },

  async headers() {
    return [
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
              // Admin image upload is a CLIENT-SIDE upload — the browser PUTs the
              // file directly to the Vercel Blob API (vercel.com/api/blob, which
              // may redirect to *.public.blob.vercel-storage.com). Without these
              // in connect-src the browser blocks the fetch; Safari reports it as
              // "Load failed", the Blob SDK treats it as a network error and
              // retries 10× with exponential backoff (~10 min) → stuck "Uploading…".
              "connect-src 'self' https://www.google-analytics.com https://api.stripe.com https://vercel.com https://*.public.blob.vercel-storage.com",

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
