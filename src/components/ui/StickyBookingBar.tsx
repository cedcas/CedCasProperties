"use client";
import { useEffect, useRef, useState } from "react";

interface Props {
  slug: string;
  name: string;
  pricePerNight: number;
  maxGuests: number;
}

/**
 * Mobile-only persistent booking CTA.
 *
 * Desktop already has a sticky booking card in the right rail, so this is
 * `lg:hidden`. It hides itself in two situations rather than following the page
 * unconditionally:
 *   1. while the real booking widget (#book) is on screen — a duplicate CTA
 *      inches from the actual date picker is noise, not help;
 *   2. while the footer is on screen — the footer's Privacy/Terms links sit
 *      ~20px from the page bottom and would be permanently covered.
 *
 * Sits at z-40, deliberately below the z-50 gallery lightbox and chat panel.
 */
export default function StickyBookingBar({ slug, name, pricePerNight, maxGuests }: Props) {
  const [visible, setVisible] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bookEl = document.getElementById("book");
    const footerEl = document.querySelector("footer");

    // Track each target separately so one leaving the viewport can't clear the
    // other's suppression.
    const state = { book: false, footer: false };

    const apply = () => setVisible(!state.book && !state.footer);

    const observers: IntersectionObserver[] = [];

    const observe = (el: Element | null, key: "book" | "footer") => {
      if (!el) return;
      const io = new IntersectionObserver(
        ([entry]) => {
          state[key] = entry.isIntersecting;
          apply();
        },
        { threshold: 0 }
      );
      io.observe(el);
      observers.push(io);
    };

    observe(bookEl, "book");
    observe(footerEl, "footer");

    // If #book is missing (unpriced property), fall back to showing the bar.
    apply();

    return () => observers.forEach((io) => io.disconnect());
  }, []);

  // Lift the chat FAB (fixed bottom-5 right-5) clear of the bar while it shows.
  // Done via a root attribute + a CSS rule so the two components stay decoupled.
  useEffect(() => {
    const root = document.documentElement;
    if (visible) root.setAttribute("data-sticky-cta", "");
    else root.removeAttribute("data-sticky-cta");
    return () => root.removeAttribute("data-sticky-cta");
  }, [visible]);

  const goToBooking = () => {
    const target = document.getElementById("book");
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    // Focus is moved only here, on an explicit user action — never on page load,
    // where auto-opening the native date picker would be a WCAG 3.2.1 hazard.
    window.setTimeout(() => {
      document.getElementById("bc-checkin")?.focus({ preventScroll: true });
    }, 450);
  };

  return (
    <div
      ref={barRef}
      role="region"
      aria-label="Booking"
      aria-hidden={!visible}
      className={`lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-black/[.08] shadow-[0_-4px_20px_rgba(51,82,56,.10)] transition-transform duration-300 ease-out ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center justify-between gap-2.5 px-4 py-3">
        <div className="min-w-0">
          {/* Below ~360px (iPhone SE and older) the button leaves too little room
              for the full strings, so the least essential words drop out rather
              than the whole line ellipsing mid-word. */}
          <div className="font-bold text-charcoal text-[15px] leading-tight whitespace-nowrap">
            <span className="max-[359px]:hidden">From </span>₱{pricePerNight.toLocaleString()}
            <span className="font-normal text-charcoal/40 text-[11.5px]"> / night</span>
          </div>
          <div className="text-[11px] text-charcoal/45 truncate">
            <span className="max-[359px]:hidden">Sleeps {maxGuests} · </span>no hidden fees
          </div>
        </div>

        <button
          type="button"
          onClick={goToBooking}
          tabIndex={visible ? 0 : -1}
          data-analytics="check_availability"
          data-property={slug}
          aria-label={`Check availability and book ${name}`}
          className="shrink-0 inline-flex items-center justify-center gap-2 px-4 min-h-[48px] rounded-full text-[13.5px] font-semibold text-white whitespace-nowrap transition-transform duration-200 active:scale-[.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-coral"
          style={{
            background: "linear-gradient(135deg,#FF5371,#E03D5A)",
            boxShadow: "0 4px 14px rgba(255,83,113,.40)",
          }}
        >
          <i className="fa-solid fa-calendar-check" aria-hidden="true" />
          Check Availability
        </button>
      </div>
    </div>
  );
}
