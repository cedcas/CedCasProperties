/**
 * Seed long-form SEO / signal content onto the three "Mickey in Lipa"
 * configurations created via the admin panel (which does not yet expose the
 * SEO fields). Brings them to parity with the original two listings seeded by
 * seed-property-seo.ts.
 *
 * Idempotent — safe to re-run. Updates by slug; does not create new properties.
 *
 * IMPORTANT — review before running on prod:
 *   - Review counts/ratings are intentionally OMITTED. These listings have zero
 *     testimonials in the DB, so no aggregateReviewCount/Rating is set (faking
 *     them is dishonest and violates Google review-snippet policy). Once real
 *     guest reviews exist, set the counts here or add testimonials in admin.
 *   - housePolicies, pricingNotes (deposit/cancellation/payment), and the
 *     neighborhood drive-times are MIRRORED from the established business policy
 *     of the original two listings. Verify they hold for the Mickey house in
 *     Bella Vita before running, and adjust any that differ.
 *
 * Run:   npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-property-seo-mickey.ts
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
  // Omitted on purpose for Mickey listings until real reviews exist.
  aggregateReviewCount?: number;
  aggregateReviewRating?: number;
};

// ---------------------------------------------------------------------------
// Shared content — all three are configurations of the SAME themed house, so
// the neighborhood, payment policy, and house policies are identical.
// ---------------------------------------------------------------------------

// Mirrored from the established business policy (same host, same city).
// Verify deposit/cancellation/payment terms before running on prod.
const SHARED_PRICING = (rate: string): PricingNotes => ({
  rate,
  weeklyDiscount: "Weekly stays (7+ nights): ask about the discount when you message",
  monthlyDiscount: "Monthly stays (28+ nights): dedicated rate available — message for terms",
  paymentMethods:
    "GCash, BPI InstaPay (no fees), Stripe / credit card (6% processing fee applies)",
  deposit: "Full payment required at the time of booking to secure your dates",
  cancellation: "100% refund 7+ days out; 50% refund 3–7 days out; no refund inside 3 days",
});

// Bella Vita sits in Lipa City; these are the same city-wide landmarks the
// other two listings reference. Verify drive-times from Bella Vita specifically.
const SHARED_NEIGHBORHOOD: NeighborhoodGroup[] = [
  {
    radiusLabel: "5 to 10 minutes by car",
    places: [
      "SM Lipa (mall, supermarket, pharmacy, food court)",
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
      "Antonio's, Bag of Beans, Sonya's Garden (date-night options)",
    ],
  },
];

const SHARED_POLICY_BASE = {
  checkInTime: "3:00 PM onwards",
  checkOutTime: "12:00 PM (noon)",
  smoking: "No smoking inside the house — outdoor smoking only",
  parties: "No parties or events — this is a residential gated subdivision",
  pets: "No pets allowed at this time",
};

// FAQs shared by all three configurations.
const SHARED_FAQS_TAIL: PropertyFaq[] = [
  {
    question: "How fast is the internet?",
    answer:
      "The house has dedicated 500+ Mbps fiber — built for multiple devices streaming, video calls, and kids on tablets all at once.",
  },
  {
    question: "Is there parking?",
    answer:
      "Yes — secure garage parking inside the gated Bella Vita subdivision. The garage fits one small/compact car. Larger vehicles can park nearby inside the village.",
  },
  {
    question: "Can we cook in the house?",
    answer:
      "Yes. Full kitchen with stove, fridge, and cookware, plus a large dining area. Bring groceries from SM Lipa, five to ten minutes away.",
  },
  {
    question: "What is the extra-guest fee?",
    answer:
      "The nightly rate covers a set number of guests; each guest beyond that is ₱400 per night, up to the maximum this configuration sleeps. The exact bands are listed under pricing above.",
  },
  {
    question: "Why book direct instead of through Airbnb?",
    answer:
      "You save the 14 to 20% Airbnb service fee, talk to a real host instead of a call center, and get more flexible cancellations and check-in.",
  },
];

// ---------------------------------------------------------------------------
// Sleeps 7 — 1-bedroom configuration (₱2,400/night, covers 5, max 7)
// ---------------------------------------------------------------------------
const SLEEPS_7: PropertySeoContent = {
  slug: "mickey-in-lipa--family-staycation--sleeps-7",
  seoTitle:
    "Mickey-Themed Family Staycation House in Lipa City — Sleeps 7 | Haven in Lipa",
  seoDescription:
    "Mickey-themed 1-bedroom staycation house in Bella Vita, Lipa City. Sleeps up to 7, full kitchen, 500+ Mbps fiber, garage parking. From ₱2,400/night. Book direct.",
  tagline: "Mickey-Themed • 500 Mbps Wi-Fi • Sleeps 7 • Garage",
  heroSummary:
    "A private, Mickey-themed staycation house in the gated Bella Vita subdivision, Lipa City, Batangas — the whole house is yours, not a room or a unit. Built for couples, small families, and groups of up to 7. Master bedroom with a queen bed, a day bed and floor mattresses for the kids, a full kitchen, dining area, living room, garage parking, and dedicated 500+ Mbps fiber internet. From ₱2,400 per night (covers 5 guests; ₱400 per extra guest for the 6th and 7th). One hour from Manila via SLEX/STAR Tollway.",
  description:
    "This is the smallest of the three Mickey in Lipa configurations — and the right size for a couple, a small family, or a barkada of up to seven who want a whole house instead of a hotel room.\n\nYou get exclusive access to the entire two-floor house: the master bedroom with a queen bed, a living room with a day bed, floor mattresses for the kids, a full kitchen, a dining area, and a garage. The Mickey-inspired décor and photo-worthy corners are a hit with kids (and the adults who pretend they aren't). The 500+ Mbps fiber means everyone streams and scrolls without the buffering arguments.\n\nIt sits in a quiet, family-friendly gated subdivision close to cafés, restaurants, and the SM Lipa area. For bigger groups, the same house is offered in larger configurations that open up the bunk rooms.",
  bestForSegments: [
    {
      title: "Couples and small families",
      body: "A whole private house for two to five people without the price of a big group rental. Real bedroom with a queen bed, real kitchen, your own front door and garage. Cook breakfast in your pajamas, stream a movie at midnight, let the kids loose in the Mickey-themed living room.",
      internalLinkLabel: "Romantic getaway in Batangas — 2-day plan",
      internalLinkUrl:
        "https://blog.haveninlipa.com/romantic-getaway-batangas-lipa-city/",
    },
    {
      title: "Kids who love a themed stay",
      body: "Mickey-inspired décor, photo-worthy spaces, and a day bed plus floor mattresses make this a fun, low-stress base for a family weekend. SM Lipa is five to ten minutes away for diaper and snack runs, and the gated subdivision is safe to walk around in.",
      internalLinkLabel: "Read our family staycation guide",
      internalLinkUrl:
        "https://blog.haveninlipa.com/family-staycation-lipa-city-batangas/",
    },
    {
      title: "Groups of 6 to 7",
      body: "The rate covers 5 guests and the house comfortably sleeps up to 7 with the day bed and floor mattresses (₱400 per extra guest for the 6th and 7th). For 8 or more, the larger Mickey configurations open up the themed bunk rooms.",
      internalLinkLabel: "See the Sleeps-11 family house",
      internalLinkUrl: "/properties/mickey-in-lipa--family-house--sleeps-11",
    },
  ],
  amenityDetails: [
    {
      section: "Sleeping (sleeps up to 7)",
      items: [
        "Master bedroom — queen bed, AC, freshly made per stay",
        "Living room day bed for additional guests",
        "Floor mattresses available for the kids",
        "Linens, pillows, and blankets provided fresh per stay",
      ],
    },
    {
      section: "Kitchen (full)",
      body: "Cook a full Filipino breakfast without buying a single piece of equipment — bring the groceries, that's it.",
      items: [
        "Stove with ventilation, refrigerator with freezer",
        "Microwave, electric kettle, rice cooker, coffee setup",
        "Pots, pans, cooking utensils, knives, chopping board",
        "Plates, glasses, mugs, cutlery for the group",
        "Dish soap, sponge, dish rack",
        "Separate dining area",
      ],
    },
    {
      section: "Bathrooms",
      items: [
        "Two bathrooms",
        "Shower with water heater",
        "Hand soap and toilet paper provided",
        "Bath towels per guest",
      ],
    },
    {
      section: "Living + entertainment",
      items: [
        "Mickey-inspired décor and photo-worthy spaces",
        "Smart TV in the living area, streaming-ready",
        "500+ Mbps dedicated fiber WiFi",
        "Living room and dining area for family meals and movie nights",
      ],
    },
    {
      section: "Outdoor + village",
      items: [
        "Garage parking for one small/compact car",
        "Gated Bella Vita subdivision with village security",
        "Close to cafés, restaurants, and sari-sari stores",
        "5 to 10 minutes to SM Lipa, restaurants, hospitals",
        "12 to 15 minutes to the Mt. Maculot trailhead",
      ],
    },
  ],
  neighborhoodPlaces: SHARED_NEIGHBORHOOD,
  housePolicies: {
    ...SHARED_POLICY_BASE,
    maxGuests: 7,
    notes: [
      "Rate covers 5 guests; ₱400 per extra guest for the 6th and 7th",
      "Maximum guests strictly enforced for safety",
    ],
  },
  pricingNotes: SHARED_PRICING("₱2,400 per night (covers 5 guests)"),
  propertyFaqs: [
    {
      question: "How many guests can stay?",
      answer:
        "The rate covers 5 guests and the house sleeps up to 7 using the day bed and floor mattresses. Each guest beyond 5 is ₱400 per night (6th and 7th). We cap strictly at 7 for this configuration.",
    },
    {
      question: "Is the whole house ours?",
      answer:
        "Yes — you have exclusive access to the entire two-floor house, including the master bedroom, living room, kitchen, dining area, and garage.",
    },
    ...SHARED_FAQS_TAIL,
  ],
  imageAlts: [
    "Mickey-themed staycation house living room in Bella Vita Lipa City Batangas",
    "Master bedroom with queen bed at Mickey in Lipa themed house Lipa City",
    "Full kitchen and dining area at Mickey in Lipa family staycation house",
    "Mickey-inspired décor and photo wall at Mickey in Lipa Lipa City rental",
    "Bathroom with shower and water heater at Mickey in Lipa themed house",
    "Garage parking inside gated Bella Vita subdivision at Mickey in Lipa Lipa City",
  ],
};

// ---------------------------------------------------------------------------
// Sleeps 11 — 2-bedroom configuration (₱4,200/night, covers 9, max 11)
// ---------------------------------------------------------------------------
const SLEEPS_11: PropertySeoContent = {
  slug: "mickey-in-lipa--family-house--sleeps-11",
  seoTitle:
    "Mickey-Themed Family House in Lipa City — Sleeps 11, Bunk Room | Haven in Lipa",
  seoDescription:
    "Mickey-themed 2-bedroom family house in Bella Vita, Lipa City. Sleeps up to 11, master bedroom plus a kids' bunk room, full kitchen, 500+ Mbps fiber, garage. From ₱4,200/night. Book direct.",
  tagline: "Mickey-Themed • Bunk Room • Sleeps 11 • Garage",
  heroSummary:
    "A Mickey-themed family house in the gated Bella Vita subdivision, Lipa City, Batangas — the whole two-floor house is yours. This 2-bedroom configuration pairs the master bedroom with one of our popular themed bunk rooms, so parents get privacy and the kids get their own fun space. Sleeps up to 11 across the master, the bunk room, and a living-room day bed, with a full kitchen, dining area, garage parking, and dedicated 500+ Mbps fiber. From ₱4,200 per night (covers 9 guests; ₱400 per extra guest for the 10th and 11th). One hour from Manila via SLEX/STAR Tollway.",
  description:
    "Bring the whole family. This 2-bedroom configuration of Mickey in Lipa is designed around how families actually travel — the master bedroom plus a themed bunk room means parents enjoy privacy while the kids get a fun space of their own, all under one roof.\n\nThe entire two-floor house is yours: master bedroom with a queen bed, a themed bunk room for the kids, a living room with a day bed, a full kitchen, a large dining area, and a garage. Mickey-inspired décor throughout, dedicated 500+ Mbps fiber, and a quiet gated subdivision five to ten minutes from SM Lipa.\n\nWhether it's a family reunion, a birthday weekend, or a staycation away from Manila, this setup keeps everyone together for family meals, movie nights, and celebrations. For larger groups, the full-house configuration opens a second bunk room and sleeps up to 15.",
  bestForSegments: [
    {
      title: "Families who want a kids' room",
      body: "Parents take the master bedroom with the queen bed; the kids get their own themed bunk room they'll actually be excited about. Everyone stays together under one roof, with a living room and dining area big enough for family meals and movie nights.",
      internalLinkLabel: "Read our family staycation guide",
      internalLinkUrl:
        "https://blog.haveninlipa.com/family-staycation-lipa-city-batangas/",
    },
    {
      title: "Reunions and birthday weekends",
      body: "Sleeping eleven is comfortable here, not crammed — master bedroom, bunk room, and living-room day bed. Cook as a group, celebrate in the dining area, and base your day trips to Mt. Maculot or Taal from a house that's all yours.",
      internalLinkLabel: "Mt. Maculot hiking guide",
      internalLinkUrl:
        "https://blog.haveninlipa.com/mt-maculot-hiking-guide-2026-cuenca-rockies/",
    },
    {
      title: "Groups of 12 or more",
      body: "The rate covers 9 guests and this configuration sleeps up to 11 (₱400 per extra guest for the 10th and 11th). For a bigger reunion or barkada, the full-house configuration opens a second bunk room and sleeps up to 15.",
      internalLinkLabel: "See the Sleeps-15 full house",
      internalLinkUrl: "/properties/mickey-in-lipa--full-family-house--sleeps-15",
    },
  ],
  amenityDetails: [
    {
      section: "Sleeping (sleeps up to 11)",
      items: [
        "Master bedroom — queen bed, AC, freshly made per stay",
        "Themed bunk room for the kids",
        "Living room day bed for additional guests",
        "Floor mattresses available on request",
        "Linens, pillows, and blankets provided fresh per stay",
      ],
    },
    {
      section: "Kitchen (full)",
      body: "A full kitchen and a large dining area — cook real family meals instead of eating out every night.",
      items: [
        "Stove with ventilation, refrigerator with freezer",
        "Microwave, electric kettle, rice cooker, coffee setup",
        "Pots, pans, cooking utensils, knives, chopping board",
        "Plates, glasses, mugs, cutlery for the group",
        "Dish soap, sponge, dish rack",
        "Large dining area for family meals",
      ],
    },
    {
      section: "Bathrooms",
      items: [
        "Two bathrooms",
        "Shower with water heater",
        "Hand soap and toilet paper provided",
        "Bath towels per guest",
      ],
    },
    {
      section: "Living + entertainment",
      items: [
        "Mickey-inspired décor and photo-worthy spaces",
        "Smart TV in the living area, streaming-ready",
        "500+ Mbps dedicated fiber WiFi",
        "Living room and dining area for family meals and movie nights",
      ],
    },
    {
      section: "Outdoor + village",
      items: [
        "Garage parking for one small/compact car",
        "Gated Bella Vita subdivision with village security",
        "Close to cafés, restaurants, and sari-sari stores",
        "5 to 10 minutes to SM Lipa, restaurants, hospitals",
        "12 to 15 minutes to the Mt. Maculot trailhead",
      ],
    },
  ],
  neighborhoodPlaces: SHARED_NEIGHBORHOOD,
  housePolicies: {
    ...SHARED_POLICY_BASE,
    maxGuests: 11,
    notes: [
      "Rate covers 9 guests; ₱400 per extra guest for the 10th and 11th",
      "Maximum guests strictly enforced for safety",
    ],
  },
  pricingNotes: SHARED_PRICING("₱4,200 per night (covers 9 guests)"),
  propertyFaqs: [
    {
      question: "How many guests can stay?",
      answer:
        "The rate covers 9 guests and this configuration sleeps up to 11 across the master bedroom, the bunk room, and the living-room day bed. Each guest beyond 9 is ₱400 per night (10th and 11th). We cap strictly at 11.",
    },
    {
      question: "Do the kids get their own room?",
      answer:
        "Yes — this 2-bedroom configuration includes the master bedroom for the parents plus a themed bunk room the kids love, so everyone has their own space under one roof.",
    },
    ...SHARED_FAQS_TAIL,
  ],
  imageAlts: [
    "Mickey-themed family house living room in Bella Vita Lipa City Batangas",
    "Master bedroom with queen bed at Mickey in Lipa family house Lipa City",
    "Themed kids bunk room at Mickey in Lipa 2-bedroom family house Lipa City",
    "Full kitchen and large dining area at Mickey in Lipa family house",
    "Bathroom with shower and water heater at Mickey in Lipa family house",
    "Garage parking inside gated Bella Vita subdivision at Mickey in Lipa Lipa City",
  ],
};

// ---------------------------------------------------------------------------
// Sleeps 15 — 3-bedroom full-house configuration (₱7,000/night, covers 13, max 15)
// ---------------------------------------------------------------------------
const SLEEPS_15: PropertySeoContent = {
  slug: "mickey-in-lipa--full-family-house--sleeps-15",
  seoTitle:
    "Mickey-Themed Full Family House in Lipa City — Sleeps 15 | Haven in Lipa",
  seoDescription:
    "Mickey-themed full house in Bella Vita, Lipa City for reunions and barkadas. Sleeps up to 15, master plus two bunk rooms, full kitchen, 500+ Mbps fiber, garage. From ₱7,000/night. Book direct.",
  tagline: "Whole House • Two Bunk Rooms • Sleeps 15 • Garage",
  heroSummary:
    "The full Mickey in Lipa house in the gated Bella Vita subdivision, Lipa City, Batangas — a one-of-a-kind themed home built for reunions, birthdays, barkadas, and multi-generation getaways. The entire two-floor house is yours, sleeping up to 15 across a master bedroom, two themed bunk rooms, a living-room day bed, and floor mattresses. Full kitchen, large dining area, garage parking, and dedicated 500+ Mbps fiber. From ₱7,000 per night (covers 13 guests; ₱400 per extra guest for the 14th and 15th). One hour from Manila via SLEX/STAR Tollway.",
  description:
    "This is the full house — a one-of-a-kind themed home created specifically for families and groups who want to stay together, celebrate together, and make memories together. Unlike a typical Airbnb room, the entire two-floor house is yours.\n\nSleeps up to 15 comfortably: master bedroom with a queen bed (sleeps 2), two themed bunk rooms (sleeps 4 each), a living-room day bed (sleeps 3), and two floor mattresses (sleeps 2). Add a Mickey-inspired gallery wall and décor, a full kitchen, a large dining area, dedicated 500+ Mbps fiber, and secure garage parking inside a family-friendly gated subdivision.\n\nIt's built for the things big groups actually do — reunions, birthday parties, barkada weekends, and multi-generation trips out of Manila. Everyone under one roof, five to ten minutes from SM Lipa and a short drive from Mt. Maculot, Taal, and Tagaytay.",
  bestForSegments: [
    {
      title: "Reunions and multi-generation trips",
      body: "Three sleeping zones — master bedroom, two themed bunk rooms, plus the living room — keep grandparents, parents, and kids each in their own space while everyone stays under one roof. The large dining area and full kitchen are built for the group meals that make reunions worth it.",
      internalLinkLabel: "Read our family staycation guide",
      internalLinkUrl:
        "https://blog.haveninlipa.com/family-staycation-lipa-city-batangas/",
    },
    {
      title: "Barkada weekends, 12 to 15 people",
      body: "Sleeping fifteen here is comfortable, not crammed. Cook as a team, hit Mt. Maculot for sunrise, drive to Taal Heritage Town in the afternoon, and regroup for a karaoke-and-lechon dinner. The kitchen and dining area have the room to actually pull it off.",
      internalLinkLabel: "Mt. Maculot hiking guide",
      internalLinkUrl:
        "https://blog.haveninlipa.com/mt-maculot-hiking-guide-2026-cuenca-rockies/",
    },
    {
      title: "Birthdays and celebrations",
      body: "Themed décor, photo-worthy corners, and a layout built for a crowd make this the spot for a birthday weekend or special occasion. The rate covers 13 guests; the house sleeps up to 15 (₱400 per extra guest for the 14th and 15th). For a smaller group, the same house is offered in 11- and 7-guest configurations.",
      internalLinkLabel: "See the Sleeps-11 family house",
      internalLinkUrl: "/properties/mickey-in-lipa--family-house--sleeps-11",
    },
  ],
  amenityDetails: [
    {
      section: "Sleeping (sleeps up to 15)",
      items: [
        "Master bedroom — queen bed (sleeps 2), AC",
        "Bunk room 1 — sleeps 4",
        "Bunk room 2 — sleeps 4",
        "Living room day bed — sleeps 3",
        "Two floor mattresses — sleeps 2",
        "Linens, pillows, and blankets provided fresh per stay",
      ],
    },
    {
      section: "Kitchen (full)",
      body: "A full kitchen and a large dining area built for cooking and eating as a big group.",
      items: [
        "Stove with ventilation, refrigerator with freezer",
        "Microwave, electric kettle, rice cooker, coffee setup",
        "Pots, pans, cooking utensils, knives, chopping board",
        "Plates, glasses, mugs, cutlery for the group",
        "Dish soap, sponge, dish rack",
        "Large dining area for group meals and celebrations",
      ],
    },
    {
      section: "Bathrooms",
      items: [
        "Two bathrooms",
        "Shower with water heater",
        "Hand soap and toilet paper provided",
        "Bath towels per guest",
      ],
    },
    {
      section: "Living + entertainment",
      items: [
        "Mickey-inspired gallery wall and themed décor",
        "Two themed bunk rooms kids love",
        "Smart TV in the living area, streaming-ready",
        "500+ Mbps dedicated fiber WiFi",
      ],
    },
    {
      section: "Outdoor + village",
      items: [
        "Garage parking for one small/compact car",
        "Gated Bella Vita subdivision with village security",
        "Close to cafés, restaurants, and sari-sari stores",
        "5 to 10 minutes to SM Lipa, restaurants, hospitals",
        "12 to 15 minutes to the Mt. Maculot trailhead",
      ],
    },
  ],
  neighborhoodPlaces: SHARED_NEIGHBORHOOD,
  housePolicies: {
    ...SHARED_POLICY_BASE,
    maxGuests: 15,
    notes: [
      "Rate covers 13 guests; ₱400 per extra guest for the 14th and 15th",
      "Maximum guests strictly enforced for safety",
    ],
  },
  pricingNotes: SHARED_PRICING("₱7,000 per night (covers 13 guests)"),
  propertyFaqs: [
    {
      question: "How many guests can stay?",
      answer:
        "The rate covers 13 guests and the full house sleeps up to 15: master bedroom (2), two bunk rooms (4 each), living-room day bed (3), and two floor mattresses (2). Each guest beyond 13 is ₱400 per night (14th and 15th). We cap strictly at 15.",
    },
    {
      question: "Is this good for a reunion or birthday party?",
      answer:
        "Yes — it was designed for exactly that. Three sleeping zones, a large dining area, and a full kitchen keep a big group together for meals and celebrations. Note this is a residential subdivision, so loud parties or events aren't allowed.",
    },
    ...SHARED_FAQS_TAIL,
  ],
  imageAlts: [
    "Mickey-themed full family house exterior in Bella Vita Lipa City Batangas",
    "Master bedroom with queen bed at Mickey in Lipa full house Lipa City",
    "Themed bunk room sleeps four at Mickey in Lipa full family house",
    "Mickey-inspired gallery wall and living room at Mickey in Lipa Lipa City",
    "Large dining area for group meals at Mickey in Lipa full house",
    "Garage parking inside gated Bella Vita subdivision at Mickey in Lipa Lipa City",
  ],
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
      // aggregateReviewCount / aggregateReviewRating intentionally left as-is
      // (no real reviews yet — do not fabricate review schema).
    },
  });
  console.log(`✓ Updated ${content.slug} (${existing.name})`);
}

async function main() {
  console.log("Seeding Mickey in Lipa SEO content...");
  await applySeo(SLEEPS_7);
  await applySeo(SLEEPS_11);
  await applySeo(SLEEPS_15);
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
