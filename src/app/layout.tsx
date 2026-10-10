import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Montserrat, Poppins, Open_Sans } from "next/font/google";
import { runQrIntegrityCheck } from "@/lib/qr-integrity-check";
import ChatWidgetServer from "@/components/chat/ChatWidgetServer";
import ChatWidgetGate from "@/components/chat/ChatWidgetGate";
import AnalyticsClickTracker from "@/components/AnalyticsClickTracker";
import Analytics from "@/components/Analytics";
import { DEFAULT_OG_IMAGE } from "@/lib/seo-metadata";
import { buildLocalBusinessJsonLd } from "@/lib/local-business-schema";
import "./globals.css";

// Server-side QR integrity check — runs once on first request
runQrIntegrityCheck();

const BASE_URL = process.env.NEXTAUTH_URL || "https://haveninlipa.com";

const localBusinessSchema = buildLocalBusinessJsonLd();

// Montserrat is used by the Hero <h1> (the LCP element on every page).
// `display: "swap"` paints the H1 with next/font's auto-adjusted fallback
// after a short block period (~100 ms), then swaps in Montserrat when ready.
// `optional` was tried previously but extended the block period to ~1 s on
// slow connections, delaying LCP by the same amount. The metric-matched
// fallback minimizes the visual swap.
const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
  fallback: ["Georgia", "serif"],
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-poppins",
  display: "swap",
});

const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-opensans",
  display: "swap",
});

// viewport-fit=cover lets the sticky mobile booking bar extend into the iOS
// home-indicator area, which it then pads back out with env(safe-area-inset-bottom).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Haven in Lipa — Short-Term Rentals in Lipa City, Batangas",
    template: "%s | Haven in Lipa",
  },
  description:
    "Stay in Style, Live in Comfort. Clean, comfortable, and thoughtfully managed short-term rentals in Lipa City, Batangas, Philippines.",
  keywords:
    "short-term rental, Lipa City, Batangas, vacation rental, Haven in Lipa, Airbnb alternative",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Haven in Lipa — Short-Term Rentals in Lipa City, Batangas",
    description:
      "Stay in Style, Live in Comfort. Short-term rentals in Lipa, Batangas.",
    type: "website",
    url: "/",
    siteName: "Haven in Lipa",
    // Fallback only — public pages set their own via socialMetadata(), since a
    // page-level openGraph replaces this object rather than merging with it.
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Haven in Lipa — Short-Term Rentals in Lipa City, Batangas",
    description:
      "Stay in Style, Live in Comfort. Short-term rentals in Lipa, Batangas.",
    images: [DEFAULT_OG_IMAGE.url],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${montserrat.variable} ${poppins.variable} ${openSans.variable}`}>
      <head>
        {/* Font Awesome — injected via inline script so the request is
            non-blocking and doesn't delay first paint / LCP. Icons appear
            with a tiny swap after CSS arrives. */}
        <link
          rel="preconnect"
          href="https://cdnjs.cloudflare.com"
          crossOrigin="anonymous"
        />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){var l=document.createElement('link');l.rel='stylesheet';l.media='print';l.onload=function(){this.media='all';this.onload=null;};l.href='https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css';l.crossOrigin='anonymous';l.referrerPolicy='no-referrer';document.head.appendChild(l);})();",
          }}
        />
        <noscript>
          <link
            rel="stylesheet"
            href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
            crossOrigin="anonymous"
          />
        </noscript>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
        />
      </head>
      <body className="antialiased">
        {children}
        <ChatWidgetGate>
          <Suspense fallback={null}>
            <ChatWidgetServer />
          </Suspense>
        </ChatWidgetGate>
        {/* Turns [data-analytics] CTAs into GA4 events (book_click, check_availability) */}
        <AnalyticsClickTracker />
        {/* Google Analytics — production host only, never /admin (DEC-021);
            gtag.js deferred until after window load */}
        <Analytics />
      </body>
    </html>
  );
}
