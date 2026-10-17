export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { socialMetadata } from "@/lib/seo-metadata";
import { SOCIAL_LINKS } from "@/lib/social-links";

export const metadata: Metadata = {
  title: "Haven in Lipa — Short-Term Rentals in Lipa City, Batangas",
  description:
    "Clean, comfortable, and thoughtfully managed short-term rentals in Lipa City, Batangas. Book direct and save 15–20% vs. Airbnb. GCash, BPI & credit cards accepted.",
  alternates: {
    canonical: "/",
  },
  ...socialMetadata({
    title: "Haven in Lipa — Short-Term Rentals in Lipa City, Batangas",
    description: "Stay in Style, Live in Comfort. Short-term rentals in Lipa City, Batangas — book direct.",
    path: "/",
  }),
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
import NewsletterSignup from "@/components/sections/NewsletterSignup";
import ScrollReveal  from "@/components/ui/ScrollReveal";

export default async function Home() {
  const propertyCount = await prisma.property.count({ where: { isActive: true } });

  return (
    <>
      <ScrollReveal />
      <Navbar />
      <main>
        <Hero propertyCount={propertyCount} />
        <TrustSignals />
        <Properties />
        <WhyUs />
        <FAQ />
        <DiscoverLipa />

        {/* ── Newsletter Signup Strip ── */}
        <section className="py-16 bg-cream/40">
          <div className="max-w-2xl mx-auto px-6 text-center">
            <h2 className="font-serif font-semibold text-charcoal leading-tight mb-2" style={{ fontSize: "clamp(1.5rem,3vw,2rem)" }}>
              Get Holiday Stay Ideas &amp; Deals
            </h2>
            <p className="text-charcoal/55 text-[14.5px] leading-[1.7] mb-6">
              Occasional emails with staycation ideas and direct-booking offers. Unsubscribe anytime.
            </p>
            <NewsletterSignup variant="strip" source="site:homepage" className="max-w-md mx-auto" />
          </div>
        </section>

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
                  ...SOCIAL_LINKS.map(({ icon, name, url }) => [icon, name, url, `Haven in Lipa on ${name}`]),
                  ["fa-airbnb", "Airbnb", "https://airbnb.com/h/fullhousebellavita", "Airbnb"],
                ] as [string, string, string, string][]
              ).map(([icon, label, href, ariaLabel]) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={ariaLabel}
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
