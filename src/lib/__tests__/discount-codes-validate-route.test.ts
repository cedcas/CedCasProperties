/**
 * Route-level tests for POST /api/discount-codes/validate (DEC-035). Prisma is mocked;
 * pricing (src/lib/pricing.ts's getDailyRates) runs for real over the mocked client, same
 * pattern as src/lib/__tests__/stripe-payment-routes.test.ts.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { db } = vi.hoisted(() => ({
  db: {
    discountCode: { findUnique: vi.fn() },
    property: { findUnique: vi.fn() },
    propertyRate: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: db }));

import { POST as validate } from "@/app/api/discount-codes/validate/route";

function req(body: unknown): Request {
  return new Request("http://localhost/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Thu 2026-12-17 → Mon 2026-12-21: Thu, Fri, Sat, Sun nights (4 nights, ₱1,000 each).
const STAY = { propertyId: 7, checkIn: "2026-12-17", checkOut: "2026-12-21" };

beforeEach(() => {
  vi.clearAllMocks();
  db.property.findUnique.mockResolvedValue({ pricePerNight: 1000 });
  db.propertyRate.findMany.mockResolvedValue([]);
});

describe("POST /api/discount-codes/validate", () => {
  it("1. no limits: percentage code, full-stay discount", async () => {
    db.discountCode.findUnique.mockResolvedValue({
      code: "WELCOME", type: "percentage", value: 10, isActive: true,
      propertyIds: null, maxUses: null, usageCount: 0, validFrom: null, validUntil: null, allowedWeekdays: null,
    });
    const res = await validate(req({ code: "welcome", ...STAY }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toMatchObject({ valid: true, discountAmount: 400, message: "10% off nightly rate" });
  });

  it("2. weekday-only (Sun-Thu): partial discount + 'eligible nights' wording", async () => {
    db.discountCode.findUnique.mockResolvedValue({
      code: "MICKEY-MIDWEEK", type: "percentage", value: 10, isActive: true,
      propertyIds: null, maxUses: null, usageCount: 0, validFrom: null, validUntil: null,
      allowedWeekdays: JSON.stringify([0, 1, 2, 3, 4]),
    });
    const res = await validate(req({ code: "mickey-midweek", ...STAY }));
    const data = await res.json();
    expect(res.status).toBe(200);
    // Thu + Sun qualify out of the 4-night stay → 10% of ₱2,000 = ₱200.
    expect(data).toMatchObject({ valid: true, discountAmount: 200, message: "10% off eligible nights" });
  });

  it("5. zero-qualifying nights: rejects with a clear message, not a valid ₱0 discount", async () => {
    db.discountCode.findUnique.mockResolvedValue({
      code: "MICKEY-MIDWEEK", type: "percentage", value: 10, isActive: true,
      propertyIds: null, maxUses: null, usageCount: 0, validFrom: null, validUntil: null,
      allowedWeekdays: JSON.stringify([0, 1, 2, 3, 4]),
    });
    // A Fri-Sun stay: both nights fall outside Sun-Thu.
    const res = await validate(req({ code: "mickey-midweek", propertyId: 7, checkIn: "2026-12-18", checkOut: "2026-12-20" }));
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.valid).toBeUndefined();
    expect(data.error).toContain("Sunday–Thursday");
  });

  it("6. listing restriction still enforced: a code scoped to other properties reads as 'Invalid promo code'", async () => {
    db.discountCode.findUnique.mockResolvedValue({
      code: "MICKEY-MIDWEEK", type: "percentage", value: 10, isActive: true,
      propertyIds: JSON.stringify([101, 102, 103]), maxUses: null, usageCount: 0,
      validFrom: null, validUntil: null, allowedWeekdays: null,
    });
    const res = await validate(req({ code: "mickey-midweek", ...STAY, propertyId: 7 }));
    const data = await res.json();
    expect(res.status).toBe(404);
    expect(data.error).toBe("Invalid promo code");
  });

  it("7. fixed-amount code is capped at the qualifying-nights subtotal", async () => {
    db.discountCode.findUnique.mockResolvedValue({
      code: "BIG", type: "fixed", value: 5000, isActive: true,
      propertyIds: null, maxUses: null, usageCount: 0, validFrom: null, validUntil: null,
      allowedWeekdays: JSON.stringify([0, 1, 2, 3, 4]),
    });
    const res = await validate(req({ code: "big", ...STAY }));
    const data = await res.json();
    expect(res.status).toBe(200);
    // Qualifying subtotal is Thu + Sun = ₱2,000; the ₱5,000 code is capped there.
    expect(data.discountAmount).toBe(2000);
  });

  it("existing behaviour unchanged: unknown code is 'Invalid promo code'", async () => {
    db.discountCode.findUnique.mockResolvedValue(null);
    const res = await validate(req({ code: "NOPE", ...STAY }));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("Invalid promo code");
  });

  it("existing behaviour unchanged: inactive code", async () => {
    db.discountCode.findUnique.mockResolvedValue({
      code: "OLD", type: "percentage", value: 10, isActive: false,
      propertyIds: null, maxUses: null, usageCount: 0, validFrom: null, validUntil: null, allowedWeekdays: null,
    });
    const res = await validate(req({ code: "OLD", ...STAY }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("This promo code is no longer active");
  });
});
