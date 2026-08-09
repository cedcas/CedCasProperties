"use client";
import { useEffect } from "react";
import { track } from "@/lib/analytics";

/**
 * One document-level listener that turns `data-analytics` markup into GA4 events.
 *
 *   <button data-analytics="book_click" data-property={slug}>
 *
 * Mounted once in the root layout, so any CTA anywhere on the site becomes
 * measurable by adding the two attributes — no per-component wiring, and no
 * risk of an onClick handler being refactored away from its tracking call.
 *
 * Listens on the CAPTURE phase: several of these CTAs call preventDefault or
 * stopPropagation in their own handlers (StickyBookingBar scrolls instead of
 * navigating), which would swallow a bubble-phase listener.
 */
export default function AnalyticsClickTracker() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      // closest() so clicks landing on a child icon/span still resolve to the CTA.
      const el = target.closest<HTMLElement>("[data-analytics]");
      const event = el?.dataset.analytics;
      if (!event) return;
      const property = el?.dataset.property;
      track(event, property ? { property } : {});
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
