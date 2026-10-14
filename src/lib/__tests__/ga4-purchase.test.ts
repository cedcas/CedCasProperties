import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  buildPurchaseParams,
  markPurchaseSent,
  purchaseTransactionId,
  shouldSendPurchase,
  trackPurchaseOnce,
  type PurchaseInput,
} from "@/lib/ga4-purchase";

function memoryStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}

beforeEach(() => {
  vi.stubGlobal("window", { sessionStorage: memoryStorage() });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("purchaseTransactionId", () => {
  it("matches booking_confirmed's HIL-<bookingId> format", () => {
    expect(purchaseTransactionId(140)).toBe("HIL-140");
  });
});

describe("buildPurchaseParams", () => {
  const base: PurchaseInput = {
    bookingId: 140,
    propertySlug: "mickey-in-lipa",
    propertyName: "Mickey in Lipa",
    total: 12345.6,
    nights: 3,
  };

  it("splits the total across nights for item price/quantity (nights > 0)", () => {
    const p = buildPurchaseParams(base);
    expect(p.transaction_id).toBe("HIL-140");
    expect(p.currency).toBe("PHP");
    expect(p.value).toBe(12346); // Math.round
    expect(p.items).toEqual([
      {
        item_id: "mickey-in-lipa",
        item_name: "Mickey in Lipa",
        item_category: "stay",
        price: 4115.2,
        quantity: 3,
      },
    ]);
  });

  it("falls back to quantity 1 / price = total when nights is 0", () => {
    const p = buildPurchaseParams({ ...base, total: 5000, nights: 0 });
    expect(p.items[0]).toEqual({
      item_id: "mickey-in-lipa",
      item_name: "Mickey in Lipa",
      item_category: "stay",
      price: 5000,
      quantity: 1,
    });
  });

  it("rounds the per-night price to 2dp", () => {
    const p = buildPurchaseParams({ ...base, total: 1000, nights: 3 });
    expect(p.items[0].price).toBe(333.33);
  });
});

describe("shouldSendPurchase / markPurchaseSent", () => {
  it("allows the first send and skips a repeat for the same transaction_id", () => {
    expect(shouldSendPurchase("HIL-1")).toBe(true);
    markPurchaseSent("HIL-1");
    expect(shouldSendPurchase("HIL-1")).toBe(false);
  });

  it("is per-transaction: a different transaction_id is unaffected", () => {
    markPurchaseSent("HIL-1");
    expect(shouldSendPurchase("HIL-2")).toBe(true);
  });

  it("never throws when storage is blocked, and defaults to allow-send", () => {
    vi.stubGlobal("window", {
      sessionStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("blocked");
        },
      },
    });
    expect(() => shouldSendPurchase("HIL-2")).not.toThrow();
    expect(shouldSendPurchase("HIL-2")).toBe(true);
    expect(() => markPurchaseSent("HIL-2")).not.toThrow();
  });
});

describe("trackPurchaseOnce", () => {
  const input: PurchaseInput = {
    bookingId: 140,
    propertySlug: "mickey-in-lipa",
    propertyName: "Mickey in Lipa",
    total: 12345.6,
    nights: 3,
  };

  it("fires `purchase` once per transaction_id and skips a repeat call", () => {
    const track = vi.fn();
    trackPurchaseOnce(track, input);
    trackPurchaseOnce(track, input);
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith(
      "purchase",
      expect.objectContaining({ transaction_id: "HIL-140", value: 12346, currency: "PHP" })
    );
  });

  it("does not block or alter the caller's booking_confirmed send", () => {
    const track = vi.fn();
    const confirmed = { bookingId: 141, total: 5000, propertySlug: "cozy-1-bedroom" };

    // Mirrors the BookingForm.tsx effect: booking_confirmed first, unchanged, then purchase.
    track("booking_confirmed", {
      property: confirmed.propertySlug,
      value: Math.round(confirmed.total),
      currency: "PHP",
      transaction_id: `HIL-${confirmed.bookingId}`,
    });
    trackPurchaseOnce(track, {
      bookingId: confirmed.bookingId,
      propertySlug: confirmed.propertySlug,
      propertyName: "Cozy 1-Bedroom",
      total: confirmed.total,
      nights: 2,
    });

    expect(track).toHaveBeenNthCalledWith(1, "booking_confirmed", {
      property: "cozy-1-bedroom",
      value: 5000,
      currency: "PHP",
      transaction_id: "HIL-141",
    });
    expect(track).toHaveBeenNthCalledWith(
      2,
      "purchase",
      expect.objectContaining({ transaction_id: "HIL-141", value: 5000, currency: "PHP" })
    );
  });
});
