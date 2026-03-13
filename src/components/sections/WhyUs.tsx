const features = [
  { icon: "fa-sparkles",   title: "Spotlessly Clean",   desc: "Every property is deep-cleaned before each guest arrives. We maintain high cleanliness standards so you can relax from the moment you walk in." },
  { icon: "fa-handshake",  title: "Locally Managed",    desc: "We're based right here in Lipa City. Our team responds quickly, knows the area, and treats every guest like a neighbor." },
  { icon: "fa-couch",      title: "Fully Furnished",    desc: "Beds, linens, cookware, toiletries — everything is ready so you can arrive with just your bags and feel at home instantly." },
  { icon: "fa-calendar-check", title: "Instant Booking", desc: "Book your dates online in minutes. No lengthy back-and-forth — just pick your property, confirm, and you're all set." },
];

export default function WhyUs() {
  return (
    <section id="why" className="py-28 bg-white">
      <div className="max-w-6xl mx-auto px-6">

        <div className="flex flex-col items-center text-center reveal mb-14">
          <span className="flex items-center gap-2 text-forest text-[11px] font-semibold tracking-[.18em] uppercase mb-3">
            <span className="block w-7 h-0.5 bg-[#C4A862] rounded" />
            Our Difference
            <span className="block w-7 h-0.5 bg-[#C4A862] rounded" />
          </span>
          <h2 className="font-serif font-semibold text-charcoal leading-tight mb-3" style={{ fontSize: "clamp(2rem,4vw,3rem)" }}>
            Why Choose Us?
          </h2>
          <div className="gold-line mx-auto" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-7">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`bg-cream rounded-[20px] p-8 border-t-[3px] border-[#3B5323] shadow-[0_4px_24px_rgba(44,44,44,.06)] hover:shadow-[0_12px_40px_rgba(44,44,44,.12)] hover:-translate-y-1 transition-all duration-300 reveal reveal-d${i + 1}`}
            >
              <div className="w-12 h-12 rounded-[14px] bg-[#3B5323]/10 flex items-center justify-center mb-5">
                <i className={`fa-solid ${f.icon} text-[#3B5323] text-[20px]`} />
              </div>
              <h3 className="font-serif font-semibold text-charcoal text-[1.1rem] mb-2">{f.title}</h3>
              <p className="text-charcoal/55 text-[13.5px] leading-[1.7]">{f.desc}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
