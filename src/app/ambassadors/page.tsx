import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import AmbassadorForm from "@/components/ambassador/AmbassadorForm";
import { REWARD_TIERS, HOW_TO_JOIN, WHY_JOIN } from "@/lib/ambassador";

export const metadata: Metadata = {
  title: "Become a Haven in Lipa Ambassador — Share Lipa, Earn Rewards",
  description:
    "Join the Haven in Lipa Ambassador Program. Share your exclusive promo code, give your audience 5% off direct bookings, and earn ₱200–₱800 cash rewards on every completed stay.",
  alternates: {
    canonical: "/ambassadors",
  },
};

export default function AmbassadorsPage() {
  return (
    <>
      <Navbar />
      <main className="bg-cream min-h-screen pt-28 pb-20">

        {/* Hero */}
        <section className="max-w-5xl mx-auto px-6 text-center">
          <span className="flex items-center justify-center gap-2 text-forest text-[11px] font-semibold tracking-[.18em] uppercase mb-4">
            <span className="block w-7 h-0.5 bg-[#FF5371] rounded" />Ambassador Program
            <span className="block w-7 h-0.5 bg-[#FF5371] rounded" />
          </span>
          <h1 className="font-serif font-semibold text-charcoal leading-tight mb-4" style={{ fontSize: "clamp(2.2rem,5vw,3.4rem)" }}>
            Become a Haven in Lipa Ambassador
          </h1>
          <p className="text-[#FF5371] font-serif italic text-[1.25rem] mb-6">Share Lipa. Welcome Guests. Earn Rewards.</p>
          <p className="text-charcoal/60 text-[16px] leading-[1.8] max-w-[640px] mx-auto">
            Whether you&apos;re a content creator, photographer, café or restaurant owner, wedding supplier,
            tour guide, business owner, or simply someone who loves Lipa City — we&apos;d love to partner with you.
            Share your exclusive promo code and earn rewards on every completed booking.
          </p>

          {/* Two value props */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl mx-auto mt-12">
            <div className="bg-forest text-cream rounded-[18px] p-7 text-left flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-cream/15 flex items-center justify-center flex-shrink-0">
                <i className="fa-solid fa-ticket text-gold text-[20px]" />
              </div>
              <div>
                <div className="font-semibold text-[15px] mb-1">Your followers get <span className="text-gold">5% off</span></div>
                <p className="text-cream/75 text-[13.5px] leading-[1.6]">when they book directly using your promo code.</p>
              </div>
            </div>
            <div className="bg-forest text-cream rounded-[18px] p-7 text-left flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-cream/15 flex items-center justify-center flex-shrink-0">
                <i className="fa-solid fa-hand-holding-dollar text-gold text-[20px]" />
              </div>
              <div>
                <div className="font-semibold text-[15px] mb-1">You earn rewards</div>
                <p className="text-cream/75 text-[13.5px] leading-[1.6]">for every completed booking made using your code.</p>
              </div>
            </div>
          </div>

          <a href="#apply" className="inline-flex items-center gap-2.5 mt-10 px-8 py-4 rounded-full text-[14px] font-semibold text-white transition-all duration-300 hover:-translate-y-0.5"
            style={{ background: "linear-gradient(135deg,#FF5371,#E03D5A)", boxShadow: "0 4px 20px rgba(255,83,113,.35)" }}>
            Apply to Become an Ambassador <i className="fa-solid fa-arrow-down" />
          </a>
        </section>

        {/* How to Join */}
        <section className="max-w-5xl mx-auto px-6 mt-24">
          <h2 className="font-serif font-semibold text-charcoal text-center mb-12" style={{ fontSize: "clamp(1.6rem,3vw,2.2rem)" }}>How to Join</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_TO_JOIN.map((step, i) => (
              <div key={step.title} className="bg-white rounded-[18px] p-7 border border-black/[.05] shadow-[0_4px_24px_rgba(44,44,44,.05)]">
                <div className="w-10 h-10 rounded-full bg-forest text-cream flex items-center justify-center font-serif font-semibold text-[16px] mb-4">{i + 1}</div>
                <div className="font-semibold text-charcoal text-[15px] mb-2">{step.title}</div>
                <p className="text-charcoal/55 text-[13.5px] leading-[1.65]">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Rewards tiers */}
        <section className="max-w-5xl mx-auto px-6 mt-24">
          <h2 className="font-serif font-semibold text-charcoal text-center mb-3" style={{ fontSize: "clamp(1.6rem,3vw,2.2rem)" }}>Ambassador Rewards</h2>
          <p className="text-charcoal/55 text-[15px] text-center max-w-[560px] mx-auto mb-12">
            Every completed booking made using your Ambassador Promo Code earns you a reward — and the more you refer, the more you earn per booking.
          </p>
          <div className="bg-white rounded-[20px] border border-black/[.06] shadow-[0_4px_24px_rgba(44,44,44,.06)] overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-forest text-cream">
                  <th className="px-6 py-4 text-[12px] font-semibold uppercase tracking-wide">Level</th>
                  <th className="px-6 py-4 text-[12px] font-semibold uppercase tracking-wide">Completed Bookings</th>
                  <th className="px-6 py-4 text-[12px] font-semibold uppercase tracking-wide text-right">Reward / Booking</th>
                </tr>
              </thead>
              <tbody>
                {REWARD_TIERS.map((tier) => (
                  <tr key={tier.level} className="border-b border-black/[.05] last:border-none">
                    <td className="px-6 py-5">
                      <span className="inline-flex items-center gap-2.5 font-semibold text-charcoal text-[15px]">
                        <i className={`fa-solid ${tier.icon}`} style={{ color: tier.color }} />
                        {tier.level}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-charcoal/65 text-[14.5px]">{tier.bookings}</td>
                    <td className="px-6 py-5 text-right font-serif font-semibold text-[#FF5371] text-[20px]">{tier.reward}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-gold/10 border border-gold/30 rounded-[14px] p-5 mt-6 flex items-start gap-3">
            <i className="fa-solid fa-star text-gold text-[16px] mt-0.5 flex-shrink-0" />
            <p className="text-charcoal/70 text-[13.5px] leading-[1.65]">
              <strong>Example:</strong> Refer 12 completed bookings and you&apos;ll earn ₱2,400 (12 × ₱200). Once you reach Silver, your future completed bookings earn ₱400 each!
            </p>
          </div>
        </section>

        {/* Reward payments */}
        <section className="max-w-5xl mx-auto px-6 mt-24">
          <h2 className="font-serif font-semibold text-charcoal text-center mb-12" style={{ fontSize: "clamp(1.6rem,3vw,2.2rem)" }}>Reward Payments</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: "fa-calendar-check", text: "Rewards are calculated after each guest successfully checks out." },
              { icon: "fa-wallet",          text: "Payments are sent once per month via GCash or your preferred payment method." },
              { icon: "fa-receipt",         text: "You'll receive a summary of your completed bookings and rewards with each payout." },
            ].map((item) => (
              <div key={item.icon} className="bg-white rounded-[18px] p-7 border border-black/[.05] shadow-[0_4px_24px_rgba(44,44,44,.05)] text-center">
                <div className="w-12 h-12 rounded-full bg-forest/10 flex items-center justify-center mx-auto mb-4">
                  <i className={`fa-solid ${item.icon} text-forest text-[18px]`} />
                </div>
                <p className="text-charcoal/60 text-[13.5px] leading-[1.65]">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Why join */}
        <section className="max-w-5xl mx-auto px-6 mt-24">
          <h2 className="font-serif font-semibold text-charcoal text-center mb-12" style={{ fontSize: "clamp(1.6rem,3vw,2.2rem)" }}>Why Join?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {WHY_JOIN.map((item) => (
              <div key={item.text} className="flex items-start gap-4 bg-white rounded-[14px] p-5 border border-black/[.05]">
                <div className="w-10 h-10 rounded-full bg-forest/10 flex items-center justify-center flex-shrink-0">
                  <i className={`fa-solid ${item.icon} text-forest text-[15px]`} />
                </div>
                <p className="text-charcoal/70 text-[14px] leading-[1.55] self-center">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Application form */}
        <section className="max-w-3xl mx-auto px-6 mt-24">
          <div className="text-center mb-10">
            <h2 className="font-serif font-semibold text-charcoal mb-3" style={{ fontSize: "clamp(1.7rem,3.5vw,2.4rem)" }}>Ready to Become an Ambassador?</h2>
            <p className="text-charcoal/55 text-[15px] max-w-[520px] mx-auto">
              Fill out the application below. Once approved, you&apos;ll receive your unique promo code and toolkit to start sharing and earning.
            </p>
          </div>
          <AmbassadorForm />
        </section>

      </main>
      <Footer />
    </>
  );
}
