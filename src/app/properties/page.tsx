import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ScrollReveal from "@/components/ui/ScrollReveal";
import PropertyCard from "@/components/ui/PropertyCard";
import { normalizePricingProse } from "@/lib/occupancy";
import { STRIPE_FEE_RATE } from "@/lib/pricing-core";
import { buildShortNames, getPublicListingCount, getPublicListings, numberWord } from "@/lib/listings";

// The inventory index. `/properties` was a 404 until now even though it looks
// like a real path: it was linked from the five biggest blog evergreens until
// 2026-08-16, and is still linked from surfaces we don't control (external
// sites, the GBP profile, old social posts, LLM citations). It is also the only
// page that answers plain lodging intent — the property grid otherwise exists
// only as a homepage section — and the fallback surface for the Stay Match
// engine's <0.4 confidence tier.
//
// Copy is from the audit deliverable MoneyPage_02_Properties_Index.md
// (081526), rendered against live DB values rather than the draft's literals.
//
// Deliberately NOT `export const revalidate` / statically prerendered, for the
// same reason as /api/properties.json (2dc488b): that form runs the Prisma
// query at BUILD time, which fails CI outright (the lint/build workflow has no
// database) and would let a transient DB error get baked into a static asset.
// The query is cached instead of the response — an App Router page can't set
// its own response headers, and a next.config.ts Cache-Control loses to the
// framework's no-store on Vercel. See getPublicListings() in src/lib/listings.ts.
export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXTAUTH_URL || "https://haveninlipa.com";

/**
 * "Find the right one → By group size", from the money-page draft. Party
 * descriptions are editorial and keyed by slug (same shape as `BEDS_BY_SLUG` in
 * src/lib/property-schema.ts); the guest maximum and the home's name render
 * from the DB, which is the half that goes stale. Rows whose slug isn't in the
 * live result set are skipped rather than rendered as a dead reference.
 */
const GROUP_SIZE_ROWS: { slug: string; party: string; withMax: boolean }[] = [
  { slug: "cozy-1-bedroom", party: "Two of you", withMax: false },
  { slug: "cozy-1-bedroom", party: "A small family", withMax: true },
  { slug: "mickey-in-lipa--family-staycation--sleeps-7", party: "A family with kids", withMax: true },
  { slug: "spacious-2-bedroom", party: "A barkada or two families", withMax: true },
  { slug: "mickey-in-lipa--family-house--sleeps-11", party: "A big group", withMax: true },
  { slug: "mickey-in-lipa--full-family-house--sleeps-15", party: "Everyone", withMax: true },
];

export async function generateMetadata(): Promise<Metadata> {
  // The count is read from the DB so the title can't claim "5 Private Rentals"
  // the day a sixth is published or one is deactivated.
  let count = 0;
  try {
    count = await getPublicListingCount();
  } catch {
    // DB unreachable — fall through to the count-free copy rather than 500-ing
    // the page's <head>.
  }

  const title = count > 0
    ? `Our Homes in Lipa City, Batangas — ${count} Private Rental${count === 1 ? "" : "s"}`
    : "Our Homes in Lipa City, Batangas";

  // Draft copy verbatim (152 chars). It names the inventory count and the top
  // occupancy, so it is only served while those still hold; any other count
  // falls back to the number-free variant instead of publishing a wrong claim.
  const description = count === 5
    ? "Browse all five Haven in Lipa homes — from a 1BR for two to a full house sleeping 15. Live rates, real availability, booked direct with no platform fee."
    : "Private, entire-unit homes in Lipa City, Batangas. Live rates, real availability, booked direct with no platform fee and no service charge on top.";

  return {
    title,
    description,
    // Self-canonical. Without this the page inherits the root layout's `/`
    // canonical — the App Router metadata gotcha that put two /book URLs in the
    // index as duplicate-canonical thin pages (36fa136).
    alternates: { canonical: "/properties" },
    openGraph: {
      title,
      description,
      type: "website",
      url: "/properties",
    },
  };
}

