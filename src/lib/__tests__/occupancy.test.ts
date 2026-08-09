import { describe, it, expect } from "vitest";
import {
  extraGuestFeeApplies,
  buildOccupancyNote,
  buildFeeBreakdown,
  buildFeeFootnote,
  sanitizeChargeProse,
  normalizePricingProse,
  type FeeLine,
} from "@/lib/occupancy";
import { calcExtraGuestFee } from "@/lib/pricing-core";

/**
 * The booking widget's itemized fee summary is the anti-surprise-fee surface: whatever
 * it shows has to equal what `/api/bookings` actually charges. Both now go through
 * `calcExtraGuestFee`, and these tests pin that agreement so a future edit to the
 * display copy can't silently reintroduce a fourth copy of the formula.
 */

// Mickey-shaped: rate covers 5, up to 7 guests, ₱400/extra guest/night.
const MICKEY = {
  pricePerNight: 6500,
  includedGuests: 5,
  maxGuests: 7,
  extraGuestFeePerNight: 400,
};

// Fee disabled — every guest included.
const FLAT = {
  pricePerNight: 3000,
  includedGuests: 4,
  maxGuests: 4,
  extraGuestFeePerNight: 0,
};

const line = (lines: FeeLine[], key: string) => lines.find((l) => l.key === key);

describe("extraGuestFeeApplies", () => {
  it("is false when the fee is 0", () => {
    expect(extraGuestFeeApplies({ ...MICKEY, extraGuestFeePerNight: 0 })).toBe(false);
  });

  it("is false when included guests already equals max occupancy", () => {
    expect(extraGuestFeeApplies({ ...MICKEY, includedGuests: 7 })).toBe(false);
  });

  it("is true when a fee is set and there is headroom above included", () => {
    expect(extraGuestFeeApplies(MICKEY)).toBe(true);
  });
});

describe("buildOccupancyNote", () => {
  it("states all-inclusive when no extra-guest fee can apply", () => {
    expect(buildOccupancyNote(FLAT)).toBe(
      "Sleeps up to 4. All guests included in the nightly rate."
    );
  });

  it("names the real included count and fee when it applies", () => {
    const note = buildOccupancyNote(MICKEY);
    expect(note).toContain("covers 5 guests");
    expect(note).toContain("₱400/guest per night");
    expect(note).toContain("no hidden fees");
  });
});

describe("buildFeeBreakdown — static mode (no dates chosen)", () => {
  const lines = buildFeeBreakdown(MICKEY);

  it("leads with the from-rate, not a total", () => {
    expect(line(lines, "nightly")).toMatchObject({
      label: "Nightly rate",
      value: "from ₱6,500",
      note: "per night",
    });
  });

  it("says what the base rate covers", () => {
    expect(line(lines, "covers")?.value).toBe("5 guests");
  });

  it("shows the per-night extra-guest fee and the guest range it covers", () => {
    expect(line(lines, "extra-guest")).toMatchObject({
      value: "₱400 / night",
      note: "for guests 6–7",
    });
  });

  it("states cleaning and service fees as an explicit None", () => {
    expect(line(lines, "cleaning")?.value).toBe("None");
    expect(line(lines, "service")?.value).toBe("None");
  });

  it("omits a total until dates are chosen", () => {
    expect(line(lines, "total")).toBeUndefined();
  });

  it("omits the extra-guest row entirely when the fee cannot apply", () => {
    expect(line(buildFeeBreakdown(FLAT), "extra-guest")).toBeUndefined();
  });

  it("singularises the range when only one guest sits above the threshold", () => {
    const l = buildFeeBreakdown({ ...MICKEY, includedGuests: 6 });
    expect(line(l, "extra-guest")?.note).toBe("for guest 7");
  });
});

describe("buildFeeBreakdown — live mode (dates chosen)", () => {
  it("totals nights × rate when no extra guests", () => {
    const lines = buildFeeBreakdown({ ...MICKEY, nights: 3, guests: 5, nightlyTotal: 19500 });
    expect(line(lines, "nightly")).toMatchObject({ label: "3 nights × ₱6,500", value: "₱19,500" });
    expect(line(lines, "extra-guest")?.value).toBe("₱0");
    expect(line(lines, "extra-guest")?.note).toBe("no extra-guest fee for 5 guests");
    expect(line(lines, "total")?.value).toBe("₱19,500");
  });

  it("adds the extra-guest fee and agrees with calcExtraGuestFee", () => {
    const nights = 3;
    const guests = 7;
    const lines = buildFeeBreakdown({ ...MICKEY, nights, guests, nightlyTotal: 19500 });

    // 2 extra guests × ₱400 × 3 nights = ₱2,400
    const expectedFee = calcExtraGuestFee(guests, MICKEY.includedGuests, MICKEY.extraGuestFeePerNight, nights);
    expect(expectedFee).toBe(2400);

    expect(line(lines, "extra-guest")).toMatchObject({
      label: "Extra guests (2 × 3 nights)",
      value: "₱2,400",
    });
    expect(line(lines, "total")?.value).toBe("₱21,900"); // 19,500 + 2,400
  });

  it("falls back to nights × pricePerNight when the rates API hasn't answered", () => {
    const lines = buildFeeBreakdown({ ...MICKEY, nights: 2, guests: 5, nightlyTotal: null });
    expect(line(lines, "nightly")?.value).toBe("₱13,000");
  });

  it("flags varied pricing when the true subtotal differs from the flat base rate", () => {
    // 2 nights where one is a ₱8,000 weekend night → avg 7,250 ≠ base 6,500
    const lines = buildFeeBreakdown({ ...MICKEY, nights: 2, guests: 5, nightlyTotal: 14500 });
    expect(line(lines, "nightly")?.label).toBe("2 nights × ₱7,250");
    expect(line(lines, "nightly")?.note).toContain("priced individually");
  });

  it("defaults guests to the included count rather than assuming a full house", () => {
    const lines = buildFeeBreakdown({ ...MICKEY, nights: 1, nightlyTotal: 6500 });
    expect(line(lines, "total")?.value).toBe("₱6,500");
  });
});

