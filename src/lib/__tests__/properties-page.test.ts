import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * `/properties` booking-intent SEO copy, pinned without a database (Hostinger blocks DB
 * access from laptops and CI). The listing loader is mocked; everything else — the
 * metadata builder and the rendered HTML — is the real page.
 *
 * Targets "apartment for rent lipa city" (content/seo/runs/101026/Booking_Intent_SEO_Proposal_101026.md).
 * Title is fixed (no DB-derived count) to stay inside the 60-char rendered budget; the count
 * stays in the description only, DEC-007-gated on count === 5 with a number-free fallback.
 */

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) =>
    createElement("a", { href, ...rest }, children),
}));
vi.mock("@/components/layout/Navbar", () => ({ default: () => null }));
vi.mock("@/components/layout/Footer", () => ({ default: () => null }));
vi.mock("@/components/ui/ScrollReveal", () => ({ default: () => null }));
vi.mock("@/components/ui/PropertyCard", () => ({ default: () => null }));

const loaders = vi.hoisted(() => ({
  getPublicListingCount: vi.fn(),
  getPublicListings: vi.fn(),
}));
vi.mock("@/lib/listings", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/listings")>()),
  getPublicListingCount: loaders.getPublicListingCount,
  getPublicListings: loaders.getPublicListings,
}));

import PropertiesIndexPage, { generateMetadata } from "@/app/properties/page";

const SUFFIX = " | Haven in Lipa"; // root layout title template

const listing = (id: number, slug: string, name: string, maxGuests: number) => ({
  id,
  slug,
  name,
  maxGuests,
  includedGuests: maxGuests,
  pricePerNight: "5000",
  extraGuestFeePerNight: "0",
  tagline: null,
  bestForSegments: null,
});

const LISTINGS = [
  listing(1, "cozy-1-bedroom", "Cozy 1-Bedroom", 5),
  listing(2, "spacious-2-bedroom", "Spacious 2-Bedroom", 9),
  listing(3, "mickey-in-lipa--family-staycation--sleeps-7", "Mickey in Lipa — Family Staycation", 7),
  listing(4, "mickey-in-lipa--family-house--sleeps-11", "Mickey in Lipa — Family House", 11),
  listing(5, "mickey-in-lipa--full-family-house--sleeps-15", "Mickey in Lipa — Full Family House", 15),
];

function withFive() {
  loaders.getPublicListingCount.mockResolvedValue(5);
  loaders.getPublicListings.mockResolvedValue(LISTINGS);
}
function withoutDb() {
  loaders.getPublicListingCount.mockRejectedValue(new Error("P1001"));
  loaders.getPublicListings.mockRejectedValue(new Error("P1001"));
}

beforeEach(() => {
  loaders.getPublicListingCount.mockReset();
  loaders.getPublicListings.mockReset();
});

describe("/properties metadata", () => {
  it("title is fixed, names 'apartment', and fits the rendered budget", async () => {
    withFive();
    const meta = await generateMetadata();
    const title = String(meta.title);

    expect(title).toBe("Apartments for Rent in Lipa City, Batangas");
    expect((title + SUFFIX).length).toBeLessThanOrEqual(60);
  });

  it("description names the count when count === 5, within the 160-char budget", async () => {
    withFive();
    const meta = await generateMetadata();
    const description = String(meta.description);

    expect(description).toMatch(/apartments and transient houses/i);
    expect(description).toMatch(/Airbnb alternative/i);
    expect(description.length).toBeLessThanOrEqual(160);
  });

  it("falls back to a number-free description when the DB is unreachable, within budget", async () => {
    withoutDb();
    const meta = await generateMetadata();
    const description = String(meta.description);

    expect(description).toMatch(/Apartments and transient houses/);
    expect(description).toMatch(/alternative to searching Airbnb/);
    expect(description.length).toBeLessThanOrEqual(160);
    expect(description).not.toMatch(/\bfive\b/i);
  });
});

describe("/properties H1 and intro", () => {
  it("renders the new H1 and an Airbnb-alternative intro naming the live count", async () => {
    withFive();
    const html = renderToStaticMarkup(await PropertiesIndexPage());
    const h1s = [...html.matchAll(/<h1[^>]*>(.*?)<\/h1>/g)].map((m) => m[1]);

    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toBe("Apartments &amp; Transient Houses for Rent in Lipa City");
    expect(html).toMatch(/entire-unit apartment or transient house for rent/);
    expect(html).toMatch(/direct-booking alternative/);
    expect(html).toMatch(/five of them/i);
  });
});
