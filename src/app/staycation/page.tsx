import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ScrollReveal from "@/components/ui/ScrollReveal";
import FaqAnswer from "@/components/ui/FaqAnswer";
import type { FaqLink } from "@/lib/faqs";
import { extraGuestFeeApplies } from "@/lib/occupancy";
import { STRIPE_FEE_RATE } from "@/lib/pricing-core";
import {
  buildShortNames,
  deriveHouses,
  getPublicListingGroups,
  getPublicListings,
  numberWord,
  plural,
  totalHouseCapacity,
  type House,
} from "@/lib/listings";

/**
 * The staycation money page — cluster C1 (Short-Term Rentals), the cluster that
 * was sitting at zero clicks. Copy is the audit deliverable
 * `081526/MoneyPage_01_Staycation.md`, rendered against live DB values.
 *
 * It is also the **consolidation target for blog article #6**
 * (`why-book-direct-instead-of-airbnb-a-philippines-hosts-honest-take`), which
 * draws 17 impressions and 0 clicks and chases the same rate-shopper. Its
 * book-direct argument is absorbed into "The 14–20% you don't pay" below.
 *
 * ⛔ SEQUENCING — the 301 is the LAST step, not the first. Article #6 is linked
 * in-body from 22 of 26 published posts (33 occurrences). The order is
 * **build → repoint → 301**; adding the redirect first turns every one of those
 * 33 links into an extra hop. The three in-repo links to #6 (this codebase's
 * share of the repoint) are updated in the same commit as this page, so they
 * never point at a 404 or through a redirect. The WordPress-side repoint of the
 * other 22 posts and the Redirection-plugin rule are owner/SEO-side.
 *
 * Deliberately NOT `export const revalidate` — that form runs the Prisma query
 * at BUILD time, which fails CI (no database in the lint/build workflow). Same
 * precedent as `2dc488b`, `/properties` and `/weddings-accommodation`; the query
 * is cached rather than the response, because an App Router page cannot set its
 * own `Cache-Control` on Vercel (`c2c5e6b`).
 */
export const dynamic = "force-dynamic";

type Listing = Awaited<ReturnType<typeof getPublicListings>>[number];

/**
 * "Which home fits your trip", from the draft. The trip description and the
 * reason-to-pick are editorial and keyed by slug (same shape as `GROUP_SIZE_ROWS`
 * on `/properties`); the home's name and guest maximum render from the DB, which
 * is the half that goes stale. A block whose slugs are all missing from the live
 * result set is skipped rather than rendered as a dead reference.
 */
const FIT_BLOCKS: { heading: string; slugs: string[]; body: string }[] = [
  {
    heading: "Two of you, and one of you has to work",
    slugs: ["cozy-1-bedroom"],
    body: "Fibre up to 340 Mbps, speed-tested rather than advertised. A proper desk surface, Netflix Premium for the evening, and a solar backup that keeps things running through a brownout. If Monday morning has a standup in it, this is the one.",
  },
  {
    heading: "A family with kids",
    slugs: ["mickey-in-lipa--family-staycation--sleeps-7"],
    body: "Disney-themed rooms that do a genuinely disproportionate amount of work on a family trip — the kids are delighted before anyone has unpacked. Full kitchen, so breakfast happens on your schedule instead of a hotel's.",
  },
  {
    heading: "A barkada, or family plus grandparents",
    slugs: ["spacious-2-bedroom", "mickey-in-lipa--family-house--sleeps-11"],
    body: "Two private bedrooms means the people who sleep early and the people who don't can both get what they want. Parking is inside the village gates.",
  },
  {
    heading: "The whole clan, one roof",
    slugs: ["mickey-in-lipa--full-family-house--sleeps-15"],
    body: "Three bedrooms across two floors. Reunions, milestone birthdays, and wedding parties who want everyone in one place the night before.",
  },
];

