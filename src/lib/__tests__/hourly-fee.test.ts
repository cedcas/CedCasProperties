import { describe, it, expect } from "vitest";
import {
  HOURLY_FEE_RATE,
  buildHourlyFeeDescription,
  isHourlyFeeType,
  isValidHours,
} from "@/lib/hourly-fee";

describe("hourly-fee", () => {
  it("rate is the published ₱200/hour", () => {
    expect(HOURLY_FEE_RATE).toBe(200);
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

  it("builds a description that includes the type, hours, and rate", () => {
    expect(buildHourlyFeeDescription("early_checkin", 3)).toBe(
      "Early Check-In — 3 hours (₱200/hr)"
    );
    expect(buildHourlyFeeDescription("late_checkout", 1)).toBe(
      "Late Checkout — 1 hour (₱200/hr)"
    );
  });
});
