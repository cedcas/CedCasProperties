import { describe, it, expect, vi, afterEach } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) =>
    createElement("a", { href, ...rest }, children),
}));
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => createElement("img", { src, alt }),
}));

import Footer from "@/components/layout/Footer";
import ContactForm from "@/components/sections/ContactForm";
import { SOCIAL_LINKS } from "@/lib/social-links";
import { BUSINESS_SAME_AS } from "@/lib/local-business-schema";

/**
 * Cedric's decision, 2026-10-22 (DEC-030): a site-wide footer social row
 * (Facebook, Instagram, TikTok, YouTube — no Airbnb) on haveninlipa.com, and
 * the Airbnb icon removed from the homepage "Find Us Online" row
 * (ContactForm.tsx). Follow-up the same day: the homepage CTA block
 * (src/app/page.tsx) and the about-page Person `sameAs` also drop their
 * remaining hardcoded Airbnb link (see HIL_COMPLETION_LOG.md).
 */
async function renderFooter(): Promise<string> {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  const el = await Footer();
  return renderToStaticMarkup(el);
}

function renderContactForm(): string {
  return renderToStaticMarkup(createElement(ContactForm));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Footer social row (site-wide, 2026-10-22 decision)", () => {
  it("renders all 4 owner-approved networks with target/rel/aria-label and no Airbnb", async () => {
    const html = await renderFooter();
    for (const { name, url, icon } of SOCIAL_LINKS) {
      const re = new RegExp(
        `<a href="${url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*aria-label="Haven in Lipa on ${name}"[^>]*>`
      );
      const tag = html.match(re)?.[0];
      expect(tag, `expected an anchor for ${name}`).toBeDefined();
      expect(tag).toContain('target="_blank"');
      expect(tag).toContain('rel="noopener noreferrer"');
      expect(html).toContain(`fa-brands ${icon}`);
    }
    expect(html).not.toContain("fa-airbnb");
    expect(html).not.toContain("airbnb.com");
  });

  it("appears exactly once per network (no duplicate social row)", async () => {
    const html = await renderFooter();
    for (const { name } of SOCIAL_LINKS) {
      const count = html.split(`Haven in Lipa on ${name}`).length - 1;
      expect(count).toBe(1);
    }
  });
});

describe("Homepage 'Find Us Online' row — Airbnb removed (ContactForm.tsx)", () => {
  it("renders the 4 owner-approved networks and no Airbnb icon or link", () => {
    const html = renderContactForm();
    expect(html).toContain("Find Us Online");
    for (const { name, icon } of SOCIAL_LINKS) {
      expect(html).toContain(`aria-label="Haven in Lipa on ${name}"`);
      expect(html).toContain(`fa-brands ${icon}`);
    }
    expect(html).not.toContain("fa-airbnb");
    expect(html).not.toContain("airbnb.com");
  });
});

describe("LodgingBusiness sameAs — no individual Airbnb listing link (2026-10-22 decision)", () => {
  it("BUSINESS_SAME_AS contains exactly the 4 owner-approved URLs, no Airbnb", () => {
    expect(BUSINESS_SAME_AS).toEqual(SOCIAL_LINKS.map((s) => s.url));
    expect(BUSINESS_SAME_AS.some((u) => u.includes("airbnb"))).toBe(false);
  });
});
