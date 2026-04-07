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
      name: "What types of properties are available?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We offer fully furnished short-term rentals including studio units, 1-bedroom, and 2-bedroom entire units in Lipa City, Batangas, Philippines.",
      },
    },
    {
      "@type": "Question",
      name: "How do I book a property?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Browse our listings, select your check-in and check-out dates on the property page, then complete your booking with GCash or BPI InstaPay. No Airbnb account required.",
      },
    },
    {
      "@type": "Question",
      name: "What payment methods do you accept?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We accept GCash and BPI InstaPay via QR code payment. Payment is verified manually by our team before your booking is confirmed.",
      },
    },
    {
      "@type": "Question",
      name: "Is there a minimum stay requirement?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Our minimum stay is typically 1 night. Specific requirements may vary per property and season.",
      },
    },
    {
      "@type": "Question",
      name: "Where are the properties located?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "All our properties are located in Lipa City, Batangas, Philippines — a convenient destination in the CALABARZON region, just a few hours from Metro Manila.",
      },
    },
    {
      "@type": "Question",
      name: "Is it cheaper to book directly instead of Airbnb?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Booking directly through our website avoids Airbnb service fees, which typically range from 14–16% of the reservation. You get the same property at a lower price.",
      },
    },
  ],
};
import Navbar       from "@/components/layout/Navbar";
import Footer       from "@/components/layout/Footer";
import Hero         from "@/components/sections/Hero";
import Properties   from "@/components/sections/Properties";
import WhyUs        from "@/components/sections/WhyUs";
import ContactForm  from "@/components/sections/ContactForm";
import DiscoverLipa from "@/components/sections/DiscoverLipa";
import ScrollReveal from "@/components/ui/ScrollReveal";

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
        <Properties />
        <WhyUs />
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
