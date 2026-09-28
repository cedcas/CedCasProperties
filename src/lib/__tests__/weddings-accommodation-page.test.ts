import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * `/weddings-accommodation` SEO contract, pinned without a database (Hostinger blocks DB
 * access from laptops and CI). The listing loaders are mocked; everything else — the
 * metadata builder, the FAQ array, the JSON-LD and the rendered HTML — is the real page.
 *
 * What must not regress:
 * - the page is accommodation, never a venue: exactly one JSON-LD block, `FAQPage` only
 *   (DEC-008 / SEO-DEC-003), and the FAQ says "No" to the venue question;
 * - the FAQPage JSON-LD is generated from the same array as the visible FAQ;
 * - title/description target the Lipa wedding-destination queries within SERP limits;
 * - no link to the blog pilgrimage guide (off-topic for a booking-intent page).
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

import WeddingsAccommodationPage, { generateMetadata } from "@/app/weddings-accommodation/page";

// Shape of the live five (two houses) — values are fixtures, not claims about live rates.
const listing = (id: number, slug: string, name: string, bedrooms: number, maxGuests: number) => ({
  id,
  slug,
  name,
  bedrooms,
  maxGuests,
  includedGuests: maxGuests,
  pricePerNight: "5000",
  extraGuestFeePerNight: "0",
  tagline: null,
});
const LISTINGS = [
  listing(5, "mickey-in-lipa--full-family-house--sleeps-15", "Mickey in Lipa — Full Family House", 3, 15),
  listing(4, "mickey-in-lipa--family-house--sleeps-11", "Mickey in Lipa — Family House", 2, 11),
  listing(3, "mickey-in-lipa--family-staycation--sleeps-7", "Mickey in Lipa — Family Staycation", 1, 7),
  listing(2, "spacious-2-bedroom", "Spacious 2-Bedroom", 2, 9),
  listing(1, "cozy-1-bedroom", "Cozy 1-Bedroom", 1, 5),
];
const MEMBERSHIPS = [
  { propertyId: 1, inventoryGroupId: 34 },
  { propertyId: 2, inventoryGroupId: 34 },
  { propertyId: 3, inventoryGroupId: 38 },
  { propertyId: 4, inventoryGroupId: 38 },
  { propertyId: 5, inventoryGroupId: 38 },
];

const SUFFIX = " | Haven in Lipa"; // root layout title template

function withDb() {
  loaders.getPublicListings.mockResolvedValue(LISTINGS);
  loaders.getPublicListingGroups.mockResolvedValue(MEMBERSHIPS);
}
function withoutDb() {
  loaders.getPublicListings.mockRejectedValue(new Error("P1001"));
  loaders.getPublicListingGroups.mockRejectedValue(new Error("P1001"));
}

async function renderPage(): Promise<string> {
  return renderToStaticMarkup(await WeddingsAccommodationPage());
}

function jsonLdBlocks(html: string): Record<string, unknown>[] {
  return [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) =>
    JSON.parse(m[1]),
  );
}

/** Visible FAQ questions: the h3s after the FAQ h2, up to the CTA h2. */
function visibleFaqQuestions(html: string): string[] {
  const start = html.indexOf(">Questions from couples</h2>");
  const end = html.indexOf(">Check your dates</h2>");
  expect(start).toBeGreaterThan(-1);
  const section = html.slice(start, end);
  return [...section.matchAll(/<h3[^>]*>(.*?)<\/h3>/g)].map((m) =>
    m[1].replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&"),
  );
}

beforeEach(() => {
  loaders.getPublicListings.mockReset();
  loaders.getPublicListingGroups.mockReset();
});

describe.each([
  ["with the database", withDb],
  ["without the database", withoutDb],
])("/weddings-accommodation %s", (_label, setup) => {
  beforeEach(() => setup());

  it("title and description target the Lipa wedding-destination intent within SERP limits", async () => {
    const meta = await generateMetadata();
    const title = String(meta.title);
    const description = String(meta.description);

    expect(title).toMatch(/Lipa Wedding Destination/);
    expect((title + SUFFIX).length).toBeLessThanOrEqual(60);
    expect(description).toMatch(/wedding in Lipa/);
    expect(description).toMatch(/not the venue/);
    expect(description.length).toBeLessThanOrEqual(160);

    expect(meta.alternates?.canonical).toBe("/weddings-accommodation");
    expect(meta.openGraph).toMatchObject({ title, description, url: "/weddings-accommodation" });
    expect(meta.twitter).toMatchObject({ title, description });
  });

  it("emits exactly one JSON-LD block, FAQPage only, in sync with the visible FAQ", async () => {
    const html = await renderPage();
    const blocks = jsonLdBlocks(html);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]["@type"]).toBe("FAQPage");
    expect(html).not.toMatch(/EventVenue|"Event"|LodgingBusiness|BreadcrumbList/);

    const ldQuestions = (blocks[0].mainEntity as { name: string }[]).map((q) => q.name);
    expect(ldQuestions).toEqual(visibleFaqQuestions(html));
    expect(ldQuestions).toContain("Is Haven in Lipa a wedding venue?");
    expect(ldQuestions).toContain("Is Lipa a good wedding destination?");
    expect(ldQuestions).toContain("How far are your homes from Lipa's churches and venues?");
  });

  it("answers the venue question with a flat No", async () => {
    const blocks = jsonLdBlocks(await renderPage());
    const venue = (blocks[0].mainEntity as { name: string; acceptedAnswer: { text: string } }[]).find(
      (q) => q.name === "Is Haven in Lipa a wedding venue?",
    );
    expect(venue?.acceptedAnswer.text.startsWith("No.")).toBe(true);
  });

  it("has one H1 naming Lipa and weddings, and links /properties and /staycation but not the pilgrimage guide", async () => {
    const html = await renderPage();
    const h1s = [...html.matchAll(/<h1[^>]*>(.*?)<\/h1>/g)].map((m) => m[1]);

    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toMatch(/Lipa/);
    expect(h1s[0]).toMatch(/Wedding/);
    expect(html).toContain('href="/properties"');
    expect(html).toContain('href="/staycation"');
    expect(html).not.toMatch(/pilgrimage/i);
  });
});

describe("/weddings-accommodation capacity (DB-derived)", () => {
  it("quotes the per-house capacity sum in the entourage FAQ, not the per-listing sum", async () => {
    withDb();
    const blocks = jsonLdBlocks(await renderPage());
    const entourage = (blocks[0].mainEntity as { name: string; acceptedAnswer: { text: string } }[]).find(
      (q) => q.name === "Can the whole entourage stay together?",
    );
    expect(entourage?.acceptedAnswer.text).toMatch(/^Up to 15 under one roof/);
    expect(entourage?.acceptedAnswer.text).toMatch(/24 in total/);
    expect(entourage?.acceptedAnswer.text).not.toMatch(/47/);
  });

  it("puts the DB-derived occupancy range in the title", async () => {
    withDb();
    expect(String((await generateMetadata()).title)).toBe("Lipa Wedding Destination Homes, Sleeps 7–15");
  });
});
