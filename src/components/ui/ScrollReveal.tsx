"use client";
import { useEffect } from "react";

export default function ScrollReveal() {
  useEffect(() => {
    // Mark anything currently in (or near) the viewport as visible BEFORE
    // adding `js-loaded` — otherwise the new CSS rule would briefly hide
    // above-the-fold elements before the observer can re-show them.
    const viewportH = window.innerHeight;
    document.querySelectorAll<HTMLElement>(".reveal").forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < viewportH && rect.bottom > 0) {
        el.classList.add("visible");
      }
    });

    document.documentElement.classList.add("js-loaded");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    document
      .querySelectorAll(".reveal:not(.visible)")
      .forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return null;
}
