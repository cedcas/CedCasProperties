/**
 * Checkout-abandonment alerts: pure selection/email logic, one full cron pass over a
 * mocked Prisma, the public attempt endpoint, and the /api/bookings link. No DB, no mail.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const { db, sendMail } = vi.hoisted(() => ({
  db: {
    checkoutAttempt: {
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    booking: { findFirst: vi.fn(), create: vi.fn() },
    property: { findMany: vi.fn(), findUnique: vi.fn() },
    propertyRate: { findMany: vi.fn() },
    discountCode: { findUnique: vi.fn(), update: vi.fn() },
  },
  sendMail: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/email", () => ({ createMailer: () => ({ sendMail }), FROM_ADDRESS: "test@example.com" }));
vi.mock("@/lib/log", () => ({ logAction: vi.fn(), getIpFromRequest: () => "127.0.0.1" }));
vi.mock("@/lib/availability", () => ({
  assertPropertyAvailable: vi.fn(),
  assertInventoryScopeAvailable: vi.fn(),
  AvailabilityConflictError: class extends Error {
    status = 409;
  },
}));
vi.mock("@/lib/inventory-groups", () => ({ reconcileBookingDerivedBlocks: vi.fn() }));
// The inventory lock is a real MySQL row lock; here it just runs the callback on the mock client.
vi.mock("@/lib/inventory-lock", () => ({
  withInventoryLock: (_ids: number[], fn: (tx: typeof db) => unknown) => fn(db),
}));
vi.mock("@/lib/emailReply", () => ({ promoteContactMessagesForEmail: vi.fn() }));
vi.mock("@/lib/scheduler", () => ({
  materializeScheduledMessagesForBooking: vi.fn(),
  flushDueScheduledMessages: vi.fn(),
}));

import {
  attemptKey,
  selectAlerts,
  buildAlertEmail,
  processAbandonedCheckouts,
  ABANDON_AFTER_MINUTES,
} from "@/lib/checkout-abandonment";
import { POST as recordAttempt } from "@/app/api/checkout-attempts/route";
import { POST as createBooking } from "@/app/api/bookings/route";

const NOW = new Date("2026-09-28T03:30:00Z");
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000);

interface Attempt {
  id: number; token: string; propertyId: number; guestName: string; guestEmail: string; guestPhone: string;
  checkIn: Date; checkOut: Date; guests: number; paymentMethod: string; discountCode: string | null;
  total: number; bookingId: number | null; alertedAt: Date | null; createdAt: Date; updatedAt: Date;
}

function attempt(over: Partial<Attempt> = {}): Attempt {
  return {
    id: 1,
    token: "tok",
    propertyId: 7,
    guestName: "Test Guest",
    guestEmail: "guest@example.com",
    guestPhone: "+639171234567",
    checkIn: new Date("2026-09-28T00:00:00Z"),
    checkOut: new Date("2026-09-29T00:00:00Z"),
    guests: 2,
    paymentMethod: "gcash",
    discountCode: null,
    total: 2100,
    bookingId: null,
    alertedAt: null,
    createdAt: minutesAgo(15),
    updatedAt: minutesAgo(15),
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.checkoutAttempt.deleteMany.mockResolvedValue({ count: 0 });
  db.checkoutAttempt.updateMany.mockResolvedValue({ count: 1 });
  db.property.findMany.mockResolvedValue([{ id: 7, name: "Mickey in Lipa" }]);
  db.booking.findFirst.mockResolvedValue(null);
  sendMail.mockResolvedValue({});
});

describe("attemptKey / selectAlerts", () => {
  it("keys on property, case-insensitive email and check-in date", () => {
    const a = attempt({ guestEmail: " Guest@Example.com " });
    expect(attemptKey(a)).toBe("7|guest@example.com|2026-09-28");
  });

  it("alerts once per guest/stay — the most recently active attempt — and suppresses the rest", () => {
    const older = attempt({ id: 1, updatedAt: minutesAgo(40) });
    const newer = attempt({ id: 2, updatedAt: minutesAgo(12) });
    const other = attempt({ id: 3, guestEmail: "someone@else.com" });
    const { alert, suppress } = selectAlerts([older, newer, other], new Set());
    expect(alert.map((a) => a.id).sort()).toEqual([2, 3]);
    expect(suppress.map((a) => a.id)).toEqual([1]);
  });

  it("suppresses a key that was already alerted in an earlier run", () => {
    const a = attempt();
    const { alert, suppress } = selectAlerts([a], new Set([attemptKey(a)]));
    expect(alert).toEqual([]);
    expect(suppress).toEqual([a]);
  });
});

describe("buildAlertEmail", () => {
  it("escapes guest-supplied text and shows the time in Manila and Central", () => {
    const { subject, html } = buildAlertEmail({
      ...attempt({ guestName: "<b>x</b>" }),
      propertyName: "Mickey in Lipa",
      lastActiveAt: new Date("2026-09-28T03:15:00Z"),
    });
    expect(subject).toContain("Mickey in Lipa");
    expect(html).toContain("&lt;b&gt;x&lt;/b&gt;");
    expect(html).not.toContain("<b>x</b>");
    expect(html).toContain("11:15 AM"); // Asia/Manila
    expect(html).toContain("10:15 PM"); // America/Chicago (CDT)
    expect(html).toContain("₱2,100");
    expect(html).toContain(`${ABANDON_AFTER_MINUTES} minutes`);
  });
});

describe("processAbandonedCheckouts", () => {
  it("only considers unlinked, unalerted attempts inactive for 10+ minutes within 24h", async () => {
    db.checkoutAttempt.findMany.mockResolvedValueOnce([]);
    await processAbandonedCheckouts(NOW);
    const where = db.checkoutAttempt.findMany.mock.calls[0][0].where;
    expect(where.bookingId).toBeNull();
    expect(where.alertedAt).toBeNull();
    expect(where.updatedAt.lte).toEqual(minutesAgo(10));
    expect(where.updatedAt.gte).toEqual(minutesAgo(24 * 60));
  });

  it("links an attempt to a booking made for the same stay instead of alerting", async () => {
    db.checkoutAttempt.findMany.mockResolvedValueOnce([attempt({ id: 5 })]);
    db.booking.findFirst.mockResolvedValueOnce({ id: 140 });
    const r = await processAbandonedCheckouts(NOW);
    expect(db.checkoutAttempt.update).toHaveBeenCalledWith({ where: { id: 5 }, data: { bookingId: 140 } });
    expect(sendMail).not.toHaveBeenCalled();
    expect(r).toMatchObject({ linked: 1, alerted: 0 });
  });

  it("claims, then emails the admin once for an abandoned checkout", async () => {
    db.checkoutAttempt.findMany
      .mockResolvedValueOnce([attempt({ id: 5 })]) // candidates
      .mockResolvedValueOnce([]); // recently alerted
    const r = await processAbandonedCheckouts(NOW);
    expect(db.checkoutAttempt.updateMany).toHaveBeenCalledWith({
      where: { id: 5, alertedAt: null, bookingId: null },
      data: { alertedAt: NOW },
    });
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail.mock.calls[0][0].to).toBe("customerservice@haveninlipa.com");
    expect(r).toMatchObject({ alerted: 1, failed: 0 });
  });

  it("skips sending when another run already claimed the attempt", async () => {
    db.checkoutAttempt.findMany.mockResolvedValueOnce([attempt()]).mockResolvedValueOnce([]);
    db.checkoutAttempt.updateMany.mockResolvedValueOnce({ count: 0 });
    const r = await processAbandonedCheckouts(NOW);
    expect(sendMail).not.toHaveBeenCalled();
    expect(r.alerted).toBe(0);
  });

  it("releases the claim when the email fails so the next run retries", async () => {
    db.checkoutAttempt.findMany.mockResolvedValueOnce([attempt({ id: 9 })]).mockResolvedValueOnce([]);
    sendMail.mockRejectedValueOnce(new Error("smtp down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await processAbandonedCheckouts(NOW);
    expect(db.checkoutAttempt.update).toHaveBeenCalledWith({ where: { id: 9 }, data: { alertedAt: null } });
    expect(r).toMatchObject({ alerted: 0, failed: 1 });
  });

  it("purges attempts older than the retention window", async () => {
    db.checkoutAttempt.findMany.mockResolvedValueOnce([]);
    db.checkoutAttempt.deleteMany.mockResolvedValueOnce({ count: 3 });
    const r = await processAbandonedCheckouts(NOW);
    expect(db.checkoutAttempt.deleteMany.mock.calls[0][0].where.createdAt.lt).toEqual(
      new Date(NOW.getTime() - 30 * 24 * 60 * 60 * 1000)
    );
    expect(r.purged).toBe(3);
  });
});

// Mon 5 → Tue 6 Oct 2026: one weeknight at ₱2,500.
const PROPERTY = {
  name: "Mickey in Lipa",
  pricePerNight: 2500,
  maxGuests: 7,
  includedGuests: 7,
  extraGuestFeePerNight: 0,
  rates: [{ rateType: "weekend" }],
};
const req = (body: unknown) => ({ json: async () => body, headers: new Headers() }) as unknown as NextRequest;
const ATTEMPT_BODY = {
  propertyId: 7,
  guestName: "Test Guest",
  guestEmail: "guest@example.com",
  guestPhone: "+639171234567",
  checkIn: "2026-10-05",
  checkOut: "2026-10-06",
  guests: 2,
  paymentMethod: "gcash",
};

describe("POST /api/checkout-attempts", () => {
  beforeEach(() => {
    db.property.findUnique.mockResolvedValue(PROPERTY);
    db.propertyRate.findMany.mockResolvedValue([]);
  });

  it("rejects an unknown payment method without writing", async () => {
    const res = await recordAttempt(req({ ...ATTEMPT_BODY, paymentMethod: "cash" }));
    expect(res.status).toBe(400);
    expect(db.checkoutAttempt.create).not.toHaveBeenCalled();
  });

  it("creates an attempt priced by the server and returns a token", async () => {
    const res = await recordAttempt(req({ ...ATTEMPT_BODY, total: 1 }));
    expect(res.status).toBe(200);
    const { token } = await res.json();
    expect(token).toMatch(/^[\w-]{20,}$/);
    const data = db.checkoutAttempt.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ propertyId: 7, total: 2500, paymentMethod: "gcash", guestPhone: "+639171234567" });
  });

  it("updates the open attempt when the page passes its token back", async () => {
    db.checkoutAttempt.updateMany.mockResolvedValueOnce({ count: 1 });
    const res = await recordAttempt(req({ ...ATTEMPT_BODY, token: "existing", paymentMethod: "bpi" }));
    expect((await res.json()).token).toBe("existing");
    expect(db.checkoutAttempt.updateMany.mock.calls[0][0].where).toEqual({ token: "existing", bookingId: null, alertedAt: null });
    expect(db.checkoutAttempt.create).not.toHaveBeenCalled();
  });

  it("starts a fresh attempt when the token's attempt is closed", async () => {
    db.checkoutAttempt.updateMany.mockResolvedValueOnce({ count: 0 });
    const res = await recordAttempt(req({ ...ATTEMPT_BODY, token: "old" }));
    expect((await res.json()).token).not.toBe("old");
    expect(db.checkoutAttempt.create).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/bookings — checkout attempt link", () => {
  beforeEach(() => {
    db.property.findUnique.mockResolvedValue(PROPERTY);
    db.propertyRate.findMany.mockResolvedValue([]);
    db.booking.create.mockResolvedValue({
      id: 141,
      createdAt: NOW,
      property: { name: "Mickey in Lipa", slug: "mickey", location: "Lipa" },
    });
  });

  it("marks the attempt completed with the new booking id", async () => {
    const res = await createBooking(req({ ...ATTEMPT_BODY, checkoutAttemptToken: "tok-1" }));
    expect(res.status).toBe(200);
    expect(db.checkoutAttempt.updateMany).toHaveBeenCalledWith({
      where: { token: "tok-1", bookingId: null },
      data: { bookingId: 141 },
    });
  });

  it("still succeeds when linking fails", async () => {
    db.checkoutAttempt.updateMany.mockRejectedValueOnce(new Error("db blip"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await createBooking(req({ ...ATTEMPT_BODY, checkoutAttemptToken: "tok-1" }));
    expect(res.status).toBe(200);
  });
});