export default async function PropertiesIndexPage() {
  // Query Prisma directly. /api/properties.json exists so WordPress can read
  // live data across an origin boundary; the app self-fetching its own route
  // would add a network hop and a failure mode for nothing.
  let properties: Awaited<ReturnType<typeof getPublicListings>> = [];
  try {
    properties = await getPublicListings();
  } catch {
    // DB unreachable — render the page copy and the contact prompt below.
    // Never an empty grid, never a throw: this URL is linked from places we
    // can't edit, so a bad minute must not resurrect the 404 it replaces.
  }

  const count = properties.length;
  const shortNames = buildShortNames(properties);
  const bySlug = new Map(properties.map((p) => [p.slug, p]));
  const sleeps = properties.map((p) => p.maxGuests);
  const minSleeps = sleeps.length ? Math.min(...sleeps) : 0;
  const maxSleeps = sleeps.length ? Math.max(...sleeps) : 0;
  const stripePct = Math.round(STRIPE_FEE_RATE * 100);

  const cards = properties.map((property) => ({
    property,
    // Seeded prose can carry a rate that has since drifted from pricePerNight.
    // Same normalisation `generateMetadata` and the feed apply. The draft's
    // "already normalised by the feed — do not re-template prices into it" rule
    // survives the switch to Prisma by calling the same helper the feed calls.
    tagline: normalizePricingProse(
      property.tagline,
      {
        pricePerNight: Number(property.pricePerNight),
        includedGuests: property.includedGuests,
      },
      {
        maxGuests: property.maxGuests,
        includedGuests: property.includedGuests,
        extraGuestFeePerNight: Number(property.extraGuestFeePerNight),
      },
    ),
  }));

  const groupRows = GROUP_SIZE_ROWS.flatMap((row) => {
    const property = bySlug.get(row.slug);
    if (!property) return [];
    return [{
      travelling: row.withMax ? `${row.party}, up to ${property.maxGuests}` : row.party,
      name: shortNames.get(property.slug) ?? property.name,
      slug: property.slug,
    }];
  });

  /** Inline link to a home by slug, or plain text if it isn't currently listed. */
  const homeLink = (slug: string) => {
    const property = bySlug.get(slug);
    if (!property) return null;
    return (
      <Link href={`/properties/${slug}`} className="text-forest hover:underline font-medium">
        {shortNames.get(slug) ?? property.name}
      </Link>
    );
  };

  const mickeySlugs = [
    "mickey-in-lipa--family-staycation--sleeps-7",
    "mickey-in-lipa--family-house--sleeps-11",
    "mickey-in-lipa--full-family-house--sleeps-15",
  ];

  const graph: Record<string, unknown>[] = [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
        {
          "@type": "ListItem",
          position: 2,
          name: "Our Homes",
          item: `${BASE_URL}/properties`,
        },
      ],
    },
  ];

  // ItemList in the "summary page" form — position + url pointing at the real
  // detail pages, which is where the content lives. No Offer/priceSpecification
  // anywhere in this graph: those were stripped from the property pages for
  // triggering "invalid itemtype" and "invalid object type for
  // priceSpecification" criticals, and this page must not reintroduce them.
  //
  // Omitted entirely when the list is empty rather than emitted as
  // `numberOfItems: 0` — a crawler landing during a DB blip would otherwise be
  // told, in machine-readable terms, that we have no inventory.
  if (count > 0) {
    graph.unshift({
      "@type": "ItemList",
      name: "Haven in Lipa — our homes in Lipa City, Batangas",
      numberOfItems: count,
      itemListElement: properties.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: p.name,
        url: `${BASE_URL}/properties/${p.slug}`,
      })),
    });
  }

  const jsonLd = { "@context": "https://schema.org", "@graph": graph };

  const h2 = "font-serif font-semibold text-charcoal text-[1.45rem] mb-4";
  const h3 = "font-serif font-semibold text-charcoal text-[1.1rem] mb-3";
  const prose = "text-charcoal/70 text-[15px] leading-[1.85]";

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ScrollReveal />
      <Navbar />

      <main className="bg-cream min-h-screen pt-28 pb-20">
        <div className="max-w-6xl mx-auto px-6">

          {/* Visible breadcrumb, mirroring the BreadcrumbList above. */}
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex items-center gap-2 text-[12px] text-charcoal/45">
              <li>
                <Link href="/" className="hover:text-forest transition-colors">Home</Link>
              </li>
              <li aria-hidden="true">
                <i className="fa-solid fa-chevron-right text-[9px]" />
              </li>
              <li aria-current="page" className="text-charcoal/70 font-medium">Our Homes</li>
            </ol>
          </nav>

          <div className="flex flex-col items-start mb-12">
            <span
              className="flex items-center gap-2 text-[11px] font-semibold tracking-[.18em] uppercase mb-3"
              style={{ color: "#3B5323" }}
            >
              <span className="block w-7 h-0.5 rounded bg-forest" />
              Our Listings
            </span>
            <h1
              className="font-serif font-semibold text-charcoal leading-tight mb-4"
              style={{ fontSize: "clamp(2rem,4vw,2.8rem)" }}
            >
              Our Homes in Lipa City, Batangas
            </h1>
            {count > 0 && (
              <p className={`${prose} max-w-2xl`}>
                {numberWord(count).charAt(0).toUpperCase() + numberWord(count).slice(1)} private
                {count === 1 ? " home" : " homes"}, all in Lipa City, all bookable directly. No
                platform between us, no service fee on top, and the rates below are the live ones
                — not a number typed into a page months ago.
              </p>
            )}
          </div>

          {count > 0 ? (
            <>
              {/* ── All homes ───────────────────────────────────────────── */}
              <section id="homes" className="mb-20">
                <h2 className={h2}>All {numberWord(count)} homes</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
                  {cards.map(({ property, tagline }, i) => (
                    <PropertyCard
                      key={property.id}
                      property={property}
                      index={i}
                      tagline={tagline}
                      variant="index"
                    />
                  ))}
                </div>
              </section>

              {/* ── Find the right one ──────────────────────────────────── */}
              <section className="mb-20">
                <h2 className={h2}>Find the right one</h2>

                {groupRows.length > 0 && (
                  <div className="mb-12">
                    <h3 className={h3}>By group size</h3>
                    <div className="overflow-x-auto rounded-[16px] bg-white" style={{ boxShadow: "0 2px 16px rgba(0,0,0,.05)" }}>
                      <table className="w-full text-[14.5px] border-collapse">
                        <thead>
                          <tr className="text-left text-charcoal/50 text-[12px] uppercase tracking-[.1em]">
                            <th scope="col" className="font-semibold px-6 py-4">Travelling as</th>
                            <th scope="col" className="font-semibold px-6 py-4">The home</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupRows.map((row, i) => (
                            <tr key={`${row.slug}-${i}`} className="border-t border-black/[.05]">
                              <td className="px-6 py-4 text-charcoal/70">{row.travelling}</td>
                              <td className="px-6 py-4">
                                <Link href={`/properties/${row.slug}`} className="text-forest hover:underline font-medium">
                                  {row.name}
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className={h3}>By occasion</h3>
                  <ul className={`${prose} space-y-3 max-w-3xl`}>
                    {bySlug.has("cozy-1-bedroom") && (
                      <li>
                        <strong className="text-charcoal">A weekend away for two</strong> &rarr;{" "}
                        {homeLink("cozy-1-bedroom")}.
                      </li>
                    )}
                    {mickeySlugs.some((s) => bySlug.has(s)) && (
                      <li>
                        <strong className="text-charcoal">Family trip with kids</strong> &rarr; the
                        Mickey houses. Mickey-themed rooms, full kitchen.
                      </li>
                    )}
                    {(bySlug.has("spacious-2-bedroom") || bySlug.has("mickey-in-lipa--family-house--sleeps-11")) && (
                      <li>
                        <strong className="text-charcoal">Barkada getaway</strong> &rarr;{" "}
                        {homeLink("spacious-2-bedroom")}
                        {bySlug.has("spacious-2-bedroom") && bySlug.has("mickey-in-lipa--family-house--sleeps-11") ? " or " : ""}
                        {homeLink("mickey-in-lipa--family-house--sleeps-11")}.
                      </li>
                    )}
                    {bySlug.has("cozy-1-bedroom") && (
                      <li>
                        <strong className="text-charcoal">Working remotely</strong> &rarr;{" "}
                        {homeLink("cozy-1-bedroom")}. 400 Mbps fibre, speed-tested, solar backup.
                      </li>
                    )}
                    {(bySlug.has("mickey-in-lipa--family-house--sleeps-11") || bySlug.has("mickey-in-lipa--full-family-house--sleeps-15")) && (
                      <li>
                        <strong className="text-charcoal">A wedding party</strong> &rarr;{" "}
                        {homeLink("mickey-in-lipa--family-house--sleeps-11")}
                        {bySlug.has("mickey-in-lipa--family-house--sleeps-11") && bySlug.has("mickey-in-lipa--full-family-house--sleeps-15") ? " or " : ""}
                        {homeLink("mickey-in-lipa--full-family-house--sleeps-15")}. We wrote{" "}
                        <Link href="/weddings-accommodation" className="text-forest hover:underline font-medium">
                          a whole page on where the entourage sleeps
                        </Link>.
                      </li>
                    )}
                    {bySlug.has("mickey-in-lipa--full-family-house--sleeps-15") && (
                      <li>
                        <strong className="text-charcoal">A reunion or milestone birthday</strong> &rarr;{" "}
                        {homeLink("mickey-in-lipa--full-family-house--sleeps-15")}. Gatherings are
                        fine — just tell us in advance.
                      </li>
                    )}
                  </ul>
                </div>
              </section>

              {/* ── What every home includes ────────────────────────────── */}
              <section className="mb-20">
                <h2 className={h2}>What every home includes</h2>
                <p className={`${prose} mb-5`}>Whichever you pick:</p>
                <ul className={`${prose} list-disc pl-5 space-y-2.5 max-w-3xl`}>
                  <li><strong className="text-charcoal">Fast fibre WiFi</strong>, speed-tested rather than advertised</li>
                  <li><strong className="text-charcoal">A full kitchen</strong> — not a kettle and a microwave</li>
                  <li><strong className="text-charcoal">Parking inside the village gates</strong>, not on a street</li>
                  <li><strong className="text-charcoal">Netflix</strong>, and a living room actually built for sitting in</li>
                  <li>
                    <strong className="text-charcoal">GCash, BPI InstaPay</strong> (no fees){" "}
                    <strong className="text-charcoal">or credit card</strong> via Stripe ({stripePct}% processing)
                  </li>
                  <li>
                    <strong className="text-charcoal">No cleaning fee, no service fee, no resort fee.</strong>{" "}
                    The rate plus any extra-guest fee is the total
                  </li>
                </ul>
              </section>

              {/* ── Where they are ──────────────────────────────────────── */}
              <section className="mb-20">
                <h2 className={h2}>Where they are</h2>
                <p className={`${prose} mb-6 max-w-3xl`}>
                  All {numberWord(count)} are in Lipa City, roughly an hour from Manila via SLEX and
                  the STAR Tollway. Nearby: SM Lipa, the Metropolitan Cathedral of Saint Sebastian,
                  Casa de Segunda, the Mt. Maculot trailhead, and Taal Heritage Town.
                </p>

                {/* Same area-level embed as the property pages — the bbox shows the
                    neighbourhood only (no exact pin) to preserve gated-village
                    privacy. OpenStreetMap rather than Google, whose ?output=embed
                    now returns X-Frame-Options: SAMEORIGIN. Allowed by the
                    frame-src CSP directive in next.config.ts.

                    NOTE: the draft specifies drive times to each landmark above.
                    They are deliberately absent — the deliverable flags them as
                    VERIFY-with-Melody-or-Wilma, and estimating them would trade
                    away the local accuracy this page's whole advantage rests on.
                    Add them here once confirmed. */}
                <div className="rounded-[12px] overflow-hidden border border-black/[.06] max-w-4xl">
                  <iframe
                    title="Map of the Lipa City, Batangas area where our homes are located"
                    src="https://www.openstreetmap.org/export/embed.html?bbox=121.16261,13.9124,121.18661,13.9284&layer=mapnik"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="w-full aspect-[16/9] border-0 block"
                  />
                  <p className="text-charcoal/45 text-[12.5px] px-4 py-2.5 bg-white">
                    Approximate area only — the exact address and gate details are shared after your
                    booking is confirmed.
                  </p>
                </div>
              </section>

              {/* ── Booking direct ──────────────────────────────────────── */}
              <section className="mb-20">
                <h2 className={h2}>Booking direct</h2>
                <p className={`${prose} mb-4 max-w-3xl`}>
                  Pick your dates on the home&rsquo;s page and you&rsquo;ll see the total before you
                  commit — nightly rate, any extra-guest fee, and nothing else. Payment by GCash,
                  BPI InstaPay or card.
                </p>
                <p className={`${prose} max-w-3xl`}>
                  Cancellation terms, check-in times, pets, kids and the rest are on the{" "}
                  <Link href="/faq" className="text-forest hover:underline">FAQ page</Link>. If your
                  question isn&rsquo;t there, message us — you&rsquo;ll get Melody or Wilma, not a queue.
                </p>
              </section>

              {/* ── Questions ───────────────────────────────────────────── */}
              <section className="mb-20">
                <h2 className={h2}>Questions</h2>
                <div className="space-y-6 max-w-3xl">
                  <div>
                    <h3 className="font-semibold text-charcoal text-[15px] mb-1.5">Can I book more than one home at once?</h3>
                    <p className={prose}>
                      Yes — for big groups we often put people across two. Message us and we&rsquo;ll
                      work out the combination.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-charcoal text-[15px] mb-1.5">Do rates change on weekends or holidays?</h3>
                    <p className={prose}>
                      The rate shown on each home&rsquo;s page is the live one for your dates. What
                      you see is what you pay.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-charcoal text-[15px] mb-1.5">How many guests can each home take?</h3>
                    <p className={prose}>
                      From {minSleeps} to {maxSleeps}. Each home&rsquo;s rate covers a set number,
                      with a flat per-night fee per guest beyond that.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-charcoal text-[15px] mb-1.5">Are the homes near each other?</h3>
                    <p className={prose}>
                      Ask us when you enquire — it matters for split groups and we&rsquo;ll tell you
                      straight.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-charcoal text-[15px] mb-1.5">Can we hold an event or gathering?</h3>
                    <p className={prose}>
                      Gatherings are permitted as long as you inform us in advance — it&rsquo;s part
                      of the house rules. What doesn&rsquo;t work is turning up with an unannounced
                      party.
                    </p>
                  </div>
                </div>
              </section>

              {/* ── Ready to book? ──────────────────────────────────────── */}
              <section>
                <h2 className={h2}>Ready to book?</h2>
                <p className={`${prose} mb-6 max-w-3xl`}>
                  Rates shown are the nightly base rate. Homes that include a set number of guests in
                  that rate show a &ldquo;From&rdquo; price — the exact total for your dates and party
                  size, with every line itemised, appears before you pay.
                </p>
                <div className="flex flex-wrap gap-3">
                  <a
                    href="#homes"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] rounded-full text-[13px] font-semibold border-2 border-forest bg-forest text-white hover:bg-[#2d4820] hover:border-[#2d4820] transition-all duration-250"
                  >
                    Browse the homes <i className="fa-solid fa-arrow-up text-[11px]" />
                  </a>
                  <Link
                    href="/#contact"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] rounded-full text-[13px] font-semibold border-2 border-forest text-forest hover:bg-forest hover:text-white transition-all duration-250"
                  >
                    Message us <i className="fa-solid fa-arrow-right text-[11px]" />
                  </Link>
                </div>
              </section>
            </>
          ) : (
            // Empty state — no grid, no throw. Covers both "nothing published
            // yet" and a DB blip.
            <div
              className="bg-white rounded-[20px] p-10 border-l-[3px] max-w-2xl"
              style={{ borderLeftColor: "#C4A862", boxShadow: "0 2px 16px rgba(0,0,0,.05)" }}
            >
              <h2 className="font-serif font-semibold text-charcoal text-[1.25rem] mb-3">
                Our listings aren&rsquo;t loading right now
              </h2>
              <p className={`${prose} mb-6`}>
                The homes are still here — this page just can&rsquo;t reach them at the moment.
                Message us with your dates and party size and we&rsquo;ll send you availability and
                rates directly, usually the same day.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/#contact"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] rounded-full text-[13px] font-semibold border-2 border-forest bg-forest text-white hover:bg-[#2d4820] hover:border-[#2d4820] transition-all duration-250"
                >
                  Ask about availability
                </Link>
                <a
                  href="mailto:customerservice@haveninlipa.com"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] rounded-full text-[13px] font-semibold border-2 border-forest text-forest hover:bg-forest hover:text-white transition-all duration-250"
                >
                  Email us
                </a>
              </div>
            </div>
          )}

        </div>
      </main>

      <Footer />
    </>
  );
}
