import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[#1c1c1c] pt-[72px]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-14 pb-16 border-b border-white/[.08]">

          {/* Brand */}
          <div>
            <div style={{ width: 180, height: 52, overflow: "hidden" }} className="mb-5">
              <Image
                src="/brand-assets/Transparent Logo.png"
                alt="CedCas Properties"
                width={180}
                height={127}
                style={{ marginTop: -33, filter: "brightness(0) invert(1)" }}
              />
            </div>
            <p className="text-[14px] text-white/45 leading-[1.75] max-w-[280px]">
              Thoughtfully managed short-term rentals in Lipa City, Batangas — designed for families, travelers, and professionals.
            </p>
            <span className="inline-block mt-3 text-[12px] italic text-[#C4A862]">&ldquo;Where Comfort Feels Like Home.&rdquo;</span>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-serif font-semibold text-white text-[1rem] mb-5 pb-3 border-b border-white/[.08] relative">
              Quick Links
              <span className="absolute bottom-[-1px] left-0 w-7 h-0.5 bg-[#C4A862] rounded" />
            </h4>
            <ul className="flex flex-col gap-3">
              {[
                ["Our Properties", "#properties"],
                ["About Us",       "#why"],
                ["Amenities",      "#why"],
                ["Location",       "#location"],
                ["Guest Reviews",  "#testimonials"],
                ["Contact Us",     "#contact"],
                ["Book a Stay",    "#cta"],
              ].map(([label, href]) => (
                <li key={label}>
                  <a href={href} className="text-[14px] text-white/45 hover:text-[#C4A862] transition-colors duration-200">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-serif font-semibold text-white text-[1rem] mb-5 pb-3 border-b border-white/[.08] relative">
              Get in Touch
              <span className="absolute bottom-[-1px] left-0 w-7 h-0.5 bg-[#C4A862] rounded" />
            </h4>
            <div className="flex flex-col gap-4 text-[13.5px] text-white/45">
              <div className="flex gap-3 items-start">
                <i className="fa-solid fa-location-dot text-[#C4A862] text-[14px] mt-0.5 flex-shrink-0" />
                <span>Lipa City, Batangas<br />Philippines</span>
              </div>
              <div className="flex gap-3 items-center">
                <i className="fa-solid fa-phone text-[#C4A862] text-[14px] flex-shrink-0" />
                <a href="tel:+639066554415" className="hover:text-[#C4A862] transition-colors">+63 906 655 4415</a>
              </div>
              <div className="flex gap-3 items-center">
                <i className="fa-solid fa-envelope text-[#C4A862] text-[14px] flex-shrink-0" />
                <a href="mailto:customerservice@cedcasproperties.com" className="hover:text-[#C4A862] transition-colors break-all">
                  customerservice@cedcasproperties.com
                </a>
              </div>
            </div>
          </div>

        </div>

        <div className="py-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[12.5px] text-white/25">&copy; {new Date().getFullYear()} CedCas Properties. All rights reserved.</p>
          <div className="flex gap-5">
            {["Privacy Policy", "Terms of Service", "Booking Policy"].map((t) => (
              <a key={t} href="#" className="text-[12.5px] text-white/25 hover:text-white/50 transition-colors duration-200">{t}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
