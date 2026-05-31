import Link from "next/link";
import { faqs, HOMEPAGE_FAQ_LIMIT } from "@/lib/faqs";
import FaqAnswer from "@/components/ui/FaqAnswer";

export default function FAQ() {
  const visible = faqs.slice(0, HOMEPAGE_FAQ_LIMIT);

  return (
    <section className="py-24 bg-cream">
      <div className="max-w-5xl mx-auto px-6">

        <div className="flex flex-col items-center text-center reveal mb-16">
          <span className="flex items-center gap-2 text-[11px] font-semibold tracking-[.18em] uppercase mb-3" style={{ color: "#3B5323" }}>
            <span className="block w-7 h-0.5 rounded bg-forest" />
            FAQ
            <span className="block w-7 h-0.5 rounded bg-forest" />
          </span>
          <h2
            className="font-serif font-semibold text-charcoal leading-tight mb-3"
            style={{ fontSize: "clamp(1.8rem,3.5vw,2.6rem)" }}
          >
            Everything You Need to Know
          </h2>
          <p className="text-charcoal/55 text-[15px]">
            Common questions about short-term rentals in Lipa City, Batangas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 reveal">
          {visible.map((item, i) => (
            <div
              key={i}
              className={`bg-white rounded-[16px] p-7 border-l-[3px] flex flex-col gap-3 transition-transform duration-300 hover:-translate-y-0.5${
                i === visible.length - 1 ? " md:col-span-2" : ""
              }`}
              style={{
                borderLeftColor: "#C4A862",
                boxShadow: "0 2px 16px rgba(0,0,0,.05)",
              }}
            >
              <span
                className="font-serif font-bold leading-none"
                style={{ color: "#C4A862", fontSize: "clamp(1.5rem, 2.5vw, 2rem)" }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="font-semibold text-[15px] leading-snug" style={{ color: "#3B5323" }}>
                {item.q}
              </h3>
              <FaqAnswer
                answer={item.a}
                links={item.links}
                className="text-charcoal/60 text-[14px] leading-[1.8]"
              />
            </div>
          ))}
        </div>

        <div className="mt-12 text-center reveal">
          <Link
            href="/faq"
            className="inline-flex items-center gap-2 px-7 py-3 rounded-full text-[14px] font-semibold transition-all duration-300 hover:-translate-y-0.5"
            style={{
              color: "#3B5323",
              border: "2px solid rgba(59,83,35,0.25)",
              background: "rgba(255,255,255,0.6)",
            }}
          >
            See all {faqs.length} FAQs
            <i className="fa-solid fa-arrow-right text-[12px]" />
          </Link>
        </div>

      </div>
    </section>
  );
}
