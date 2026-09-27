import { describe, it, expect } from "vitest";
import {
  verifyPaymentIntent,
  toStripeAmount,
  bookingIntentMetadata,
  chargeIntentMetadata,
  STRIPE_CURRENCY,
  type PaymentIntentLike,
} from "@/lib/stripe-payment";
import { toUtcMidnight } from "@/lib/dates";

const metadata = bookingIntentMetadata({
  propertyId: 7,
  checkIn: toUtcMidnight("2026-10-05"),
  checkOut: toUtcMidnight("2026-10-07"),
  guests: 3,
  discountCode: null,
  amount: 530000,
});

function pi(overrides: Partial<PaymentIntentLike> = {}): PaymentIntentLike {
  return {
    status: "succeeded",
    currency: "php",
    amount: 530000,
    amount_received: 530000,
    metadata: { ...metadata },
    ...overrides,
  };
}

describe("toStripeAmount", () => {
  it("converts pesos to integer centavos", () => {
    expect(toStripeAmount(5300)).toBe(530000);
    expect(toStripeAmount(4876.2)).toBe(487620);
    expect(toStripeAmount(0.1 + 0.2)).toBe(30); // float noise is rounded away
  });
  it("uses PHP", () => {
    expect(STRIPE_CURRENCY).toBe("php");
  });
});

describe("bookingIntentMetadata / chargeIntentMetadata", () => {
  it("stamps calendar-date keys regardless of runtime timezone", () => {
    expect(metadata).toEqual({
      kind: "booking",
      propertyId: "7",
      checkIn: "2026-10-05",
      checkOut: "2026-10-07",
      guests: "3",
      discountCode: "",
      amount: "530000",
    });
  });
  it("builds charge metadata", () => {
    expect(chargeIntentMetadata({ chargeId: 3, token: "tok", amount: 10600 })).toEqual({
      kind: "additional_charge",
      chargeId: "3",
      token: "tok",
      amount: "10600",
    });
  });
});

describe("verifyPaymentIntent", () => {
  const expected = { amount: 530000, metadata };

  it("accepts a succeeded intent with matching amount, currency and metadata", () => {
    expect(verifyPaymentIntent(pi(), expected)).toEqual({ ok: true });
  });

  it.each(["requires_payment_method", "requires_action", "processing", "canceled", "requires_capture"])(
    "rejects a %s intent with 402",
    (status) => {
      const r = verifyPaymentIntent(pi({ status }), expected);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.status).toBe(402);
    }
  );

  it("rejects a currency mismatch", () => {
    const r = verifyPaymentIntent(pi({ currency: "usd" }), expected);
    expect(r).toMatchObject({ ok: false, status: 400 });
  });

  it("rejects when amount_received differs from the server total", () => {
    expect(verifyPaymentIntent(pi({ amount_received: 100 }), expected)).toMatchObject({ ok: false, status: 400 });
  });

  it("rejects when the intent amount differs from the server total", () => {
    expect(
      verifyPaymentIntent(pi({ amount: 100, amount_received: 100 }), expected)
    ).toMatchObject({ ok: false, status: 400 });
  });

  it.each([
    ["kind", "additional_charge"],
    ["propertyId", "8"],
    ["checkIn", "2026-10-04"],
    ["checkOut", "2026-10-08"],
    ["guests", "2"],
    ["amount", "1"],
    ["discountCode", "SAVE10"],
  ])("rejects a metadata mismatch on %s", (key, value) => {
    const r = verifyPaymentIntent(pi({ metadata: { ...metadata, [key]: value } }), expected);
    expect(r).toMatchObject({ ok: false, status: 400 });
  });

  it("rejects an intent with no metadata (e.g. created by an old client)", () => {
    expect(verifyPaymentIntent(pi({ metadata: null }), expected)).toMatchObject({ ok: false, status: 400 });
  });
});
