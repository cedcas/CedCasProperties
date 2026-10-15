/**
 * Tool-handler tests — Prisma and the services tools.ts calls into are mocked; no DB.
 * The point is to prove each tool only ever relays numbers/availability a real service
 * already computed (DEC-020/DEC-029), never computing one itself.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { db, listingsApi, availabilityApi, quoteApi } = vi.hoisted(() => ({
  db: { property: { findFirst: vi.fn(), findMany: vi.fn() } },
  listingsApi: { getPublicListings: vi.fn(), getPublicListingGroups: vi.fn() },
  availabilityApi: {
    getPropertyConflicts: vi.fn(),
    getInventoryScopeConflicts: vi.fn(),
    formatConflictRange: vi.fn((c: { start: string; end: string }) => `${c.start}-${c.end}`),
  },
  quoteApi: { computeBookingQuote: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: db }));
// `buildShortNames` is real (not stubbed) — the property-resolver's ambiguous-candidate
// labels go through it, same as production, so a test exercising that path is meaningful.
vi.mock("@/lib/listings", async () => {
  const actual = await vi.importActual<typeof import("@/lib/listings")>("@/lib/listings");
  return { ...listingsApi, buildShortNames: actual.buildShortNames };
});
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

  it("includes a shortName, disambiguated against the full listing set (DEC-029, 2026-10-15)", async () => {
    listingsApi.getPublicListings.mockResolvedValue([
      { slug: "mickey-in-lipa--family-staycation--sleeps-7", name: "Mickey in Lipa | Family Staycation•Sleeps 7", type: "House", location: "Lipa City", pricePerNight: 5000, bedrooms: 2, bathrooms: 1, maxGuests: 7 },
      { slug: "mickey-in-lipa--family-house--sleeps-11", name: "Mickey in Lipa | Family House•Sleeps 11", type: "House", location: "Lipa City", pricePerNight: 6000, bedrooms: 2, bathrooms: 2, maxGuests: 11 },
      { slug: "mickey-in-lipa--full-family-house--sleeps-15", name: "Mickey in Lipa | Full Family House•Sleeps 15", type: "House", location: "Lipa City", pricePerNight: 6500, bedrooms: 3, bathrooms: 2, maxGuests: 15 },
    ]);

    const result = (await runHavenTool("list_properties", {})) as Array<Record<string, unknown>>;
    expect(result.map((p) => p.shortName)).toEqual([
      "Mickey in Lipa — Family Staycation",
      "Mickey in Lipa — Family House",
      "Mickey in Lipa — Full Family House",
    ]);
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

  it("includes a per-night (date, weekday, rate) breakdown alongside the total, for a Thu→Sat stay spanning a weekend rate", async () => {
    db.property.findFirst.mockResolvedValue({ id: 1, name: "Spacious 2BR" });
    quoteApi.computeBookingQuote.mockResolvedValue({
      ok: true,
      quote: {
        nightlyTotal: 6300,
        extraGuestFee: 0,
        discountAmount: 0,
        total: 6300,
        dailyRates: [
          { date: "2026-11-19", rate: 2800 },
          { date: "2026-11-20", rate: 3500 },
        ],
      },
    });

    const result = (await runHavenTool("get_quote", {
      slug: "spacious-2-bedroom",
      checkIn: "2026-11-19",
      checkOut: "2026-11-21",
      guests: 4,
    })) as { total: number; perNight: Array<{ date: string; weekday: string; rate: number }> };

    expect(result.total).toBe(6300);
    expect(result.perNight).toEqual([
      { date: "2026-11-19", weekday: "Thursday", rate: 2800 },
      { date: "2026-11-20", weekday: "Friday", rate: 3500 },
    ]);
    // The total is the SUM of the per-night rates, never one night's rate × night count.
    expect(result.total).toBe(result.perNight.reduce((sum, d) => sum + d.rate, 0));
  });
});

describe("find_amenity", () => {
  it("reports which properties have an amenity, searching amenities and amenityDetails across all properties", async () => {
    db.property.findMany.mockResolvedValue([
      { slug: "cozy-1-bedroom", name: "Cozy 1BR", amenities: JSON.stringify(["WiFi", "Parking"]), amenityDetails: null },
      {
        slug: "mickey-full",
        name: "Mickey Full House",
        amenities: JSON.stringify(["WiFi"]),
        amenityDetails: JSON.stringify([{ name: "Karaoke machine" }]),
      },
    ]);

    const result = (await runHavenTool("find_amenity", { term: "karaoke" })) as {
      found: boolean;
      properties: Array<{ slug: string }>;
    };

    expect(result.found).toBe(true);
    expect(result.properties).toEqual([{ slug: "mickey-full", name: "Mickey Full House" }]);
  });

  it("reports not found when no property's amenities mention the term", async () => {
    db.property.findMany.mockResolvedValue([
      { slug: "cozy-1-bedroom", name: "Cozy 1BR", amenities: JSON.stringify(["WiFi"]), amenityDetails: null },
    ]);

    const result = (await runHavenTool("find_amenity", { term: "jacuzzi" })) as { found: boolean; properties: unknown[] };
    expect(result).toEqual({ found: false, properties: [] });
  });

  it("is case-insensitive and does not require asking which house first", async () => {
    db.property.findMany.mockResolvedValue([
      { slug: "b38", name: "Mickey", amenities: JSON.stringify(["Videoke Machine"]), amenityDetails: null },
    ]);

    const result = (await runHavenTool("find_amenity", { term: "VIDEOKE" })) as { found: boolean };
    expect(result.found).toBe(true);
  });
});

describe("check_early_late", () => {
  const housePolicies = JSON.stringify({ checkInTime: "3:00 PM", checkOutTime: "12:00 PM (noon)" });

  it("is not_possible for early check-in when a conflict ends exactly on the target date", () => {
    db.property.findFirst.mockResolvedValue({ id: 1, housePolicies });
    availabilityApi.getInventoryScopeConflicts.mockResolvedValue([
      { kind: "booking", id: 1, start: new Date("2026-11-13T00:00:00Z"), end: new Date("2026-11-15T00:00:00Z") },
    ]);

    return runHavenTool("check_early_late", { slug: "cozy-1-bedroom", date: "2026-11-15", kind: "early_checkin" }).then((result) => {
      expect(result).toEqual({
        status: "not_possible",
        reason: "Another guest is staying the night before and the house won't be ready early that day.",
        standardTime: "3:00 PM",
        fee: "₱200/hour",
      });
    });
  });

  it("is not_possible for late checkout when a conflict starts exactly on the target date", () => {
    db.property.findFirst.mockResolvedValue({ id: 1, housePolicies });
    availabilityApi.getInventoryScopeConflicts.mockResolvedValue([
      { kind: "booking", id: 2, start: new Date("2026-11-15T00:00:00Z"), end: new Date("2026-11-17T00:00:00Z") },
    ]);

    return runHavenTool("check_early_late", { slug: "cozy-1-bedroom", date: "2026-11-15", kind: "late_checkout" }).then((result) => {
      expect(result).toEqual({
        status: "not_possible",
        reason: "Another guest is checking in that same day, so a late checkout isn't possible.",
        standardTime: "12:00 PM (noon)",
        fee: "₱200/hour",
      });
    });
  });

  it("is likely_possible, subject to confirmation, when there's no neighboring conflict", () => {
    db.property.findFirst.mockResolvedValue({ id: 1, housePolicies });
    availabilityApi.getInventoryScopeConflicts.mockResolvedValue([]);

    return runHavenTool("check_early_late", { slug: "cozy-1-bedroom", date: "2026-11-15", kind: "early_checkin" }).then((result) => {
      expect(result).toMatchObject({ status: "likely_possible", standardTime: "3:00 PM", fee: "₱200/hour" });
      expect((result as { reason: string }).reason).toMatch(/subject to confirmation/i);
    });
  });

  it("flags a shared-inventory sibling's booking as a blocking conflict for late checkout", () => {
    // getInventoryScopeConflicts already folds sibling bookings into its result — the tool
    // only has to relay what it returns, never re-derive sibling membership itself.
    db.property.findFirst.mockResolvedValue({ id: 1, housePolicies });
    availabilityApi.getInventoryScopeConflicts.mockResolvedValue([
      {
        kind: "booking",
        id: 9,
        start: new Date("2026-11-15T00:00:00Z"),
        end: new Date("2026-11-16T00:00:00Z"),
        sourcePropertyName: "Mickey Sleeps 11, shared inventory",
      },
    ]);

    return runHavenTool("check_early_late", { slug: "mickey-full", date: "2026-11-15", kind: "late_checkout" }).then((result) => {
      expect(result).toMatchObject({ status: "not_possible" });
    });
  });

  it("flags an imported Airbnb iCal event as a blocking conflict for early check-in", () => {
    db.property.findFirst.mockResolvedValue({ id: 1, housePolicies });
    availabilityApi.getInventoryScopeConflicts.mockResolvedValue([
      { kind: "external_event", id: 3, start: new Date("2026-11-13T00:00:00Z"), end: new Date("2026-11-15T00:00:00Z") },
    ]);

    return runHavenTool("check_early_late", { slug: "cozy-1-bedroom", date: "2026-11-15", kind: "early_checkin" }).then((result) => {
      expect(result).toMatchObject({ status: "not_possible" });
    });
  });

  it("is unknown when the property doesn't exist, without fabricating a status", () => {
    db.property.findFirst.mockResolvedValue(null);

    return runHavenTool("check_early_late", { slug: "ghost", date: "2026-11-15", kind: "early_checkin" }).then((result) => {
      expect(result).toEqual({ status: "unknown", reason: "Property not found.", standardTime: null, fee: "₱200/hour" });
    });
  });

  it("is unknown when the availability check itself errors", () => {
    db.property.findFirst.mockResolvedValue({ id: 1, housePolicies });
    availabilityApi.getInventoryScopeConflicts.mockRejectedValue(new Error("db down"));

    return runHavenTool("check_early_late", { slug: "cozy-1-bedroom", date: "2026-11-15", kind: "early_checkin" }).then((result) => {
      expect(result).toMatchObject({ status: "unknown" });
    });
  });

  it("falls back to null standardTime when housePolicies has no matching time", () => {
    db.property.findFirst.mockResolvedValue({ id: 1, housePolicies: null });
    availabilityApi.getInventoryScopeConflicts.mockResolvedValue([]);

    return runHavenTool("check_early_late", { slug: "cozy-1-bedroom", date: "2026-11-15", kind: "late_checkout" }).then((result) => {
      expect((result as { standardTime: string | null }).standardTime).toBeNull();
    });
  });
});

describe("fuzzy property-name fallback (DEC-029 — a plausible informal name must never say 'not in our system')", () => {
  const MICKEY_LISTINGS = [
    { slug: "cozy-1-bedroom", name: "Cozy 1BR Haven | Solar Power•Netflix•Wi-Fi•5 Pax", maxGuests: 5 },
    { slug: "mickey-in-lipa--family-staycation--sleeps-7", name: "Mickey in Lipa | Family Staycation•Sleeps 7", maxGuests: 7 },
    { slug: "mickey-in-lipa--family-house--sleeps-11", name: "Mickey in Lipa | Family House•Sleeps 11", maxGuests: 11 },
    { slug: "mickey-in-lipa--full-family-house--sleeps-15", name: "Mickey in Lipa | Full Family House•Sleeps 15", maxGuests: 15 },
  ];

  it("get_property_details resolves an informal name after an exact-slug miss", async () => {
    db.property.findFirst.mockResolvedValueOnce(null); // exact "mickey full family house" slug lookup misses
    listingsApi.getPublicListings.mockResolvedValue(MICKEY_LISTINGS);
    db.property.findFirst.mockResolvedValueOnce({
      slug: "mickey-in-lipa--full-family-house--sleeps-15",
      name: "Mickey in Lipa | Full Family House•Sleeps 15",
      description: "The big one.",
      amenities: "[]",
      amenityDetails: null,
      propertyRules: null,
      housePolicies: null,
      pricingNotes: null,
      propertyFaqs: null,
      neighborhoodPlaces: null,
      maxGuests: 15,
      includedGuests: 10,
      extraGuestFeePerNight: 300,
    });

    const result = (await runHavenTool("get_property_details", { slug: "mickey full family house" })) as Record<string, unknown>;
    expect(result.slug).toBe("mickey-in-lipa--full-family-house--sleeps-15");
    expect(result).not.toHaveProperty("ambiguous");
  });

  it("get_property_details surfaces candidates instead of 'not found' when the name is ambiguous", async () => {
    db.property.findFirst.mockResolvedValueOnce(null);
    listingsApi.getPublicListings.mockResolvedValue(MICKEY_LISTINGS);

    const result = (await runHavenTool("get_property_details", { slug: "Mickey" })) as {
      ambiguous: true;
      candidates: Array<{ slug: string }>;
    };
    expect(result.ambiguous).toBe(true);
    expect(result.candidates).toHaveLength(3);
    expect(db.property.findFirst).toHaveBeenCalledTimes(1); // never retried with an ambiguous name
  });

  it("get_property_details still reports 'Property not found.' for genuine garbage, not an empty ambiguity list", async () => {
    db.property.findFirst.mockResolvedValueOnce(null);
    listingsApi.getPublicListings.mockResolvedValue(MICKEY_LISTINGS);

    const result = await runHavenTool("get_property_details", { slug: "zzz nonsense property zzz" });
    expect(result).toEqual({ error: "Property not found." });
  });

  it("check_availability resolves an informal name after an exact-slug miss", async () => {
    db.property.findFirst.mockResolvedValueOnce(null);
    listingsApi.getPublicListings.mockResolvedValue(MICKEY_LISTINGS);
    db.property.findFirst.mockResolvedValueOnce({ id: 42 });
    availabilityApi.getPropertyConflicts.mockResolvedValue([]);

    const result = await runHavenTool("check_availability", {
      slug: "mickey 15",
      checkIn: "2026-11-14",
      checkOut: "2026-11-15",
    });
    expect(result).toEqual({ available: true, conflicts: [] });
  });

  it("get_quote resolves an informal name after an exact-slug miss", async () => {
    db.property.findFirst.mockResolvedValueOnce(null);
    listingsApi.getPublicListings.mockResolvedValue(MICKEY_LISTINGS);
    db.property.findFirst.mockResolvedValueOnce({ id: 1, name: "Mickey in Lipa | Full Family House•Sleeps 15" });
    quoteApi.computeBookingQuote.mockResolvedValue({
      ok: true,
      quote: { nightlyTotal: 10000, extraGuestFee: 0, discountAmount: 0, total: 10000, dailyRates: [{}] },
    });

    const result = (await runHavenTool("get_quote", {
      slug: "the full family house",
      checkIn: "2026-11-14",
      checkOut: "2026-11-15",
      guests: 15,
    })) as Record<string, unknown>;
    expect(result.total).toBe(10000);
  });

  it("check_early_late resolves an informal name after an exact-slug miss", async () => {
    db.property.findFirst.mockResolvedValueOnce(null);
    listingsApi.getPublicListings.mockResolvedValue(MICKEY_LISTINGS);
    db.property.findFirst.mockResolvedValueOnce({ id: 1, housePolicies: null });
    availabilityApi.getInventoryScopeConflicts.mockResolvedValue([]);

    const result = await runHavenTool("check_early_late", { slug: "Mickey Full Family House", date: "2026-11-15", kind: "early_checkin" });
    expect(result).toMatchObject({ status: "likely_possible" });
  });

  it("check_early_late surfaces candidates instead of 'unknown' when the name is ambiguous", async () => {
    db.property.findFirst.mockResolvedValueOnce(null);
    listingsApi.getPublicListings.mockResolvedValue(MICKEY_LISTINGS);

    const result = (await runHavenTool("check_early_late", { slug: "Mickey", date: "2026-11-15", kind: "early_checkin" })) as {
      ambiguous: true;
      candidates: unknown[];
    };
    expect(result.ambiguous).toBe(true);
    expect(result.candidates).toHaveLength(3);
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

  it("includes a shortName disambiguated against the full listing set, not just this one result (DEC-029, 2026-10-15)", async () => {
    db.property.findFirst.mockResolvedValue({
      slug: "mickey-in-lipa--full-family-house--sleeps-15",
      name: "Mickey in Lipa | Full Family House•Sleeps 15",
      description: "The big one.",
      amenities: "[]",
      amenityDetails: null,
      propertyRules: null,
      housePolicies: null,
      pricingNotes: null,
      propertyFaqs: null,
      neighborhoodPlaces: null,
      maxGuests: 15,
      includedGuests: 10,
      extraGuestFeePerNight: 300,
    });
    // Only this ONE Mickey configuration is in the listing set the tool fetches for
    // disambiguation — proving the short name still comes back distinguishable even when
    // its siblings aren't part of this particular call.
    listingsApi.getPublicListings.mockResolvedValue([
      { slug: "mickey-in-lipa--family-staycation--sleeps-7", name: "Mickey in Lipa | Family Staycation•Sleeps 7", maxGuests: 7 },
      { slug: "mickey-in-lipa--family-house--sleeps-11", name: "Mickey in Lipa | Family House•Sleeps 11", maxGuests: 11 },
      { slug: "mickey-in-lipa--full-family-house--sleeps-15", name: "Mickey in Lipa | Full Family House•Sleeps 15", maxGuests: 15 },
    ]);

    const result = (await runHavenTool("get_property_details", {
      slug: "mickey-in-lipa--full-family-house--sleeps-15",
    })) as Record<string, unknown>;

    expect(result.shortName).toBe("Mickey in Lipa — Full Family House");
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
