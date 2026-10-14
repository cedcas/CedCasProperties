/**
 * Tool-handler tests — Prisma and the services tools.ts calls into are mocked; no DB.
 * The point is to prove each tool only ever relays numbers/availability a real service
 * already computed (DEC-020/DEC-029), never computing one itself.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { db, listingsApi, availabilityApi, quoteApi } = vi.hoisted(() => ({
  db: { property: { findFirst: vi.fn() } },
  listingsApi: { getPublicListings: vi.fn(), getPublicListingGroups: vi.fn() },
  availabilityApi: { getPropertyConflicts: vi.fn(), formatConflictRange: vi.fn((c: { start: string; end: string }) => `${c.start}-${c.end}`) },
  quoteApi: { computeBookingQuote: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/listings", () => listingsApi);
vi.mock("@/lib/availability", () => availabilityApi);
vi.mock("@/lib/booking-quote", () => quoteApi);

import { runHavenTool } from "../tools";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("list_properties", () => {
  it("never exposes airbnbIcsUrl, and includes maxGuests", async () => {
    listingsApi.getPublicListings.mockResolvedValue([
      {
        slug: "cozy-1-bedroom",
        name: "Cozy 1BR Haven",
        type: "1BR",
        location: "Lipa City",
        pricePerNight: 3500,
        bedrooms: 1,
        bathrooms: 1,
        maxGuests: 5,
        airbnbIcsUrl: "https://secret.example/feed.ics",
      },
    ]);

    const result = (await runHavenTool("list_properties", {})) as Array<Record<string, unknown>>;
    expect(result).toHaveLength(1);
    expect(result[0].maxGuests).toBe(5);
    expect(result[0]).not.toHaveProperty("airbnbIcsUrl");
  });
});

describe("check_availability", () => {
  it("reports available when there are no conflicts", async () => {
    db.property.findFirst.mockResolvedValue({ id: 1 });
    availabilityApi.getPropertyConflicts.mockResolvedValue([]);

    const result = await runHavenTool("check_availability", {
      slug: "cozy-1-bedroom",
      checkIn: "2026-11-14",
      checkOut: "2026-11-15",
    });
    expect(result).toEqual({ available: true, conflicts: [] });
  });

  it("reports the property-not-found error without touching availability", async () => {
    db.property.findFirst.mockResolvedValue(null);
    const result = await runHavenTool("check_availability", { slug: "ghost", checkIn: "2026-11-14", checkOut: "2026-11-15" });
    expect(result).toEqual({ error: "Property not found." });
    expect(availabilityApi.getPropertyConflicts).not.toHaveBeenCalled();
  });
});

describe("get_quote", () => {
  it("relays computeBookingQuote's numbers verbatim and builds the booking link", async () => {
    db.property.findFirst.mockResolvedValue({ id: 1, name: "Cozy 1BR Haven" });
    quoteApi.computeBookingQuote.mockResolvedValue({
      ok: true,
      quote: { nightlyTotal: 7000, extraGuestFee: 500, discountAmount: 0, total: 7500, dailyRates: [{}, {}] },
    });

    const result = (await runHavenTool("get_quote", {
      slug: "cozy-1-bedroom",
      checkIn: "2026-11-14",
      checkOut: "2026-11-16",
      guests: 3,
    })) as Record<string, unknown>;

    expect(result.total).toBe(7500);
    expect(result.nights).toBe(2);
    expect(result.name).toBe("Cozy 1BR Haven");
    expect(result.bookingLink).toBe("/properties/cozy-1-bedroom/book?checkIn=2026-11-14&checkOut=2026-11-16&guests=3");
  });

  it("surfaces a quote error (e.g. over capacity) instead of a number", async () => {
    db.property.findFirst.mockResolvedValue({ id: 1 });
    quoteApi.computeBookingQuote.mockResolvedValue({ ok: false, status: 400, error: "This property accommodates up to 5 guests." });

    const result = await runHavenTool("get_quote", { slug: "cozy-1-bedroom", checkIn: "2026-11-14", checkOut: "2026-11-16", guests: 50 });
    expect(result).toEqual({ error: "This property accommodates up to 5 guests." });
  });
});

describe("get_property_details", () => {
  it("returns structured, numeric fee fields so the model never has to guess a fee amount", async () => {
    db.property.findFirst.mockResolvedValue({
      slug: "cozy-1-bedroom",
      name: "Cozy 1BR Haven",
      description: "A cozy place.",
      amenities: "[]",
      amenityDetails: null,
      propertyRules: "Standard house rules.",
      housePolicies: null,
      pricingNotes: null,
      propertyFaqs: null,
      neighborhoodPlaces: null,
      maxGuests: 5,
      includedGuests: 3,
      extraGuestFeePerNight: 300,
    });

    const result = (await runHavenTool("get_property_details", { slug: "cozy-1-bedroom" })) as {
      fees: { extraGuestFeePerNight: number; earlyCheckInPerHour: number; lateCheckoutPerHour: number };
    };

    expect(result.fees).toEqual({
      extraGuestFeePerNight: 300,
      earlyCheckInPerHour: 200,
      lateCheckoutPerHour: 200,
    });
  });

  it("reports the property-not-found error without fabricating fee data", async () => {
    db.property.findFirst.mockResolvedValue(null);
    const result = await runHavenTool("get_property_details", { slug: "ghost" });
    expect(result).toEqual({ error: "Property not found." });
  });
});

describe("get_faq", () => {
  it("finds a relevant FAQ entry by keyword", async () => {
    const result = (await runHavenTool("get_faq", { query: "cancellation refund policy" })) as { results: Array<{ question: string }> };
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results.some((r) => /cancellation/i.test(r.question))).toBe(true);
  });

  it("returns no results for an unrelated query", async () => {
    const result = (await runHavenTool("get_faq", { query: "xyzxyz nonsense query zzqq" })) as { results: unknown[] };
    expect(result.results).toEqual([]);
  });
});

describe("runHavenTool — validation and unknown tools", () => {
  it("returns an error for an unknown tool name", async () => {
    const result = await runHavenTool("delete_everything", {});
    expect(result).toEqual({ error: "Unknown tool: delete_everything" });
  });

  it("returns a validation error instead of calling the handler with bad args", async () => {
    const result = await runHavenTool("check_availability", { slug: "x" }); // missing checkIn/checkOut
    expect(result).toHaveProperty("error");
    expect(db.property.findFirst).not.toHaveBeenCalled();
  });
});

describe("end-to-end: 'Is there anything available on the 2nd Saturday of November for 12 people'", () => {
  it("resolve_dates then find_stay returns combined options with totals and booking links", async () => {
    const resolved = (await runHavenTool("resolve_dates", { expression: "2nd Saturday of November" })) as {
      checkIn: string;
      checkOut: string;
    };
    expect(resolved.checkIn).toMatch(/^\d{4}-11-\d{2}$/);

    listingsApi.getPublicListings.mockResolvedValue([
      { id: 1, slug: "cozy-1-bedroom", name: "Cozy 1BR", maxGuests: 5 },
      { id: 2, slug: "spacious-2-bedroom", name: "Spacious 2BR", maxGuests: 9 },
      { id: 3, slug: "sleeps-15", name: "Mickey Full House", maxGuests: 15 },
    ]);
    listingsApi.getPublicListingGroups.mockResolvedValue([]);
    availabilityApi.getPropertyConflicts.mockImplementation(async ({ propertyId }: { propertyId: number }) =>
      propertyId === 3 ? [{ kind: "booking" }] : [] // sleeps-15 is booked; the other two are free
    );
    quoteApi.computeBookingQuote.mockImplementation(async ({ propertyId, guests }: { propertyId: number; guests: number }) => ({
      ok: true,
      quote: { total: propertyId === 1 ? guests * 1000 : guests * 800, nightlyTotal: 0, dailyRates: [{}] },
    }));

    const result = (await runHavenTool("find_stay", {
      checkIn: resolved.checkIn,
      checkOut: resolved.checkOut,
      guests: 12,
    })) as { options: Array<{ properties: Array<{ bookingLink: string; quote: { total: number } | null }>; combinedTotal: number }> };

    expect(result.options.length).toBeGreaterThan(0);
    const option = result.options[0];
    // sleeps-15 is unavailable, so the only viable combo is cozy-1-bedroom + spacious-2-bedroom.
    expect(option.properties.map((p) => p.bookingLink).every((link) => link.includes("/book?checkIn="))).toBe(true);
    expect(option.combinedTotal).toBeGreaterThan(0);
    expect(option.properties.every((p) => p.quote !== null)).toBe(true);
  });
});
