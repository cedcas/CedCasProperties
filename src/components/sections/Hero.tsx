export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 80% at 30% 60%, rgba(59,83,35,.55) 0%, transparent 65%), linear-gradient(158deg, #0f1f08 0%, #1e3310 35%, #2d4820 62%, #2C2C2C 100%)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,.07) 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative z-[1] max-w-6xl mx-auto px-6 pt-32 pb-28 flex flex-col items-center text-center">
        <div className="flex items-center gap-2.5 mb-7 reveal">
          <span className="block w-8 h-px bg-[#C4A862]" />
          <span className="text-[#C4A862] text-[11px] font-semibold tracking-[.22em] uppercase">
            Lipa City, Batangas
          </span>
          <span className="block w-8 h-px bg-[#C4A862]" />
        </div>

        <h1
          className="font-serif font-bold text-white leading-[1.12] mb-6 reveal reveal-d1"
          style={{ fontSize: "clamp(2.4rem, 6vw, 4.5rem)" }}
        >
          Your Home Away<br />
          <span style={{ color: "#C4A862" }}>From Home</span> in<br />
          Lipa, Batangas
        </h1>

        <p
          className="text-white/65 leading-[1.75] max-w-[560px] mb-10 reveal reveal-d2"
          style={{ fontSize: "clamp(1rem, 2vw, 1.15rem)" }}
        >
          Discover thoughtfully furnished short-term rentals perfect for families, weekend getaways, and business travelers in the heart of Batangas.
        </p>

        <div className="flex flex-wrap gap-4 justify-center mb-16 reveal reveal-d3">
          <a
            href="#properties"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-[14px] font-semibold text-white"
            style={{
              background: "linear-gradient(135deg,#C4A862,#A8893F)",
              boxShadow: "0 4px 20px rgba(196,168,98,.40)",
            }}
          >
            <i className="fa-solid fa-house" /> Explore Properties
          </a>
          <a
            href="#why"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-[14px] font-semibold text-white border-2 border-white/40 hover:bg-white/10 transition-all duration-300"
          >
            <i className="fa-solid fa-circle-info" /> Learn More
          </a>
        </div>

        {/* Stats bar */}
        <div
          className="reveal reveal-d4 rounded-2xl px-8 py-5 flex flex-wrap justify-center gap-x-10 gap-y-3"
          style={{
            background: "rgba(255,255,255,.07)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,.12)",
          }}
        >
          {[
            { icon: "fa-house",    value: "5+",    label: "Properties" },
            { icon: "fa-users",    value: "200+",  label: "Happy Guests" },
            { icon: "fa-star",     value: "4.9",   label: "Rating" },
            { icon: "fa-location-dot", value: "Lipa City", label: "Batangas" },
          ].map(({ icon, value, label }) => (
            <div key={label} className="flex items-center gap-2.5">
              <i className={`fa-solid ${icon} text-[#C4A862] text-[15px]`} />
              <span className="text-white font-bold text-[15px]">{value}</span>
              <span className="text-white/50 text-[13px]">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 opacity-50">
        <span className="text-white text-[10px] tracking-widest uppercase">Scroll</span>
        <i className="fa-solid fa-chevron-down text-white text-[11px] animate-bounce" />
      </div>
    </section>
  );
}
