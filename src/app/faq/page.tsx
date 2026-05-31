import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import FaqAnswer from "@/components/ui/FaqAnswer";
import { faqs } from "@/lib/faqs";

export const metadata: Metadata = {
  title: "FAQ — Booking, Payments & Stays in Lipa City",
  description:
    "Answers to common questions about booking direct with Haven in Lipa: payments (GCash, BPI, credit card), cancellation, WiFi, parking, families, pets, check-in, and more.",
  alternates: {
    canonical: "/faq",
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: f.a,
    },
  })),
};

export default function FAQPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Navbar />
      <main className="bg-cream min-h-screen pt-28 pb-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex flex-col items-start mb-12">
            <span
              className="flex items-center gap-2 text-[11px] font-semibold tracking-[.18em] uppercase mb-3"
              style={{ color: "#3B5323" }}
            >
              <span className="block w-7 h-0.5 rounded bg-forest" />
              FAQ
            </span>
            <h1
              className="font-serif font-semibold text-charcoal leading-tight mb-4"
              style={{ fontSize: "clamp(2rem,4vw,2.8rem)" }}
            >
              Frequently Asked Questions
            </h1>
            <p className="text-charcoal/65 text-[15px] leading-[1.75] max-w-2xl">
              Everything you need to know about booking direct with Haven in Lipa
              — payments, policies, amenities, and the practical stuff that
              actually matters for your stay in Lipa City, Batangas.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((item, i) => (
              <article
                key={i}
                className="bg-white rounded-[16px] p-7 border-l-[3px]"
                style={{
                  borderLeftColor: "#C4A862",
                  boxShadow: "0 2px 16px rgba(0,0,0,.05)",
                }}
              >
                <div className="flex items-start gap-5">
                  <span
                    className="font-serif font-bold leading-none shrink-0"
                    style={{ color: "#C4A862", fontSize: "1.5rem" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h2
                      className="font-semibold text-[16px] leading-snug mb-3"
                      style={{ color: "#3B5323" }}
                    >
                      {item.q}
                    </h2>
                    <FaqAnswer
                      answer={item.a}
                      links={item.links}
                      className="text-charcoal/70 text-[14.5px] leading-[1.85]"
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div
            className="mt-16 rounded-[20px] p-10 text-center"
            style={{
              background:
                "linear-gradient(135deg, rgba(59,83,35,0.06), rgba(196,168,98,0.08))",
              border: "1px solid rgba(59,83,35,0.12)",
            }}
          >
            <h2
              className="font-serif font-semibold text-charcoal mb-3"
              style={{ fontSize: "clamp(1.4rem,2.5vw,1.9rem)" }}
            >
              Still have a question?
            </h2>
            <p className="text-charcoal/65 text-[15px] mb-7 max-w-xl mx-auto">
              Message us on the homepage contact form or via WhatsApp / Messenger
              — we usually reply within an hour during the day.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/#contact"
                className="inline-flex items-center gap-2 px-7 py-3 rounded-full text-[14px] font-semibold text-white"
                style={{
                  background: "linear-gradient(135deg,#FF5371,#E03D5A)",
                  boxShadow: "0 4px 20px rgba(255,83,113,.30)",
                }}
              >
                <i className="fa-solid fa-envelope" /> Contact us
              </Link>
              <Link
                href="/#properties"
                className="inline-flex items-center gap-2 px-7 py-3 rounded-full text-[14px] font-semibold transition-all duration-300 hover:bg-black/5"
                style={{
                  color: "#2C2C2C",
                  border: "2px solid rgba(44,44,44,0.22)",
                }}
              >
                <i className="fa-solid fa-house" /> Browse properties
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
