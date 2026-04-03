"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const links = [
  { label: "Home",       href: "/" },
  { label: "Properties", href: "/#properties" },
  { label: "About",      href: "/#why" },
  { label: "Location",   href: "/#location" },
  { label: "Contact",    href: "/#contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled]   = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      id="navbar"
      ref={navRef}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "scrolled" : ""
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-[72px] flex items-center justify-end">
        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-7">
          {links.map((l) => (
            <a key={l.label} href={l.href} className="nav-link">
              {l.label}
            </a>
          ))}
          <Link
            href="/#properties"
            className="ml-2 px-5 py-2 rounded-full text-[13px] font-semibold text-white"
            style={{ background: "linear-gradient(135deg,#FF5371,#E03D5A)", boxShadow: "0 4px 14px rgba(255,83,113,.40)" }}
          >
            Book Now
          </Link>
        </div>

        {/* Hamburger */}
        <button
          className="md:hidden flex flex-col gap-[5px] p-2"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="block w-5 h-0.5 rounded transition-all duration-200"
              style={{ background: "#2C2C2C" }}
            />
          ))}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-offwhite border-t border-black/[.06] px-6 py-4 flex flex-col gap-3">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-[14px] font-semibold text-charcoal py-1"
              onClick={() => setMenuOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <Link
            href="/#properties"
            className="mt-1 text-center px-5 py-2.5 rounded-full text-[13px] font-semibold text-white"
            style={{ background: "linear-gradient(135deg,#FF5371,#E03D5A)" }}
            onClick={() => setMenuOpen(false)}
          >
            Book Now
          </Link>
        </div>
      )}
    </nav>
  );
}
