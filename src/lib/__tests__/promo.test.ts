import { describe, it, expect } from "vitest";
import {
  parsePropertyIds,
  scopeAppliesToProperty,
  parseAllowedWeekdays,
  nightQualifiesForDiscount,
  describeDiscountLimits,
  buildPromoRejectionMessage,
  evaluatePromoDiscount,
  parseDiscountLimitsInput,
} from "@/lib/promo";

// A Thu(1)–Sat(3)/Sun(4) 4-night stay at ₱1,000/night, used across several cases below.
// Dates: Thu 2026-12-17, Fri 2026-12-18, Sat 2026-12-19, Sun 2026-12-20.
const THU_TO_MON = [
  { date: "2026-12-17", rate: 1000 }, // Thu
  { date: "2026-12-18", rate: 1000 }, // Fri
  { date: "2026-12-19", rate: 1000 }, // Sat
  { date: "2026-12-20", rate: 1000 }, // Sun
];

describe("parsePropertyIds / scopeAppliesToProperty (pre-existing, unaffected)", () => {
  it("null/empty propertyIds applies to all properties", () => {
    expect(parsePropertyIds(null)).toEqual([]);
    expect(scopeAppliesToProperty(null, 5)).toBe(true);
  });

  it("restricts to listed ids only", () => {
    expect(scopeAppliesToProperty(JSON.stringify([1, 2]), 1)).toBe(true);
    expect(scopeAppliesToProperty(JSON.stringify([1, 2]), 3)).toBe(false);
  });
});

describe("parseAllowedWeekdays", () => {
  it("null/undefined/empty-string → []", () => {
    expect(parseAllowedWeekdays(null)).toEqual([]);
    expect(parseAllowedWeekdays(undefined)).toEqual([]);
    expect(parseAllowedWeekdays("")).toEqual([]);
  });
  it("parses a valid JSON int array, deduped", () => {
    expect(parseAllowedWeekdays(JSON.stringify([0, 1, 2, 0]))).toEqual([0, 1, 2]);
  });
  it("malformed JSON or non-array → []", () => {
    expect(parseAllowedWeekdays("{not json")).toEqual([]);
    expect(parseAllowedWeekdays(JSON.stringify({ a: 1 }))).toEqual([]);
  });
  it("drops out-of-range / non-integer values", () => {
    expect(parseAllowedWeekdays(JSON.stringify([0, 7, -1, 2.5, 3]))).toEqual([0, 3]);
  });
});

describe("nightQualifiesForDiscount", () => {
  it("no limits set → every night qualifies", () => {
    expect(nightQualifiesForDiscount("2026-12-17", {})).toBe(true);
    expect(nightQualifiesForDiscount("2026-12-20", { validFrom: null, validUntil: null, allowedWeekdays: null })).toBe(true);
  });

  it("weekday limit: only listed weekdays qualify (0=Sun..6=Sat)", () => {
    const limits = { allowedWeekdays: [0, 1, 2, 3, 4] }; // Sun-Thu
    expect(nightQualifiesForDiscount("2026-12-17", limits)).toBe(true); // Thu
    expect(nightQualifiesForDiscount("2026-12-20", limits)).toBe(true); // Sun
    expect(nightQualifiesForDiscount("2026-12-18", limits)).toBe(false); // Fri
    expect(nightQualifiesForDiscount("2026-12-19", limits)).toBe(false); // Sat
  });

  it("date range is inclusive on both ends", () => {
    const limits = { validFrom: new Date("2026-12-01T00:00:00Z"), validUntil: new Date("2026-12-18T00:00:00Z") };
    expect(nightQualifiesForDiscount("2026-12-01", limits)).toBe(true); // == validFrom
    expect(nightQualifiesForDiscount("2026-12-18", limits)).toBe(true); // == validUntil
    expect(nightQualifiesForDiscount("2026-11-30", limits)).toBe(false); // before
    expect(nightQualifiesForDiscount("2026-12-19", limits)).toBe(false); // after
  });

  it("both a date window and a weekday set must be satisfied", () => {
    const limits = { validFrom: new Date("2026-12-18T00:00:00Z"), allowedWeekdays: [0, 1, 2, 3, 4] };
    // 2026-12-20 is a Sunday (qualifying weekday) and on/after validFrom.
    expect(nightQualifiesForDiscount("2026-12-20", limits)).toBe(true);
    // 2026-12-17 is a Thursday (qualifying weekday) but before validFrom.
    expect(nightQualifiesForDiscount("2026-12-17", limits)).toBe(false);
  });
});

