import Image from "next/image";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden">
      {/* Light vacation background */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(160deg, #fffaf7 0%, #fff3ec 40%, #fef8f5 70%, #f0fbf8 100%)",
        }}
      />

      {/* Decorative blobs — soft tropical accents */}
      <div
        className="absolute top-24 right-[8%] w-[420px] h-[420px] rounded-full opacity-25 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #FF5371 0%, transparent 65%)" }}
      />
      <div
        className="absolute bottom-24 left-[4%] w-[340px] h-[340px] rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #8BCDB8 0%, transparent 65%)" }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #FFD580 0%, transparent 65%)" }}
      />

      <div className="relative z-[1] max-w-6xl mx-auto px-6 pt-32 pb-28 flex flex-col items-center text-center">
        {/* Logo — 3× bigger than navbar (navbar: 52px → hero: 156px) */}
        <div className="mb-6 reveal">
          <Image
            src="/brand-assets/Transparent Logo.png"
            alt="HavenInLipa"
            width={320}
            height={320}
            className="h-[312px] w-auto mx-auto"
            style={{ filter: "drop-shadow(0 4px 18px rgba(255,83,113,.18))" }}
            priority
          />
        </div>

        <div className="flex items-center gap-2.5 mb-7 reveal">
          <span className="block w-8 h-px" style={{ background: "#FF5371" }} />
          <span
            className="text-[11px] font-semibold tracking-[.22em] uppercase"
            style={{ color: "#FF5371" }}
          >
            Lipa City, Batangas
          </span>
          <span className="block w-8 h-px" style={{ background: "#FF5371" }} />
        </div>

        <h1
          className="font-serif font-bold leading-[1.12] mb-6 reveal reveal-d1"
          style={{ fontSize: "clamp(2.4rem, 6vw, 4.5rem)", color: "#2C2C2C" }}
        >
          Stay in Style,<br />
          <span style={{ color: "#FF5371" }}>Live in Comfort</span><br />
          in Lipa, Batangas
        </h1>

        <p
          className="leading-[1.75] max-w-[560px] mb-10 reveal reveal-d2"
          style={{
            fontSize: "clamp(1rem, 2vw, 1.15rem)",
            color: "rgba(44,44,44,0.65)",
          }}
        >
          Upscale short-term rentals thoughtfully designed for families, weekend
          escapes, and business stays — right in the heart of Batangas.
        </p>

        <div className="flex flex-wrap gap-4 justify-center mb-16 reveal reveal-d3">
          <a
            href="#properties"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-[14px] font-semibold text-white"
            style={{
              background: "linear-gradient(135deg,#FF5371,#E03D5A)",
              boxShadow: "0 4px 20px rgba(255,83,113,.35)",
            }}
          >
            <i className="fa-solid fa-house" /> Explore Properties
          </a>
          <a
            href="#why"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-[14px] font-semibold transition-all duration-300 hover:bg-black/5"
            style={{
              color: "#2C2C2C",
              border: "2px solid rgba(44,44,44,0.22)",
            }}
          >
            <i className="fa-solid fa-circle-info" /> Learn More
          </a>
        </div>

        {/* Stats bar */}
        <div
          className="reveal reveal-d4 rounded-2xl px-8 py-5 flex flex-wrap justify-center gap-x-10 gap-y-3"
          style={{
            background: "rgba(255,255,255,0.80)",
            backdropFilter: "blur(14px)",
            border: "1px solid rgba(255,83,113,0.14)",
            boxShadow: "0 4px 30px rgba(0,0,0,0.07)",
          }}
        >
          {[
            { icon: "fa-house",        value: "5+",       label: "Properties"   },
            { icon: "fa-users",        value: "200+",     label: "Happy Guests" },
            { icon: "fa-star",         value: "4.9",      label: "Rating"       },
            { icon: "fa-location-dot", value: "Lipa City",label: "Batangas"     },
          ].map(({ icon, value, label }) => (
            <div key={label} className="flex items-center gap-2.5">
              <i
                className={`fa-solid ${icon} text-[15px]`}
                style={{ color: "#FF5371" }}
              />
              <span className="font-bold text-[15px]" style={{ color: "#2C2C2C" }}>
                {value}
              </span>
              <span className="text-[13px]" style={{ color: "rgba(44,44,44,0.50)" }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 opacity-40">
        <span
          className="text-[10px] tracking-widest uppercase"
          style={{ color: "#2C2C2C" }}
        >
          Scroll
        </span>
        <i
          className="fa-solid fa-chevron-down text-[11px] animate-bounce"
          style={{ color: "#2C2C2C" }}
        />
      </div>
    </section>
  );
}
