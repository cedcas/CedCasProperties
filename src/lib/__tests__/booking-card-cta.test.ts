import { describe, it, expect } from "vitest";
import { bookingCtaLabel, isBookingCtaDisabled } from "@/lib/booking-card-cta";

describe("isBookingCtaDisabled", () => {
  it("is disabled when not priced", () => {
    expect(isBookingCtaDisabled({ notPriced: true, availability: "idle" })).toBe(true);
  });

  it("is disabled when dates are unavailable", () => {
    expect(isBookingCtaDisabled({ notPriced: false, availability: "unavailable" })).toBe(true);
  });

  it("is disabled while checking availability", () => {
    expect(isBookingCtaDisabled({ notPriced: false, availability: "checking" })).toBe(true);
  });

  it("is enabled once priced and not unavailable/checking — with no dates chosen yet", () => {
    // DEC-034: the CTA is reachable with no dates selected (handleBook shows an
    // inline date-required error instead) and, crucially, has no rules-agreement
    // parameter at all — the listing-page "Agree to Rules to Book" gate is gone.
    expect(isBookingCtaDisabled({ notPriced: false, availability: "idle" })).toBe(false);
    expect(isBookingCtaDisabled({ notPriced: false, availability: "available" })).toBe(false);
  });
});

describe("bookingCtaLabel", () => {
  it("says Not Available Yet when unpriced", () => {
    expect(bookingCtaLabel({ notPriced: true, availability: "idle", nights: 0, stayTotal: 0 })).toBe(
      "Not Available Yet"
    );
  });

  it("says Dates Not Available when unavailable", () => {
    expect(
      bookingCtaLabel({ notPriced: false, availability: "unavailable", nights: 2, stayTotal: 5000 })
    ).toBe("Dates Not Available");
  });

  it("shows the live total once nights are chosen", () => {
    expect(
      bookingCtaLabel({ notPriced: false, availability: "available", nights: 2, stayTotal: 3600 })
    ).toBe("Book — ₱3,600");
  });

  it("rounds a fractional total", () => {
    expect(
      bookingCtaLabel({ notPriced: false, availability: "idle", nights: 1, stayTotal: 1799.6 })
    ).toBe("Book — ₱1,800");
  });

  it("falls back to a clear next-step label before dates are chosen", () => {
    // DEC-034: replaces the old "Agree to Rules to Book" label — there is no
    // rules gate left to describe, and "Book this Property" read oddly for a
    // button that only proceeds to a second (checkout) step.
    expect(bookingCtaLabel({ notPriced: false, availability: "idle", nights: 0, stayTotal: 0 })).toBe(
      "Continue to Book"
    );
  });
});