describe("describeDiscountLimits", () => {
  it("no limits → 'No date/day limits'", () => {
    expect(describeDiscountLimits({ validFrom: null, validUntil: null, allowedWeekdays: [] })).toBe("No date/day limits");
  });
  it("contiguous weekday range + validUntil → 'Sun–Thu, until 18 Dec 2026'", () => {
    expect(
      describeDiscountLimits({
        validFrom: null,
        validUntil: new Date("2026-12-18T00:00:00Z"),
        allowedWeekdays: [0, 1, 2, 3, 4],
      })
    ).toBe("Sun–Thu, until 18 Dec 2026");
  });
  it("date range only, both bounds", () => {
    expect(
      describeDiscountLimits({
        validFrom: new Date("2026-12-01T00:00:00Z"),
        validUntil: new Date("2026-12-18T00:00:00Z"),
        allowedWeekdays: [],
      })
    ).toBe("from 1 Dec 2026 to 18 Dec 2026");
  });
  it("non-contiguous weekdays list each name", () => {
    expect(
      describeDiscountLimits({ validFrom: null, validUntil: null, allowedWeekdays: [0, 3, 6] })
    ).toBe("Sun, Wed, Sat");
  });
});

describe("buildPromoRejectionMessage", () => {
  it("weekday only", () => {
    expect(buildPromoRejectionMessage({ allowedWeekdays: [0, 1, 2, 3, 4] })).toBe(
      "This code is only valid on Sunday–Thursday nights. None of the nights in this stay qualify."
    );
  });
  it("date range only", () => {
    expect(
      buildPromoRejectionMessage({
        validFrom: new Date("2026-12-01T00:00:00Z"),
        validUntil: new Date("2026-12-18T00:00:00Z"),
      })
    ).toBe("This code is only valid for nights from 1 Dec 2026 to 18 Dec 2026. None of the nights in this stay qualify.");
  });
  it("weekday + date range", () => {
    expect(
      buildPromoRejectionMessage({ allowedWeekdays: [0, 1, 2, 3, 4], validUntil: new Date("2026-12-18T00:00:00Z") })
    ).toBe(
      "This code is only valid on Sunday–Thursday nights, until 18 Dec 2026. None of the nights in this stay qualify."
    );
  });
});

