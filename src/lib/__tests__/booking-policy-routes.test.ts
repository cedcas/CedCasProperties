/**
 * Route-level tests for the guest advance-notice rule (src/lib/booking-policy.ts): the
 * three guest routes and the public availability route. Prisma, Stripe, mail and the
 * availability service are mocked — no DB, no network — and the clock is pinned, so
 * every case states the Manila time it runs at.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";

const { db, stripeApi, sendMail, availability } = vi.hoisted(() => ({
  db: {
    property: { findUnique: vi.fn() },
    propertyRate: { findMany: vi.fn() },
    discountCode: { findUnique: vi.fn(), update: vi.fn() },
    booking: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    checkoutAttempt: { findUnique: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
    adminLog: { findFirst: vi.fn(), create: vi.fn() },
  },
  stripeApi: { create: vi.fn(), retrieve: vi.fn() },
  sendMail: vi.fn(),
  availability: {
    assertPropertyAvailable: vi.fn(),
    assertInventoryScopeAvailable: vi.fn(),
    getPropertyConflicts: vi.fn(),
    getUnavailableDateRanges: vi.fn(),
  },
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
  ...availability,
  formatConflictRange: () => "",
  AvailabilityConflictError: class extends Error {
    status = 409;
  },
}));
vi.mock("@/lib/inventory-groups", () => ({ reconcileBookingDerivedBlocks: vi.fn() }));
vi.mock("@/lib/inventory-lock", () => ({
  withInventoryLock: (_ids: number[], fn: (tx: typeof db) => unknown) => fn(db),
}));
vi.mock("@/lib/emailReply", () => ({ promoteContactMessagesForEmail: vi.fn() }));
vi.mock("@/lib/scheduler", () => ({
  materializeScheduledMessagesForBooking: vi.fn(),
  flushDueScheduledMessages: vi.fn(),
}));

import { POST as createBooking } from "@/app/api/bookings/route";
import { POST as createPaymentIntent } from "@/app/api/stripe/payment-intent/route";
import { POST as recordAttempt } from "@/app/api/checkout-attempts/route";
import { GET as getAvailability } from "@/app/api/availability/[slug]/route";
import { AvailabilityConflictError } from "@/lib/availability";
import { reconcileBookingDerivedBlocks } from "@/lib/inventory-groups";

/** An instant given as Manila wall-clock time. */
const manila = (date: string, time: string) => new Date(`${date}T${time}:00+08:00`);
const setNow = (date: string, time: string) => vi.setSystemTime(manila(date, time));

// Mon 12 → Tue 13 Oct 2026: one weeknight at ₱2,000; card fee 6% → ₱2,120.
const TONIGHT = { propertyId: 7, checkIn: "2026-10-12", checkOut: "2026-10-13", guests: 2 };
const CARD_CENTAVOS = 212000;
const GUEST = { guestName: "Juan Dela Cruz", guestEmail: "juan@example.com", guestPhone: "09171234567" };
const TEN_AM = 10 * 60;

function property(
  policy: { advanceNoticeDays?: number; sameDayCutoffMinutes?: number | null; instantBookingMode?: string } = {}
) {
  return {
    id: 7,
    name: "Haven Suite",
    pricePerNight: 2000,
    maxGuests: 4,
    includedGuests: 2,
    extraGuestFeePerNight: 0,
    rates: [{ rateType: "weekend" }],
    advanceNoticeDays: 0,
    sameDayCutoffMinutes: null,
    ...policy,
  };
}

