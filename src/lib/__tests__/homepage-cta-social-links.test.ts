import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * 2026-10-22 follow-up to DEC-030: the homepage CTA block ("Ready to
 * Experience Our Comfort?", src/app/page.tsx) carried its own hardcoded
 * Airbnb icon/link independent of src/lib/social-links.ts. Dropped rather
 * than replaced with an on-site icon — the block already has two on-site
 * CTAs ("Book Your Stay Today" / "Browse Properties") immediately above the
 * icon row, and every other social row in the app (Footer, ContactForm) is
 * SOCIAL_LINKS-only with no on-site entry mixed in.
 */

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) =>
    createElement("a", { href, ...rest }, children),
}));

const propertyCount = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: { property: { count: propertyCount } } }));

vi.mock("@/components/layout/Navbar", () => ({ default: () => null }));
vi.mock("@/components/layout/Footer", () => ({ default: () => null }));
vi.mock("@/components/sections/Hero", () => ({ default: () => null }));
vi.mock("@/components/sections/Properties", () => ({ default: () => null }));
vi.mock("@/components/sections/WhyUs", () => ({ default: () => null }));
vi.mock("@/components/sections/TrustSignals", () => ({ default: () => null }));
vi.mock("@/components/sections/FAQ", () => ({ default: () => null }));
vi.mock("@/components/sections/ContactForm", () => ({ default: () => null }));
vi.mock("@/components/sections/DiscoverLipa", () => ({ default: () => null }));
vi.mock("@/components/sections/NewsletterSignup", () => ({ default: () => null }));
vi.mock("@/components/ui/ScrollReveal", () => ({ default: () => null }));

import Home from "@/app/page";
import { SOCIAL_LINKS } from "@/lib/social-links";

beforeEach(() => {
  propertyCount.mockReset();
  propertyCount.mockResolvedValue(5);
});

describe("homepage CTA block ('Ready to Experience Our Comfort?') — no Airbnb icon (2026-10-22)", () => {
  it("renders exactly the 4 owner-approved social icons and no Airbnb icon/link", async () => {
    const html = renderToStaticMarkup(await Home());

    for (const { name, url, icon } of SOCIAL_LINKS) {
      expect(html).toContain(`aria-label="Haven in Lipa on ${name}"`);
      expect(html).toContain(`href="${url}"`);
      expect(html).toContain(`fa-brands ${icon}`);
    }
    expect(html).not.toContain("fa-airbnb");
    expect(html).not.toContain("airbnb.com");
  });

  it("keeps the on-site 'Book Your Stay Today' and 'Browse Properties' CTAs", async () => {
    const html = renderToStaticMarkup(await Home());

    expect(html).toContain("Book Your Stay Today");
    expect(html).toContain("Browse Properties");
  });
});