describe("evaluatePromoDiscount — the DEC-035 mixed-stay rule", () => {
  it("1. no limits: existing codes behave exactly as today (percentage, full stay)", () => {
    const result = evaluatePromoDiscount({ type: "percentage", value: 10 }, THU_TO_MON);
    expect(result).toMatchObject({ ok: true, discountAmount: 400, qualifyingNightCount: 4, totalNightCount: 4 });
  });

  it("1b. no limits: fixed discount, full stay", () => {
    const result = evaluatePromoDiscount({ type: "fixed", value: 500 }, THU_TO_MON);
    expect(result).toMatchObject({ ok: true, discountAmount: 500, qualifyingNightCount: 4 });
  });

  it("2. weekday-only: only the listed weekdays are discounted", () => {
    // Sun-Thu only (0-4): Thu + Sun qualify out of the 4-night stay (Fri, Sat excluded).
    const result = evaluatePromoDiscount(
      { type: "percentage", value: 10, allowedWeekdays: [0, 1, 2, 3, 4] },
      THU_TO_MON
    );
    expect(result).toMatchObject({ ok: true, qualifyingNightCount: 2, totalNightCount: 4 });
    expect(result.discountAmount).toBeCloseTo(200); // 10% of (1000 Thu + 1000 Sun)
  });

  it("3. date range: nights outside the window are not discounted; bounds are inclusive", () => {
    const result = evaluatePromoDiscount(
      { type: "percentage", value: 10, validFrom: new Date("2026-12-18T00:00:00Z"), validUntil: new Date("2026-12-19T00:00:00Z") },
      THU_TO_MON
    );
    // Only Fri (18th) and Sat (19th) are inside [validFrom, validUntil].
    expect(result).toMatchObject({ ok: true, qualifyingNightCount: 2, totalNightCount: 4 });
    expect(result.discountAmount).toBeCloseTo(200);
  });

  it("4. mixed stay: Thu-Sat booking with a Sun-Thu-only code discounts Thursday only", () => {
    const thuToSat = [
      { date: "2026-12-17", rate: 1000 }, // Thu
      { date: "2026-12-18", rate: 1200 }, // Fri
    ];
    const result = evaluatePromoDiscount(
      { type: "percentage", value: 10, allowedWeekdays: [0, 1, 2, 3, 4] },
      thuToSat
    );
    expect(result).toMatchObject({ ok: true, qualifyingNightCount: 1, totalNightCount: 2 });
    expect(result.discountAmount).toBeCloseTo(100); // 10% of Thursday's ₱1,000 only
  });

  it("5. zero-qualifying nights rejects with a clear message (weekend-only stay, Sun-Thu code)", () => {
    const friToSun = [
      { date: "2026-12-18", rate: 1000 }, // Fri
      { date: "2026-12-19", rate: 1000 }, // Sat
    ];
    const result = evaluatePromoDiscount(
      { type: "percentage", value: 10, allowedWeekdays: [0, 1, 2, 3, 4] },
      friToSun
    );
    expect(result.ok).toBe(false);
    expect(result.discountAmount).toBe(0);
    expect(result.rejectionMessage).toContain("Sunday–Thursday");
    expect(result.rejectionMessage).toContain("None of the nights in this stay qualify.");
  });

  it("5b. zero-qualifying nights rejects when the stay is entirely after validUntil", () => {
    const result = evaluatePromoDiscount(
      { type: "percentage", value: 10, validUntil: new Date("2026-12-01T00:00:00Z") },
      THU_TO_MON
    );
    expect(result.ok).toBe(false);
    expect(result.rejectionMessage).toContain("until 1 Dec 2026");
  });

  it("7. fixed-amount code is capped at the qualifying-nights subtotal, not the full stay", () => {
    // Sun-Thu only; qualifying subtotal is Thu (1000) + Sun (1000) = 2000; code value 5000.
    const result = evaluatePromoDiscount(
      { type: "fixed", value: 5000, allowedWeekdays: [0, 1, 2, 3, 4] },
      THU_TO_MON
    );
    expect(result).toMatchObject({ ok: true, qualifyingNightCount: 2 });
    expect(result.discountAmount).toBe(2000); // capped, not 5000
  });

  it("8. null dates and empty allowedWeekdays behave identically to no limits", () => {
    const result = evaluatePromoDiscount(
      { type: "percentage", value: 10, validFrom: null, validUntil: null, allowedWeekdays: [] },
      THU_TO_MON
    );
    expect(result).toMatchObject({ ok: true, qualifyingNightCount: 4, totalNightCount: 4, discountAmount: 400 });
  });

  it("an empty stay (0 nights) is not treated as a rejection", () => {
    const result = evaluatePromoDiscount({ type: "percentage", value: 10, allowedWeekdays: [0] }, []);
    expect(result).toMatchObject({ ok: true, discountAmount: 0, totalNightCount: 0 });
  });
});

describe("parseDiscountLimitsInput — admin create/edit validation", () => {
  it("empty input → all null (no limits)", () => {
    const result = parseDiscountLimitsInput({});
    expect(result).toEqual({ ok: true, limits: { validFrom: null, validUntil: null, allowedWeekdays: null } });
  });

  it("validFrom after validUntil is rejected", () => {
    const result = parseDiscountLimitsInput({ validFrom: "2026-12-20", validUntil: "2026-12-01" });
    expect(result.ok).toBe(false);
  });

  it("validFrom equal to validUntil is accepted", () => {
    const result = parseDiscountLimitsInput({ validFrom: "2026-12-18", validUntil: "2026-12-18" });
    expect(result.ok).toBe(true);
  });

  it("rejects an out-of-range weekday", () => {
    const result = parseDiscountLimitsInput({ allowedWeekdays: [0, 7] });
    expect(result.ok).toBe(false);
  });

  it("an empty allowedWeekdays array normalizes to null (same as unset)", () => {
    const result = parseDiscountLimitsInput({ allowedWeekdays: [] });
    expect(result).toEqual({ ok: true, limits: { validFrom: null, validUntil: null, allowedWeekdays: null } });
  });

  it("stores a sorted, deduped JSON array", () => {
    const result = parseDiscountLimitsInput({ allowedWeekdays: [4, 0, 2, 0] });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.limits.allowedWeekdays).toBe(JSON.stringify([0, 2, 4]));
  });
});
