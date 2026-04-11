import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
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

              // Connections: own origin + GA + Stripe
              "connect-src 'self' https://www.google-analytics.com https://api.stripe.com",

              // Frames: only Stripe for 3D-Secure
              "frame-src https://js.stripe.com",

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
