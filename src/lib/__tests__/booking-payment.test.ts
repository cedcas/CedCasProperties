/**
 * Paying an approved booking request (src/lib/booking-payment.ts) and the public route in
 * front of it. Prisma, Stripe, mail, the inventory lock and the availability service are
 * mocked — no DB, no network. The real-row and concurrency cases live in the db suite.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const { db, tx, stripeRetrieve, sendMail, logAction, assertScope, reconcileSource, scheduler, ga4 } = vi.hoisted(() => {
  const tx = {
    $queryRaw: vi.fn(),
    booking: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
  };
  return {
    tx,
    db: {
      booking: { findUnique: vi.fn() },
      discountCode: { update: vi.fn() },
      adminLog: { findFirst: vi.fn(), create: vi.fn() },
    },
    stripeRetrieve: vi.fn(),
    sendMail: vi.fn(),
    logAction: vi.fn(),
    assertScope: vi.fn(),
    reconcileSource: vi.fn(),
    scheduler: { materializeScheduledMessagesForBooking: vi.fn(), flushDueScheduledMessages: vi.fn() },
    ga4: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("stripe", () => ({ default: class { paymentIntents = { retrieve: stripeRetrieve }; } }));
vi.mock("@/lib/email", () => ({ createMailer: () => ({ sendMail }), FROM_ADDRESS: "test@example.com" }));
vi.mock("@/lib/log", () => ({ logAction, getIpFromRequest: () => "203.0.113.9" }));
vi.mock("@/lib/availability", () => ({
  assertInventoryScopeAvailable: assertScope,
  AvailabilityConflictError: class extends Error {
    status = 409;
  },
}));
vi.mock("@/lib/inventory-lock", () => ({ withInventoryLock: (_ids: number[], fn: (t: typeof tx) => unknown) => fn(tx) }));
vi.mock("@/lib/inventory-groups", () => ({ reconcileSource }));
vi.mock("@/lib/scheduler", () => scheduler);
vi.mock("@/lib/ga4-measurement-protocol", () => ({ sendBookingConfirmedMeasurementEvent: ga4 }));
vi.mock("@/lib/checkout-abandonment", () => ({ ADMIN_ALERT_TO: "customerservice@haveninlipa.com" }));

import { AvailabilityConflictError } from "@/lib/availability";
import { BookingPaymentError, cardTotalFor, paymentLinkState, submitBookingPayment } from "@/lib/booking-payment";
import { bookingPaymentIntentMetadata } from "@/lib/stripe-payment";
import { redactPageLocation } from "@/lib/analytics-config";
import { POST as payRoute } from "@/app/api/bookings/pay/[token]/route";

const manila = (date: string, time: string) => new Date(`${date}T${time}:00+08:00`);
const NOW = manila("2026-10-12", "09:00");
const TOKEN = "tok_abcdefghijklmnopqrstuvwxyz012345";
// ₱4,000 stay; card fee 6% → ₱4,240.
const CARD_CENTAVOS = 424000;

function approved(over: Record<string, unknown> = {}) {
  return {
    id: 42,
    status: "approved",
    propertyId: 7,
    guestName: "Juan Dela Cruz",
    guestEmail: "juan@example.com",
    guestPhone: "+639171234567",
    checkIn: new Date("2026-10-20T00:00:00Z"),
    checkOut: new Date("2026-10-22T00:00:00Z"),
    guests: 2,
    totalPrice: 4000,
    discountCode: null,
    paymentToken: TOKEN,
    paymentLinkExpiresAt: manila("2026-10-13", "09:00"),
    stripePaymentIntentId: null,
    property: { name: "Haven Suite", slug: "haven-suite" },
    ...over,
  };
}

function paidIntent(over: Record<string, unknown> = {}) {
  return {
    id: "pi_123",
    status: "succeeded",
    currency: "php",
    amount: CARD_CENTAVOS,
    amount_received: CARD_CENTAVOS,
    metadata: bookingPaymentIntentMetadata({ bookingId: 42, token: TOKEN, amount: CARD_CENTAVOS }),
    ...over,
  };
}

const pay = (over: Record<string, unknown> = {}) => submitBookingPayment({ token: TOKEN, paymentMethod: "gcash", now: NOW, ...over });
const rejection = async (p: Promise<unknown>) => {
  const err = await p.then(
    () => null,
    (e) => e
  );
  expect(err).toBeInstanceOf(BookingPaymentError);
  return err as BookingPaymentError;
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_dummy");
  vi.spyOn(console, "error").mockImplementation(() => {});
  db.booking.findUnique.mockResolvedValue(approved());
  db.adminLog.findFirst.mockResolvedValue(null);
  db.adminLog.create.mockResolvedValue({});
  tx.booking.findUniqueOrThrow.mockResolvedValue({ status: "approved", stripePaymentIntentId: null });
  tx.booking.update.mockResolvedValue({});
  assertScope.mockResolvedValue(undefined);
  stripeRetrieve.mockResolvedValue(paidIntent());
  sendMail.mockResolvedValue(undefined);
});

describe("paymentLinkState", () => {
  it("an approved request is payable until its link expires", () => {
    const b = { status: "approved", paymentLinkExpiresAt: manila("2026-10-13", "09:00") };
    expect(paymentLinkState(b, NOW)).toBe("payable");
    expect(paymentLinkState(b, manila("2026-10-13", "09:00"))).toBe("link_expired");
  });

  it.each([
    ["pending", "pending"],
    ["confirmed", "confirmed"],
    ["expired", "link_expired"],
    ["cancelled", "closed"],
    ["declined", "closed"],
    ["requested", "closed"],
  ])("%s → %s", (status, state) => {
    expect(paymentLinkState({ status, paymentLinkExpiresAt: null }, NOW)).toBe(state);
  });

  it("the card total is the stored total plus 6%", () => {
    expect(cardTotalFor(4000)).toEqual({ fee: 240, total: 4240 });
  });
});

describe("GCash / BPI — “I've Paid”", () => {
  it("holds the dates under the lock: re-check, then pending, then sibling blocks", async () => {
    const result = await pay({ paymentMethod: "bpi" });
    expect(result).toEqual({ status: "pending", bookingId: 42, total: 4000, propertySlug: "haven-suite", propertyName: "Haven Suite", nights: 2 });

    expect(assertScope).toHaveBeenCalledWith(expect.objectContaining({ propertyId: 7, excludeBookingId: 42, db: tx }));
    expect(tx.booking.update).toHaveBeenCalledWith({
      where: { id: 42 },
      data: { paymentMethod: "bpi", paymentSubmittedAt: NOW, status: "pending" },
    });
    expect(reconcileSource).toHaveBeenCalledWith(expect.objectContaining({ kind: "booking", id: 42, isActive: true }), { db: tx });
    // Availability is checked before anything is written.
    expect(assertScope.mock.invocationCallOrder[0]).toBeLessThan(tx.booking.update.mock.invocationCallOrder[0]);
  });

  it("tells the guest it is being verified and asks the admin to verify", async () => {
    await pay();
    expect(sendMail.mock.calls.map(([m]) => [m.to, m.subject])).toEqual([
      ["juan@example.com", "Payment Received, Being Verified – Haven Suite"],
      ["customerservice@haveninlipa.com", "Verify Payment – Booking #42, Haven Suite"],
    ]);
    expect(stripeRetrieve).not.toHaveBeenCalled();
    // Not confirmed yet: no reminders are scheduled and no server-side conversion is sent.
    expect(scheduler.materializeScheduledMessagesForBooking).not.toHaveBeenCalled();
    expect(ga4).not.toHaveBeenCalled();
  });

  it("counts a promo code's use now that the request is paid", async () => {
    db.booking.findUnique.mockResolvedValue(approved({ discountCode: "WELCOME" }));
    await pay();
    expect(db.discountCode.update).toHaveBeenCalledWith({ where: { code: "WELCOME" }, data: { usageCount: { increment: 1 } } });
  });

  it("dates taken: refused, nothing held, one admin alert and one log entry however often it is tapped", async () => {
    assertScope.mockRejectedValue(new AvailabilityConflictError("taken", []));
    const err = await rejection(pay());
    expect(err).toMatchObject({ status: 409, code: "unavailable" });
    expect(err.message).toContain("do not pay again");
    expect(err.message).toContain("#42");
    expect(tx.booking.update).not.toHaveBeenCalled();
    expect(db.adminLog.create).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail.mock.calls[0][0].subject).toContain("Dates Already Taken");

    db.adminLog.findFirst.mockResolvedValue({ id: 1 });
    await rejection(pay());
    expect(db.adminLog.create).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["an expired link", { paymentLinkExpiresAt: manila("2026-10-12", "08:00") }, "expired"],
    ["a link already used", { status: "pending" }, "already recorded your payment"],
    ["a confirmed booking", { status: "confirmed" }, "already paid"],
    ["a cancelled approval", { status: "cancelled" }, "no longer active"],
  ])("refuses %s without touching the lock", async (_name, over, text) => {
    db.booking.findUnique.mockResolvedValue(approved(over));
    const err = await rejection(pay());
    expect(err).toMatchObject({ status: 409, code: "not_payable" });
    expect(err.message).toContain(text);
    expect(tx.$queryRaw).not.toHaveBeenCalled();
  });

  it("a second tap that arrives while the first is committing gets “already recorded”, not a second hold", async () => {
    tx.booking.findUniqueOrThrow.mockResolvedValue({ status: "pending", stripePaymentIntentId: null });
    const err = await rejection(pay());
    expect(err.message).toContain("already recorded your payment");
    expect(tx.booking.update).not.toHaveBeenCalled();
  });

  it("an unknown token or method is rejected", async () => {
    expect((await rejection(pay({ paymentMethod: "cash" }))).status).toBe(400);
    db.booking.findUnique.mockResolvedValue(null);
    expect((await rejection(pay())).status).toBe(404);
  });
});

describe("card", () => {
  const card = (over: Record<string, unknown> = {}) => pay({ paymentMethod: "stripe", stripePaymentIntentId: "pi_123", ...over });

  it("verifies the payment, then confirms with the fee added to the total", async () => {
    const result = await card();
    expect(result).toMatchObject({ status: "confirmed", total: 4240 });
    expect(tx.booking.update).toHaveBeenCalledWith({
      where: { id: 42 },
      data: { paymentMethod: "stripe", stripeFee: 240, totalPrice: 4240, stripePaymentIntentId: "pi_123", status: "confirmed" },
    });
    expect(scheduler.materializeScheduledMessagesForBooking).toHaveBeenCalledWith(42);
    expect(ga4).toHaveBeenCalledWith(expect.objectContaining({ bookingId: 42, total: 4240, nights: 2 }));
    expect(sendMail.mock.calls.map(([m]) => m.subject)).toEqual([
      "Booking Confirmed – Haven Suite",
      "Booking Confirmed (Card) – Booking #42, Haven Suite",
    ]);
    expect(sendMail.mock.calls[0][0].html).toContain("Credit/Debit Card");
    expect(sendMail.mock.calls[0][0].html).not.toMatch(/stripe/i);
  });

  it.each([
    ["not completed", { status: "requires_payment_method" }, 402],
    ["the wrong amount (the stay without the fee)", { amount: 400000, amount_received: 400000 }, 400],
    ["minted for another booking", { metadata: bookingPaymentIntentMetadata({ bookingId: 43, token: TOKEN, amount: CARD_CENTAVOS }) }, 400],
    ["an instant-booking payment replayed here", { metadata: { kind: "booking", propertyId: "7", amount: String(CARD_CENTAVOS) } }, 400],
  ])("rejects a payment that is %s, changing nothing", async (_name, over, status) => {
    stripeRetrieve.mockResolvedValue(paidIntent(over));
    expect((await rejection(card())).status).toBe(status);
    expect(tx.$queryRaw).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("charged, then the dates were taken: no booking, guest gets the reference, admin alerted once", async () => {
    assertScope.mockRejectedValue(new AvailabilityConflictError("taken", []));
    const err = await rejection(card());
    expect(err).toMatchObject({ status: 409, code: "paid_unavailable", paymentReference: "pi_123" });
    expect(err.message).toContain("do not pay again");
    expect(tx.booking.update).not.toHaveBeenCalled();
    expect(db.adminLog.create).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail.mock.calls[0][0].subject).toContain("Card charged, booking NOT saved");
  });

  it("a card charged a moment after the link's expiry is still honoured while the request is approved", async () => {
    db.booking.findUnique.mockResolvedValue(approved({ paymentLinkExpiresAt: manila("2026-10-12", "08:59") }));
    expect((await card()).status).toBe("confirmed");
  });

  it("a card charged after the request was expired or cancelled is reported, not silently dropped", async () => {
    db.booking.findUnique.mockResolvedValue(approved({ status: "expired" }));
    const err = await rejection(card());
    expect(err).toMatchObject({ code: "paid_unavailable", paymentReference: "pi_123" });
    expect(db.adminLog.create).toHaveBeenCalledTimes(1);
  });

  it("a retry after success returns the same confirmation without charging or emailing again", async () => {
    db.booking.findUnique.mockResolvedValue(approved({ status: "confirmed", stripePaymentIntentId: "pi_123", totalPrice: 4240 }));
    expect(await card()).toMatchObject({ status: "confirmed", total: 4240 });
    expect(stripeRetrieve).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("needs a payment reference", async () => {
    expect((await rejection(card({ stripePaymentIntentId: undefined }))).status).toBe(400);
  });
});

describe("POST /api/bookings/pay/[token]", () => {
  const post = (body: unknown) =>
    payRoute(
      new Request(`http://localhost/api/bookings/pay/${TOKEN}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }) as unknown as NextRequest,
      { params: Promise.resolve({ token: TOKEN }) }
    );

  it("returns what the page needs for the conversion event", async () => {
    const res = await post({ paymentMethod: "gcash" });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true, status: "pending", bookingId: 42, total: 4000, propertySlug: "haven-suite" });
  });

  it("passes a refusal through with its code, and the payment reference when a card was charged", async () => {
    assertScope.mockRejectedValue(new AvailabilityConflictError("taken", []));
    const res = await post({ paymentMethod: "stripe", stripePaymentIntentId: "pi_123" });
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: "paid_unavailable", paymentReference: "pi_123" });
  });

  it("ignores any amount the browser sends", async () => {
    await post({ paymentMethod: "gcash", amount: 1, totalPrice: 1 });
    expect(tx.booking.update.mock.calls[0][0].data).not.toHaveProperty("totalPrice");
  });
});

describe("the payment link never reaches analytics", () => {
  it("redacts the token on both kinds of payment page", () => {
    expect(redactPageLocation(`https://haveninlipa.com/pay/booking/${TOKEN}?x=1`)).toBe("https://haveninlipa.com/pay/booking/[token]");
    expect(redactPageLocation("https://haveninlipa.com/pay/tok_secret")).toBe("https://haveninlipa.com/pay/[token]");
  });
});
