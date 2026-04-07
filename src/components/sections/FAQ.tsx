const faqs = [
  {
    q: "What makes your properties different from a hotel or Airbnb?",
    a: "Our properties are fully furnished homes — not hotel rooms. You get a full kitchen, living area, and the kind of space to relax that a hotel just can't offer. And unlike Airbnb, booking directly with us means no service fees and a more personal experience with your host.",
  },
  {
    q: "Where exactly are your properties located in Lipa City, Batangas?",
    a: "All our properties are in Lipa City, Batangas — a thriving city in the heart of the CALABARZON region, just 2–3 hours from Metro Manila. Whether you're here for the cool highland climate, the cafes, or visiting family, we're conveniently located to get you wherever you're going.",
  },
  {
    q: "How do I book a short-term rental in Lipa City, Batangas?",
    a: "It's simple: browse our listings, pick your dates, and complete a quick booking form. We accept payment via GCash or BPI InstaPay — no credit card required. You'll get a confirmation once your payment is verified.",
  },
  {
    q: "Can I book for just one night?",
    a: "Yes! We welcome short stays. Whether you need a one-night stopover or a week-long retreat, you can select any available dates on the property page and see the total price upfront.",
  },
  {
    q: "Is it safe to book directly instead of through Airbnb?",
    a: "Absolutely. We've hosted over 280 guests and take pride in transparent communication from the moment you inquire. You'll receive a full booking confirmation by email, and your host will be reachable throughout your stay.",
  },
  {
    q: "What amenities are included in your short-term rentals?",
    a: "Amenities vary by property but typically include air conditioning, Wi-Fi, a full kitchen, hot shower, and all the basics you need for a comfortable stay. Check each property's listing for the full amenity list.",
  },
  {
    q: "What is your cancellation policy for bookings?",
    a: "We follow a strict cancellation policy: partial refunds are available for cancellations made 7 or more days before check-in. We also offer one free rebooking if requested at least 14 days before your original check-in date. See full details on the booking page.",
  },
];

export default function FAQ() {
  return (
    <section className="py-24 bg-cream">
      <div className="max-w-5xl mx-auto px-6">

        <div className="flex flex-col items-center text-center reveal mb-16">
          <span className="flex items-center gap-2 text-[11px] font-semibold tracking-[.18em] uppercase mb-3" style={{ color: "#3B5323" }}>
            <span className="block w-7 h-0.5 rounded bg-forest" />
            FAQ
            <span className="block w-7 h-0.5 rounded bg-forest" />
          </span>
          <h2
            className="font-serif font-semibold text-charcoal leading-tight mb-3"
            style={{ fontSize: "clamp(1.8rem,3.5vw,2.6rem)" }}
          >
            Everything You Need to Know
          </h2>
          <p className="text-charcoal/55 text-[15px]">
            Common questions about short-term rentals in Lipa City, Batangas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 reveal">
          {faqs.map((item, i) => (
            <div
              key={i}
              className={`bg-white rounded-[16px] p-7 border-l-[3px] flex flex-col gap-3 transition-transform duration-300 hover:-translate-y-0.5${
                i === faqs.length - 1 ? " md:col-span-2" : ""
              }`}
              style={{
                borderLeftColor: "#C4A862",
                boxShadow: "0 2px 16px rgba(0,0,0,.05)",
              }}
            >
              <span
                className="font-serif font-bold leading-none"
                style={{ color: "#C4A862", fontSize: "clamp(1.5rem, 2.5vw, 2rem)" }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="font-semibold text-[15px] leading-snug" style={{ color: "#3B5323" }}>
                {item.q}
              </h3>
              <p className="text-charcoal/60 text-[14px] leading-[1.8]">{item.a}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
