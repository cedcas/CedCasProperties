/**
 * Route-level tests for server-side Stripe verification. Prisma, Stripe, mail and the
 * availability/inventory side effects are mocked — no DB, no network. Pricing runs for
 * real (src/lib/pricing.ts over the mocked prisma), so these pin the actual amounts.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";

const { db, stripeApi, sendMail } = vi.hoisted(() => ({
  db: {
    property: { findUnique: vi.fn() },
    propertyRate: { findMany: vi.fn() },
    discountCode: { findUnique: vi.fn(), update: vi.fn() },
    booking: { findFirst: vi.fn(), create: vi.fn() },
    additionalCharge: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  },
  stripeApi: { create: vi.fn(), retrieve: vi.fn() },
  sendMail: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("stripe", () => ({
  default: class {
    paymentIntents = stripeApi;
  },
}));
vi.mock("@/lib/email", () => ({ createMailer: () => ({ sendMail }), FROM_ADDRESS: "test@example.com" }));
vi.mock("@/lib/log", () => ({ logAction: vi.fn(), getIpFromRequest: () => "127.0.0.1" }));
vi.mock("@/lib/availability", () => ({
  assertPropertyAvailable: vi.fn(),
  AvailabilityConflictError: class extends Error {
    status = 409;
  },
}));
vi.mock("@/lib/inventory-groups", () => ({ reconcileBookingDerivedBlocks: vi.fn() }));
vi.mock("@/lib/emailReply", () => ({ promoteContactMessagesForEmail: vi.fn() }));
vi.mock("@/lib/scheduler", () => ({
  materializeScheduledMessagesForBooking: vi.fn(),
  flushDueScheduledMessages: vi.fn(),
}));
vi.mock("@/lib/guestMessages", () => ({ sendGuestMessage: vi.fn() }));

import { POST as createBooking } from "@/app/api/bookings/route";
import { POST as createPaymentIntent } from "@/app/api/stripe/payment-intent/route";
import { POST as payCharge } from "@/app/api/charges/[token]/pay/route";

// Mon 5 → Wed 7 Oct 2026: 2 weeknights × ₱2,000 = ₱4,000; 3 guests with 2 included
// → ₱500 × 1 × 2 = ₱1,000 extra; card fee 6% of ₱5,000 = ₱300 → ₱5,300.
const STAY = { propertyId: 7, checkIn: "2026-10-05", checkOut: "2026-10-07", guests: "3" };
const CARD_TOTAL_CENTAVOS = 530000;
const BOOKING_METADATA = {
  kind: "booking",
  propertyId: "7",
  checkIn: "2026-10-05",
  checkOut: "2026-10-07",
  guests: "3",
  discountCode: "",
  amount: String(CARD_TOTAL_CENTAVOS),
};

const GUEST = { guestName: "Juan Dela Cruz", guestEmail: "juan@example.com", guestPhone: "09171234567" };

function req(body: unknown): NextRequest {
  return new Request("http://localhost/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

function succeededIntent(overrides: Record<string, unknown> = {}) {
  return {
    id: "pi_123",
    status: "succeeded",
    currency: "php",
    amount: CARD_TOTAL_CENTAVOS,
    amount_received: CARD_TOTAL_CENTAVOS,
    metadata: { ...BOOKING_METADATA },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_dummy");
  vi.spyOn(console, "error").mockImplementation(() => {}); // rejections log by design
  db.property.findUnique.mockResolvedValue({
    name: "Haven Suite",
    pricePerNight: 2000,
    maxGuests: 4,
    includedGuests: 2,
    extraGuestFeePerNight: 500,
    rates: [{ rateType: "weekend" }],
  });
  db.propertyRate.findMany.mockResolvedValue([]);
  db.discountCode.findUnique.mockResolvedValue(null);
  db.booking.findFirst.mockResolvedValue(null);
  db.booking.create.mockImplementation(async ({ data }) => ({
    id: 42,
    ...data,
    createdAt: new Date(),
    property: { name: "Haven Suite", location: "Lipa City", slug: "haven-suite" },
  }));
  stripeApi.create.mockResolvedValue({ client_secret: "cs_123" });
  stripeApi.retrieve.mockResolvedValue(succeededIntent());
  sendMail.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/stripe/payment-intent (booking)", () => {
  it("prices the intent server-side and ignores a client amount/currency/metadata", async () => {
    const res = await createPaymentIntent(
      req({ ...STAY, guests: 3, amount: 1, currency: "usd", metadata: { kind: "evil" } })
    );
    expect(res.status).toBe(200);
    expect(stripeApi.create).toHaveBeenCalledWith({
      amount: CARD_TOTAL_CENTAVOS,
      currency: "php",
      metadata: BOOKING_METADATA,
      automatic_payment_methods: { enabled: true },
    });
    expect(await res.json()).toMatchObject({ clientSecret: "cs_123", total: 5300 });
  });

  it("returns 503 with the message the client matches on when Stripe isn't configured", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    const res = await createPaymentIntent(req(STAY));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("Stripe is not configured on this server.");
  });

  it("rejects over-capacity guests before creating an intent", async () => {
    const res = await createPaymentIntent(req({ ...STAY, guests: 9 }));
    expect(res.status).toBe(400);
    expect(stripeApi.create).not.toHaveBeenCalled();
  });

  it("computes the promo on the server nightly total", async () => {
    db.discountCode.findUnique.mockResolvedValue({
      code: "SAVE10", type: "percentage", value: 10, isActive: true,
      propertyIds: null, maxUses: null, usageCount: 0,
    });
    await createPaymentIntent(req({ ...STAY, discountCode: "save10", nightlyTotal: 1_000_000 }));
    // ₱4,000 + ₱1,000 − ₱400 = ₱4,600; +6% = ₱4,876
    expect(stripeApi.create.mock.calls[0][0]).toMatchObject({
      amount: 487600,
      metadata: { discountCode: "SAVE10", amount: "487600" },
    });
  });
});

describe("POST /api/stripe/payment-intent (additional charge)", () => {
  it("prices the charge from the DB and stamps charge metadata", async () => {
    db.additionalCharge.findUnique.mockResolvedValue({ id: 3, amount: 1000, status: "pending" });
    const res = await createPaymentIntent(req({ kind: "additional_charge", token: "tok", amount: 1 }));
    expect(res.status).toBe(200);
    expect(stripeApi.create.mock.calls[0][0]).toMatchObject({
      amount: 106000,
      currency: "php",
      metadata: { kind: "additional_charge", chargeId: "3", token: "tok", amount: "106000" },
    });
  });

  it("refuses an already-paid charge", async () => {
    db.additionalCharge.findUnique.mockResolvedValue({ id: 3, amount: 1000, status: "paid" });
    const res = await createPaymentIntent(req({ kind: "additional_charge", token: "tok" }));
    expect(res.status).toBe(409);
    expect(stripeApi.create).not.toHaveBeenCalled();
  });

  it("404s an unknown token", async () => {
    db.additionalCharge.findUnique.mockResolvedValue(null);
    const res = await createPaymentIntent(req({ kind: "additional_charge", token: "nope" }));
    expect(res.status).toBe(404);
  });
});

describe("POST /api/bookings (stripe)", () => {
  const body = { ...STAY, ...GUEST, paymentMethod: "stripe", stripePaymentIntentId: "pi_123" };

  it("confirms a booking whose intent succeeded for the exact server total", async () => {
    const res = await createBooking(req(body));
    expect(res.status).toBe(200);
    expect(stripeApi.retrieve).toHaveBeenCalledWith("pi_123");
    const { data } = db.booking.create.mock.calls[0][0];
    expect(data).toMatchObject({ status: "confirmed", totalPrice: 5300, stripePaymentIntentId: "pi_123" });
    expect(await res.json()).toMatchObject({ success: true, bookingId: 42, total: 5300 });
  });

  it("ignores a client totalPrice that matches a tampered intent amount", async () => {
    stripeApi.retrieve.mockResolvedValue(
      succeededIntent({ amount: 100, amount_received: 100, metadata: { ...BOOKING_METADATA, amount: "100" } })
    );
    const res = await createBooking(req({ ...body, totalPrice: 1, nightlyTotal: 1 }));
    expect(res.status).toBe(400);
    expect(db.booking.create).not.toHaveBeenCalled();
  });

  it.each(["requires_payment_method", "processing"])("rejects a %s intent", async (status) => {
    stripeApi.retrieve.mockResolvedValue(succeededIntent({ status }));
    const res = await createBooking(req(body));
    expect(res.status).toBe(402);
    expect(db.booking.create).not.toHaveBeenCalled();
  });

  it("rejects a currency mismatch", async () => {
    stripeApi.retrieve.mockResolvedValue(succeededIntent({ currency: "usd" }));
    const res = await createBooking(req(body));
    expect(res.status).toBe(400);
    expect(db.booking.create).not.toHaveBeenCalled();
  });

  it("rejects an intent minted for different dates", async () => {
    stripeApi.retrieve.mockResolvedValue(
      succeededIntent({ metadata: { ...BOOKING_METADATA, checkOut: "2026-10-08" } })
    );
    const res = await createBooking(req(body));
    expect(res.status).toBe(400);
    expect(db.booking.create).not.toHaveBeenCalled();
  });

  it("rejects a reused intent with 409", async () => {
    db.booking.findFirst.mockResolvedValue({ id: 1 });
    const res = await createBooking(req(body));
    expect(res.status).toBe(409);
    expect(db.booking.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { stripePaymentIntentId: "pi_123" } })
    );
    expect(db.booking.create).not.toHaveBeenCalled();
  });

  it("requires a payment reference", async () => {
    const res = await createBooking(req({ ...body, stripePaymentIntentId: null }));
    expect(res.status).toBe(400);
    expect(db.booking.create).not.toHaveBeenCalled();
  });

  it("returns 400 when the intent can't be retrieved", async () => {
    stripeApi.retrieve.mockRejectedValue(new Error("No such payment_intent"));
    const res = await createBooking(req(body));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Could not verify payment");
  });

  it("returns 503 when Stripe isn't configured", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    const res = await createBooking(req(body));
    expect(res.status).toBe(503);
    expect(db.booking.create).not.toHaveBeenCalled();
  });
});

describe("POST /api/bookings (gcash / bpi)", () => {
  it("stays pending, ignores a supplied intent id and never calls Stripe", async () => {
    const res = await createBooking(
      req({ ...STAY, ...GUEST, paymentMethod: "gcash", stripePaymentIntentId: "pi_123" })
    );
    expect(res.status).toBe(200);
    expect(stripeApi.retrieve).not.toHaveBeenCalled();
    const { data } = db.booking.create.mock.calls[0][0];
    // No card fee for QR payments: ₱4,000 + ₱1,000.
    expect(data).toMatchObject({ status: "pending", stripePaymentIntentId: null, totalPrice: 5000 });
  });

  it("computes the discount on the server nightly total, ignoring client totals", async () => {
    db.discountCode.findUnique.mockResolvedValue({
      code: "SAVE10", type: "percentage", value: 10, isActive: true,
      propertyIds: null, maxUses: null, usageCount: 0,
    });
    await createBooking(
      req({
        ...STAY, ...GUEST, paymentMethod: "bpi", discountCode: "save10",
        nightlyTotal: 1_000_000, totalPrice: 1_000_000, discountAmount: 999_999,
      })
    );
    const { data } = db.booking.create.mock.calls[0][0];
    expect(data).toMatchObject({ discountCode: "SAVE10", discountAmount: 400, nightlyTotal: 4000, totalPrice: 4600 });
  });

  it("caps a fixed discount at the server nightly total", async () => {
    db.discountCode.findUnique.mockResolvedValue({
      code: "BIG", type: "fixed", value: 50_000, isActive: true,
      propertyIds: null, maxUses: null, usageCount: 0,
    });
    await createBooking(
      req({ ...STAY, ...GUEST, paymentMethod: "gcash", discountCode: "BIG", nightlyTotal: 1_000_000 })
    );
    const { data } = db.booking.create.mock.calls[0][0];
    expect(data).toMatchObject({ discountAmount: 4000, totalPrice: 1000 });
  });
});

describe("POST /api/charges/[token]/pay (stripe)", () => {
  const params = { params: Promise.resolve({ token: "tok" }) };
  const chargeIntent = (overrides: Record<string, unknown> = {}) => ({
    id: "pi_charge",
    status: "succeeded",
    currency: "php",
    amount: 106000,
    amount_received: 106000,
    metadata: { kind: "additional_charge", chargeId: "3", token: "tok", amount: "106000" },
    ...overrides,
  });

  beforeEach(() => {
    db.additionalCharge.findUnique.mockResolvedValue({
      id: 3, amount: 1000, status: "pending", description: "Late checkout",
      booking: { id: 42, guestName: "Juan", property: { name: "Haven Suite" } },
    });
    db.additionalCharge.findFirst.mockResolvedValue(null);
    db.additionalCharge.update.mockResolvedValue({ status: "paid" });
    stripeApi.retrieve.mockResolvedValue(chargeIntent());
  });

  const pay = () => payCharge(req({ paymentMethod: "stripe", stripePaymentIntentId: "pi_charge" }), params);

  it("marks the charge paid when the intent matches", async () => {
    const res = await pay();
    expect(res.status).toBe(200);
    expect(db.additionalCharge.update).toHaveBeenCalled();
  });

  it("rejects an intent for a smaller amount", async () => {
    stripeApi.retrieve.mockResolvedValue(chargeIntent({ amount: 100, amount_received: 100 }));
    expect((await pay()).status).toBe(400);
    expect(db.additionalCharge.update).not.toHaveBeenCalled();
  });

  it("rejects an intent minted for a booking, not this charge", async () => {
    stripeApi.retrieve.mockResolvedValue(chargeIntent({ metadata: { ...BOOKING_METADATA, amount: "106000" } }));
    expect((await pay()).status).toBe(400);
    expect(db.additionalCharge.update).not.toHaveBeenCalled();
  });

  it("rejects an intent already used by another charge", async () => {
    db.additionalCharge.findFirst.mockResolvedValue({ id: 99 });
    expect((await pay()).status).toBe(409);
    expect(db.additionalCharge.update).not.toHaveBeenCalled();
  });
});