/** Saturday's options, each already verified to resolve 200 on the blog. */
const WEEKEND_LINKS = {
  lomi: "https://blog.haveninlipa.com/best-lomi-lipa-city/",
  food: "https://blog.haveninlipa.com/best-restaurants-cafes-in-lipa-city-batangas-2026-food-guide/",
  taal: "https://blog.haveninlipa.com/taal-volcano-day-trip-from-lipa-city-2026-updated-guide/",
  casa: "https://blog.haveninlipa.com/casa-de-segunda-lipa-city/",
  barako: "https://blog.haveninlipa.com/lipa-barako-coffee-heritage/",
  rain: "https://blog.haveninlipa.com/indoor-things-to-do-in-lipa-city-when-it-rains/",
  tagaytay: "https://blog.haveninlipa.com/lipa-vs-tagaytay-an-honest-comparison-from-a-host-who-lives-in-lipa/",
};

const peso = (n: number) => `₱${Math.round(n).toLocaleString("en-PH")}`;

/** `housePolicies` is a JSON *string* column; a malformed value must not 500 the page. */
function policiesOf(listing: Listing): Record<string, string> {
  try {
    const parsed = JSON.parse(listing.housePolicies || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** "2:00 PM onwards" → "2:00 PM". The suffix reads as noise mid-sentence. */
const tidyTime = (t: string | undefined) =>
  (t ?? "").replace(/\s*onwards\s*$/i, "").trim();

async function loadInventory(): Promise<{ listings: Listing[]; houses: House<Listing>[] }> {
  try {
    const [listings, memberships] = await Promise.all([
      getPublicListings(),
      getPublicListingGroups(),
    ]);
    return { listings, houses: deriveHouses(listings, memberships) };
  } catch {
    // DB unreachable. The page still works as an argument for booking direct —
    // what is withheld is every number, rather than a guess.
    return { listings: [], houses: [] };
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const { listings } = await loadInventory();
  const count = listings.length;

  // The count renders from the DB so the title can't claim "5 Private Homes"
  // the day a sixth is published or one is deactivated.
  const title = count > 0
    ? `Staycation in Lipa City: ${count} Private ${plural(count, "Home")}, Booked Direct`
    : "Staycation in Lipa City — Private Homes, Booked Direct";

  const cheapest = listings.length
    ? Math.min(...listings.map((p) => Number(p.pricePerNight)))
    : 0;

  // Draft copy (159 chars). It names the inventory count and the entry rate, so
  // it is only served while both still hold.
  const description = count === 5 && cheapest > 0
    ? `Five private homes for a Lipa City staycation — couples, families, barkadas and remote workers. Book direct from ${peso(cheapest)}/night and skip the 14–20% platform fee.`
    : "Private homes for a Lipa City staycation — couples, families, barkadas and remote workers. Book direct and skip the 14–20% platform fee, with no service charge on top.";

  return {
    title,
    description,
    // Self-canonical. Without this the page inherits the root layout's `/`
    // canonical — the App Router metadata gotcha that put two /book URLs in the
    // index as duplicate-canonical thin pages (36fa136).
    alternates: { canonical: "/staycation" },
    openGraph: { title, description, type: "website", url: "/staycation" },
  };
}

export default async function StaycationPage() {
  const { listings, houses } = await loadInventory();

  const count = listings.length;
  const hasInventory = count > 0;
  const shortNames = buildShortNames(listings);
  const bySlug = new Map(listings.map((p) => [p.slug, p]));
  const stripePct = Math.round(STRIPE_FEE_RATE * 100);

  const prices = listings.map((p) => Number(p.pricePerNight));
  const cheapest = prices.length ? Math.min(...prices) : 0;
  const dearest = prices.length ? Math.max(...prices) : 0;
  const guestCounts = listings.map((p) => p.maxGuests);
  const minGuests = guestCounts.length ? Math.min(...guestCounts) : 0;
  const maxGuests = guestCounts.length ? Math.max(...guestCounts) : 0;
  /** The listing behind the top rate — "…and run to ₱X for the whole N-person house." */
  const dearestListing = listings.find((p) => Number(p.pricePerNight) === dearest);

  const capacity = totalHouseCapacity(houses);
  const bigHouse = houses[0];
  const twoHouses = houses.length === 2;

  /** Same predicate as the cards, the property pages and the feed's `priceFrom`. */
  const showFrom = (p: Listing) =>
    extraGuestFeeApplies({
      maxGuests: p.maxGuests,
      includedGuests: p.includedGuests,
      extraGuestFeePerNight: Number(p.extraGuestFeePerNight),
    });

  const rateOf = (p: Listing) =>
    `${showFrom(p) ? "From " : ""}${peso(Number(p.pricePerNight))}`;

  /**
   * The solar house. Verified with the owner 2026-08-16: the block holding the
   * Cozy 1BR and Spacious 2BR has a whole-unit solar array with battery backup;
   * **the Mickey house does not**. Resolved through the inventory group rather
   * than by naming listings, so the claim follows the data if a configuration is
   * renamed — and disappears entirely rather than migrating to the wrong house if
   * `cozy-1-bedroom` ever stops being listed.
   */
  const solarHouse = houses.find((h) =>
    h.configurations.some((c) => c.slug === "cozy-1-bedroom"),
  );
  const solarNames = solarHouse
    ? solarHouse.configurations.map((c) => shortNames.get(c.slug) ?? c.name)
    : [];

  /**
   * Check-in / checkout, read from `housePolicies` per house rather than typed in.
   * Today that is 2:00 PM for Block 34 and 3:00 PM for the Mickey house, with a
   * shared noon checkout — exactly the draft's sentence, but sourced. Collapses to
   * a single clause when every house agrees, and is dropped when the field is empty.
   */
  /**
   * A house's name, not a configuration's. `buildShortNames` disambiguates the
   * three Mickey configurations from each other ("Mickey in Lipa — Family
   * House"), which is right in a list of listings and wrong when referring to the
   * building: quoting one configuration implies the policy applies only to it.
   * For a multi-configuration house take the shared first segment instead.
   */
  const houseLabel = (house: House<Listing>) =>
    house.configurations.length > 1
      ? (house.largest.name.split("|")[0] ?? "").trim() || house.largest.name
      : (shortNames.get(house.largest.slug) ?? house.largest.name);

  const checkInSentence = (() => {
    const rows = houses.map((h) => ({
      name: houseLabel(h),
      checkIn: tidyTime(policiesOf(h.largest).checkInTime),
      checkOut: tidyTime(policiesOf(h.largest).checkOutTime),
    })).filter((r) => r.checkIn && r.checkOut);

    if (rows.length === 0) return null;

    const checkOuts = [...new Set(rows.map((r) => r.checkOut))];
    const checkIns = [...new Set(rows.map((r) => r.checkIn))];

    // Mixed checkout times would need a different sentence than the draft's; fall
    // back to listing each house rather than quietly picking one to report.
    if (checkOuts.length > 1 || checkIns.length > 2) {
      return rows.map((r) => `${r.name}: check-in ${r.checkIn}, checkout ${r.checkOut}`).join(". ") + ".";
    }

    if (checkIns.length === 1) {
      return `Check-in is ${checkIns[0]}, checkout ${checkOuts[0]}.`;
    }

    // Two check-in times: report the earlier as the norm and name the exception.
    const sorted = [...rows].sort((a, b) => a.checkIn.localeCompare(b.checkIn));
    const base = sorted[0];
    const later = sorted.find((r) => r.checkIn !== base.checkIn)!;
    return `Check-in is ${base.checkIn}, checkout ${base.checkOut} — ${later.checkIn} check-in at ${later.name}.`;
  })();

  /** Inline link to a home by slug, or null if it isn't currently listed. */
  const homeLink = (slug: string) => {
    const property = bySlug.get(slug);
    if (!property) return null;
    return (
      <Link href={`/properties/${slug}`} className="text-forest hover:underline font-medium">
        {shortNames.get(slug) ?? property.name}
      </Link>
    );
  };

  const fitBlocks = FIT_BLOCKS.flatMap((block) => {
    const present = block.slugs.filter((s) => bySlug.has(s));
    if (present.length === 0) return [];
    return [{ ...block, present }];
  });

  /* ── FAQ ───────────────────────────────────────────────────────────────────
     Answers stay plain strings so the FAQPage JSON-LD `text` value is link-free;
     `links` only affect the rendered HTML (same contract as src/lib/faqs.ts). */
  const faqs: { q: string; a: string; links?: FaqLink[] }[] = [];

  faqs.push({
    q: "Can I book for one night?",
    a: hasInventory
      ? `Yes. There's no minimum-stay rule on any of the ${numberWord(count)} homes.`
      : "Yes. There's no minimum-stay rule on any of our homes.",
  });

  if (hasInventory) {
    faqs.push({
      q: "What's the maximum number of guests?",
      a: `It varies by home — from ${minGuests} to ${maxGuests}. The nightly rate covers a set number and each guest beyond that is a flat per-night fee. The booking calculator shows the total before you commit.`,
    });
  }

  faqs.push(
    {
      q: "How do I pay?",
      a: `GCash, BPI InstaPay (no fees), or Credit/Debit Card (${stripePct}% processing fee).`,
    },
    {
      q: "Is it safe to book directly?",
      a: "Payment goes through a secure card payment or a named BPI account, you get written confirmation, and you're dealing with Melody and Wilma directly. Full detail on the FAQ page.",
      links: [{ phrase: "FAQ page", href: "/faq" }],
    },
    {
      q: "Can I bring pets?",
      a: "Ask us — it depends on the home. Say so when you enquire rather than on arrival.",
    },
    {
      q: "Can we have a small gathering?",
      a: "Yes, as long as you tell us in advance. It's in the house rules: gatherings are fine with the host informed. What we can't accommodate is an unannounced event.",
    },
  );

  // Both of these quote simultaneous capacity, which is summed PER HOUSE — five
  // listings are two physical houses and each takes one booking at a time. See
  // deriveHouses(). Omitted rather than guessed when the shape isn't two houses.
  if (twoHouses) {
    faqs.push({
      q: "Can I book more than one at a time?",
      a: `We have two houses, five doors apart — about a two-minute walk. Together they sleep up to ${capacity}. What you can't do is book two options on the same house: the different guest counts are configurations of one property, not separate units. Tell us your headcount and we'll sort the split.`,
    });
  }

  if (hasInventory) {
    faqs.push({
      q: "Do you have a place for a bigger group?",
      a: twoHouses
        ? `The big house sleeps up to ${bigHouse.maxGuests}, and both houses together take ${capacity}. For wedding parties and reunions, see where your wedding party stays.`
        : `Our largest home sleeps up to ${bigHouse.maxGuests}. For wedding parties and reunions, see where your wedding party stays.`,
      links: [{ phrase: "where your wedding party stays", href: "/weddings-accommodation" }],
    });
  }

  // FAQPage only — the one rich result available to this site.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const h2 = "font-serif font-semibold text-charcoal text-[1.45rem] mb-4";
  const h3 = "font-serif font-semibold text-charcoal text-[1.1rem] mb-3";
  const prose = "text-charcoal/70 text-[15px] leading-[1.85]";
  const lead = (text: string) => <strong className="text-charcoal">{text}</strong>;
  const blogLink = (href: string, label: string) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-forest hover:underline font-medium">
      {label}
    </a>
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ScrollReveal />
      <Navbar />

      {/* bg-offwhite (#FFF8FA), matching the homepage body — NOT bg-cream, whose
          token is #F5BECA, a saturated pink despite the name. */}
      <main className="bg-offwhite min-h-screen pt-28 pb-20">
        <div className="max-w-4xl mx-auto px-6">

          {/* Visible breadcrumb only — the schema on this page is FAQPage and
              nothing else, matching /weddings-accommodation. */}
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex items-center gap-2 text-[12px] text-charcoal/45">
              <li><Link href="/" className="hover:text-forest transition-colors">Home</Link></li>
              <li aria-hidden="true"><i className="fa-solid fa-chevron-right text-[9px]" /></li>
              <li><Link href="/properties" className="hover:text-forest transition-colors">Our Homes</Link></li>
              <li aria-hidden="true"><i className="fa-solid fa-chevron-right text-[9px]" /></li>
              <li aria-current="page" className="text-charcoal/70 font-medium">Staycation</li>
            </ol>
          </nav>

          <div className="flex flex-col items-start mb-12">
            <span
              className="flex items-center gap-2 text-[11px] font-semibold tracking-[.18em] uppercase mb-3"
              style={{ color: "#3B5323" }}
            >
              <span className="block w-7 h-0.5 rounded bg-forest" />
              Staycation
            </span>
            <h1
              className="font-serif font-semibold text-charcoal leading-tight mb-6"
              style={{ fontSize: "clamp(2rem,4vw,2.8rem)" }}
            >
              {hasInventory
                ? `Staycation in Lipa City: ${count} Private ${plural(count, "Home")}, Booked Direct`
                : "Staycation in Lipa City — Private Homes, Booked Direct"}
            </h1>
            <div className={`${prose} space-y-4`}>
              <p>
                Lipa is about {lead("an hour from Alabang")} on SLEX and the STAR Tollway — call it{" "}
                {lead("about one hour from central Manila")} once traffic has its say. It
                sits high enough to be genuinely cooler than the lowlands, and it doesn&rsquo;t fill up
                the way Tagaytay does on a long weekend. It&rsquo;s where we live, and it&rsquo;s where
                we run {hasInventory ? `${numberWord(count)} private ${plural(count, "home")}` : "private homes"}{" "}
                you can book directly — no platform, no service fee, no bidding against a hundred other
                listings.
              </p>
              <p>
                This page is the honest version: what each home costs, who each one actually suits, and
                what a weekend here looks like once you&rsquo;ve dropped your bags.
              </p>
            </div>
          </div>

          {/* ── Cost ──────────────────────────────────────────────────────── */}
          <section className="mb-16">
            <h2 className={h2}>What a Lipa staycation actually costs</h2>

            {hasInventory ? (
              <>
                <p className={`${prose} mb-6`}>
                  Rates start at {lead(`${peso(cheapest)}`)} a night and run to {lead(`${peso(dearest)}`)}
                  {dearestListing ? ` for the whole ${dearestListing.maxGuests}-person house` : ""}. Nothing
                  is hidden behind a checkout screen.
                </p>

                <div className="overflow-x-auto rounded-[16px] bg-white mb-8" style={{ boxShadow: "0 2px 16px rgba(0,0,0,.05)" }}>
                  <table className="w-full text-[14.5px] border-collapse">
                    <thead>
                      <tr className="text-left text-charcoal/50 text-[12px] uppercase tracking-[.1em]">
                        <th scope="col" className="font-semibold px-6 py-4">Home</th>
                        <th scope="col" className="font-semibold px-6 py-4">Sleeps up to</th>
                        <th scope="col" className="font-semibold px-6 py-4">Nightly rate</th>
                        <th scope="col" className="font-semibold px-6 py-4">Included guests</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listings.map((p) => (
                        <tr key={p.id} className="border-t border-black/[.05]">
                          <td className="px-6 py-4">
                            <Link href={`/properties/${p.slug}`} className="text-forest hover:underline font-medium">
                              {shortNames.get(p.slug) ?? p.name}
                            </Link>
                          </td>
                          <td className="px-6 py-4 text-charcoal/70">{p.maxGuests}</td>
                          <td className="px-6 py-4 text-charcoal/70">{rateOf(p)}</td>
                          <td className="px-6 py-4 text-charcoal/70">{p.includedGuests}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className={`${prose} mb-8`}>
                Live rates for every home are on the{" "}
                <Link href="/properties" className="text-forest hover:underline font-medium">homes page</Link>,
                and the exact total for your dates and party size is shown before you pay.
              </p>
            )}

            <h3 className={h3}>What &ldquo;from&rdquo; means, and what an extra guest adds</h3>
            <div className={`${prose} space-y-4 mb-8`}>
              <p>
                The nightly rate covers a set number of guests — the{" "}
                <span className="whitespace-nowrap">&ldquo;Included guests&rdquo;</span> column above.
                Beyond that, each additional guest is a flat per-night fee, and it&rsquo;s the same
                number in the booking calculator as it is here. That&rsquo;s the only variable. There is
                no cleaning fee, no service fee, no resort fee, and no surprise at checkout.
              </p>
              <p>
                If a home&rsquo;s rate doesn&rsquo;t change with headcount, you&rsquo;ll see a flat price
                with no &ldquo;From&rdquo; — because there&rsquo;s nothing extra to add.
              </p>
            </div>

            <h3 className={h3}>The 14&ndash;20% you don&rsquo;t pay</h3>
            <div className={`${prose} space-y-4`}>
              <p>
                Booking through a platform adds a guest service fee of roughly 14&ndash;20% on top of the
                nightly rate. On a two-night family stay that&rsquo;s often more than a full tank of fuel
                for the drive down.
              </p>
              <p>
                Booking here, you pay the rate and the extra-guest fee, and that&rsquo;s the total. We take{" "}
                {lead("GCash")}, {lead("BPI InstaPay")} (no fees), and {lead("Credit/Debit Card")} (
                {stripePct}% processing). You&rsquo;re also messaging the people who own the homes rather
                than a support queue — which matters more than it sounds when you&rsquo;re arriving at
                11pm and the gate is closed.
              </p>
            </div>
          </section>

          {/* ── Which home fits ───────────────────────────────────────────── */}
          {fitBlocks.length > 0 && (
            <section className="mb-16">
              <h2 className={h2}>Which home fits your trip</h2>
              <p className={`${prose} mb-6`}>
                {hasInventory ? `${numberWord(count).charAt(0).toUpperCase()}${numberWord(count).slice(1)}` : "Five"}{" "}
                listings sorted by price tells you nothing useful. Here&rsquo;s the version that does.
              </p>

              <div className="space-y-6">
                {fitBlocks.map((block) => (
                  <div
                    key={block.heading}
                    className="bg-white rounded-[16px] p-7 border-l-[3px]"
                    style={{ borderLeftColor: "#C4A862", boxShadow: "0 2px 16px rgba(0,0,0,.05)" }}
                  >
                    <h3 className={h3}>{block.heading}</h3>
                    <p className={`${prose} mb-3`}>
                      {block.present.map((slug, i) => {
                        const property = bySlug.get(slug)!;
                        return (
                          <span key={slug}>
                            {i > 0 ? " or " : ""}
                            {homeLink(slug)}{" "}
                            <span className="text-charcoal/45">(sleeps up to {property.maxGuests})</span>
                          </span>
                        );
                      })}
                    </p>
                    <p className={prose}>
                      {block.body}
                      {block.heading === "The whole clan, one roof" && (
                        <>
                          {" "}
                          <Link href="/weddings-accommodation" className="text-forest hover:underline font-medium">
                            We wrote a separate page for that
                          </Link>
                          .
                        </>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Why Lipa ──────────────────────────────────────────────────── */}
          <section className="mb-16">
            <h2 className={h2}>Why Lipa and not Tagaytay</h2>
            <div className={`${prose} space-y-4`}>
              <p>
                We&rsquo;re not going to pretend Tagaytay doesn&rsquo;t have the better view. It does.
                Here&rsquo;s the honest trade.
              </p>
              <p>
                {lead("The traffic goes the other way.")} SLEX then the STAR Tollway — about an hour from
                Alabang. On a Friday evening the queue is heading to Tagaytay, not through Lipa.
              </p>
              <p>
                {lead("Cooler than the lowlands, cheaper than the ridge.")} Lipa sits high enough that
                evenings need a blanket, without the ridge-view premium on every rate in town.
              </p>
              <p>
                {lead("It doesn't sell out.")} Long weekends in Tagaytay mean booking a month ahead and
                paying surge rates. Lipa absorbs a holiday weekend without either.
              </p>
              <p>
                We put the full comparison in{" "}
                {blogLink(WEEKEND_LINKS.tagaytay, "Lipa vs Tagaytay: an honest comparison from a host who lives in Lipa")}.
              </p>
            </div>
          </section>

          {/* ── A weekend here ────────────────────────────────────────────── */}
          <section className="mb-16">
            <h2 className={h2}>What a weekend here actually looks like</h2>
            <div className={`${prose} space-y-4`}>
              <p>
                {lead("Friday night.")} Arrive, drop bags, and eat.{" "}
                {blogLink(WEEKEND_LINKS.lomi, "Beegee's for lomi")} if you want the Batangas thing done
                properly, or {blogLink(WEEKEND_LINKS.food, "one of the sit-down places")} if the drive was
                long.
              </p>
              <p>
                {lead("Saturday.")} Pick one: {blogLink(WEEKEND_LINKS.taal, "Taal Heritage Town")}, or{" "}
                {blogLink(WEEKEND_LINKS.casa, "Casa de Segunda and the cathedral")} if the
                weather&rsquo;s against you. Back for the afternoon, out again for{" "}
                {blogLink(WEEKEND_LINKS.barako, "barako coffee")}.
              </p>
              <p>
                {lead("Sunday.")} Slow start, groceries from the market for the drive home, checkout at
                noon. If it&rsquo;s raining,{" "}
                {blogLink(WEEKEND_LINKS.rain, "there's a whole guide for that")}.
              </p>
              <p>
                Or ignore all of it and stay in. That&rsquo;s a legitimate use of a staycation and the
                most common thing our guests actually do.
              </p>
            </div>
          </section>

          {/* ── Practical ─────────────────────────────────────────────────── */}
          <section className="mb-16">
            <h2 className={h2}>Practical things nobody tells you</h2>
            <div className={`${prose} space-y-4`}>
              <p>
                {lead("Brownouts happen, and one of our houses shrugs them off.")} They&rsquo;re normal in
                Batangas — the announced ones can run most of a day, the unannounced ones usually a couple
                of hours.
              </p>
              {solarNames.length > 0 && (
                <p>
                  The house with the {solarNames.join(" and ")} runs on a{" "}
                  {lead("solar array with battery backup, powering the whole unit — not just the lights.")}{" "}
                  In a daytime outage the panels carry the load, so the battery barely gets touched. After
                  dark it&rsquo;s about {lead("four hours with the aircon running")}, and considerably
                  longer without. In practice that covers essentially every unannounced brownout, and the
                  daylight half of a scheduled one. Worth knowing if you&rsquo;re working, or travelling
                  with someone who won&rsquo;t sleep without aircon.
                </p>
              )}
              <p>
                {lead("The WiFi is real.")} Fibre up to 340 Mbps in the{" "}
                {homeLink("cozy-1-bedroom") ?? "1BR"}, speed-tested. If you&rsquo;re taking calls, ask us
                and we&rsquo;ll tell you honestly whether the home you&rsquo;re looking at will hold up.
              </p>
              <p>{lead("Parking is inside the gates.")} Not on a street, not in a public lot.</p>
              <p>
                {lead("Groceries.")} SM Lipa for a full shop; the public market if you&rsquo;d rather buy
                the way we do.
              </p>
              {checkInSentence && (
                <p>
                  {lead(checkInSentence)} Ask if you need either moved; we usually can.
                </p>
              )}
            </div>
          </section>

          {/* ── FAQ ───────────────────────────────────────────────────────── */}
          <section className="mb-16">
            <h2 className={h2}>Frequently asked questions</h2>
            <div className="space-y-4">
              {faqs.map((faq) => (
                <div
                  key={faq.q}
                  className="bg-white rounded-[14px] p-6 border-l-[3px]"
                  style={{ borderLeftColor: "#C4A862", boxShadow: "0 2px 16px rgba(0,0,0,.04)" }}
                >
                  <h3 className="font-semibold text-forest text-[15px] mb-2">{faq.q}</h3>
                  <FaqAnswer answer={faq.a} links={faq.links} className={prose} />
                </div>
              ))}
            </div>
          </section>

          {/* ── CTA ───────────────────────────────────────────────────────── */}
          <section>
            <h2 className={h2}>Check your dates</h2>
            <p className={`${prose} mb-6`}>
              Pick the home that fits and see live availability — no account, no platform, no service fee.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/properties"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] rounded-full text-[13px] font-semibold border-2 border-forest bg-forest text-white hover:bg-[#2d4820] hover:border-[#2d4820] transition-all duration-250"
              >
                {hasInventory ? `See all ${numberWord(count)} homes` : "See all our homes"}{" "}
                <i className="fa-solid fa-arrow-right text-[11px]" />
              </Link>
              <Link
                href="/#contact"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] rounded-full text-[13px] font-semibold border-2 border-forest text-forest hover:bg-forest hover:text-white transition-all duration-250"
              >
                Message us <i className="fa-solid fa-arrow-right text-[11px]" />
              </Link>
            </div>
          </section>

        </div>
      </main>

      <Footer />
    </>
  );
}
