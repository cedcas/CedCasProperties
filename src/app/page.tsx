export const dynamic = "force-dynamic";

import Navbar       from "@/components/layout/Navbar";
import Footer       from "@/components/layout/Footer";
import Hero         from "@/components/sections/Hero";
import Properties   from "@/components/sections/Properties";
import WhyUs        from "@/components/sections/WhyUs";
import Testimonials from "@/components/sections/Testimonials";
import ContactForm  from "@/components/sections/ContactForm";
import ScrollReveal from "@/components/ui/ScrollReveal";

export default function Home() {
  return (
    <>
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
        <Testimonials />
        <ContactForm />

        {/* ── CTA Banner ── */}
        <section id="cta" className="py-28 relative overflow-hidden text-center">
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 80% 100% at 50% 110%,rgba(196,168,98,.10) 0%,transparent 65%),linear-gradient(158deg,#17260f 0%,#2d4820 48%,#2C2C2C 100%)",
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
              <span className="block w-6 h-px bg-[#C4A862]" />
              <span className="text-[#C4A862] text-[11px] font-semibold tracking-[.22em] uppercase">
                Start Your Journey
              </span>
              <span className="block w-6 h-px bg-[#C4A862]" />
            </div>
            <h2
              className="font-serif font-bold text-white leading-[1.18] mb-5"
              style={{ fontSize: "clamp(2rem,4vw,3.2rem)" }}
            >
              Ready to Experience<br />CedCas Comfort?
            </h2>
            <p className="text-white/60 text-[16px] leading-[1.7] max-w-[460px] mx-auto mb-11">
              Book your stay today and discover why hundreds of guests call CedCas their home away
              from home in Lipa, Batangas.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 mb-14">
              <a
                href="#contact"
                className="inline-flex items-center gap-2 px-9 py-4 rounded-full text-[14px] font-semibold text-white"
                style={{
                  background: "linear-gradient(135deg,#C4A862,#A8893F)",
                  boxShadow: "0 4px 20px rgba(196,168,98,.40)",
                }}
              >
                <i className="fa-solid fa-calendar-check" /> Book Your Stay Today
              </a>
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
                  ["fa-facebook-f", "Facebook"],
                  ["fa-instagram",  "Instagram"],
                  ["fa-tiktok",     "TikTok"],
                  ["fa-airbnb",     "Airbnb"],
                ] as [string, string][]
              ).map(([icon, label]) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="w-11 h-11 rounded-full flex items-center justify-center text-[15px] text-white/70 border border-white/[.15] hover:bg-[#C4A862] hover:border-[#C4A862] hover:text-white hover:-translate-y-0.5 transition-all duration-300"
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