function req(body: unknown): NextRequest {
  return new Request("http://localhost/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

function paidIntent(createdAt: Date) {
  return {
    id: "pi_123",
    status: "succeeded",
    currency: "php",
    amount: CARD_CENTAVOS,
    amount_received: CARD_CENTAVOS,
    created: Math.floor(createdAt.getTime() / 1000),
    metadata: {
      kind: "booking",
      propertyId: "7",
      checkIn: TONIGHT.checkIn,
      checkOut: TONIGHT.checkOut,
      guests: "2",
      discountCode: "",
      amount: String(CARD_CENTAVOS),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  setNow("2026-10-12", "09:00");
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_dummy");
  vi.spyOn(console, "error").mockImplementation(() => {}); // refusals log by design
  db.property.findUnique.mockResolvedValue(property());
  db.propertyRate.findMany.mockResolvedValue([]);
  db.discountCode.findUnique.mockResolvedValue(null);
  db.booking.findFirst.mockResolvedValue(null);
  db.booking.create.mockImplementation(async ({ data }) => ({
    id: 42,
    ...data,
    createdAt: new Date(),
    property: { name: "Haven Suite", location: "Lipa City", slug: "haven-suite" },
  }));
  db.checkoutAttempt.findUnique.mockResolvedValue(null);
  db.checkoutAttempt.updateMany.mockResolvedValue({ count: 0 });
  db.checkoutAttempt.create.mockResolvedValue({});
  db.adminLog.findFirst.mockResolvedValue(null);
  db.adminLog.create.mockResolvedValue({});
  stripeApi.create.mockResolvedValue({ client_secret: "cs_123" });
  availability.getPropertyConflicts.mockResolvedValue([]);
  availability.getUnavailableDateRanges.mockResolvedValue([]);
  sendMail.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("today floor — every guest route, every payment method", () => {
  const YESTERDAY = { ...TONIGHT, checkIn: "2026-10-11", checkOut: "2026-10-12" };

  // 00:30 in Lipa is still Oct 11 in UTC — the hours when the pickers used to offer yesterday.
  beforeEach(() => setNow("2026-10-12", "00:30"));

  it("payment-intent: refuses before any PaymentIntent is created", async () => {
    const res = await createPaymentIntent(req(YESTERDAY));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: "too_soon", earliestCheckIn: "2026-10-12" });
    expect(stripeApi.create).not.toHaveBeenCalled();
  });

  it("checkout-attempts: refuses without recording an attempt", async () => {
    const res = await recordAttempt(req({ ...YESTERDAY, ...GUEST, paymentMethod: "gcash" }));
    expect(res.status).toBe(409);
    expect(db.checkoutAttempt.create).not.toHaveBeenCalled();
    expect(db.checkoutAttempt.updateMany).not.toHaveBeenCalled();
  });

  it.each(["gcash", "bpi"])("bookings (%s): a direct API call is refused and nothing is saved", async (paymentMethod) => {
    // Even holding an attempt recorded before midnight — the floor has no grace.
    db.checkoutAttempt.findUnique.mockResolvedValue({
      propertyId: 7,
      checkIn: new Date("2026-10-11T00:00:00Z"),
      createdAt: manila("2026-10-11", "23:50"),
    });
    const res = await createBooking(req({ ...YESTERDAY, ...GUEST, paymentMethod, checkoutAttemptToken: "tok" }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body).toMatchObject({ code: "too_soon", earliestCheckIn: "2026-10-12" });
    expect(body.error).toContain("October 12, 2026");
    expect(db.booking.create).not.toHaveBeenCalled();
  });

  it("bookings (card, no payment reference): refused as too soon", async () => {
    const res = await createBooking(req({ ...YESTERDAY, ...GUEST, paymentMethod: "stripe" }));
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("too_soon");
    expect(db.booking.create).not.toHaveBeenCalled();
  });

  it("today itself is still bookable with the default settings", async () => {
    const res = await createBooking(req({ ...TONIGHT, ...GUEST, paymentMethod: "gcash" }));
    expect(res.status).toBe(200);
    expect(db.booking.create).toHaveBeenCalledTimes(1);
  });
});

describe("same-day cutoff (10:00 AM)", () => {
  beforeEach(() => db.property.findUnique.mockResolvedValue(property({ sameDayCutoffMinutes: TEN_AM })));

  it("books tonight before the cutoff", async () => {
    setNow("2026-10-12", "09:59");
    const res = await createBooking(req({ ...TONIGHT, ...GUEST, paymentMethod: "gcash" }));
    expect(res.status).toBe(200);
  });

  it("refuses tonight at the cutoff on all three routes and names tomorrow", async () => {
    setNow("2026-10-12", "10:00");
    for (const res of [
      await createPaymentIntent(req(TONIGHT)),
      await recordAttempt(req({ ...TONIGHT, ...GUEST, paymentMethod: "bpi" })),
      await createBooking(req({ ...TONIGHT, ...GUEST, paymentMethod: "bpi" })),
    ]) {
      expect(res.status).toBe(409);
      expect(await res.json()).toMatchObject({ code: "too_soon", earliestCheckIn: "2026-10-13" });
    }
    expect(stripeApi.create).not.toHaveBeenCalled();
    expect(db.checkoutAttempt.create).not.toHaveBeenCalled();
    expect(db.booking.create).not.toHaveBeenCalled();
  });

  it("still books tomorrow after today's cutoff", async () => {
    setNow("2026-10-12", "18:00");
    const res = await createBooking(
      req({ ...TONIGHT, checkIn: "2026-10-13", checkOut: "2026-10-14", ...GUEST, paymentMethod: "gcash" })
    );
    expect(res.status).toBe(200);
  });

  describe("grace at final submission", () => {
    const attemptAt = (createdAt: Date, checkIn = "2026-10-12") =>
      db.checkoutAttempt.findUnique.mockResolvedValue({
        propertyId: 7,
        checkIn: new Date(`${checkIn}T00:00:00Z`),
        createdAt,
      });
    const submitGcash = () =>
      createBooking(req({ ...TONIGHT, ...GUEST, paymentMethod: "gcash", checkoutAttemptToken: "tok" }));

    it("GCash: payment screen reached before the cutoff, submitted 10 minutes after — saved", async () => {
      setNow("2026-10-12", "10:10");
      attemptAt(manila("2026-10-12", "09:50"));
      const res = await submitGcash();
      expect(res.status).toBe(200);
      expect(db.booking.create).toHaveBeenCalledTimes(1);
    });

    it("GCash: submitted after the window — refused", async () => {
      setNow("2026-10-12", "10:31");
      attemptAt(manila("2026-10-12", "09:50"));
      const res = await submitGcash();
      expect(res.status).toBe(409);
      expect(db.booking.create).not.toHaveBeenCalled();
    });

    it("GCash: an attempt for another check-in or listing earns nothing", async () => {
      setNow("2026-10-12", "10:10");
      attemptAt(manila("2026-10-12", "09:50"), "2026-10-20");
      expect((await submitGcash()).status).toBe(409);
      db.checkoutAttempt.findUnique.mockResolvedValue({
        propertyId: 8,
        checkIn: new Date("2026-10-12T00:00:00Z"),
        createdAt: manila("2026-10-12", "09:50"),
      });
      expect((await submitGcash()).status).toBe(409);
      expect(db.booking.create).not.toHaveBeenCalled();
    });

    const submitCard = () =>
      createBooking(req({ ...TONIGHT, ...GUEST, paymentMethod: "stripe", stripePaymentIntentId: "pi_123" }));

    it("card: PaymentIntent created before the cutoff, paid 10 minutes after — confirmed", async () => {
      setNow("2026-10-12", "10:10");
      stripeApi.retrieve.mockResolvedValue(paidIntent(manila("2026-10-12", "09:50")));
      const res = await submitCard();
      expect(res.status).toBe(200);
      expect(db.booking.create.mock.calls[0][0].data).toMatchObject({ status: "confirmed", stripePaymentIntentId: "pi_123" });
    });

    it("card: paid outside the window — no booking, guest gets the reference, admin is alerted once", async () => {
      setNow("2026-10-12", "10:45");
      stripeApi.retrieve.mockResolvedValue(paidIntent(manila("2026-10-12", "09:50")));
      const res = await submitCard();
      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body).toMatchObject({ code: "paid_unavailable", paymentReference: "pi_123" });
      expect(body.error).toContain("do not pay again");
      expect(body.error).toContain("closed before your booking could be saved");
      expect(db.booking.create).not.toHaveBeenCalled();
      expect(db.adminLog.create).toHaveBeenCalledTimes(1);
      expect(db.adminLog.create.mock.calls[0][0].data.target).toBe("stripe-pi_123");
      expect(sendMail).toHaveBeenCalledTimes(1);
      expect(sendMail.mock.calls[0][0].html).toContain("Online booking for that check-in closed");
    });
  });
});

describe("advance notice in days", () => {
  it.each([1, 2, 3, 7])("%i day(s): refuses an earlier arrival, accepts the first allowed one", async (days) => {
    db.property.findUnique.mockResolvedValue(property({ advanceNoticeDays: days }));
    setNow("2026-10-12", "09:00");
    const key = (offset: number) => new Date(Date.UTC(2026, 9, 12 + offset)).toISOString().slice(0, 10);

    const early = await createBooking(
      req({ ...TONIGHT, checkIn: key(days - 1), checkOut: key(days), ...GUEST, paymentMethod: "gcash" })
    );
    expect(early.status).toBe(409);
    expect(await early.json()).toMatchObject({ code: "too_soon", earliestCheckIn: key(days) });

    const ok = await createPaymentIntent(req({ ...TONIGHT, checkIn: key(days), checkOut: key(days + 1) }));
    expect(ok.status).toBe(200);
    expect(stripeApi.create).toHaveBeenCalledTimes(1);
  });
});

describe("GET /api/availability/[slug]", () => {
  const get = (query = "") =>
    getAvailability(new Request(`http://localhost/api/availability/haven-suite${query}`), {
      params: Promise.resolve({ slug: "haven-suite" }),
    });

  beforeEach(() => db.property.findUnique.mockResolvedValue(property({ sameDayCutoffMinutes: TEN_AM })));

  it("reports the earliest check-in with the blocked ranges", async () => {
    setNow("2026-10-12", "09:00");
    expect(await (await get()).json()).toEqual({ blockedRanges: [], earliestCheckIn: "2026-10-12", requiresApproval: false });
    setNow("2026-10-12", "10:00");
    expect((await (await get()).json()).earliestCheckIn).toBe("2026-10-13");
  });

  it("answers ?earliest=1 for the date pickers without reading any calendar", async () => {
    setNow("2026-10-12", "10:00");
    expect(await (await get("?earliest=1")).json()).toEqual({ earliestCheckIn: "2026-10-13", requiresApproval: false });
    expect(availability.getUnavailableDateRanges).not.toHaveBeenCalled();
    expect(availability.getPropertyConflicts).not.toHaveBeenCalled();
  });

  it("answers a too-soon stay as unavailable, with the reason and a message", async () => {
    setNow("2026-10-12", "11:00");
    const body = await (await get("?checkIn=2026-10-12&checkOut=2026-10-13")).json();
    expect(body).toMatchObject({ available: false, conflicts: [], reason: "too_soon", earliestCheckIn: "2026-10-13" });
    expect(body.message).toContain("October 13, 2026");
    expect(availability.getPropertyConflicts).not.toHaveBeenCalled();
  });

  it("answers an allowed stay as before, plus earliestCheckIn", async () => {
    setNow("2026-10-12", "09:00");
    expect(await (await get("?checkIn=2026-10-12&checkOut=2026-10-13")).json()).toEqual({
      available: true,
      conflicts: [],
      earliestCheckIn: "2026-10-12",
      requiresApproval: false,
    });
  });

  it("does not apply the guest rule to a re-check of an existing booking", async () => {
    setNow("2026-10-12", "11:00");
    const body = await (await get("?checkIn=2026-10-01&checkOut=2026-10-03&excludeBookingId=9")).json();
    expect(body.available).toBe(true);
    expect(body.reason).toBeUndefined();
    expect(availability.getPropertyConflicts).toHaveBeenCalledTimes(1);
  });
});

describe("Instant Booking off — the listing takes requests, not bookings", () => {
  const savedRequest = () => ({
    id: 42,
    status: "requested",
    propertyId: 7,
    ...GUEST,
    guestPhone: "+639171234567",
    checkIn: new Date("2026-10-12T00:00:00Z"),
    checkOut: new Date("2026-10-13T00:00:00Z"),
    guests: 2,
    totalPrice: 2000,
    paymentMethod: null,
    requestExpiresAt: manila("2026-10-13", "00:00"),
    paymentLinkExpiresAt: null,
    paymentSubmittedAt: null,
    property: { name: "Haven Suite", advanceNoticeDays: 0, sameDayCutoffMinutes: null },
  });

  beforeEach(() => {
    db.property.findUnique.mockResolvedValue(property({ instantBookingMode: "off" }));
    db.booking.findUnique.mockResolvedValue(savedRequest());
  });

  it("payment-intent: no card is charged before approval", async () => {
    const res = await createPaymentIntent(req(TONIGHT));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: "requires_approval" });
    expect(stripeApi.create).not.toHaveBeenCalled();
  });

  it("checkout-attempts: nothing is recorded", async () => {
    const res = await recordAttempt(req({ ...TONIGHT, ...GUEST, paymentMethod: "gcash" }));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: "requires_approval" });
    expect(db.checkoutAttempt.create).not.toHaveBeenCalled();
  });

  it.each(["gcash", "bpi", "stripe", undefined])(
    "bookings (%s): saves a request with no payment, no hold and no card fee",
    async (paymentMethod) => {
      const res = await createBooking(req({ ...TONIGHT, ...GUEST, paymentMethod, discountCode: "" }));
      expect(res.status).toBe(200);
      // 9:00 AM + 24 h would be tomorrow 9:00 AM, but tonight stops being bookable at midnight.
      expect(await res.json()).toEqual({
        success: true,
        requested: true,
        bookingId: 42,
        total: 2000,
        propertySlug: "haven-suite",
        replyBy: manila("2026-10-13", "00:00").toISOString(),
      });
      const { data } = db.booking.create.mock.calls[0][0];
      expect(data).toMatchObject({
        status: "requested",
        paymentMethod: null,
        stripeFee: null,
        totalPrice: 2000,
        requestExpiresAt: manila("2026-10-13", "00:00"),
      });
      expect(data.stripePaymentIntentId).toBeUndefined();
      expect(data.paymentSubmittedAt).toBeUndefined();
      // Nothing is blocked on sibling listings, and no promo use is counted yet.
      expect(reconcileBookingDerivedBlocks).not.toHaveBeenCalled();
      expect(db.discountCode.update).not.toHaveBeenCalled();
      expect(stripeApi.retrieve).not.toHaveBeenCalled();
      // Guest "request received" + admin "new request".
      expect(sendMail).toHaveBeenCalledTimes(2);
      expect(sendMail.mock.calls[0][0].subject).toContain("Booking Request Received");
    }
  );

  it("a request made well ahead waits the full 24 hours", async () => {
    await createBooking(req({ ...TONIGHT, checkIn: "2026-10-20", checkOut: "2026-10-21", ...GUEST }));
    expect(db.booking.create.mock.calls[0][0].data.requestExpiresAt).toEqual(manila("2026-10-13", "09:00"));
  });

  it("advance notice applies to a request exactly as to a booking", async () => {
    db.property.findUnique.mockResolvedValue(property({ instantBookingMode: "off", sameDayCutoffMinutes: TEN_AM }));
    setNow("2026-10-12", "11:00");
    const res = await createBooking(req({ ...TONIGHT, ...GUEST }));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: "too_soon", earliestCheckIn: "2026-10-13" });
    expect(db.booking.create).not.toHaveBeenCalled();
  });

  it("refuses a request for dates that are already taken", async () => {
    availability.assertPropertyAvailable.mockRejectedValueOnce(new AvailabilityConflictError("Those dates are unavailable.", []));
    const res = await createBooking(req({ ...TONIGHT, ...GUEST }));
    expect(res.status).toBe(409);
    expect(db.booking.create).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("the same request sent twice is saved and emailed once", async () => {
    db.booking.findFirst.mockResolvedValue({
      id: 41,
      totalPrice: 2000,
      requestExpiresAt: manila("2026-10-13", "00:00"),
      property: { slug: "haven-suite" },
    });
    const res = await createBooking(req({ ...TONIGHT, ...GUEST }));
    expect(await res.json()).toMatchObject({ requested: true, bookingId: 41 });
    expect(db.booking.create).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  describe("a guest already paying when the listing was switched to Off", () => {
    const attemptAt = (date: string, time: string) =>
      db.checkoutAttempt.findUnique.mockResolvedValue({
        propertyId: 7,
        checkIn: new Date("2026-10-12T00:00:00Z"),
        createdAt: manila(date, time),
      });

    it("GCash: reached the payment screen 30 minutes ago — still an instant booking that holds the dates", async () => {
      attemptAt("2026-10-12", "08:30");
      const res = await createBooking(req({ ...TONIGHT, ...GUEST, paymentMethod: "gcash", checkoutAttemptToken: "tok" }));
      expect(await res.json()).not.toHaveProperty("requested");
      expect(db.booking.create.mock.calls[0][0].data).toMatchObject({ status: "pending", paymentMethod: "gcash" });
    });

    it("GCash: an old payment-screen visit earns nothing — it becomes a request", async () => {
      attemptAt("2026-10-12", "06:00");
      const res = await createBooking(req({ ...TONIGHT, ...GUEST, paymentMethod: "gcash", checkoutAttemptToken: "tok" }));
      expect(await res.json()).toMatchObject({ requested: true });
      expect(db.booking.create.mock.calls[0][0].data.status).toBe("requested");
    });

    it("card: a verified payment for this stay is still confirmed", async () => {
      stripeApi.retrieve.mockResolvedValue(paidIntent(manila("2026-10-12", "08:50")));
      const res = await createBooking(req({ ...TONIGHT, ...GUEST, paymentMethod: "stripe", stripePaymentIntentId: "pi_123" }));
      expect(res.status).toBe(200);
      expect(db.booking.create.mock.calls[0][0].data).toMatchObject({ status: "confirmed", stripePaymentIntentId: "pi_123" });
    });

    it("card: an unverifiable payment reference gets no booking and no request", async () => {
      stripeApi.retrieve.mockRejectedValue(new Error("No such payment_intent"));
      const res = await createBooking(req({ ...TONIGHT, ...GUEST, paymentMethod: "stripe", stripePaymentIntentId: "pi_fake" }));
      expect(res.status).toBe(400);
      expect(db.booking.create).not.toHaveBeenCalled();
    });
  });

  it("the public availability route says the listing takes requests", async () => {
    const res = await getAvailability(new Request("http://localhost/api/availability/haven-suite?earliest=1"), {
      params: Promise.resolve({ slug: "haven-suite" }),
    });
    expect(await res.json()).toMatchObject({ requiresApproval: true });
  });
});

describe("Instant Booking on — unchanged, plus the payment-submitted timestamp", () => {
  it("GCash: pending as before, and the unverified-payment clock starts", async () => {
    const res = await createBooking(req({ ...TONIGHT, ...GUEST, paymentMethod: "gcash" }));
    expect(await res.json()).not.toHaveProperty("requested");
    const { data } = db.booking.create.mock.calls[0][0];
    expect(data).toMatchObject({ status: "pending", paymentSubmittedAt: manila("2026-10-12", "09:00") });
  });

  it("card: confirmed as before, with no unverified-payment clock", async () => {
    stripeApi.retrieve.mockResolvedValue(paidIntent(manila("2026-10-12", "08:50")));
    await createBooking(req({ ...TONIGHT, ...GUEST, paymentMethod: "stripe", stripePaymentIntentId: "pi_123" }));
    expect(db.booking.create.mock.calls[0][0].data).toMatchObject({ status: "confirmed", paymentSubmittedAt: null });
  });

  it("a stored mode nobody recognises behaves as On", async () => {
    db.property.findUnique.mockResolvedValue(property({ instantBookingMode: "sometimes" }));
    const res = await createPaymentIntent(req(TONIGHT));
    expect(res.status).toBe(200);
  });
});

describe("the form's explicit request intent, and the card intent for an approved request", () => {
  it("a request sent to a listing that books instantly is refused, so nothing unpaid holds dates", async () => {
    const res = await createBooking(req({ ...TONIGHT, ...GUEST, intent: "request" }));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: "instant_booking" });
    expect(db.booking.create).not.toHaveBeenCalled();
  });

  it("a request sent to an approval-only listing is saved as one", async () => {
    db.property.findUnique.mockResolvedValue(property({ instantBookingMode: "off" }));
    db.booking.findUnique.mockResolvedValue(null);
    const res = await createBooking(req({ ...TONIGHT, ...GUEST, intent: "request" }));
    expect(await res.json()).toMatchObject({ requested: true });
  });

  describe("payment-intent kind booking_payment", () => {
    const approved = (over: Record<string, unknown> = {}) => ({
      id: 42,
      status: "approved",
      propertyId: 7,
      checkIn: new Date("2026-10-12T00:00:00Z"),
      checkOut: new Date("2026-10-13T00:00:00Z"),
      totalPrice: 2000,
      paymentLinkExpiresAt: manila("2026-10-13", "00:00"),
      ...over,
    });
    const intent = () => createPaymentIntent(req({ kind: "booking_payment", token: "tok" }));

    it("charges the stored total plus the card fee, bound to that booking — on a listing that is Off", async () => {
      db.property.findUnique.mockResolvedValue(property({ instantBookingMode: "off" }));
      db.booking.findUnique.mockResolvedValue(approved());
      const res = await intent();
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ total: 2120 });
      expect(stripeApi.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: CARD_CENTAVOS,
          metadata: { kind: "booking_payment", bookingId: "42", token: "tok", amount: String(CARD_CENTAVOS) },
        })
      );
      expect(availability.assertPropertyAvailable).toHaveBeenCalledWith(expect.objectContaining({ propertyId: 7, excludeBookingId: 42 }));
    });

    it("creates no intent when the dates are already gone", async () => {
      db.booking.findUnique.mockResolvedValue(approved());
      availability.assertPropertyAvailable.mockRejectedValueOnce(new AvailabilityConflictError("Those dates are unavailable.", []));
      const res = await intent();
      expect(res.status).toBe(409);
      expect(await res.json()).toMatchObject({ code: "unavailable" });
      expect(stripeApi.create).not.toHaveBeenCalled();
    });

    it.each([
      ["an expired link", { paymentLinkExpiresAt: manila("2026-10-12", "08:00") }],
      ["a request not yet approved", { status: "requested" }],
      ["a booking already paid", { status: "confirmed" }],
    ])("creates no intent for %s", async (_name, over) => {
      db.booking.findUnique.mockResolvedValue(approved(over));
      const res = await intent();
      expect(res.status).toBe(409);
      expect(stripeApi.create).not.toHaveBeenCalled();
    });

    it("404s an unknown token", async () => {
      db.booking.findUnique.mockResolvedValue(null);
      expect((await intent()).status).toBe(404);
    });
  });
});
