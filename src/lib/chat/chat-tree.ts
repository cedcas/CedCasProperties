// Phase 0: Rule-based chat tree for Haven chatbot
// Each node has a message from Haven and optional topic buttons for the user to tap.
// Property-specific nodes (properties list, house rules) are injected dynamically
// by get-chat-tree.ts from the database.

export interface ChatNode {
  id: string;
  message: string;              // Haven's response (supports simple markdown: **bold**)
  options?: ChatOption[];       // Buttons shown after the message
  link?: {                      // Optional CTA button
    label: string;
    href: string;
    external?: boolean;         // If true, open in a new tab (for m.me, social, etc.)
  };
}

export interface ChatOption {
  label: string;
  nodeId: string;
}

export const chatTree: Record<string, ChatNode> = {

  // ── Root ──────────────────────────────────────────────
  root: {
    id: "root",
    message:
      "Hi! I'm **Haven**, your virtual assistant for Haven in Lipa. What can I help you with?",
    options: [
      { label: "Our Properties",    nodeId: "properties" },
      { label: "Booking & Payments", nodeId: "booking" },
      { label: "Property Info",     nodeId: "property-info" },
      { label: "Pricing",           nodeId: "pricing" },
      { label: "About Lipa City",   nodeId: "lipa" },
      { label: "Contact Us",        nodeId: "contact" },
      { label: "💬 Talk to a Human", nodeId: "talk-to-human" },
    ],
  },

  // ── Talk to a Human (Messenger handoff) ──────────────
  "talk-to-human": {
    id: "talk-to-human",
    message:
      "Need to talk to a real person? Our team is on Messenger and happy to help. Tap below to start a chat — we usually reply within a few hours.",
    options: [
      { label: "← Back to topics", nodeId: "root" },
    ],
    link: {
      label: "Message us on Facebook",
      href: "https://m.me/haveninlipa",
      external: true,
    },
  },

  // ── Properties (options injected dynamically) ────────
  properties: {
    id: "properties",
    message:
      "We have cozy properties in Lipa City, Batangas! Which one would you like to know about?",
    options: [], // populated by get-chat-tree.ts
    link: { label: "Browse All Properties", href: "/#properties" },
  },

  // ── Booking & Payments ───────────────────────────────
  booking: {
    id: "booking",
    message: "I'd love to help with your booking! What do you need to know?",
    options: [
      { label: "How do I book?",       nodeId: "booking-how" },
      { label: "Payment methods",      nodeId: "booking-payment" },
      { label: "House Rules",          nodeId: "booking-rules" },
      { label: "Discount codes",       nodeId: "booking-discount" },
      { label: "Cancellation policy",  nodeId: "booking-cancel" },
      { label: "← Back to topics",     nodeId: "root" },
    ],
  },
  "booking-how": {
    id: "booking-how",
    message:
      "Booking is easy!\n\n" +
      "1. Pick a property and select your dates\n" +
      "2. Fill in your guest details\n" +
      "3. Choose a payment method — GCash, BPI, or card\n" +
      "4. For QR payments, scan and pay, then tap \"I Paid\"\n" +
      "5. We'll confirm your booking within a few hours!\n\n" +
      "Card payments via Stripe are confirmed instantly.",
    options: [
      { label: "Payment methods",  nodeId: "booking-payment" },
      { label: "← Back to topics", nodeId: "root" },
    ],
    link: { label: "Book Now", href: "/#properties" },
  },
  "booking-payment": {
    id: "booking-payment",
    message:
      "We accept three payment methods:\n\n" +
      "**GCash** — Scan the QR code and pay instantly. No transaction fee.\n\n" +
      "**BPI (InstaPay)** — Scan the QR code to transfer from your BPI account. No transaction fee.\n\n" +
      "**Credit / Debit Card (Stripe)** — Pay online with any major card. A 6% processing fee applies.\n\n" +
      "GCash and BPI bookings are confirmed once we verify your payment. Card payments are confirmed immediately.",
    options: [
      { label: "How do I book?",    nodeId: "booking-how" },
      { label: "Discount codes",    nodeId: "booking-discount" },
      { label: "← Back to topics",  nodeId: "root" },
    ],
  },
  "booking-rules": {
    id: "booking-rules",
    message:
      "Each property has its own house rules that you'll need to agree to before booking. Which property's rules would you like to see?",
    options: [], // populated by get-chat-tree.ts
  },
  "booking-discount": {
    id: "booking-discount",
    message:
      "Got a promo code? You can enter it during checkout and the discount will be applied to your nightly total before any fees.\n\n" +
      "Discounts can be a fixed ₱ amount off or a percentage off your stay.",
    options: [
      { label: "How do I book?",    nodeId: "booking-how" },
      { label: "💬 Talk to a Human", nodeId: "talk-to-human" },
      { label: "← Back to topics",  nodeId: "root" },
    ],
  },
  "booking-cancel": {
    id: "booking-cancel",
    message:
      "Our cancellation policy:\n\n" +
      "• **7+ days before check-in** — Partial refund available\n" +
      "• **Free rebooking** if requested at least 14 days before your original check-in date\n" +
      "• Late cancellations may not be eligible for a refund\n\n" +
      "For full details, see our Terms of Service.",
    options: [
      { label: "Payment methods",   nodeId: "booking-payment" },
      { label: "💬 Talk to a Human", nodeId: "talk-to-human" },
      { label: "← Back to topics",  nodeId: "root" },
    ],
    link: { label: "View Terms of Service", href: "/terms" },
  },

  // ── Property Info ────────────────────────────────────
  "property-info": {
    id: "property-info",
    message: "What would you like to know about our properties?",
    options: [
      { label: "Check-in / check-out times", nodeId: "info-checkin" },
      { label: "Amenities",                  nodeId: "info-amenities" },
      { label: "How many guests?",           nodeId: "info-guests" },
      { label: "Is there parking?",          nodeId: "info-parking" },
      { label: "Is it safe to book direct?", nodeId: "info-safety" },
      { label: "← Back to topics",           nodeId: "root" },
    ],
  },
  "info-checkin": {
    id: "info-checkin",
    message:
      "**Check-in** is at **2:00 PM** and **check-out** is at **12:00 PM (noon)**.\n\n" +
      "Early check-in or late check-out may be available — just let us know when you book and we'll do our best to accommodate!",
    options: [
      { label: "Amenities",         nodeId: "info-amenities" },
      { label: "← Back to topics",  nodeId: "root" },
    ],
  },
  "info-amenities": {
    id: "info-amenities",
    message:
      "Amenities vary by property, but most of our places include:\n\n" +
      "• Air conditioning\n" +
      "• Wi-Fi\n" +
      "• Full kitchen\n" +
      "• Hot shower\n" +
      "• TV\n" +
      "• Clean linens and towels\n\n" +
      "Check each property's listing for the complete amenity list!",
    options: [
      { label: "Our Properties",    nodeId: "properties" },
      { label: "← Back to topics",  nodeId: "root" },
    ],
    link: { label: "Browse Properties", href: "/#properties" },
  },
  "info-guests": {
    id: "info-guests",
    message:
      "Guest capacity depends on the property — our units range from cozy studios to multi-bedroom homes.\n\n" +
      "Check each listing for the maximum number of guests allowed. You can select your group size when booking.",
    options: [
      { label: "Our Properties",    nodeId: "properties" },
      { label: "💬 Talk to a Human", nodeId: "talk-to-human" },
      { label: "← Back to topics",  nodeId: "root" },
    ],
  },
  "info-parking": {
    id: "info-parking",
    message:
      "Parking availability varies by property. Most of our listings include free parking or are in areas with convenient nearby parking.\n\n" +
      "Check the property listing or reach out to us if you need specific parking details!",
    options: [
      { label: "💬 Talk to a Human", nodeId: "talk-to-human" },
      { label: "← Back to topics",  nodeId: "root" },
    ],
  },
  "info-safety": {
    id: "info-safety",
    message:
      "Absolutely! We've hosted over 280 guests and take pride in transparent communication from the moment you inquire.\n\n" +
      "You'll receive a full booking confirmation by email, and your host will be reachable throughout your stay. Booking directly also means no service fees — so you save compared to Airbnb!",
    options: [
      { label: "How do I book?",    nodeId: "booking-how" },
      { label: "💬 Talk to a Human", nodeId: "talk-to-human" },
      { label: "← Back to topics",  nodeId: "root" },
    ],
  },

  // ── Pricing ──────────────────────────────────────────
  pricing: {
    id: "pricing",
    message: "Here's what you'd like to know about pricing:",
    options: [
      { label: "Nightly rates",               nodeId: "pricing-rates" },
      { label: "Weekend vs weekday pricing",   nodeId: "pricing-dynamic" },
      { label: "Save vs Airbnb",               nodeId: "pricing-savings" },
      { label: "← Back to topics",             nodeId: "root" },
    ],
  },
  "pricing-rates": {
    id: "pricing-rates",
    message:
      "Nightly rates vary by property and dates. You'll see the exact nightly breakdown — including any weekend or special-date pricing — when you select your dates on the booking page.\n\n" +
      "All prices are in Philippine Pesos (₱).",
    options: [
      { label: "Weekend vs weekday", nodeId: "pricing-dynamic" },
      { label: "Our Properties",     nodeId: "properties" },
      { label: "← Back to topics",   nodeId: "root" },
    ],
  },
  "pricing-dynamic": {
    id: "pricing-dynamic",
    message:
      "Our pricing adjusts based on the day of the week:\n\n" +
      "• **Weekdays** (Sun–Thu) — standard rate\n" +
      "• **Weekends** (Fri–Sat) — may have a different rate\n" +
      "• **Holidays & special dates** — custom rates may apply\n\n" +
      "You'll always see a full daily breakdown before you pay — no surprises!",
    options: [
      { label: "Nightly rates",      nodeId: "pricing-rates" },
      { label: "← Back to topics",   nodeId: "root" },
    ],
  },
  "pricing-savings": {
    id: "pricing-savings",
    message:
      "By booking directly with us instead of through Airbnb, you skip the service fees that platforms charge — which can be 10–15% on top of the nightly rate.\n\n" +
      "Same property, same host, better price. We'll even show you how much you're saving during checkout!",
    options: [
      { label: "How do I book?",     nodeId: "booking-how" },
      { label: "← Back to topics",   nodeId: "root" },
    ],
    link: { label: "Book Direct & Save", href: "/#properties" },
  },

  // ── About Lipa City ──────────────────────────────────
  lipa: {
    id: "lipa",
    message:
      "Lipa City is one of Batangas' most vibrant cities — just about 1.5 hours from Metro Manila via SLEX and STAR Tollway. What would you like to know?",
    options: [
      { label: "How to get there",    nodeId: "lipa-directions" },
      { label: "Nearby attractions",  nodeId: "lipa-attractions" },
      { label: "Food & restaurants",  nodeId: "lipa-food" },
      { label: "← Back to topics",    nodeId: "root" },
    ],
  },
  "lipa-directions": {
    id: "lipa-directions",
    message:
      "**From Metro Manila:**\n" +
      "Take SLEX → STAR Tollway → Lipa exit. The drive is approximately 84 km and takes about 1 hour 35 minutes in normal traffic.\n\n" +
      "**By bus:**\n" +
      "DLTB and Jam Liner have regular trips from Manila to Lipa via the Batangas route. Look for buses headed to Lipa or Batangas City.",
    options: [
      { label: "Nearby attractions", nodeId: "lipa-attractions" },
      { label: "← Back to topics",   nodeId: "root" },
    ],
  },
  "lipa-attractions": {
    id: "lipa-attractions",
    message:
      "There's plenty to explore near our properties:\n\n" +
      "• **Mt. Maculot** — A popular hiking trail with stunning views\n" +
      "• **Taal Volcano & Lake** — An iconic Philippine landmark just a short drive away\n" +
      "• **The Farm at San Benito** — A luxury wellness resort\n" +
      "• **Coffee farms & plantations** — Batangas is known for its barako coffee\n" +
      "• **Shopping malls** — Robinsons Lipa and SM City Lipa for everyday needs",
    options: [
      { label: "Food & restaurants", nodeId: "lipa-food" },
      { label: "How to get there",   nodeId: "lipa-directions" },
      { label: "← Back to topics",   nodeId: "root" },
    ],
  },
  "lipa-food": {
    id: "lipa-food",
    message:
      "Lipa has a thriving food scene!\n\n" +
      "• **Local Batangas beef tapa** — A must-try regional specialty\n" +
      "• **Third-wave coffee shops** — The city's café culture is booming\n" +
      "• **Restaurants & grills** — From casual eateries to fine dining\n" +
      "• **Bakeries** — Try the local kakanin and pandesal\n\n" +
      "We're happy to share specific recommendations for our favorite spots when you book!",
    options: [
      { label: "Nearby attractions", nodeId: "lipa-attractions" },
      { label: "← Back to topics",   nodeId: "root" },
    ],
  },

  // ── Contact Us ───────────────────────────────────────
  contact: {
    id: "contact",
    message: "We'd love to hear from you! How would you like to reach us?",
    options: [
      { label: "💬 Facebook Messenger", nodeId: "talk-to-human" },
      { label: "Send a message",  nodeId: "contact-form" },
      { label: "Email us",        nodeId: "contact-email" },
      { label: "Social media",    nodeId: "contact-social" },
      { label: "← Back to topics", nodeId: "root" },
    ],
  },
  "contact-form": {
    id: "contact-form",
    message: "You can send us a message using the contact form on our homepage. We'll get back to you as soon as possible!",
    options: [
      { label: "← Back to topics", nodeId: "root" },
    ],
    link: { label: "Go to Contact Form", href: "/#contact" },
  },
  "contact-email": {
    id: "contact-email",
    message:
      "You can email us directly at:\n\n" +
      "**customerservice@haveninlipa.com**\n\n" +
      "We typically respond within a few hours during business hours.",
    options: [
      { label: "Social media",     nodeId: "contact-social" },
      { label: "← Back to topics", nodeId: "root" },
    ],
  },
  "contact-social": {
    id: "contact-social",
    message:
      "Follow us and send a message on any of our social channels:\n\n" +
      "• **Facebook** — facebook.com/haveninlipa\n" +
      "• **Instagram** — @haven_inlipa\n" +
      "• **TikTok** — @haven_inlipa",
    options: [
      { label: "Email us",         nodeId: "contact-email" },
      { label: "← Back to topics", nodeId: "root" },
    ],
  },
};
