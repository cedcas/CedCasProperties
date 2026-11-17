import { describe, it, expect } from "vitest";
import {
  HOURLY_FEE_RATE_MICKEY,
  HOURLY_FEE_RATE_ORIGINAL_HAVEN,
  HOURLY_FEE_RATES_DESCRIPTION,
  hourlyFeeRateFor,
  hourlyFeeLabelFor,
  buildHourlyFeeDescription,
  isHourlyFeeType,
  isValidHours,
} from "@/lib/hourly-fee";

describe("hourly-fee", () => {
  it("publishes ₱400/hr for Mickey in Lipa and ₱300/hr for Original Haven in Lipa", () => {
    expect(HOURLY_FEE_RATE_MICKEY).toBe(400);
    expect(HOURLY_FEE_RATE_ORIGINAL_HAVEN).toBe(300);
  });

  describe("hourlyFeeRateFor", () => {
    it("returns ₱400 for every Mickey in Lipa (B38) slug", () => {
      expect(hourlyFeeRateFor("mickey-in-lipa--family-staycation--sleeps-7")).toBe(400);
      expect(hourlyFeeRateFor("mickey-in-lipa--family-house--sleeps-11")).toBe(400);
      expect(hourlyFeeRateFor("mickey-in-lipa--full-family-house--sleeps-15")).toBe(400);
      expect(hourlyFeeRateFor({ slug: "mickey-in-lipa--family-house--sleeps-11" })).toBe(400);
    });

    it("returns ₱300 for both Original Haven in Lipa (B34) slugs", () => {
      expect(hourlyFeeRateFor("cozy-1-bedroom")).toBe(300);
      expect(hourlyFeeRateFor("spacious-2-bedroom")).toBe(300);
      expect(hourlyFeeRateFor({ slug: "cozy-1-bedroom" })).toBe(300);
    });

    it("never falls back to the old ₱200 rate for an unrecognized or missing listing", () => {
      expect(hourlyFeeRateFor("some-future-listing")).toBeNull();
      expect(hourlyFeeRateFor(undefined)).toBeNull();
      expect(hourlyFeeRateFor(null)).toBeNull();
      expect(hourlyFeeRateFor({})).toBeNull();
      expect(hourlyFeeRateFor("some-future-listing")).not.toBe(200);
    });
  });

  describe("hourlyFeeLabelFor", () => {
    it("states the specific listing's rate when known", () => {
      expect(hourlyFeeLabelFor("mickey-in-lipa--family-house--sleeps-11")).toBe("₱400/hour");
      expect(hourlyFeeLabelFor("cozy-1-bedroom")).toBe("₱300/hour");
    });

    it("states both group rates, never a flat default, when the listing is unknown", () => {
      expect(hourlyFeeLabelFor(undefined)).toBe(HOURLY_FEE_RATES_DESCRIPTION);
      expect(HOURLY_FEE_RATES_DESCRIPTION).toContain("₱400/hour");
      expect(HOURLY_FEE_RATES_DESCRIPTION).toContain("₱300/hour");
      expect(HOURLY_FEE_RATES_DESCRIPTION).not.toContain("₱200");
    });
  });

  it("accepts only the two known fee types", () => {
    expect(isHourlyFeeType("early_checkin")).toBe(true);
    expect(isHourlyFeeType("late_checkout")).toBe(true);
    expect(isHourlyFeeType("damage")).toBe(false);
    expect(isHourlyFeeType(undefined)).toBe(false);
    expect(isHourlyFeeType(null)).toBe(false);
  });

  it("accepts only whole positive hours", () => {
    expect(isValidHours(1)).toBe(true);
    expect(isValidHours(6)).toBe(true);
    expect(isValidHours(0)).toBe(false);
    expect(isValidHours(-2)).toBe(false);
    expect(isValidHours(1.5)).toBe(false);
    expect(isValidHours(NaN)).toBe(false);
    expect(isValidHours("3")).toBe(false); // must already be a number, not a numeric string
    expect(isValidHours(undefined)).toBe(false);
  });

  it("builds a description that includes the type, hours, and the given rate", () => {
    expect(buildHourlyFeeDescription("early_checkin", 3, 400)).toBe(
      "Early Check-In — 3 hours (₱400/hr)"
    );
    expect(buildHourlyFeeDescription("late_checkout", 1, 300)).toBe(
      "Late Checkout — 1 hour (₱300/hr)"
    );
  });
});
