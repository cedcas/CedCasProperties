export type Faq = {
  q: string;
  a: string;
};

/**
 * Single source of truth for site-wide FAQ content.
 * The homepage shows the first `HOMEPAGE_FAQ_LIMIT` items as a teaser; the
 * standalone /faq page renders all of them and emits the FAQPage JSON-LD.
 */
export const HOMEPAGE_FAQ_LIMIT = 5;

export const faqs: Faq[] = [
  {
    q: "What makes Haven in Lipa different from a hotel or Airbnb?",
    a: "Our properties are fully furnished homes — not hotel rooms. You get a full kitchen, living area, and the kind of space to relax that a hotel just can't offer. And unlike Airbnb, booking directly with us means no service fees and a more personal experience with your host.",
  },
  {
    q: "Where exactly are your properties located in Lipa City, Batangas?",
    a: "All our properties are inside quiet, gated villages in Lipa City, Batangas — a thriving city in the heart of CALABARZON, about 1 hour from Manila via SLEX/STAR Tollway. We're a short drive to SM Lipa, Casa Marikit, the Mt. Maculot trailhead, and the major hospitals.",
  },
  {
    q: "How do I book a short-term rental on Haven in Lipa?",
    a: "Browse our properties, pick your dates, and complete the booking form. You can pay via GCash, BPI InstaPay (no fees), or credit card via Stripe (6% processing fee). You'll get a confirmation email once payment is verified.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept GCash and BPI InstaPay (no fees on either) and major credit cards via Stripe (6% processing fee applies). Booking direct with any method still saves you the 15–20% Airbnb service fee.",
  },
  {
    q: "What is your cancellation policy?",
    a: "100% refund for cancellations 7 or more days before check-in. 50% refund 3–7 days out. No refund inside 3 days. We also offer one free rebooking when requested at least 14 days before your original check-in date.",
  },
  {
    q: "Can I book for just one night?",
    a: "Yes. We welcome short stays — one-night stopovers, weekend getaways, and longer retreats. Available dates and the total price are shown upfront on each property page.",
  },
  {
    q: "Is the WiFi fast enough for remote work?",
    a: "Yes. The 2BR runs on 400 Mbps fiber and the 1BR runs on a dedicated business-grade fiber line. Multiple Netflix streams, video calls, and kids' tablets work simultaneously without buffering.",
  },
  {
    q: "Is parking safe?",
    a: "Parking is inside the gated village with 24-hour security at every property. We've never had a parking incident.",
  },
  {
    q: "Are your properties good for families with kids?",
    a: "Yes. The 2BR is built for families: two private bedrooms, full kitchen for snacks and milk on demand, baby-safe living area, SM Lipa five minutes away for diapers and supplies, and hospitals within 10 minutes. Note: the unit has a loft accessed by an internal staircase, so if you're traveling with crawlers or very young toddlers, message us about the layout and we'll advise.",
  },
  {
    q: "Can I bring pets?",
    a: "We don't allow pets in our units at this time. Sorry — we know this is a dealbreaker for some travelers.",
  },
  {
    q: "Why book direct with Haven in Lipa instead of Airbnb?",
    a: "Three reasons: you save the 14–20% Airbnb service fee, you talk to the host directly instead of a call center, and our cancellation and check-in policies are more flexible. Same property, same beds, same WiFi — just a better deal for both of us.",
  },
  {
    q: "Is it safe to book directly?",
    a: "Yes. We've hosted over 280 guests, hold 3 years of Airbnb Superhost status, and operate from a verified Philippine business address. You'll receive a full booking confirmation by email and your host is reachable throughout your stay via SMS, WhatsApp, or Messenger.",
  },
  {
    q: "What are your check-in and check-out times?",
    a: "Check-in is from 2:00 PM and check-out is by 12:00 PM (noon). Earlier check-in or later check-out can sometimes be arranged depending on the bookings on either side — just message us.",
  },
  {
    q: "Can I bring a larger group? What's the maximum?",
    a: "The 2BR sleeps up to 9 across two bedrooms plus a sofa bed; the 1BR sleeps up to 4. Both caps are strictly enforced for safety and insurance. For groups larger than 9, message us — we may be able to coordinate both units.",
  },
];
