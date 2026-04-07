export default function TrustSignals() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-6">

        <div className="flex flex-col items-center text-center reveal mb-12">
          <span className="flex items-center gap-2 text-[11px] font-semibold tracking-[.18em] uppercase mb-3" style={{ color: "#FF5371" }}>
            <span className="block w-7 h-0.5 rounded" style={{ background: "#FF5371" }} />
            Guest Reviews
            <span className="block w-7 h-0.5 rounded" style={{ background: "#FF5371" }} />
          </span>
          <h2
            className="font-serif font-semibold text-charcoal leading-tight mb-4"
            style={{ fontSize: "clamp(1.8rem,3.5vw,2.6rem)" }}
          >
            Guests Love Staying Here
          </h2>
          <p
            className="max-w-[560px] leading-[1.75]"
            style={{ fontSize: "clamp(0.95rem,1.8vw,1.05rem)", color: "rgba(44,44,44,0.60)" }}
          >
            Hundreds of guests have made our properties their home away from home in Lipa City —
            for weekend getaways, family reunions, remote work retreats, and everything in between.
          </p>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap justify-center gap-6 mb-4 reveal">
          {[
            { icon: "fa-star",    value: "4.9",  label: "Average Rating",       color: "#FF5371" },
            { icon: "fa-users",   value: "250+", label: "Happy Guests Hosted",  color: "#3B5323" },
            { icon: "fa-comment", value: "180+", label: "Five-Star Reviews",    color: "#C4A862" },
          ].map(({ icon, value, label, color }) => (
            <div
              key={label}
              className="flex flex-col items-center justify-center rounded-2xl px-10 py-7 min-w-[180px]"
              style={{
                background: "rgba(249,245,238,0.80)",
                border: "1px solid rgba(196,168,98,0.18)",
                boxShadow: "0 4px 20px rgba(0,0,0,.05)",
              }}
            >
              <i className={`fa-solid ${icon} text-[22px] mb-3`} style={{ color }} />
              <span className="font-bold text-charcoal text-[2rem] leading-none mb-1">{value}</span>
              <span className="text-[12px] text-charcoal/50 tracking-wide text-center">{label}</span>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
