// A contextual internal link layered onto a FAQ answer at render time. The
// answer string (`a`) stays plain text so the FAQPage JSON-LD `text` value
// remains link-free; `links` only affect the rendered HTML. Each entry links
// the FIRST occurrence of `phrase` in the answer to `href`.
export type FaqLink = {
  phrase: string;
  href: string;
};

export type Faq = {
  q: string;
  a: string;
  links?: FaqLink[];
};

/**
 * Single source of truth for site-wide FAQ content.
 * The homepage shows the first `HOMEPAGE_FAQ_LIMIT` items as a teaser; the
 * standalone /faq page renders all of them and emits the FAQPage JSON-LD.
 */
export const HOMEPAGE_FAQ_LIMIT = 5;

export const faqs: Faq[] = [
  // ── Choosing a Property ──────────────────────────────────────────────
  {
    q: "What's the difference between your two properties?",
    a: "Haven in Lipa has two separate houses inside the same gated Bella Vita subdivision in Lipa City — about a two-minute walk apart. B34 is our original property with two configurations: a Cozy 1-Bedroom (sleeps up to 5) and a Spacious 2-Bedroom (sleeps up to 9). B38, \"Mickey in Lipa,\" is a Mickey-themed house with three configurations depending on how many rooms you need: Sleeps 7, Sleeps 11, or the Full House (sleeps up to 15). Each house takes one booking at a time, so if you need to compare, see \"Which unit should I book for my group size?\" below.",
    links: [{ phrase: "two separate houses", href: "/#properties" }],
  },
  {
    q: "How many guests can each unit accommodate?",
    a: "The Cozy 1-Bedroom (B34) sleeps up to 5, the Spacious 2-Bedroom (B34) sleeps up to 9, Mickey in Lipa Sleeps 7 (B38) sleeps up to 7, Mickey in Lipa Sleeps 11 (B38) sleeps up to 11, and the Mickey in Lipa Full House (B38) sleeps up to 15. These caps are strictly enforced for safety. B34 and B38 are two separate houses, so capacities don't combine within a house — but you can book both houses on the same dates for a larger group, up to 24 guests total across both.",
    links: [
      { phrase: "Cozy 1-Bedroom (B34)", href: "/properties/cozy-1-bedroom#book" },
      { phrase: "Spacious 2-Bedroom (B34)", href: "/properties/spacious-2-bedroom#book" },
      { phrase: "Mickey in Lipa Sleeps 7 (B38)", href: "/properties/mickey-in-lipa--family-staycation--sleeps-7#book" },
      { phrase: "Mickey in Lipa Sleeps 11 (B38)", href: "/properties/mickey-in-lipa--family-house--sleeps-11#book" },
      { phrase: "Mickey in Lipa Full House (B38)", href: "/properties/mickey-in-lipa--full-family-house--sleeps-15#book" },
    ],
  },
  {
    q: "Which unit should I book for my group size?",
    a: "For 1–2 guests or a couple or solo traveler, choose the Cozy 1-Bedroom. For a family or barkada trip of up to 9, choose the Spacious 2-Bedroom. For a small group of up to 7, choose Mickey Sleeps 7. For a medium group or two-generation family of up to 11, choose Mickey Sleeps 11. For a big group — reunion, birthday, or barkada weekend — of up to 15, choose the Mickey Full House. Still not sure, or need both houses at once? Message us and we'll help you figure out the best fit.",
    links: [{ phrase: "Message us", href: "/#contact" }],
  },
  {
    q: "Can I book both houses for a wedding, reunion, or big event?",
    a: "Yes. B34 and B38 are two separate houses in the same village, about a two-minute walk apart, and can be booked together — up to 24 guests across both houses on the same dates. This setup works well for wedding parties, multi-generation family trips, and reunions where everyone wants to stay close but not in one building. See our dedicated page for group and wedding-party accommodation.",
    links: [{ phrase: "dedicated page for group and wedding-party accommodation", href: "/weddings-accommodation" }],
  },
  {
    q: "Are your properties good for families with kids?",
    a: "Yes. The Spacious 2-Bedroom (B34) is family-built: two private bedrooms, a full kitchen, and a baby-safe living area — note it has a loft reached by an internal staircase, so if you're traveling with crawlers or very young toddlers, message us about the layout first. Mickey in Lipa (B38) was designed specifically for families and groups, with themed bunk rooms that kids love. SM Lipa is 5–10 minutes away for supplies, and hospitals are within 10 minutes.",
    links: [{ phrase: "Spacious 2-Bedroom (B34)", href: "/properties/spacious-2-bedroom" }],
  },

  // ── Location and Getting There ───────────────────────────────────────
  {
    q: "Where is Haven in Lipa located?",
    a: "Both of our houses are inside Bella Vita, a quiet, gated subdivision in Lipa City, Batangas — about one hour from Manila via SLEX and the STAR Tollway. B34 and B38 (\"Mickey in Lipa\") are separate houses within the same subdivision, about a two-minute walk apart.",
    links: [{ phrase: "Both of our houses", href: "/#properties" }],
  },
  {
    q: "How far is Haven in Lipa from Manila and nearby landmarks?",
    a: "About one hour from Manila via SLEX and the STAR Tollway. From the property, it's roughly 5–10 minutes to SM Lipa for groceries and shopping, and under 10 minutes to major hospitals (Mary Mediatrix, Lipa Medix). Casa Marikit is a short drive away.",
  },

  // ── Booking and Payment ──────────────────────────────────────────────
  {
    q: "How do I book directly?",
    a: "Browse our properties, pick your dates, and complete the booking form. Choose GCash, BPI InstaPay, or Credit/Debit Card, and you'll get a confirmation email once your payment is verified. Full payment is required at the time of booking to secure your dates.",
    links: [{ phrase: "Browse our properties", href: "/#properties" }],
  },
  {
    q: "What payment methods do you accept, and are there fees?",
    a: "We accept GCash and BPI InstaPay — both fee-free — and Credit/Debit Card, which carries a 6% processing fee. Booking direct with any method still saves you the service fee OTAs like Airbnb charge on top.",
  },
  {
    q: "How do I know my reservation is confirmed?",
    a: "If you pay by GCash or BPI, your booking is pending until we manually verify the payment. You'll get a confirmation email once that's done, usually within a few minutes. If you pay by Credit/Debit Card, your booking is confirmed immediately.",
  },
  {
    q: "Is it safe to book directly on your website?",
    a: "Yes. We've hosted over 280 guests and hold 3 years of Airbnb Superhost status, and we operate from a verified Philippine business address. Card payments are processed securely — we never see or store your card details. You'll get a full booking confirmation by email, and your host is reachable throughout your stay.",
    links: [{ phrase: "Philippine business address", href: "/about" }],
  },

  // ── Check-In and Checkout ────────────────────────────────────────────
  {
    q: "What are the check-in and checkout times?",
    a: "Check-in for B34 properties—Cozy 1-Bedroom and Spacious 2-Bedroom—is from 2:00 PM. Check-in for B38 \"Mickey in Lipa\" properties—Sleeps 7, Sleeps 11, and Sleeps 15—is from 3:00 PM. Checkout is at 12:00 PM (noon) for all properties.",
  },
  {
    q: "Can I check in early or check out late?",
    a: "Early check-in and late checkout may be available, but they're never guaranteed — they depend on our cleaning schedule and whether another guest is arriving or departing the same day. When approved, early check-in or late checkout is charged at ₱200 per hour. Just message us as early as possible, ideally at the time of booking, and we'll let you know if it's possible for your dates.",
  },
  {
    q: "How and when will I get my check-in instructions?",
    a: "We'll send everything you need for your arrival by email and/or FB Messenger. Email arrival details go out automatically as your check-in date gets closer; we may also follow up on Messenger.",
  },

  // ── Amenities and House Rules ────────────────────────────────────────
  {
    q: "What amenities are included?",
    a: "Every property includes a full kitchen, fast WiFi, air conditioning, and parking inside the gated village. B34 units add Netflix and dedicated fiber (up to 340 Mbps); B38 (\"Mickey in Lipa\") adds fiber up to 520 Mbps and garage parking. Full amenity lists are on each property page.",
    links: [{ phrase: "each property page", href: "/#properties" }],
  },
  {
    q: "Is parking available and safe?",
    a: "B34 has a garage that can accommodate a full-size SUV, such as a Toyota Fortuner. B38 has a garage suited for a small car, such as a Toyota Vios. Both locations also have ample street parking directly in front of the properties.",
  },
  {
    q: "Is the WiFi fast enough for remote work?",
    a: "B34 has fiber internet with speeds up to 340 Mbps, while B38 has fiber internet with speeds up to 520 Mbps. Both locations also have a backup internet connection. Multiple video calls, streaming, and devices at once are no problem at any of our properties.",
  },
  {
    q: "Are pets allowed?",
    a: "We don't allow pets in any of our units at this time. Sorry — we know this is a dealbreaker for some travelers.",
  },
  {
    q: "Are parties, events, or extra visitors allowed?",
    a: "No — all of our properties are in residential subdivisions, not event venues, so parties and events aren't allowed. If you'd like extra day guests beyond your booked headcount, please message us in advance so we can check whether that works for your dates.",
  },

  // ── Changes, Cancellations, and Refunds ──────────────────────────────
  {
    q: "What is your cancellation and refund policy?",
    a: "100% refund for cancellations 7 or more days before check-in. 50% refund 3–7 days out. No refund inside 3 days or for no-shows. To cancel, email customerservice@haveninlipa.com or call +63 906 655 4415.",
    links: [{ phrase: "cancellations", href: "/terms" }],
  },

  // ── Direct Booking and Guest Support ─────────────────────────────────
  {
    q: "Why book direct with Haven in Lipa instead of Airbnb?",
    a: "Three reasons: you skip the 14–20% Airbnb service fee, you talk to your host directly instead of a call center, and our cancellation and check-in policies are more flexible. Same houses, same beds, same WiFi — just a better deal for both of us. Our properties are fully furnished homes, not hotel rooms — you get a full kitchen and real living space a hotel can't offer.",
    links: [{ phrase: "14–20% Airbnb service fee", href: "/staycation" }],
  },
  {
    q: "Can I book for just one night?",
    a: "Yes. We welcome short stays — one-night stopovers, weekend getaways, and longer retreats. Available dates and the total price are shown upfront on each property page.",
    links: [{ phrase: "each property page", href: "/#properties" }],
  },
  {
    q: "How can I contact Haven in Lipa before booking?",
    a: "Message us on Facebook (facebook.com/haveninlipa), email customerservice@haveninlipa.com, or call/text +63 906 655 4415. You can also use the chat widget on this site for quick answers, any time.",
    links: [{ phrase: "Message us on Facebook", href: "/#contact" }],
  },
];
