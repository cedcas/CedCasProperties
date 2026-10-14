import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * The homepage's "Our Rentals" section used to link only to /staycation — /properties had
 * no direct homepage link at all (confirmed by grep in the booking-intent SEO proposal,
 * content/seo/runs/101026/Booking_Intent_SEO_Proposal_101026.md). This pins that both money
 * pages now get a homepage-level link.
 */

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) =>
    createElement("a", { href, ...rest }, children),
}));
vi.mock("@/components/ui/PropertyCard", () => ({ default: () => null }));

const findMany = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: { property: { findMany } } }));

import Properties from "@/components/sections/Properties";

beforeEach(() => {
  findMany.mockReset();
});

describe("homepage Properties section", () => {
  it("links to both /properties and /staycation", async () => {
    findMany.mockResolvedValue([]);
    const html = renderToStaticMarkup(await Properties());

    expect(html).toContain('href="/properties"');
    expect(html).toContain('href="/staycation"');
  });

  it("links to both pages even when the DB is unreachable", async () => {
    findMany.mockRejectedValue(new Error("P1001"));
    const html = renderToStaticMarkup(await Properties());

    expect(html).toContain('href="/properties"');
    expect(html).toContain('href="/staycation"');
  });
});
