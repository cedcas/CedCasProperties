import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { prisma } from "@/lib/prisma";
import { STRIPE_FEE_RATE } from "@/lib/pricing-core";
import { PUBLIC_LISTING_GATE, PUBLIC_LISTING_ORDER, buildShortNames, numberWord, plural } from "@/lib/listings";

const BASE_URL = process.env.NEXTAUTH_URL || "https://www.haveninlipa.com";

// The homes section reads live inventory, so this page can no longer be
// prerendered: `revalidate` would run the Prisma query at build time, which
// fails CI (no database in the lint/build workflow). Same precedent as
// /api/properties.json (2dc488b) and /properties — dynamic, with an explicit
// one-hour edge cache declared in next.config.ts.
export const dynamic = "force-dynamic";

type BestForSegment = { title: string; body: string };

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  // The description used to say "Two short-term rental homes" — wrong since the
  // three Mickey houses went live on 2026-06-18. Counted from the DB so it
  // cannot go stale again the next time inventory changes.
  let count = 0;
  try {
    count = await prisma.property.count({ where: PUBLIC_LISTING_GATE });
  } catch {
    // DB unreachable — fall back to count-free copy rather than 500 the <head>.
  }

  const homes = count > 0
    ? `${numberWord(count).charAt(0).toUpperCase()}${numberWord(count).slice(1)} short-term rental ${plural(count, "home")}`
    : "Short-term rental homes";

  return {
    title: "About Haven in Lipa — Your Host Melody & Our Lipa City Properties",
    description:
      `Meet Melody — Batangas-raised, Chicago-based nurse and Airbnb Superhost. ${homes} in Lipa City, Batangas, run with on-the-ground manager Wilma.`,
    alternates: {
      canonical: "/about",
    },
  };
}

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Melody",
  jobTitle: "Host & Owner, Haven in Lipa",
  description:
    // Was "two short-term rental homes" — a wrong count, in machine-readable
    // form, on the page whose job is trust. Rewritten count-free rather than
    // re-pinned to a new number, so it can never drift again. No structural
    // change to the Person / Place / LocalBusiness graph.
    "Batangas-raised nurse and Memory Care Director based in Chicago, Illinois. Owner and host of Haven in Lipa, short-term rental homes in Lipa City, Batangas.",
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

export default async function AboutPage() {
  // Same source of truth and same gate as /properties — this section going
  // stale is the defect being fixed, and hardcoding guarantees it recurs.
  let properties: Awaited<ReturnType<typeof prisma.property.findMany>> = [];
  try {
    properties = await prisma.property.findMany({
      where: PUBLIC_LISTING_GATE,
      orderBy: PUBLIC_LISTING_ORDER,
    });
  } catch {
    // DB unreachable — the homes section falls back to a pointer at
    // /properties below. Melody's story doesn't need a database.
  }

  const count = properties.length;
  const shortNames = buildShortNames(properties);
  const stripePct = Math.round(STRIPE_FEE_RATE * 100);

  const homes = properties.map((p) => {
    // `bestForSegments[0].title` is the admin-authored audience fit — the same
    // field the property pages render — so the "built for" line is DB copy
    // rather than a phrase invented here that nobody can update.
    const segments = safeJsonParse<BestForSegment[]>(p.bestForSegments, []);
    const builtFor = segments[0]?.title?.trim();
    return {
      slug: p.slug,
      name: shortNames.get(p.slug) ?? p.name,
      maxGuests: p.maxGuests,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      builtFor: builtFor ? builtFor.charAt(0).toLowerCase() + builtFor.slice(1) : null,
    };
  });

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
            Haven in Lipa is a small, family-run short-term rental operation in Lipa City, Batangas — owned by Melody, a Batangas-raised nurse based in Chicago, and managed on the ground by her property manager Wilma. {count > 0 ? `${numberWord(count).charAt(0).toUpperCase()}${numberWord(count).slice(1)} private ${plural(count, "home")}` : "Private homes"} in quiet, gated villages, and a host who answers her own messages.
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
                Why Lipa, why these homes
              </h2>
              <p>
                Lipa is one hour from Manila via SLEX/STAR Tollway, sits at about 300 meters of elevation, and runs cooler than the city. It&rsquo;s a short drive to Tagaytay, Mt. Maculot, and Taal Heritage Town. For me it&rsquo;s also home — the kind of place I want my own family to stay in when we&rsquo;re back, which is exactly the standard I hold the units to. &ldquo;New, modern, and always improving&rdquo; is how I&rsquo;d describe them, and the &ldquo;always improving&rdquo; part is on purpose: when guests tell us something would help, we add it.
              </p>
            </section>

            <section>
              <h2 className="font-serif font-semibold text-charcoal text-[1.25rem] mb-3">
                {count > 0 ? `Our ${numberWord(count)} ${plural(count, "home")}` : "Our homes"}
              </h2>
              {count > 0 ? (
                <ul className="list-disc pl-5 space-y-2">
                  {homes.map((home) => (
                    <li key={home.slug}>
                      <strong>
                        <Link href={`/properties/${home.slug}`} className="text-forest hover:underline">
                          {home.name}
                        </Link>
                      </strong>{" "}
                      &mdash; sleeps up to {home.maxGuests}, {home.bedrooms}{" "}
                      {plural(home.bedrooms, "bedroom")}, {home.bathrooms}{" "}
                      {plural(home.bathrooms, "bath")}.
                      {home.builtFor ? ` Built for ${home.builtFor}.` : ""}
                    </li>
                  ))}
                  <li>
                    Every one of them has a full kitchen, fast WiFi, Netflix, and parking inside the
                    village gates. All of them take GCash, BPI InstaPay (no fees), and credit card
                    via Stripe ({stripePct}% processing fee). Booking direct here saves you the
                    14&ndash;20% Airbnb service fee.
                  </li>
                  <li>
                    <Link href="/properties" className="text-forest hover:underline">
                      See all {numberWord(count)} homes
                    </Link>{" "}
                    &mdash; photos, live rates, and what each one sleeps.
                  </li>
                </ul>
              ) : (
                <p>
                  The current line-up &mdash; photos, live rates, and what each one sleeps &mdash;
                  is on{" "}
                  <Link href="/properties" className="text-forest hover:underline">
                    our homes page
                  </Link>
                  . All of them take GCash, BPI InstaPay (no fees), and credit card via Stripe (
                  {stripePct}% processing fee). Booking direct here saves you the 14&ndash;20%
                  Airbnb service fee.
                </p>
              )}
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
