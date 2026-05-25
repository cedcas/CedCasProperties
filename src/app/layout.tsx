import type { Metadata } from "next";
import { Suspense } from "react";
import Script from "next/script";
import { Montserrat, Poppins, Open_Sans } from "next/font/google";
import { runQrIntegrityCheck } from "@/lib/qr-integrity-check";
import ChatWidgetServer from "@/components/chat/ChatWidgetServer";
import ChatWidgetGate from "@/components/chat/ChatWidgetGate";
import "./globals.css";

// Server-side QR integrity check — runs once on first request
runQrIntegrityCheck();

const BASE_URL = process.env.NEXTAUTH_URL || "https://www.haveninlipa.com";

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": BASE_URL,
  name: "Haven in Lipa",
  description:
    "Short-term vacation rentals in Lipa City, Batangas, Philippines.",
  url: BASE_URL,
  email: "customerservice@haveninlipa.com",
  telephone: "+639066554415",
  image: `${BASE_URL}/brand-assets/Logo.png`,
  logo: `${BASE_URL}/brand-assets/Logo.png`,
  priceRange: "₱₱",
  openingHours: "Mo-Su 00:00-23:59",
  address: {
    "@type": "PostalAddress",
    streetAddress: "BellaVita Subdivision",
    addressLocality: "Lipa City",
    addressRegion: "Batangas",
    postalCode: "4217",
    addressCountry: "PH",
  },
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+639066554415",
    email: "customerservice@haveninlipa.com",
    contactType: "customer service",
    availableLanguage: ["English", "Filipino"],
    hoursAvailable: "Mo-Su 00:00-23:59",
  },
  sameAs: [
    "https://www.facebook.com/haveninlipa",
    "https://www.instagram.com/haven_inlipa/",
    "https://www.tiktok.com/@haven_inlipa",
    "https://airbnb.com/h/fullhousebellavita",
  ],
};

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
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
    images: [
      {
        url: "/brand-assets/Logo.png",
        width: 1200,
        height: 630,
        alt: "Haven in Lipa — Short-Term Rentals in Lipa City, Batangas",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Haven in Lipa — Short-Term Rentals in Lipa City, Batangas",
    description:
      "Stay in Style, Live in Comfort. Short-term rentals in Lipa, Batangas.",
    images: ["/brand-assets/Logo.png"],
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
              "(function(){var l=document.createElement('link');l.rel='stylesheet';l.href='https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css';l.crossOrigin='anonymous';l.referrerPolicy='no-referrer';document.head.appendChild(l);})();",
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
        {/* Google Analytics — deferred until after window load */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-2SV2PXYB7T"
          strategy="lazyOnload"
        />
        <Script id="gtag-init" strategy="lazyOnload">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-2SV2PXYB7T');`}
        </Script>
      </body>
    </html>
  );
}
