export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Haven in Lipa — Short-Term Rentals in Lipa City, Batangas",
  description:
    "Discover clean, comfortable, and thoughtfully managed short-term rentals in Lipa City, Batangas. Book directly and save on Airbnb fees. GCash & BPI accepted.",
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What makes your properties different from a hotel or Airbnb?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Our properties are fully furnished homes — not hotel rooms. You get a full kitchen, living area, and the kind of space to relax that a hotel just can't offer. And unlike Airbnb, booking directly with us means no service fees and a more personal experience with your host.",
      },
    },
    {
      "@type": "Question",
      name: "Where exactly are your properties located in Lipa City, Batangas?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "All our properties are in Lipa City, Batangas — a thriving city in the heart of the CALABARZON region, just 2–3 hours from Metro Manila. Whether you're here for the cool highland climate, the cafes, or visiting family, we're conveniently located to get you wherever you're going.",
      },
    },
    {
      "@type": "Question",
      name: "How do I book a short-term rental in Lipa City, Batangas?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "It's simple: browse our listings, pick your dates, and complete a quick booking form. We accept payment via GCash or BPI InstaPay — no credit card required. You'll get a confirmation once your payment is verified.",
      },
    },
    {
      "@type": "Question",
      name: "Can I book for just one night?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes! We welcome short stays. Whether you need a one-night stopover or a week-long retreat, you can select any available dates on the property page and see the total price upfront.",
      },
    },
    {
      "@type": "Question",
      name: "Is it safe to book directly instead of through Airbnb?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Absolutely. We've hosted over 250 guests and take pride in transparent communication from the moment you inquire. You'll receive a full booking confirmation by email, and your host will be reachable throughout your stay.",
      },
    },
    {
      "@type": "Question",
      name: "What amenities are included in your short-term rentals?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Amenities vary by property but typically include air conditioning, Wi-Fi, a full kitchen, hot shower, and all the basics you need for a comfortable stay. Check each property's listing for the full amenity list.",
      },
    },
    {
      "@type": "Question",
      name: "What is your cancellation policy for bookings?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We follow a strict cancellation policy: partial refunds are available for cancellations made 7 or more days before check-in. We also offer one free rebooking if requested at least 14 days before your original check-in date.",
      },
    },
  ],
};
import Navbar        from "@/components/layout/Navbar";
import Footer        from "@/components/layout/Footer";
import Hero          from "@/components/sections/Hero";
import Properties    from "@/components/sections/Properties";
import WhyUs         from "@/components/sections/WhyUs";
import TrustSignals  from "@/components/sections/TrustSignals";
import FAQ           from "@/components/sections/FAQ";
import ContactForm   from "@/components/sections/ContactForm";
import DiscoverLipa  from "@/components/sections/DiscoverLipa";
import ScrollReveal  from "@/components/ui/ScrollReveal";

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      {/* Font Awesome */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
        crossOrigin="anonymous"
      />
      <ScrollReveal />
      <Navbar />
      <main>
        <Hero />
        <TrustSignals />
        <Properties />
        <WhyUs />
        <FAQ />
        <DiscoverLipa />
        <ContactForm />

        {/* ── CTA Banner ── */}
        <section id="cta" className="py-28 relative overflow-hidden text-center">
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 80% 100% at 50% 110%,rgba(139,205,184,.10) 0%,transparent 65%),linear-gradient(158deg,#1e3326 0%,#335238 48%,#2C2C2C 100%)",
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px,rgba(255,255,255,.03) 1px,transparent 0)",
              backgroundSize: "36px 36px",
            }}
          />
          <div className="relative z-[1] max-w-6xl mx-auto px-6 reveal">
            <div className="flex items-center justify-center gap-2.5 mb-6">
              <span className="block w-6 h-px bg-[#8BCDB8]" />
              <span className="text-[#8BCDB8] text-[11px] font-semibold tracking-[.22em] uppercase">
                Start Your Journey
              </span>
              <span className="block w-6 h-px bg-[#8BCDB8]" />
            </div>
            <h2
              className="font-serif font-bold text-white leading-[1.18] mb-5"
              style={{ fontSize: "clamp(2rem,4vw,3.2rem)" }}
            >
              Ready to Experience<br />Our Comfort?
            </h2>
            <p className="text-white/60 text-[16px] leading-[1.7] max-w-[460px] mx-auto mb-11">
              Book your stay today and discover why hundreds of guests call our properties their home away
              from home in Lipa, Batangas.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 mb-14">
              <Link
                href="/#properties"
                className="inline-flex items-center gap-2 px-9 py-4 rounded-full text-[14px] font-semibold text-white"
                style={{
                  background: "linear-gradient(135deg,#FF5371,#E03D5A)",
                  boxShadow: "0 4px 20px rgba(255,83,113,.40)",
                }}
              >
                <i className="fa-solid fa-calendar-check" /> Book Your Stay Today
              </Link>
              <a
                href="#properties"
                className="inline-flex items-center gap-2 px-9 py-4 rounded-full text-[14px] font-semibold text-white border-2 border-white/40 hover:bg-white/10 transition-all duration-300"
              >
                <i className="fa-solid fa-magnifying-glass" /> Browse Properties
              </a>
            </div>
            <div className="flex justify-center gap-4">
              {(
                [
                  ["fa-facebook-f", "Facebook",  "https://www.facebook.com/profile.php?id=61572535599006"],
                  ["fa-instagram",  "Instagram", "https://www.instagram.com/haven_inlipa/"],
                  ["fa-tiktok",     "TikTok",    "https://www.tiktok.com/@haven_inlipa"],
                  ["fa-airbnb",     "Airbnb",    "https://airbnb.com/h/fullhousebellavita"],
                ] as [string, string, string][]
              ).map(([icon, label, href]) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-11 h-11 rounded-full flex items-center justify-center text-[15px] text-white/70 border border-white/[.15] hover:bg-[#FF5371] hover:border-[#FF5371] hover:text-white hover:-translate-y-0.5 transition-all duration-300"
                  style={{ background: "rgba(255,255,255,.08)" }}
                >
                  <i className={`fa-brands ${icon}`} />
                </a>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
