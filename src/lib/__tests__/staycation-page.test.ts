import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * `/staycation` booking-intent SEO copy, pinned without a database (Hostinger blocks DB
 * access from laptops and CI). The listing loaders are mocked; everything else — the
 * metadata builder and the rendered HTML — is the real page.
 *
 * Targets "vacation rental" / "airbnb lipa" framing, distinct from /properties' plain
 * lodging intent (SEO-DEC-012; content/seo/runs/101026/Booking_Intent_SEO_Proposal_101026.md).
 * The title is fixed (no DB-derived count) to stay inside the 60-char rendered budget; the
 * H1 keeps the existing DB-derived count/plural pattern. The description is intentionally
 * UNCHANGED from the pre-existing copy — the proposal's reworded description rendered over
 * the 160-char budget (187 / 213-214 chars), so it was held rather than shipped.
 */

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) =>
    createElement("a", { href, ...rest }, children),
}));
vi.mock("@/components/layout/Navbar", () => ({ default: () => null }));
vi.mock("@/components/layout/Footer", () => ({ default: () => null }));
vi.mock("@/components/ui/ScrollReveal", () => ({ default: () => null }));

const loaders = vi.hoisted(() => ({
  getPublicListings: vi.fn(),
  getPublicListingGroups: vi.fn(),
}));
vi.mock("@/lib/listings", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/listings")>()),
  getPublicListings: loaders.getPublicListings,
  getPublicListingGroups: loaders.getPublicListingGroups,
}));

import StaycationPage, { generateMetadata } from "@/app/staycation/page";

const SUFFIX = " | Haven in Lipa"; // root layout title template

const listing = (id: number, slug: string, name: string, maxGuests: number, price: string) => ({
  id,
  slug,
  name,
  maxGuests,
  includedGuests: maxGuests,
  pricePerNight: price,
  extraGuestFeePerNight: "0",
  housePolicies: "{}",
});

const LISTINGS = [
  listing(1, "cozy-1-bedroom", "Cozy 1-Bedroom", 5, "1800"),
  listing(2, "spacious-2-bedroom", "Spacious 2-Bedroom", 9, "2500"),
  listing(3, "mickey-in-lipa--family-staycation--sleeps-7", "Mickey in Lipa — Family Staycation", 7, "3000"),
  listing(4, "mickey-in-lipa--family-house--sleeps-11", "Mickey in Lipa — Family House", 11, "3800"),
  listing(5, "mickey-in-lipa--full-family-house--sleeps-15", "Mickey in Lipa — Full Family House", 15, "4500"),
];
const MEMBERSHIPS = [
  { propertyId: 1, inventoryGroupId: 34 },
  { propertyId: 2, inventoryGroupId: 34 },
  { propertyId: 3, inventoryGroupId: 38 },
  { propertyId: 4, inventoryGroupId: 38 },
  { propertyId: 5, inventoryGroupId: 38 },
];

function withDb() {
  loaders.getPublicListings.mockResolvedValue(LISTINGS);
  loaders.getPublicListingGroups.mockResolvedValue(MEMBERSHIPS);
}
function withoutDb() {
  loaders.getPublicListings.mockRejectedValue(new Error("P1001"));
  loaders.getPublicListingGroups.mockRejectedValue(new Error("P1001"));
}

beforeEach(() => {
  loaders.getPublicListings.mockReset();
  loaders.getPublicListingGroups.mockReset();
});

describe("/staycation metadata", () => {
  it("title is fixed, names the staycation + vacation-rental intent, within the rendered budget", async () => {
    withDb();
    const title = String((await generateMetadata()).title);

    expect(title).toBe("Lipa City Staycation & Vacation Rental Homes");
    expect((title + SUFFIX).length).toBeLessThanOrEqual(60);
  });

  it("title stays fixed even without a database", async () => {
    withoutDb();
    expect(String((await generateMetadata()).title)).toBe("Lipa City Staycation & Vacation Rental Homes");
  });
});

describe("/staycation H1 and intro", () => {
  it("renders the new H1 with the DB-derived count, and an Airbnb-alternative intro sentence", async () => {
    withDb();
    const html = renderToStaticMarkup(await StaycationPage());
    const h1s = [...html.matchAll(/<h1[^>]*>(.*?)<\/h1>/g)].map((m) => m[1]);

    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toBe("Lipa City Staycation &amp; Vacation Rentals: 5 Private Homes, Booked Direct");
    expect(html).toMatch(/If you.{1,8}d normally search Airbnb for a Lipa getaway/);
    expect(html).toMatch(/direct, with live availability and no service fee/);
  });

  it("falls back to the count-free H1 without a database", async () => {
    withoutDb();
    const html = renderToStaticMarkup(await StaycationPage());
    const h1s = [...html.matchAll(/<h1[^>]*>(.*?)<\/h1>/g)].map((m) => m[1]);

    expect(h1s[0]).toBe("Lipa City Staycation &amp; Vacation Rentals — Private Homes, Booked Direct");
  });
});
