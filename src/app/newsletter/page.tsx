import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import NewsletterSignup from "@/components/sections/NewsletterSignup";
import { socialMetadata } from "@/lib/seo-metadata";

const PAGE_TITLE = "Holiday Stay Ideas & Deals Newsletter";
const PAGE_DESCRIPTION =
  "Subscribe for holiday stay ideas and direct-booking deals from Haven in Lipa. Get occasional emails (and SMS if you add your number). Unsubscribe anytime.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: {
    canonical: "/newsletter",
  },
  ...socialMetadata({ title: PAGE_TITLE, description: PAGE_DESCRIPTION, path: "/newsletter" }),
};

export default function NewsletterPage() {
  return (
    <>
      <Navbar />
      <main className="bg-offwhite min-h-screen pt-28 pb-24">
        <div className="max-w-xl mx-auto px-6 text-center">
          <span className="flex items-center justify-center gap-2 text-forest text-[11px] font-semibold tracking-[.18em] uppercase mb-4">
            <span className="block w-7 h-0.5 bg-[#FF5371] rounded" />Stay in the Loop
            <span className="block w-7 h-0.5 bg-[#FF5371] rounded" />
          </span>
          <h1 className="font-serif font-semibold text-charcoal leading-tight mb-3" style={{ fontSize: "clamp(1.9rem,4.5vw,2.6rem)" }}>
            Get holiday stay ideas and direct-booking deals from Haven in Lipa
          </h1>
          <p className="text-charcoal/55 text-[15px] leading-[1.7] mb-10">
            Occasional emails with staycation ideas, seasonal offers, and a heads-up when we run a direct-booking
            deal — no spam, unsubscribe anytime.
          </p>

          <div className="bg-white rounded-[20px] p-8 sm:p-9 shadow-[0_4px_24px_rgba(44,44,44,.08)] border border-black/[.04] text-left">
            <NewsletterSignup variant="page" source="site:newsletter-page" />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
