import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ScrollReveal from "@/components/ui/ScrollReveal";
import FaqAnswer from "@/components/ui/FaqAnswer";
import type { FaqLink } from "@/lib/faqs";
import { extraGuestFeeApplies, normalizePricingProse } from "@/lib/occupancy";
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
 * Wedding-party accommodation. Copy is the audit deliverable
 * `081526/MoneyPage_03_Wedding_Party_Accommodation.md`, rendered against live DB
 * values rather than the draft's literals.
 *
 * ⛔ POSITIONING RULE — the page depends on it. **We are not a wedding venue and
 * must never imply we are.** No ceremonies, no receptions, no catering, no
 * function rooms. The SERP for `wedding venue lipa` belongs to businesses whose
 * entire product is that (Palazzo Antonio, Villa Marasigan, Casa Marikit, JET
 * Hotel with five named function rooms) and we would deserve to lose it. What we
 * sell is the thing none of them sell: somewhere for the party to sleep. The FAQ
 * says "No" to the ceremony question in as many words — that reads as a weakness
 * and is exactly why the page is credible. **Keep it.**
 *
 * Consequently the only structured data here is `FAQPage`. `EventVenue`, `Event`
 * and anything else venue-implying is a machine-readable claim we cannot support.
 *
 * 📌 Copy rule for whoever edits this page: always write "sleeps up to N people",
 * never "N beds". Capacity comes from mixed sleeping arrangements — a queen
 * sleeps two, a daybed three — so bed count and guest count are different
 * numbers. Quoting beds understates the house and invites a complaint on arrival.
 *
 * Deliberately NOT `export const revalidate` — that form runs the Prisma query at
 * BUILD time, which fails CI (no database in the lint/build workflow). Same
 * precedent as `2dc488b` and `/properties`; the query is cached instead of the
 * response, because an App Router page cannot set its own `Cache-Control` on
 * Vercel (`c2c5e6b`).
 */
export const dynamic = "force-dynamic";

/**
 * Drive times confirmed with the owner on 2026-08-16 — real times, not map
 * estimates, which is the page's whole advantage. **Do not adjust, round, or
 * supplement these from a map.**
 *
 * Five venues were deliberately dropped as 45–50 minutes out or ambiguous in
 * identity: Casa Marikit, Villa Marasigan, Cintai Corito's Garden, Villa Natura
 * Taal, and M Farm / The Farm at San Benito (40 min *and* two businesses appear
 * to share the name). Do not add them back.
 */
const DRIVE_TIMES: { place: string; note?: string; time: string; emphasis: boolean }[] = [
  { place: "Mary Mediatrix of All Grace Parish", time: "under 10 minutes", emphasis: true },
  { place: "Our Lady of Mount Carmel", time: "10 minutes", emphasis: true },
  { place: "Metropolitan Cathedral of Saint Sebastian", time: "15 minutes", emphasis: true },
  { place: "Palazzo Antonio", note: "hotel, resort and convention venue", time: "30 minutes", emphasis: false },
  { place: "SM Lipa", note: "for the thing somebody forgot", time: "20 minutes", emphasis: false },
];

/** "A, B, or C" — the list form the copy uses throughout. */
function listSentence(items: string[], conjunction = "or"): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, ${conjunction} ${items[items.length - 1]}`;
}

type Listing = Awaited<ReturnType<typeof getPublicListings>>[number];

/** The homes, collapsed into the physical houses behind them. See `deriveHouses`. */
async function loadHouses(): Promise<{ listings: Listing[]; houses: House<Listing>[] }> {
  try {
    const [listings, memberships] = await Promise.all([
      getPublicListings(),
      getPublicListingGroups(),
    ]);
    return { listings, houses: deriveHouses(listings, memberships) };
  } catch {
    // DB unreachable. Every section below that quotes a number is skipped rather
    // than rendered with a guess, and the page still returns 200.
    return { listings: [], houses: [] };
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const { houses } = await loadHouses();
  const big = houses[0];
  const range = big && big.configurations.length > 1
    ? `${big.configurations[0].maxGuests}–${big.maxGuests}`
    : null;

  // The draft's title is 76 characters with the layout's "| Haven in Lipa"
  // suffix. The occupancy range renders from the DB, so a configuration change
  // can't leave a wrong span in the SERP; without a database we serve the
  // number-free variant rather than a claim we can't stand behind.
  const title = range
    ? `Where Your Wedding Party Stays in Lipa — Whole Homes for ${range}`
    : "Where Your Wedding Party Stays in Lipa";

  const description = range
    ? `Getting married in Lipa? Your venue seats everyone and sleeps nobody. Private whole homes for ${range} guests, minutes from the city's wedding venues. Booked direct.`
    : "Getting married in Lipa? Your venue seats everyone and sleeps nobody. Private whole homes for your entourage, minutes from the city's wedding venues. Booked direct.";

  return {
    title,
    description,
    // Self-canonical. Without this the page inherits the root layout's `/`
    // canonical — the App Router metadata gotcha that put two /book URLs in the
    // index as duplicate-canonical thin pages (36fa136).
    alternates: { canonical: "/weddings-accommodation" },
    openGraph: {
      title,
      description,
      type: "website",
      url: "/weddings-accommodation",
    },
  };
}

