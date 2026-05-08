import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const BASE_URL = process.env.NEXTAUTH_URL || "https://www.haveninlipa.com";

export const metadata: Metadata = {
  title: "About Haven in Lipa — Your Host Melody & Our Lipa City Properties",
  description:
    "Meet Melody — Batangas-raised, Chicago-based nurse and Airbnb Superhost. Two short-term rental homes in Lipa City, Batangas, run with on-the-ground manager Wilma.",
  alternates: {
    canonical: "/about",
  },
};

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Melody",
  jobTitle: "Host & Owner, Haven in Lipa",
  description:
    "Batangas-raised nurse and Memory Care Director based in Chicago, Illinois. Owner and host of Haven in Lipa, two short-term rental homes in Lipa City, Batangas.",
  worksFor: {
    "@type": "LocalBusiness",
    "@id": BASE_URL,
    name: "Haven in Lipa",
    url: BASE_URL,
  },
  url: `${BASE_URL}/about`,
  birthPlace: {
    "@type": "Place",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Mataas na Kahoy",
      addressRegion: "Batangas",
      addressCountry: "PH",
    },
  },
  homeLocation: {
    "@type": "Place",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Chicago",
      addressRegion: "IL",
      addressCountry: "US",
    },
  },
  knowsLanguage: ["en", "fil"],
  sameAs: [
    "https://airbnb.com/h/fullhousebellavita",
    "https://www.facebook.com/haveninlipa",
    "https://www.instagram.com/haven_inlipa/",
  ],
};

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />
      <Navbar />
      <main className="bg-cream min-h-screen pt-28 pb-20">
        <div className="max-w-3xl mx-auto px-6">
          <span
            className="flex items-center gap-2 text-[11px] font-semibold tracking-[.18em] uppercase mb-3"
            style={{ color: "#3B5323" }}
          >
            <span className="block w-7 h-0.5 rounded bg-forest" />
            About
          </span>
          <h1
            className="font-serif font-semibold text-charcoal leading-tight mb-5"
            style={{ fontSize: "clamp(2rem,4vw,2.8rem)" }}
          >
            About Haven in Lipa
          </h1>
          <p className="text-charcoal/65 text-[16px] leading-[1.85] mb-10">
            Haven in Lipa is a small, family-run short-term rental operation in Lipa City, Batangas — owned by Melody, a Batangas-raised nurse based in Chicago, and managed on the ground by her property manager Wilma. Two private homes in quiet, gated villages, and a host who answers her own messages.
          </p>

          <div className="prose-custom space-y-8 text-[15px] text-charcoal/75 leading-[1.85]">
            <section>
              <h2 className="font-serif font-semibold text-charcoal text-[1.25rem] mb-3">
                Meet your host
              </h2>
              <p>
                Hi, I&rsquo;m Melody. I&rsquo;m a nurse — currently a Memory Care Director — and I split my life between Chicago, Illinois, where I work and raise my two daughters, and Lumang Lipa, Mataas na Kahoy in Batangas, where I grew up, went to school, and forged the friendships that still shape me. Haven in Lipa is how I keep that second home alive.
              </p>
              <p>
                On the Airbnb side, I&rsquo;m a three-year Superhost. On the personal side, I&rsquo;ll admit I spend too much time worrying about my guests. I think both of those facts are connected. The hospitality eye comes from the nursing job; you stop being able to ignore details once you&rsquo;ve been responsible for the kind of details that matter on a hospital floor.
              </p>
              <p>
                Languages I work in: English and Tagalog. Either is fine for booking, check-in, and any midnight messages.
              </p>
            </section>

            <section>
              <h2 className="font-serif font-semibold text-charcoal text-[1.25rem] mb-3">
                Wilma keeps things running on the ground
              </h2>
              <p>
                I host the message side from Chicago — bookings, questions, recommendations, the personal touch. Wilma, our property manager in Lipa, handles the day-to-day at the units: turnover cleaning, key handoffs, supply restocks, and being two minutes away if anything comes up during your stay. Between the two of us, the goal is that nothing about being far from a corporate front desk ever feels like a downgrade.
              </p>
            </section>

            <section>
              <h2 className="font-serif font-semibold text-charcoal text-[1.25rem] mb-3">
                Why Lipa, why these two homes
              </h2>
              <p>
                Lipa is one hour from Manila via SLEX/STAR Tollway, sits at about 300 meters of elevation, and runs cooler than the city. It&rsquo;s a short drive to Tagaytay, Mt. Maculot, and Taal Heritage Town. For me it&rsquo;s also home — the kind of place I want my own family to stay in when we&rsquo;re back, which is exactly the standard I hold the units to. &ldquo;New, modern, and always improving&rdquo; is how I&rsquo;d describe them, and the &ldquo;always improving&rdquo; part is on purpose: when guests tell us something would help, we add it.
              </p>
            </section>

            <section>
              <h2 className="font-serif font-semibold text-charcoal text-[1.25rem] mb-3">
                Our two properties
              </h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>
                    <Link href="/properties/spacious-2-bedroom" className="text-forest hover:underline">
                      Spacious 2BR Getaway
                    </Link>
                  </strong>{" "}
                  &mdash; sleeps 9, full kitchen, Netflix, fast WiFi, parking inside the village. Built for families and barkadas.
                </li>
                <li>
                  <strong>
                    <Link href="/properties/cozy-1-bedroom" className="text-forest hover:underline">
                      Cozy 1BR Haven
                    </Link>
                  </strong>{" "}
                  &mdash; sleeps 5, full kitchen, 400 Mbps fiber WiFi, Netflix Premium, solar power backup. Built for couples and remote workers.
                </li>
                <li>
                  Both take GCash, BPI InstaPay (no fees), and credit card via Stripe (6% processing fee). Booking direct here saves you the 14&ndash;20% Airbnb service fee.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif font-semibold text-charcoal text-[1.25rem] mb-3">
                Where to read more
              </h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <Link href="/faq" className="text-forest hover:underline">
                    FAQ
                  </Link>{" "}
                  &mdash; payment, cancellation, WiFi, kids, pets, and the practical stuff
                </li>
                <li>
                  <a
                    href="https://blog.haveninlipa.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-forest hover:underline"
                  >
                    Our Lipa City blog
                  </a>{" "}
                  &mdash; honest local guides for things to do, eat, and see while you stay
                </li>
                <li>
                  <a
                    href="https://blog.haveninlipa.com/why-book-direct-instead-of-airbnb-a-philippines-hosts-honest-take/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-forest hover:underline"
                  >
                    Why book direct vs. Airbnb
                  </a>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif font-semibold text-charcoal text-[1.25rem] mb-3">
                How to reach us
              </h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Email:</strong>{" "}
                  <a
                    href="mailto:customerservice@haveninlipa.com"
                    className="text-forest hover:underline"
                  >
                    customerservice@haveninlipa.com
                  </a>
                </li>
                <li>
                  <strong>Phone / WhatsApp:</strong>{" "}
                  <a href="tel:+639066554415" className="text-forest hover:underline">
                    +63 906 655 4415
                  </a>
                </li>
                <li>
                  <strong>Messenger:</strong>{" "}
                  <a
                    href="https://www.facebook.com/haveninlipa"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-forest hover:underline"
                  >
                    facebook.com/haveninlipa
                  </a>
                </li>
              </ul>
              <p className="text-[13px] text-charcoal/55">
                I&rsquo;m on Chicago time, so most messages get a reply within an hour during my day. Wilma is on the ground in Lipa for anything urgent at the units.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
