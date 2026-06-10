/**
 * Seed long-form SEO content onto the two existing properties from the
 * May 8 2026 SEO audit deliverables (HavenInLipa_Full_SEO_Strategy_Report_May8.docx,
 * 050826/2br-property-page-rewrite.md and 050826/1br-property-page-rewrite.md).
 *
 * Idempotent — safe to re-run. Updates by slug; does not create new properties.
 *
 * Run:   npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-property-seo.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type BestForSegment = {
  title: string;
  body: string;
  internalLinkLabel?: string;
  internalLinkUrl?: string;
};

type AmenitySection = {
  section: string;
  body?: string;
  items: string[];
};

type NeighborhoodGroup = {
  radiusLabel: string;
  places: string[];
};

type HousePolicies = {
  checkInTime: string;
  checkOutTime: string;
  maxGuests: number;
  smoking: string;
  parties: string;
  pets: string;
  notes?: string[];
};

type PricingNotes = {
  rate: string;
  weeklyDiscount: string;
  monthlyDiscount: string;
  paymentMethods: string;
  deposit: string;
  cancellation: string;
};

type PropertyFaq = { question: string; answer: string };

type PropertySeoContent = {
  slug: string;
  seoTitle: string;
  seoDescription: string;
  tagline: string;
  heroSummary: string;
  description: string;
  bestForSegments: BestForSegment[];
  amenityDetails: AmenitySection[];
  neighborhoodPlaces: NeighborhoodGroup[];
  housePolicies: HousePolicies;
  pricingNotes: PricingNotes;
  propertyFaqs: PropertyFaq[];
  imageAlts: string[];
  aggregateReviewCount: number;
  aggregateReviewRating: number;
};

const TWO_BR: PropertySeoContent = {
  slug: "spacious-2-bedroom",
  seoTitle:
    "Spacious 2BR Vacation Rental in Lipa City, Batangas — Sleeps 9 | Haven in Lipa",
  seoDescription:
    "Family-friendly 2-bedroom vacation rental in Lipa City. Sleeps 9, full kitchen, fast WiFi, parking. ₱2,800/night. Book direct and save 15–20%.",
  tagline: "Netflix • Wi-Fi • 9 Pax • Parking",
  heroSummary:
    "A two-bedroom vacation rental in a quiet gated village in Lipa City, Batangas — built for families, barkadas, and group trips. Sleeps up to 9 across two private bedrooms, a full kitchen for cooking real meals, fast WiFi, Netflix, and parking inside the village. From ₱2,800 per night. Twenty-one verified guest reviews and counting. One hour from Manila via SLEX/STAR Tollway.",
  description:
    "This isn't a hotel suite and it isn't a generic Airbnb. It's a real two-bedroom unit in a quiet residential village — the kind of place a Manila family rents for a weekend, leaves with everyone in a better mood, and books again.\n\nTwo private bedrooms mean parents and kids (or two couples on a barkada trip) get real sleep. The full kitchen means breakfast happens on your schedule and you don't burn ₱2,000 every morning at a hotel restaurant. The 400 Mbps fiber WiFi means everyone streams Netflix on different devices without the buffering arguments. Parking is inside the village gates, so the car is safe.\n\nLipa City sits at about 300 meters elevation — cool air, quiet streets, real food. The unit is a short drive to SM Lipa, Casa Marikit, and the Mt. Maculot trailhead. Most guests don't go back to Manila on Sunday wishing they had a third night. They just rebook for the next month.",
  bestForSegments: [
    {
      title: "Families with kids",
      body: "Two bedrooms, one kitchen, one parking slot. Bunk the kids together, parents in their own room. The living area gives the toddler somewhere to play that isn't your bedroom. Stove and fridge mean snacks and milk on demand. SM Lipa for diaper runs is 5 minutes away. Mary Mediatrix and Lipa Medix hospitals are within 10 minutes for peace of mind.",
      internalLinkLabel: "Read our family staycation guide",
      internalLinkUrl:
        "https://blog.haveninlipa.com/family-staycation-lipa-city-batangas/",
    },
    {
      title: "Barkada trips, 6 to 9 people",
      body: "Sleeping nine in this unit is comfortable, not crammed. The configuration handles a group split across the two bedrooms plus the living room (sofa bed). Cook breakfast as a team, hit Mt. Maculot for sunrise, drive to Taal Heritage Town in the afternoon, regroup at the unit for a karaoke-and-lechon dinner. The kitchen has the cookware to actually pull this off.",
      internalLinkLabel: "Mt. Maculot hiking guide",
      internalLinkUrl:
        "https://blog.haveninlipa.com/mt-maculot-hiking-guide-2026-cuenca-rockies/",
    },
    {
      title: "Work trips with extended family",
      body: "Some guests use this unit for hybrid trips — one couple sleeps in the master, in-laws or extended family in the second bedroom. The two private bedrooms make it work without anyone resenting the arrangement on Sunday morning.",
    },
  ],
  amenityDetails: [
    {
      section: "Bedrooms (sleeps 9)",
      items: [
        "Master bedroom — queen bed, blackout curtains, AC, ample closet space",
        "Second bedroom — double bed plus a single bed (or bunk configuration depending on dates), AC, closet",
        "Living room — fold-out sofa bed for additional guests",
        "All linens, pillows, blankets provided fresh per stay",
        "Bedside lamps and outlets for phone charging on both sides of each bed",
      ],
    },
    {
      section: "Kitchen (full)",
      body: "You can cook a full Filipino breakfast (tapsilog, longsilog, hot sinigang) without buying a single piece of equipment. Bring the groceries, that's it.",
      items: [
        "Stove (gas) with ventilation hood",
        "Refrigerator with freezer",
        "Microwave, electric kettle, rice cooker, drip coffee maker",
        "Pots, pans, cooking utensils, knives, chopping board",
        "Plates, glasses, mugs, cutlery for 9",
        "Dish soap, sponge, dish rack",
        "Dining table that seats 6 (additional folding chairs available)",
      ],
    },
    {
      section: "Bathroom",
      items: [
        "Shower with consistent water heater",
        "Hand soap and toilet paper provided",
        "Hairdryer available on request",
        "Bath towels per guest",
      ],
    },
    {
      section: "Living + work area",
      items: [
        "Smart TV with Netflix Premium included",
        "400 Mbps fiber WiFi (speed-tested by guests, real number)",
        "Sofa, coffee table, floor space for kids or yoga",
        "Dining table doubles as a work desk if needed",
      ],
    },
    {
      section: "Outdoor + village",
      items: [
        "Parking slot inside the gated village (car is safe)",
        "24-hour village security",
        "Walking distance to a sari-sari store and a small bakery",
        "5 to 10 minutes to SM Lipa, restaurants, hospitals",
        "12 to 15 minutes to Mt. Maculot trailhead",
      ],
    },
  ],
  neighborhoodPlaces: [
    {
      radiusLabel: "5 minutes by car",
      places: [
        "SM Lipa (mall, grocery, pharmacy, food court)",
        "Casa Marikit Restaurant",
        "Cafe de Lipa",
        "Mary Mediatrix Medical Center",
        "Lipa Medix Medical Center",
      ],
    },
    {
      radiusLabel: "10 to 15 minutes by car",
      places: [
        "San Sebastian Cathedral",
        "Beegee's Lomi House",
        "Carmelite Monastery",
        "Mt. Maculot trailhead (Cuenca jump-off)",
      ],
    },
    {
      radiusLabel: "30 to 45 minutes by car",
      places: [
        "Tagaytay Ridge restaurants and viewpoints",
        "Taal Heritage Town",
        "Taal Lake boat tour jump-off (Talisay)",
      ],
    },
    {
      radiusLabel: "Walking distance",
      places: ["Sari-sari store", "Small bakery", "Tricycle stop for short rides"],
    },
  ],
  housePolicies: {
    checkInTime: "2:00 PM onwards",
    checkOutTime: "12:00 PM (noon)",
    maxGuests: 9,
    smoking: "No smoking inside the unit — designated outdoor smoking area",
    parties: "No parties or events — this is a residential village, not an event venue",
    pets: "No pets allowed at this time",
    notes: ["Maximum guests strictly enforced for safety and insurance"],
  },
  pricingNotes: {
    rate: "₱2,800 per night",
    weeklyDiscount: "Weekly stays (7+ nights): ask about the discount when you message",
    monthlyDiscount: "Monthly stays: dedicated rate available — message for terms",
    paymentMethods:
      "GCash, BPI InstaPay (no fees), Stripe / credit card (6% processing fee applies)",
    deposit: "50% to secure the booking; balance on or before check-in",
    cancellation: "100% refund 7+ days out; 50% refund 3–7 days out; no refund inside 3 days",
  },
  propertyFaqs: [
    {
      question: "Is the unit good for families with toddlers?",
      answer:
        "Yes — full kitchen for snacks and milk on demand, baby-safe living area, SM Lipa five minutes away for diapers and supplies, and hospitals within 10 minutes. The unit has a loft accessed by an internal staircase, so for crawlers and very young toddlers we recommend a stair gate. Message us before booking and we'll advise based on your dates.",
    },
    {
      question: "How many guests can sleep here comfortably?",
      answer:
        "Nine guests fit comfortably across the two bedrooms plus the sofa bed. We strictly cap at 9 — beyond that the unit is uncomfortable and we won't accept the booking.",
    },
    {
      question: "Is parking safe?",
      answer:
        "Parking is inside a gated village with 24-hour security. We've never had a parking incident.",
    },
    {
      question: "How fast is the WiFi really?",
      answer:
        "Speed-tested at 400 Mbps. Multiple Netflix streams, video calls, kids' tablets — all simultaneously, no buffering.",
    },
    {
      question: "Can we cook in the unit?",
      answer:
        "Yes. Full stove, full kitchen, all cookware. Bring groceries from SM Lipa or the public market.",
    },
    {
      question: "Is the village quiet at night?",
      answer:
        "Yes. The village is residential and well-mannered — by 9 to 10 PM most evenings, you'll hear crickets, not parties.",
    },
    {
      question: "What if our plans change?",
      answer:
        "Booking direct, our cancellation policy is more flexible than most platforms. 100% refund 7+ days out, 50% inside 7 days, no refund inside 3 days. Special situations? Message Melody.",
    },
    {
      question: "Why book direct instead of through Airbnb?",
      answer:
        "You save the 14 to 20% Airbnb service fee, talk to a real host instead of a call center, and get more flexible cancellations and check-in.",
    },
  ],
  imageAlts: [
    "Spacious 2BR vacation rental living room in Lipa City Batangas with sofa Netflix TV",
    "Master bedroom with queen bed and AC at HavenInLipa 2BR rental Lipa City",
    "Second bedroom with double and single bed at HavenInLipa 2BR rental Lipa",
    "Full kitchen with stove fridge and cookware at HavenInLipa 2BR Lipa City rental",
    "Dining table for 6 at HavenInLipa 2BR Lipa City vacation rental",
    "Bathroom with shower and water heater at HavenInLipa 2BR Lipa City rental",
    "HavenInLipa 2BR vacation rental exterior in gated Lipa City Batangas village",
    "Inside-village parking at HavenInLipa 2BR rental Lipa City Batangas",
  ],
  aggregateReviewCount: 21,
  aggregateReviewRating: 5.0,
};

const ONE_BR: PropertySeoContent = {
  slug: "cozy-1-bedroom",
  seoTitle:
    "Cozy 1BR Vacation Rental in Lipa City, Batangas — 400 Mbps WiFi | Haven in Lipa",
  seoDescription:
    "Cozy 1-bedroom vacation rental in Lipa City. Sleeps 5, full kitchen, 400 Mbps WiFi, Netflix, solar power. ₱2,000/night. Book direct, save 15–20%.",
  tagline: "Solar Power • Netflix • Wi-Fi • 5 Pax",
  heroSummary:
    "A one-bedroom vacation rental in a quiet gated village in Lipa City, Batangas — designed for couples, solo digital nomads, and small group stays. Sleeps up to 5, full kitchen, 400 Mbps fiber WiFi (speed-tested), Netflix Premium, solar-powered backup, and parking inside the village. From ₱2,000 per night. Thirty-two verified guest reviews. One hour from Manila via SLEX/STAR Tollway.",
  description:
    "This is the unit guests rebook. Couples on weekend getaways, remote workers logging Manila hours from a quieter address, single travelers who want a real apartment instead of a hotel room. The 1BR has a way of getting under people's skin — they come for one weekend and start asking about monthly rates.\n\nThe bedroom is genuinely restful. The kitchen is fully equipped, not symbolic. The WiFi runs at 400 Mbps tested speeds, and during brownouts the solar backup keeps essentials running. The village is gated, quiet by 9 PM, and a five-minute drive from SM Lipa for groceries.\n\nIt's not a luxury suite. It's a comfortable, well-equipped private home. That turns out to be exactly what most people actually want.",
  bestForSegments: [
    {
      title: "Couples on a weekend getaway",
      body: "The 1BR is the right size for two people who want privacy without a hotel's hospitality theatre. Real bedroom, real kitchen, real living room, your own front door. Cook breakfast in your pajamas. Stream a movie at midnight. Sleep in.",
      internalLinkLabel: "Romantic getaway in Batangas — 2-day plan",
      internalLinkUrl:
        "https://blog.haveninlipa.com/romantic-getaway-batangas-lipa-city/",
    },
    {
      title: "Remote workers and digital nomads",
      body: "If you're tired of Manila WiFi, BGC office overhead, or just need a quiet place to grind for a week or a month — this is the unit built for it. 400 Mbps fiber, dedicated workspace at the dining table, fast water heater for morning showers, no roommates, no co-working noise.",
      internalLinkLabel: "Remote work staycation guide",
      internalLinkUrl:
        "https://blog.haveninlipa.com/work-from-lipa-the-affordable-remote-work-staycation-near-manila/",
    },
    {
      title: "Small groups (up to 5)",
      body: "Three friends on a long weekend, a small family with one or two kids, a couple plus parents visiting from the province. The unit sleeps 5 across the bedroom (queen bed) and the living room (sofa bed and an extra single bed). For groups of 6+, the 2BR is the better fit.",
      internalLinkLabel: "See the Spacious 2BR",
      internalLinkUrl: "/properties/spacious-2-bedroom",
    },
  ],
  amenityDetails: [
    {
      section: "Bedroom (sleeps 2 in primary bed)",
      items: [
        "Queen-size bed, freshly made per stay",
        "Blackout curtains for late sleepers and shift workers",
        "AC, fan",
        "Bedside lamps and outlets on both sides",
        "Closet with hangers",
      ],
    },
    {
      section: "Living + sleeping area extension (additional 3 guests)",
      items: [
        "Sofa bed (sleeps 2 comfortably)",
        "Single roll-out bed available on request (sleeps 1 more)",
        "Coffee table, smart TV with Netflix Premium",
        "Floor space for yoga mat or kid play",
      ],
    },
    {
      section: "Kitchen (full)",
      items: [
        "Stove (gas) with ventilation",
        "Refrigerator with freezer",
        "Microwave, electric kettle, drip coffee maker, rice cooker",
        "Pots, pans, knives, chopping board, cooking utensils",
        "Plates, glasses, mugs, cutlery for 5",
        "Dish soap, sponge, dish rack",
        "Compact dining table (seats 4)",
      ],
    },
    {
      section: "Bathroom",
      items: [
        "Shower with consistent water heater",
        "Hand soap, toilet paper provided",
        "Bath towels for each guest",
        "Hairdryer on request",
      ],
    },
    {
      section: "Work + entertainment",
      items: [
        "400 Mbps fiber WiFi (speed-tested, tested again, still 400)",
        "Netflix Premium (4K, multiple devices)",
        "Smart TV in the living area",
        "Solar power backup — essentials stay on during a brownout",
      ],
    },
    {
      section: "Outdoor + village",
      items: [
        "Parking inside the gated village",
        "24-hour security",
        "Walking distance to a sari-sari, small bakery, tricycle stop",
        "5 minutes by car to SM Lipa, restaurants, hospitals",
        "12 to 15 minutes to Mt. Maculot trailhead",
      ],
    },
  ],
  neighborhoodPlaces: [
    {
      radiusLabel: "5 minutes by car",
      places: [
        "SM Lipa (mall, supermarket, pharmacy, food court)",
        "Casa Marikit Restaurant",
        "Cafe de Lipa",
        "Mary Mediatrix Medical Center",
      ],
    },
    {
      radiusLabel: "10 to 15 minutes by car",
      places: [
        "San Sebastian Cathedral",
        "Beegee's Lomi House",
        "Carmelite Monastery",
        "Mt. Maculot trailhead",
      ],
    },
    {
      radiusLabel: "30 to 45 minutes by car",
      places: [
        "Tagaytay Ridge restaurants",
        "Taal Heritage Town",
        "Antonio's, Bag of Beans, Sonya's Garden (date-night options)",
      ],
    },
  ],
  housePolicies: {
    checkInTime: "2:00 PM onwards",
    checkOutTime: "12:00 PM (noon)",
    maxGuests: 5,
    smoking: "No smoking inside the unit — outdoor smoking only",
    parties: "No parties or events — residential village",
    pets: "No pets allowed at this time",
    notes: ["Maximum guests strictly enforced"],
  },
  pricingNotes: {
    rate: "₱2,000 per night",
    weeklyDiscount: "Weekly stays (7+ nights): ask about the discount when you message",
    monthlyDiscount:
      "Monthly stays (28+ nights): dedicated remote-work rate available — message for terms",
    paymentMethods:
      "GCash, BPI InstaPay (no fees), Stripe / credit card (6% processing fee applies)",
    deposit: "50% to secure the booking; balance on or before check-in",
    cancellation: "100% refund 7+ days out; 50% refund 3–7 days out; no refund inside 3 days",
  },
  propertyFaqs: [
    {
      question: "Is the WiFi actually 400 Mbps?",
      answer:
        "Yes — speed-tested by guests on multiple devices. Designed for remote work and multi-device streaming.",
    },
    {
      question: "Is there a workspace?",
      answer:
        "The dining table doubles as a workspace and is comfortable for a laptop and external monitor if you bring one. Outlets are positioned within reach.",
    },
    {
      question: "How quiet is it for video calls?",
      answer:
        "Very. The village is residential, the unit has no shared walls in active use, and there's no construction or business noise nearby. Confirmed by remote workers who've taken full days of calls without issue.",
    },
    {
      question: "What if there's a brownout?",
      answer:
        "The unit has solar power backup that keeps essentials (WiFi, lights, phone charging) running during typical brownouts. Air conditioning is on the main grid.",
    },
    {
      question: "Is the bed comfortable?",
      answer:
        "Queen mattress, recently checked. If you need an extra firm or extra soft pillow, message us before check-in and we'll set it up.",
    },
    {
      question: "Can two couples share the unit?",
      answer:
        "The unit can sleep four (queen bed + sofa bed) plus a fifth on a roll-out. Two couples is workable for a short stay, but most couples prefer the privacy of separate rooms — for that, the 2BR is the better fit.",
    },
    {
      question: "Can I do a long stay (1 week+ or 1 month+)?",
      answer:
        "Yes. We have weekly and monthly rates for extended stays — message us for availability and pricing.",
    },
    {
      question: "Why book direct instead of through Airbnb?",
      answer:
        "You save the 14 to 20% Airbnb service fee, talk to a real host instead of a call center, and get more flexible cancellations and check-in.",
    },
  ],
  imageAlts: [
    "Cozy 1BR vacation rental living room in Lipa City Batangas with smart TV and Netflix",
    "Bedroom with queen bed at HavenInLipa Cozy 1BR rental Lipa City",
    "Full kitchen at HavenInLipa Cozy 1BR vacation rental in Lipa City Batangas",
    "Workspace at HavenInLipa Cozy 1BR with 400 Mbps WiFi remote work setup",
    "Bathroom with shower and water heater at HavenInLipa Cozy 1BR Lipa City",
    "HavenInLipa Cozy 1BR vacation rental exterior in Lipa City gated village",
    "Solar power backup at HavenInLipa Cozy 1BR Lipa City vacation rental",
  ],
  aggregateReviewCount: 32,
  aggregateReviewRating: 5.0,
};

async function applySeo(content: PropertySeoContent) {
  const existing = await prisma.property.findUnique({
    where: { slug: content.slug },
    select: { id: true, name: true },
  });
  if (!existing) {
    console.warn(`! Skipping ${content.slug} — no Property row found.`);
    return;
  }
  await prisma.property.update({
    where: { slug: content.slug },
    data: {
      description: content.description,
      seoTitle: content.seoTitle,
      seoDescription: content.seoDescription,
      tagline: content.tagline,
      heroSummary: content.heroSummary,
      bestForSegments: JSON.stringify(content.bestForSegments),
      amenityDetails: JSON.stringify(content.amenityDetails),
      neighborhoodPlaces: JSON.stringify(content.neighborhoodPlaces),
      housePolicies: JSON.stringify(content.housePolicies),
      pricingNotes: JSON.stringify(content.pricingNotes),
      propertyFaqs: JSON.stringify(content.propertyFaqs),
      imageAlts: JSON.stringify(content.imageAlts),
      aggregateReviewCount: content.aggregateReviewCount,
      aggregateReviewRating: content.aggregateReviewRating,
    },
  });
  console.log(`✓ Updated ${content.slug} (${existing.name})`);
}

async function main() {
  console.log("Seeding property SEO content from May 8 audit deliverables...");
  await applySeo(TWO_BR);
  await applySeo(ONE_BR);
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