export default async function WeddingsAccommodationPage() {
  const { houses } = await loadHouses();

  const hasInventory = houses.length > 0;
  const bigHouse = houses[0];
  const secondHouse = houses[1];
  const capacity = totalHouseCapacity(houses);
  const stripePct = Math.round(STRIPE_FEE_RATE * 100);
  const shortNames = buildShortNames(houses.flatMap((h) => h.configurations));

  // "five doors apart", "a two-minute walk" and "the same village" are facts
  // about the two houses we have today. They are only rendered when the data
  // still describes exactly two houses; any other shape falls back to copy that
  // makes no distance claim rather than one we'd have to re-verify.
  const twoHouses = houses.length === 2;

  /**
   * "a 1BR (up to 7), a 2BR (up to 11), or the full 3BR (up to 15)" — the ways one
   * house can be booked. Bedrooms *and* guest count in one list, because they are
   * the two things a couple is actually matching against, and because two separate
   * sentences of the same information read as two separate options.
   */
  const configurationSentence = (house: House<Listing>) => {
    const labels = house.configurations.map((c, i) =>
      i === house.configurations.length - 1 && house.configurations.length > 1
        ? `the full ${c.bedrooms}BR (up to ${c.maxGuests})`
        : `a ${c.bedrooms}BR (up to ${c.maxGuests})`,
    );
    if (labels.length === 1) return `It books as one configuration — ${labels[0]}.`;
    const prefix = house === bigHouse
      ? "Book it as the configuration that matches your headcount — "
      : `Configured as ${labels.length === 2 ? "either " : ""}`;
    return `${prefix}${listSentence(labels)}.`;
  };

  /** Seeded prose can carry a rate that has drifted; same normalisation as /properties. */
  const taglineOf = (listing: Listing) =>
    normalizePricingProse(
      listing.tagline,
      { pricePerNight: Number(listing.pricePerNight), includedGuests: listing.includedGuests },
      {
        maxGuests: listing.maxGuests,
        includedGuests: listing.includedGuests,
        extraGuestFeePerNight: Number(listing.extraGuestFeePerNight),
      },
    );

  const flagship = bigHouse?.largest;
  const flagshipName = flagship ? (shortNames.get(flagship.slug) ?? flagship.name) : null;
  // Same predicate as the property pages and the cards: "From" only when an
  // extra-guest fee can actually push the total above the base rate.
  const flagshipFrom = flagship
    ? extraGuestFeeApplies({
        maxGuests: flagship.maxGuests,
        includedGuests: flagship.includedGuests,
        extraGuestFeePerNight: Number(flagship.extraGuestFeePerNight),
      })
    : false;
  const flagshipRate = flagship
    ? `₱${Math.round(Number(flagship.pricePerNight)).toLocaleString("en-PH")}`
    : null;

  /* ── FAQ ───────────────────────────────────────────────────────────────────
     Answers stay plain strings so the FAQPage JSON-LD `text` value is link-free;
     `links` only affect the rendered HTML (same contract as src/lib/faqs.ts).
     The first answer is a flat "No" on purpose — see the positioning rule. */
  const faqs: { q: string; a: string; links?: FaqLink[] }[] = [
    {
      q: "Can we hold the ceremony or reception there?",
      a: "No. We're accommodation, not a venue — no ceremony space, no reception capacity, no catering. Book your venue, then book us for where everyone sleeps.",
    },
    {
      q: "Can the bridal party get ready at the house?",
      a: "Yes, and it's one of the main reasons people book us. Kitchen and living space for hair and makeup, and room for a photographer to work. Just tell us in advance.",
    },
    {
      q: "Can we have a dinner the night before?",
      a: "Yes — gatherings are permitted with the host informed. Let us know numbers and timing when you book.",
    },
  ];

  if (hasInventory) {
    faqs.push({
      q: "How many people can you actually sleep?",
      a: twoHouses
        ? `Up to ${bigHouse.maxGuests} in the big house and up to ${secondHouse.maxGuests} in the second — ${capacity} in total, across two houses a two-minute walk apart.`
        : `Up to ${capacity} people in total, across ${numberWord(houses.length)} ${plural(houses.length, "house")} in Lipa City. The largest sleeps up to ${bigHouse.maxGuests}.`,
    });
  }

  faqs.push({
    q: "How far ahead should we book?",
    a: "For a wedding date, as early as you have it. Peak season books out months ahead.",
  });

  if (twoHouses) {
    faqs.push({
      q: "Can we book both houses?",
      a: "Yes — that's the usual arrangement for a wedding party, and they're five doors apart. What you can't do is book two configurations of the same house: the different guest counts are options on one property, not separate units. Tell us your headcount and we'll work out the split.",
    });
  }

  faqs.push({
    q: "What if the wedding date moves?",
    a: "Talk to us early. Cancellation terms are on the FAQ page, but a conversation usually beats a policy.",
    links: [{ phrase: "FAQ page", href: "/faq" }],
  });

  // FAQPage and nothing else. No EventVenue, no Event, no LodgingBusiness — see
  // the positioning rule at the top of this file.
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ScrollReveal />
      <Navbar />

      <main className="bg-cream min-h-screen pt-28 pb-20">
        <div className="max-w-4xl mx-auto px-6">

          {/* Visible breadcrumb only. No BreadcrumbList JSON-LD: the schema on
              this page is FAQPage and nothing else. */}
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex items-center gap-2 text-[12px] text-charcoal/45">
              <li>
                <Link href="/" className="hover:text-forest transition-colors">Home</Link>
              </li>
              <li aria-hidden="true"><i className="fa-solid fa-chevron-right text-[9px]" /></li>
              <li>
                <Link href="/properties" className="hover:text-forest transition-colors">Our Homes</Link>
              </li>
              <li aria-hidden="true"><i className="fa-solid fa-chevron-right text-[9px]" /></li>
              <li aria-current="page" className="text-charcoal/70 font-medium">Wedding Party Accommodation</li>
            </ol>
          </nav>

          <div className="flex flex-col items-start mb-12">
            <span
              className="flex items-center gap-2 text-[11px] font-semibold tracking-[.18em] uppercase mb-3"
              style={{ color: "#3B5323" }}
            >
              <span className="block w-7 h-0.5 rounded bg-forest" />
              Weddings
            </span>
            <h1
              className="font-serif font-semibold text-charcoal leading-tight mb-6"
              style={{ fontSize: "clamp(2rem,4vw,2.8rem)" }}
            >
              Where Your Wedding Party Stays in Lipa
            </h1>
            <div className={`${prose} space-y-4`}>
              <p>Every wedding in Lipa has the same gap in the plan.</p>
              <p>
                You&rsquo;ve booked the venue. It seats eighty, it photographs beautifully, and it
                sleeps nobody. So the entourage scatters across hotel rooms, the bridesmaids get
                ready in three different places, and somebody spends the morning of the wedding
                driving between them.
              </p>
              <p>
                We rent whole houses in Lipa City
                {bigHouse ? ` — up to ${bigHouse.maxGuests} people under one roof` : ""}, minutes
                from where you&rsquo;re getting married.
              </p>
            </div>
          </div>

          {/* ── The problem ───────────────────────────────────────────────── */}
          <section className="mb-16">
            <h2 className={h2}>The problem nobody solves for you</h2>
            <div className={`${prose} space-y-4`}>
              <p>
                Search for wedding accommodation in Lipa and you&rsquo;ll get hotels or you&rsquo;ll
                get venues. The guides that rank for wedding venues mention accommodation in a
                single line — <em>&ldquo;proximity to a variety of hotels ensures ample
                options&rdquo;</em> — and name none of them.
              </p>
              <p>That&rsquo;s not an answer. Here&rsquo;s what it leaves you managing:</p>
              <p>
                {lead("Eight rooms, eight keys, eight breakfasts, nobody together.")} Hotels price
                per room, so a party of twelve becomes six or seven bookings. Everyone checks in
                separately, eats separately, and the group you specifically wanted around you is
                down a corridor.
              </p>
              <p>
                {lead("No kitchen, no space, no morning-of.")} Hair and makeup for six people needs
                counter space and mirrors and somewhere to put a garment bag. A hotel room has a
                bathroom and a bed. The photographer needs light and floor space; they&rsquo;ll
                spend the morning shooting around a headboard.
              </p>
              <p>
                {lead("Checkout at noon on the day after.")} The reception ends late. Everyone&rsquo;s
                out by twelve the next morning, which is exactly when nobody wants to be packing.
              </p>
            </div>
          </section>

          {/* ── What a whole house changes ────────────────────────────────── */}
          <section className="mb-16">
            <h2 className={h2}>What a whole house changes</h2>
            <div className={`${prose} space-y-4`}>
              <p>
                {lead("Everyone under one roof the night before.")} The part people actually
                remember — the whole group in one place the evening before, without a lobby or a
                room-service menu.
              </p>
              <p>
                {lead("A real kitchen for the morning of.")} Counter space for makeup, a proper
                table for breakfast that isn&rsquo;t a tray, a fridge for whatever needs to stay
                cold. Somebody&rsquo;s aunt will cook. This is a feature.
              </p>
              <p>
                {lead("Room for the photographer to work.")} Getting-ready shots need light and
                space. A living room gives both; a hotel room gives a window and a bed.
              </p>
              <p>
                {lead("One booking, one payment, one set of house rules.")} Not seven reservations
                under seven names.
              </p>
            </div>
          </section>

          {/* ── The cost ──────────────────────────────────────────────────── */}
          <section className="mb-16">
            <h2 className={h2}>The cost, honestly</h2>
            <div className={`${prose} space-y-4`}>
              <p>Nobody in this market publishes this comparison, so here it is.</p>
              {/* The hotel side stays QUALITATIVE. No figure has been supplied that
                  we can check, and an invented comparison number would undermine
                  the one thing this page is selling. */}
              <p>
                A party of twelve in hotel rooms means {lead("six rooms at double occupancy")}. At
                typical Lipa mid-range rates that&rsquo;s a real nightly figure per room, times six,
                times however many nights — plus breakfast per head if it isn&rsquo;t included.
              </p>
              {flagship && (
                <p>
                  The{" "}
                  <Link href={`/properties/${flagship.slug}`} className="text-forest hover:underline font-medium">
                    {flagshipName}
                  </Link>{" "}
                  {lead(`sleeps up to ${flagship.maxGuests}`)} at{" "}
                  {lead(`${flagshipFrom ? "from " : ""}${flagshipRate} a night`)}
                  {flagshipFrom
                    ? `, covering ${flagship.includedGuests} ${plural(flagship.includedGuests, "guest")}, with a flat per-guest fee beyond that`
                    : ", all guests included in the nightly rate"}
                  . One booking. One total. A kitchen instead of six breakfast bills.
                </p>
              )}
              <p>
                {lead("Two nights beats one.")} Book the night before <em>and</em> the night of. The
                reception ends late, and nobody should be driving home or checking out at noon on
                four hours&rsquo; sleep. The second night is usually the cheapest good decision in
                the whole plan.
              </p>
            </div>
          </section>

          {/* ── The houses ────────────────────────────────────────────────── */}
          {hasInventory ? (
            <section className="mb-16">
              <h2 className={h2}>
                {twoHouses
                  ? "Two houses, five doors apart"
                  : `${numberWord(houses.length).charAt(0).toUpperCase()}${numberWord(houses.length).slice(1)} ${plural(houses.length, "house")} in Lipa City`}
              </h2>
              <div className={`${prose} space-y-4 mb-8`}>
                <p>
                  Here is the part that makes this work for a wedding, and it&rsquo;s worth being
                  precise about.
                </p>
                <p>
                  {twoHouses ? (
                    <>
                      We have <strong className="text-charcoal">two houses in the same village
                      — five doors apart, about a two-minute walk.</strong> Between them they sleep{" "}
                      {lead(`up to ${capacity} people`)}.
                    </>
                  ) : (
                    <>
                      We have {numberWord(houses.length)} {plural(houses.length, "house")} in Lipa
                      City. Between them they sleep {lead(`up to ${capacity} people`)}.
                    </>
                  )}
                </p>
              </div>

              <div className="space-y-6 mb-8">
                {houses.map((house, i) => {
                  const name = shortNames.get(house.largest.slug) ?? house.largest.name;
                  const heading = twoHouses
                    ? i === 0
                      ? `The big house — up to ${house.maxGuests}`
                      : `The second house — up to ${house.maxGuests}`
                    : `${name} — up to ${house.maxGuests}`;
                  return (
                    <div
                      key={house.key}
                      className="bg-white rounded-[16px] p-7 border-l-[3px]"
                      style={{ borderLeftColor: "#C4A862", boxShadow: "0 2px 16px rgba(0,0,0,.05)" }}
                    >
                      <h3 className={h3}>{heading}</h3>
                      <p className={`${prose} mb-4`}>
                        {`${house.largest.bedrooms} ${plural(house.largest.bedrooms, "bedroom")}.`}
                        {i === 0
                          ? " The entourage, or both families the night before."
                          : `${twoHouses ? " A two-minute walk away." : ""} For the couple, the parents, or whoever doesn’t fit in the big house.`}
                        {` ${configurationSentence(house)}`}
                      </p>
                      {taglineOf(house.largest) && (
                        <p className="text-charcoal/55 text-[13.5px] mb-4">
                          {taglineOf(house.largest)}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-x-4 gap-y-2 text-[13.5px]">
                        {house.configurations.map((c) => (
                          <Link
                            key={c.slug}
                            href={`/properties/${c.slug}`}
                            className="text-forest hover:underline font-medium"
                          >
                            {shortNames.get(c.slug) ?? c.name} <span className="text-charcoal/45">· up to {c.maxGuests}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {twoHouses && (
                <p className={`${prose} mb-6`}>
                  {lead("Why two houses beats one big one:")} the bridal party can take over the big
                  house for hair, makeup and the photographer, while the parents and early sleepers
                  have their own roof — and nobody is driving between them. Everyone is still
                  together for breakfast.
                </p>
              )}

              {/* The honest constraint. It is load-bearing: each house takes ONE
                  booking at a time, and the different guest counts are
                  configurations of the same property, not separate units. An
                  earlier draft implied two configurations of one house could be
                  booked together — they cannot. Enforced in code by
                  InventoryGroup / InventoryGroupMember. */}
              <div
                className="rounded-[16px] p-7"
                style={{
                  background: "linear-gradient(135deg, rgba(59,83,35,0.06), rgba(196,168,98,0.08))",
                  border: "1px solid rgba(59,83,35,0.12)",
                }}
              >
                <p className={prose}>
                  <strong className="text-charcoal">One honest constraint.</strong> Each house takes{" "}
                  {lead("one booking at a time")} — the different guest counts you&rsquo;ll see are
                  configurations of the same house, not separate units. So the real question
                  isn&rsquo;t &ldquo;how many listings can I book,&rdquo; it&rsquo;s &ldquo;do{" "}
                  {houses.length === 1 ? "our house" : `${numberWord(houses.length)} houses`} sleeping
                  up to {capacity} between them cover my party?&rdquo; Message us with your headcount
                  and we&rsquo;ll tell you straight whether we fit.
                </p>
              </div>
            </section>
          ) : (
            // DB unreachable. The editorial case above stands on its own; what is
            // withheld is every number, rather than a guess about capacity.
            <section className="mb-16">
              <div
                className="bg-white rounded-[20px] p-10 border-l-[3px]"
                style={{ borderLeftColor: "#C4A862", boxShadow: "0 2px 16px rgba(0,0,0,.05)" }}
              >
                <h2 className="font-serif font-semibold text-charcoal text-[1.25rem] mb-3">
                  Our houses aren&rsquo;t loading right now
                </h2>
                <p className={`${prose} mb-6`}>
                  They&rsquo;re still here — this page just can&rsquo;t reach them at the moment.
                  Tell us your wedding date and how many people need a bed and we&rsquo;ll come back
                  with what fits and what it costs, usually the same day.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/#contact"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] rounded-full text-[13px] font-semibold border-2 border-forest bg-forest text-white hover:bg-[#2d4820] hover:border-[#2d4820] transition-all duration-250"
                  >
                    Message us
                  </Link>
                  <Link
                    href="/properties"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] rounded-full text-[13px] font-semibold border-2 border-forest text-forest hover:bg-forest hover:text-white transition-all duration-250"
                  >
                    See the houses
                  </Link>
                </div>
              </div>
            </section>
          )}

          {/* ── Churches ──────────────────────────────────────────────────── */}
          <section className="mb-16">
            <h2 className={h2}>Three churches within fifteen minutes</h2>
            <div className={`${prose} space-y-4 mb-6`}>
              <p>
                Lipa is called the {lead("Little Rome of the Philippines")} — it has more churches,
                monasteries and shrines than a city this size has any right to, and most weddings
                here are church weddings. That&rsquo;s the wedding you&rsquo;re probably planning,
                and this is where our houses sit relative to it.
              </p>
              <p className="text-[13.5px] text-charcoal/55">
                <i className="fa-solid fa-circle-check text-forest mr-1.5" />
                Verified with the owner, 2026-08-16 — real driving times, not map estimates.
              </p>
            </div>

            <div className="overflow-x-auto rounded-[16px] bg-white mb-6" style={{ boxShadow: "0 2px 16px rgba(0,0,0,.05)" }}>
              <table className="w-full text-[14.5px] border-collapse">
                <thead>
                  <tr className="text-left text-charcoal/50 text-[12px] uppercase tracking-[.1em]">
                    <th scope="col" className="font-semibold px-6 py-4">Where you&rsquo;re getting married</th>
                    <th scope="col" className="font-semibold px-6 py-4">From our houses</th>
                  </tr>
                </thead>
                <tbody>
                  {DRIVE_TIMES.map((row) => (
                    <tr key={row.place} className="border-t border-black/[.05]">
                      <td className="px-6 py-4 text-charcoal/70">
                        <span className={row.emphasis ? "font-semibold text-charcoal" : ""}>{row.place}</span>
                        {row.note && <span className="text-charcoal/45 text-[13px]"> ({row.note})</span>}
                      </td>
                      <td className={`px-6 py-4 ${row.emphasis ? "font-semibold text-charcoal" : "text-charcoal/70"}`}>
                        {row.time}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={`${prose} space-y-4`}>
              <p>
                Three churches inside a quarter of an hour. That is the difference between a morning
                where everyone gets ready together and leaves once, and a morning spent driving
                between hotels.
              </p>
              <p>
                If your venue isn&rsquo;t on this list, ask — we&rsquo;ll tell you honestly how far
                it is, including when the answer is &ldquo;far enough that you&rsquo;d rather stay
                closer to it.&rdquo;
              </p>
              <p>
                {lead("Moving a group.")} Parking is inside the village gates. Tell us the schedule
                and we&rsquo;ll advise on timing and where vehicles can wait.
              </p>
              <p className="text-[14px] text-charcoal/60 border-l-2 border-gold/50 pl-4">
                If you&rsquo;re building the day around Lipa&rsquo;s churches, our{" "}
                <a
                  href="https://blog.haveninlipa.com/lipa-pilgrimage-guide/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-forest hover:underline font-medium"
                >
                  Lipa pilgrimage guide
                </a>{" "}
                covers Carmel and the Cathedral in detail.
              </p>
            </div>
          </section>

          {/* ── Booking ───────────────────────────────────────────────────── */}
          <section className="mb-16">
            <h2 className={h2}>Booking for a wedding</h2>
            <div className={`${prose} space-y-4`}>
              <p>
                {lead("Book early.")} Wedding dates cluster hard — December through February, and
                every long weekend.{" "}
                {flagshipName ? `The ${flagshipName} is the first to go.` : "The largest house is the first to go."}
              </p>
              <p>
                {lead("Holding dates.")} Message us before you book if the venue date isn&rsquo;t
                locked. We&rsquo;d rather hold a conversation than take a booking you have to move.
              </p>
              <p>
                {lead("Payment.")} GCash, BPI InstaPay (no fees), or credit card via Stripe
                ({stripePct}% processing). Full cancellation terms on the{" "}
                <Link href="/faq" className="text-forest hover:underline">FAQ page</Link>.
              </p>
              {/* Both halves of this stay: gatherings ARE permitted with the host
                  informed (house rules), AND the house is not the reception venue. */}
              <p>
                {lead("Gatherings are fine — tell us first.")} A get-together at the house is
                permitted under our house rules as long as you let us know in advance. That covers
                the night-before dinner, the morning-of preparations, and family dropping by. What
                we can&rsquo;t accommodate is an unannounced event, or using the house as the
                reception venue itself — we&rsquo;re where your people stay, not where the wedding
                happens.
              </p>
            </div>
          </section>

          {/* ── FAQ ───────────────────────────────────────────────────────── */}
          <section className="mb-16">
            <h2 className={h2}>Questions from couples</h2>
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
              Tell us your wedding date and how many people need a bed. We&rsquo;ll tell you honestly
              whether we can fit you and what it costs.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/properties"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] rounded-full text-[13px] font-semibold border-2 border-forest bg-forest text-white hover:bg-[#2d4820] hover:border-[#2d4820] transition-all duration-250"
              >
                See the houses <i className="fa-solid fa-arrow-right text-[11px]" />
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