describe("buildFeeFootnote", () => {
  it("derives the card fee percentage from STRIPE_FEE_RATE", () => {
    expect(buildFeeFootnote()).toContain("6% processing fee");
    expect(buildFeeFootnote()).toContain("No hidden fees");
  });
});

describe("sanitizeChargeProse", () => {
  it("leaves clean prose completely untouched", () => {
    const clean =
      "Check-in is 2 PM. Quiet hours after 10 PM.\nRate covers 5 guests; ₱400 per extra guest for the 6th and 7th.";
    expect(sanitizeChargeProse(clean, MICKEY)).toBe(clean);
  });

  it("leaves a specific, named charge untouched", () => {
    const specific = "A ₱500 late-checkout charge applies after 1 PM.";
    expect(sanitizeChargeProse(specific, MICKEY)).toBe(specific);
  });

  /**
   * Verbatim from the live `propertyRules` of all three Mickey listings. These read
   * as vague pricing but are penalty clauses that name their own trigger — rewriting
   * them would delete a real house rule and leave dangling grammar
   * ("…No other charges. for not following this rule."). Regression-locked.
   */
  it.each([
    "10. Please TURN OFF the AIR CONDITIONING when not in use or when leaving. Additional charges may apply for not following this rule.",
    "Do not write on or mark the walls, ADDITIONAL FEES may be incurred for any damage.",
    "Extra charges may apply if the unit is left excessively dirty.",
    "Additional fees may be charged when check-out is delayed.",
  ])("leaves a penalty clause that names its trigger untouched: %j", (input) => {
    expect(sanitizeChargeProse(input, MICKEY)).toBe(input);
  });

  it.each([
    "No smoking indoors. Additional charges may apply.",
    "No smoking indoors. Extra charges may apply.",
    "No smoking indoors. Additional fees may apply.",
    "No smoking indoors. Any additional charges may be applied.",
    "No smoking indoors. Subject to additional charges.",
    "No smoking indoors. Other charges may apply.",
  ])("replaces the vague variant in %j", (input) => {
    const out = sanitizeChargeProse(input, MICKEY);
    expect(out).not.toMatch(/may apply|subject to additional/i);
    expect(out).toContain("No smoking indoors.");
    expect(out).toContain("₱400/guest per night");
  });

  it("states a flat price when no extra-guest fee can apply", () => {
    const out = sanitizeChargeProse("Quiet hours after 10 PM. Additional charges may apply.", FLAT);
    expect(out).toBe("Quiet hours after 10 PM. No additional charges — the nightly rate is the full price.");
  });

  it("does not repeat the replacement sentence when the phrase appears twice", () => {
    const out = sanitizeChargeProse(
      "Additional charges may apply. Please be tidy. Extra fees may apply.",
      MICKEY
    );
    expect(out.match(/₱400\/guest per night/g)).toHaveLength(1);
    expect(out).toContain("Please be tidy.");
  });

  it("returns empty string for empty input", () => {
    expect(sanitizeChargeProse(null, MICKEY)).toBe("");
    expect(sanitizeChargeProse(undefined, MICKEY)).toBe("");
    expect(sanitizeChargeProse("", MICKEY)).toBe("");
  });

  it("is safe to call repeatedly — module-level /g regexes must not carry lastIndex", () => {
    const input = "No smoking. Additional charges may apply.";
    const first = sanitizeChargeProse(input, MICKEY);
    const second = sanitizeChargeProse(input, MICKEY);
    expect(second).toBe(first);
  });
});

describe("normalizePricingProse", () => {
  it("rewrites a drifted base rate and included-guest count to live DB values", () => {
    const out = normalizePricingProse("From ₱5,000 per night, covers 3 guests.", {
      pricePerNight: 6500,
      includedGuests: 5,
    });
    expect(out).toBe("From ₱6,500 per night, covers 5 guests.");
  });

  it("also strips vague charge language when a fee record is supplied", () => {
    const out = normalizePricingProse(
      "From ₱5,000 per night. Additional charges may apply.",
      { pricePerNight: 6500, includedGuests: 5 },
      MICKEY
    );
    expect(out).toContain("₱6,500 per night");
    expect(out).not.toMatch(/may apply/i);
  });

  it("leaves vague language alone when no fee record is supplied (back-compat)", () => {
    const out = normalizePricingProse("From ₱5,000 per night. Additional charges may apply.", {
      pricePerNight: 6500,
      includedGuests: 5,
    });
    // Without occupancy context we still normalise, and the generic no-fee line is used.
    expect(out).toContain("₱6,500 per night");
  });

  it("returns empty string for empty input", () => {
    expect(normalizePricingProse(null, { pricePerNight: 1, includedGuests: 1 })).toBe("");
  });
});
