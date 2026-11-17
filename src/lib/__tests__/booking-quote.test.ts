/**
 * Unit tests for `computeBookingQuote`'s discount-code handling. Prisma is mocked —
 * no DB. Pricing runs for real (src/lib/pricing.ts over the mocked prisma).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { db } = vi.hoisted(() => ({
  db: {
    property: { findUnique: vi.fn() },
    propertyRate: { findMany: vi.fn() },
    discountCode: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: db }));

import { computeBookingQuote } from "@/lib/booking-quote";

// Thu 2026-12-17 → Sun 2026-12-20 (exclusive checkout): 3 nights, all weekdays except
// Fri/Sat which need a weekend rate — so give the property one to keep pricing simple.
const STAY = { propertyId: 1, checkIn: "2026-12-17", checkOut: "2026-12-20", guests: 2 };

beforeEach(() => {
  vi.clearAllMocks();
  db.property.findUnique.mockResolvedValue({
    name: "Haven Suite",
    pricePerNight: 1000,
    maxGuests: 4,
    includedGuests: 2,
    extraGuestFeePerNight: 500,
    rates: [{ rateType: "weekend" }],
  });
  db.propertyRate.findMany.mockResolvedValue([{ rateType: "weekend", rate: 1000, specificDate: null, note: null }]);
});

function activeCode(overrides: Record<string, unknown> = {}) {
  return {
    code: "SUNTOTHU",
    type: "percentage",
    value: 10,
    isActive: true,
    propertyIds: null,
    maxUses: null,
    usageCount: 0,
    validFrom: null,
    validUntil: null,
    allowedWeekdays: null,
    ...overrides,
  };
}

describe("computeBookingQuote — DEC-035 discount rejection vs. silent ignore", () => {
  it("rejects the quote with the weekday rejection message when zero nights qualify", async () => {
    // Fri (18th) and Sat (19th) are the only nights in a 2-night Fri→Sun stay; a
    // Sun-Thu-only code qualifies none of them.
    db.discountCode.findUnique.mockResolvedValue(
      activeCode({ allowedWeekdays: JSON.stringify([0, 1, 2, 3, 4]) })
    );
    const result = await computeBookingQuote({
      propertyId: 1,
      checkIn: "2026-12-18",
      checkOut: "2026-12-20",
      guests: 2,
      discountCode: "suntothu",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
      expect(result.error).toBe(
        "This code is only valid on Sunday–Thursday nights. None of the nights in this stay qualify."
      );
    }
  });

  it("rejects the quote with the date-range rejection message when the stay is outside the window", async () => {
    db.discountCode.findUnique.mockResolvedValue(
      activeCode({ validUntil: new Date("2026-12-01T00:00:00Z") })
    );
    const result = await computeBookingQuote({ ...STAY, discountCode: "suntothu" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
      expect(result.error).toContain("until 1 Dec 2026");
      expect(result.error).toContain("None of the nights in this stay qualify.");
    }
  });

  it("still silently ignores an unknown code (no error, discount not applied)", async () => {
    db.discountCode.findUnique.mockResolvedValue(null);
    const result = await computeBookingQuote({ ...STAY, discountCode: "NOPE" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.quote.discountCode).toBeNull();
      expect(result.quote.discountAmount).toBe(0);
    }
  });

  it("still silently ignores an inactive code", async () => {
    db.discountCode.findUnique.mockResolvedValue(activeCode({ isActive: false }));
    const result = await computeBookingQuote({ ...STAY, discountCode: "suntothu" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.quote.discountCode).toBeNull();
      expect(result.quote.discountAmount).toBe(0);
    }
  });

  it("still silently ignores a code scoped to a different property", async () => {
    db.discountCode.findUnique.mockResolvedValue(activeCode({ propertyIds: JSON.stringify([99]) }));
    const result = await computeBookingQuote({ ...STAY, discountCode: "suntothu" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.quote.discountCode).toBeNull();
      expect(result.quote.discountAmount).toBe(0);
    }
  });

  it("still silently ignores a code that has reached maxUses", async () => {
    db.discountCode.findUnique.mockResolvedValue(activeCode({ maxUses: 5, usageCount: 5 }));
    const result = await computeBookingQuote({ ...STAY, discountCode: "suntothu" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.quote.discountCode).toBeNull();
      expect(result.quote.discountAmount).toBe(0);
    }
  });

  it("still applies the discount normally when nights qualify", async () => {
    db.discountCode.findUnique.mockResolvedValue(activeCode());
    const result = await computeBookingQuote({ ...STAY, discountCode: "suntothu" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.quote.discountCode).toBe("SUNTOTHU");
      expect(result.quote.discountAmount).toBeGreaterThan(0);
    }
  });
});
