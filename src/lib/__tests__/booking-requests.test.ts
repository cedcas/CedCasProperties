/**
 * Booking requests (src/lib/booking-requests.ts): approve, decline, the expiry job and the
 * unverified-payment alert, plus the admin route in front of them and the pure rules they
 * rest on. Prisma, mail, the audit log and the availability service are mocked — no DB,
 * no network — and every case passes its own clock.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";

const { db, sendMail, logAction, availability, permission } = vi.hoisted(() => ({
  db: { booking: { findUnique: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() } },
  sendMail: vi.fn(),
  logAction: vi.fn(),
  availability: { getInventoryScopeConflicts: vi.fn(), refreshExternalFeedForBooking: vi.fn() },
  permission: { current: { ok: true, actor: { id: 1, name: "Owner", role: "admin" } } as unknown },
}));

vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/email", () => ({ createMailer: () => ({ sendMail }), FROM_ADDRESS: "test@example.com" }));
vi.mock("@/lib/log", () => ({ logAction, getIpFromRequest: () => "203.0.113.9" }));
vi.mock("@/lib/availability", () => ({ ...availability, formatConflictRange: () => "2026-10-20 – 2026-10-22" }));
vi.mock("@/lib/admin-permissions", () => ({
  checkPermission: async () => permission.current,
  permissionDenied: (r: { status: number; error: string }) => Response.json({ error: r.error }, { status: r.status }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  approveBookingRequest,
  BookingRequestError,
  cappedExpiry,
  declineBookingRequest,
  processBookingRequests,
} from "@/lib/booking-requests";
import {
  assertInstantBooking,
  bookingDeadlineFor,
  normalizeInstantBookingMode,
  parseInstantBookingModeInput,
} from "@/lib/booking-policy";
import {
  adminStatusChoices,
  bookingBlocksAvailability,
  BOOKING_STATUSES,
  canAdminSetStatus,
  isClosedBooking,
  isOpenRequest,
} from "@/lib/booking-status";
import {
  requestApprovedGuestEmail,
  requestDeclinedGuestEmail,
  requestExpiredGuestEmail,
  requestReceivedGuestEmail,
} from "@/lib/booking-request-emails";
import { POST as decide } from "@/app/api/admin/bookings/[id]/request/route";

const manila = (date: string, time: string) => new Date(`${date}T${time}:00+08:00`);
const OWNER = { id: 1, name: "Owner", role: "admin" as const };
const NOW = manila("2026-10-12", "09:00");

function request(overrides: Record<string, unknown> = {}) {
  return {
    id: 42,
    status: "requested",
    propertyId: 7,
    guestName: "Juan Dela Cruz",
    guestEmail: "juan@example.com",
    guestPhone: "+639171234567",
    checkIn: new Date("2026-10-20T00:00:00Z"),
    checkOut: new Date("2026-10-22T00:00:00Z"),
    guests: 2,
    totalPrice: 4000,
    paymentMethod: null,
    requestExpiresAt: manila("2026-10-13", "09:00"),
    paymentLinkExpiresAt: null,
    paymentSubmittedAt: null,
    property: { name: "Haven Suite", advanceNoticeDays: 0, sameDayCutoffMinutes: null },
    ...overrides,
  };
}

const rejection = async (p: Promise<unknown>) => {
  const err = await p.then(
    () => null,
    (e) => e
  );
  expect(err).toBeInstanceOf(BookingRequestError);
  return err as BookingRequestError;
};

beforeEach(() => {
  vi.clearAllMocks();
  // The route cases cannot pass their own clock, and every fixture expiry is relative to
  // NOW — without this the suite starts failing the day after it was written.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  vi.spyOn(console, "error").mockImplementation(() => {});
  permission.current = { ok: true, actor: OWNER };
  db.booking.findUnique.mockResolvedValue(request());
  db.booking.findMany.mockResolvedValue([]);
  db.booking.updateMany.mockResolvedValue({ count: 1 });
  availability.getInventoryScopeConflicts.mockResolvedValue([]);
  sendMail.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("which statuses hold dates", () => {
  it("only pending and confirmed block — a request never does", () => {
    expect(BOOKING_STATUSES.filter(bookingBlocksAvailability)).toEqual(["pending", "confirmed"]);
    expect(BOOKING_STATUSES.filter(isOpenRequest)).toEqual(["requested", "approved"]);
    expect(BOOKING_STATUSES.filter(isClosedBooking)).toEqual(["declined", "expired", "cancelled"]);
  });

  it("the admin status control cannot approve, decline, or confirm a request without payment", () => {
    expect(adminStatusChoices("requested")).toEqual([]);
    expect(adminStatusChoices("approved")).toEqual(["cancelled"]);
    expect(adminStatusChoices("declined")).toEqual([]);
    expect(adminStatusChoices("expired")).toEqual([]);
    for (const from of BOOKING_STATUSES) {
      expect(canAdminSetStatus(from, "requested")).toBe(false);
      expect(canAdminSetStatus(from, "approved")).toBe(false);
      expect(canAdminSetStatus(from, "declined")).toBe(false);
      expect(canAdminSetStatus(from, "expired")).toBe(false);
    }
    expect(canAdminSetStatus("approved", "confirmed")).toBe(false);
    expect(canAdminSetStatus("approved", "pending")).toBe(false);
  });

  it("the three original statuses still move between each other", () => {
    expect(adminStatusChoices("pending")).toEqual(["confirmed", "cancelled"]);
    expect(adminStatusChoices("confirmed")).toEqual(["pending", "cancelled"]);
    expect(adminStatusChoices("cancelled")).toEqual(["pending", "confirmed"]);
  });
});

describe("Instant Booking mode", () => {
  it("on books instantly, off never does, auto only for a trusted guest", () => {
    expect(assertInstantBooking({ mode: "on" }).ok).toBe(true);
    expect(assertInstantBooking({ mode: "off" })).toMatchObject({ ok: false, code: "requires_approval" });
    expect(assertInstantBooking({ mode: "off", trustedGuest: true }).ok).toBe(false);
    expect(assertInstantBooking({ mode: "auto" }).ok).toBe(false);
    expect(assertInstantBooking({ mode: "auto", trustedGuest: true }).ok).toBe(true);
  });

  it("an unreadable stored value falls back to on", () => {
    expect(normalizeInstantBookingMode(null)).toBe("on");
    expect(normalizeInstantBookingMode("OFF")).toBe("on");
    expect(normalizeInstantBookingMode("auto")).toBe("auto");
  });

  it("the admin form may choose on or off, not auto yet", () => {
    expect(parseInstantBookingModeInput("off")).toEqual({ ok: true, mode: "off" });
    expect(parseInstantBookingModeInput("on")).toEqual({ ok: true, mode: "on" });
    expect(parseInstantBookingModeInput("auto").ok).toBe(false);
    expect(parseInstantBookingModeInput(undefined).ok).toBe(false);
  });
});

describe("booking deadline and capped expiry", () => {
  const checkIn = new Date("2026-10-20T00:00:00Z");

  it("same day, no cutoff: the end of the check-in day in Lipa", () => {
    expect(bookingDeadlineFor(checkIn, { advanceNoticeDays: 0, sameDayCutoffMinutes: null })).toEqual(manila("2026-10-21", "00:00"));
  });

  it("same day with an 11:30 PM cutoff", () => {
    expect(bookingDeadlineFor(checkIn, { advanceNoticeDays: 0, sameDayCutoffMinutes: 23 * 60 + 30 })).toEqual(manila("2026-10-20", "23:30"));
  });

  it("2 days' notice: the end of the 18th in Lipa", () => {
    expect(bookingDeadlineFor(checkIn, { advanceNoticeDays: 2, sameDayCutoffMinutes: null })).toEqual(manila("2026-10-19", "00:00"));
  });

  it("an expiry is 24 hours away unless the deadline comes first", () => {
    const policy = { advanceNoticeDays: 0, sameDayCutoffMinutes: 23 * 60 + 30 };
    expect(cappedExpiry(NOW, 24, checkIn, policy)).toEqual(manila("2026-10-13", "09:00"));
    expect(cappedExpiry(manila("2026-10-20", "15:00"), 24, checkIn, policy)).toEqual(manila("2026-10-20", "23:30"));
  });
});

describe("approveBookingRequest", () => {
  it("approves: status, payment token, 24-hour link, audit entry and guest email", async () => {
    const result = await approveBookingRequest({ bookingId: 42, actor: OWNER, note: " agreed on Messenger ", now: NOW });
    expect(result).toEqual({ status: "approved", emailSent: true, paymentLinkExpiresAt: manila("2026-10-13", "09:00").toISOString() });

    const { where, data } = db.booking.updateMany.mock.calls[0][0];
    expect(where).toEqual({ id: 42, status: "requested" });
    expect(data).toMatchObject({
      status: "approved",
      paymentLinkExpiresAt: manila("2026-10-13", "09:00"),
      decidedAt: NOW,
      decidedById: 1,
      decisionNote: "agreed on Messenger",
    });
    expect(data.paymentToken).toMatch(/^[A-Za-z0-9_-]{32}$/);

    expect(logAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: "Approved booking request #42", module: "bookings", actorId: 1 })
    );
    const mail = sendMail.mock.calls[0][0];
    expect(mail.to).toBe("juan@example.com");
    expect(mail.html).toContain(`/pay/booking/${data.paymentToken}`);
    expect(mail.html).toContain("not held yet");
  });

  it("checks availability against everything except the request itself, after refreshing the channel feed", async () => {
    await approveBookingRequest({ bookingId: 42, actor: OWNER, now: NOW });
    expect(availability.refreshExternalFeedForBooking).toHaveBeenCalledWith(7);
    expect(availability.getInventoryScopeConflicts).toHaveBeenCalledWith(
      expect.objectContaining({ propertyId: 7, excludeBookingId: 42 })
    );
  });

  it("is refused when the dates are gone: nothing changes, nothing is emailed, the refusal is logged", async () => {
    availability.getInventoryScopeConflicts.mockResolvedValue([{ label: "Booking #50", kind: "booking" }]);
    const err = await rejection(approveBookingRequest({ bookingId: 42, actor: OWNER, now: NOW }));
    expect(err).toMatchObject({ status: 409, code: "conflict" });
    expect(err.conflicts).toEqual([{ label: "Booking #50", range: "2026-10-20 – 2026-10-22", kind: "booking" }]);
    expect(db.booking.updateMany).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
    expect(logAction).toHaveBeenCalledWith(expect.objectContaining({ action: expect.stringContaining("Refused to approve") }));
  });

  it("the link never outlives the listing's booking deadline", async () => {
    db.booking.findUnique.mockResolvedValue(
      request({
        checkIn: new Date("2026-10-12T00:00:00Z"),
        checkOut: new Date("2026-10-13T00:00:00Z"),
        property: { name: "Haven Suite", advanceNoticeDays: 0, sameDayCutoffMinutes: 23 * 60 + 30 },
      })
    );
    const result = await approveBookingRequest({ bookingId: 42, actor: OWNER, now: NOW });
    expect(result.paymentLinkExpiresAt).toBe(manila("2026-10-12", "23:30").toISOString());
  });

  it.each([
    ["an expired request", { requestExpiresAt: manila("2026-10-12", "08:00") }, "expired"],
    ["a check-in that can no longer be booked", { checkIn: new Date("2026-10-11T00:00:00Z"), requestExpiresAt: null }, "expired"],
    ["a request already approved", { status: "approved" }, "not_requested"],
    ["an ordinary pending booking", { status: "pending" }, "not_requested"],
  ])("refuses %s", async (_name, overrides, code) => {
    db.booking.findUnique.mockResolvedValue(request(overrides));
    const err = await rejection(approveBookingRequest({ bookingId: 42, actor: OWNER, now: NOW }));
    expect(err).toMatchObject({ status: 409, code });
    expect(db.booking.updateMany).not.toHaveBeenCalled();
  });

  it("loses cleanly when someone else decided first", async () => {
    db.booking.updateMany.mockResolvedValue({ count: 0 });
    const err = await rejection(approveBookingRequest({ bookingId: 42, actor: OWNER, now: NOW }));
    expect(err.code).toBe("not_requested");
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("stays approved and says so when the email cannot be sent", async () => {
    sendMail.mockRejectedValue(new Error("SMTP down"));
    const result = await approveBookingRequest({ bookingId: 42, actor: OWNER, now: NOW });
    expect(result).toMatchObject({ status: "approved", emailSent: false });
  });

  it("reports a missing booking and an over-long note", async () => {
    expect((await rejection(approveBookingRequest({ bookingId: 42, actor: OWNER, note: "x".repeat(501), now: NOW }))).status).toBe(400);
    db.booking.findUnique.mockResolvedValue(null);
    expect((await rejection(approveBookingRequest({ bookingId: 9, actor: OWNER, now: NOW }))).status).toBe(404);
  });
});

describe("declineBookingRequest", () => {
  it("declines, records who and why, and tells the guest", async () => {
    const result = await declineBookingRequest({ bookingId: 42, actor: OWNER, note: "Fully booked that week", now: NOW });
    expect(result).toEqual({ status: "declined", emailSent: true });
    expect(db.booking.updateMany).toHaveBeenCalledWith({
      where: { id: 42, status: "requested" },
      data: { status: "declined", decidedAt: NOW, decidedById: 1, decisionNote: "Fully booked that week" },
    });
    expect(availability.getInventoryScopeConflicts).not.toHaveBeenCalled();
    expect(sendMail.mock.calls[0][0].html).toContain("Fully booked that week");
    expect(logAction).toHaveBeenCalledWith(expect.objectContaining({ action: "Declined booking request #42" }));
  });

  it("can still decline a request whose time has run out, but not one already approved", async () => {
    db.booking.findUnique.mockResolvedValue(request({ requestExpiresAt: manila("2026-10-12", "08:00") }));
    expect((await declineBookingRequest({ bookingId: 42, actor: OWNER, now: NOW })).status).toBe("declined");
    db.booking.findUnique.mockResolvedValue(request({ status: "approved" }));
    expect((await rejection(declineBookingRequest({ bookingId: 42, actor: OWNER, now: NOW }))).code).toBe("not_requested");
  });
});

describe("processBookingRequests — the cron pass", () => {
  it("expires undecided requests and unpaid links, and tells each guest once", async () => {
    db.booking.findMany
      .mockResolvedValueOnce([request({ id: 1 })])
      .mockResolvedValueOnce([request({ id: 2, status: "approved" })])
      .mockResolvedValueOnce([]);
    const result = await processBookingRequests(NOW);
    expect(result).toEqual({ expiredRequests: 1, expiredPaymentLinks: 1, paymentAlerts: 0, failed: 0 });

    expect(db.booking.findMany.mock.calls[0][0].where).toEqual({ status: "requested", requestExpiresAt: { lte: NOW } });
    expect(db.booking.findMany.mock.calls[1][0].where).toEqual({ status: "approved", paymentLinkExpiresAt: { lte: NOW } });
    expect(db.booking.updateMany).toHaveBeenCalledWith({
      where: { status: "requested", requestExpiresAt: { lte: NOW }, id: 1 },
      data: { status: "expired" },
    });
    expect(sendMail).toHaveBeenCalledTimes(2);
    expect(sendMail.mock.calls[0][0].html).toContain("not able to reply to your request");
    expect(sendMail.mock.calls[1][0].html).toContain("payment link");
  });

  it("does nothing for a row another run already took", async () => {
    db.booking.findMany.mockResolvedValueOnce([request({ id: 1 })]).mockResolvedValue([]);
    db.booking.updateMany.mockResolvedValue({ count: 0 });
    expect(await processBookingRequests(NOW)).toMatchObject({ expiredRequests: 0 });
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("alerts the admin once about a payment unverified for 24 hours, and releases nothing", async () => {
    const paid = request({ id: 3, status: "pending", paymentMethod: "gcash", paymentSubmittedAt: manila("2026-10-11", "08:00") });
    db.booking.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([paid]);
    const result = await processBookingRequests(NOW);
    expect(result).toMatchObject({ paymentAlerts: 1, failed: 0 });

    expect(db.booking.findMany.mock.calls[2][0].where).toEqual({
      status: "pending",
      holdAlertedAt: null,
      paymentSubmittedAt: { lte: manila("2026-10-11", "09:00") },
    });
    // The only write is the claim. The booking's status is never touched.
    expect(db.booking.updateMany).toHaveBeenCalledTimes(1);
    expect(db.booking.updateMany.mock.calls[0][0].data).toEqual({ holdAlertedAt: NOW });
    const mail = sendMail.mock.calls[0][0];
    expect(mail.to).toBe("customerservice@haveninlipa.com");
    expect(mail.subject).toContain("Payment Not Yet Verified");
  });

  it("releases the claim when the alert cannot be sent, so the next run retries", async () => {
    const paid = request({ id: 3, status: "pending", paymentMethod: "bpi", paymentSubmittedAt: manila("2026-10-11", "08:00") });
    db.booking.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([paid]);
    sendMail.mockRejectedValue(new Error("SMTP down"));
    expect(await processBookingRequests(NOW)).toMatchObject({ paymentAlerts: 0, failed: 1 });
    expect(db.booking.updateMany.mock.calls[1][0]).toEqual({ where: { id: 3, holdAlertedAt: NOW }, data: { holdAlertedAt: null } });
  });
});

describe("POST /api/admin/bookings/[id]/request", () => {
  const post = (body: unknown, id = "42") =>
    decide(
      new Request(`http://localhost/api/admin/bookings/${id}/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }) as unknown as NextRequest,
      { params: Promise.resolve({ id }) }
    );

  it("requires the bookings permission", async () => {
    permission.current = { ok: false, status: 403, error: "You don't have permission to do this." };
    const res = await post({ action: "approve" });
    expect(res.status).toBe(403);
    expect(db.booking.updateMany).not.toHaveBeenCalled();
  });

  it("approves and declines", async () => {
    expect(await (await post({ action: "approve" })).json()).toMatchObject({ status: "approved" });
    expect(await (await post({ action: "decline", note: "No" })).json()).toMatchObject({ status: "declined" });
  });

  it("returns the conflicts when approval is refused", async () => {
    availability.getInventoryScopeConflicts.mockResolvedValue([{ label: "Booking #50", kind: "booking" }]);
    const res = await post({ action: "approve" });
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: "conflict", conflicts: [{ label: "Booking #50" }] });
  });

  it("rejects an unknown action or a bad id", async () => {
    expect((await post({ action: "confirm" })).status).toBe(400);
    expect((await post({ action: "approve" }, "abc")).status).toBe(404);
  });
});

describe("guest emails", () => {
  const b = {
    id: 42,
    guestName: "Juan <b>Dela Cruz</b>",
    guestEmail: "juan@example.com",
    guestPhone: "+639171234567",
    checkIn: new Date("2026-10-20T00:00:00Z"),
    checkOut: new Date("2026-10-22T00:00:00Z"),
    guests: 2,
    totalPrice: 4000,
    propertyName: "Haven Suite",
  };
  const all = [
    requestReceivedGuestEmail(b, NOW),
    requestApprovedGuestEmail(b, { paymentUrl: "https://haveninlipa.com/pay/booking/tok", expiresAt: NOW }),
    requestDeclinedGuestEmail(b, "Sorry <script>"),
    requestExpiredGuestEmail(b, "request"),
    requestExpiredGuestEmail(b, "payment_link"),
  ];

  it("say a request is not a booking and the dates are not held", () => {
    expect(all[0].html).toContain("Please do not send any payment yet");
    expect(all[0].html).toContain("not held yet");
    expect(all[1].html).toContain("first come, first served");
    expect(all[1].html).toContain("Oct 12, 2026");
  });

  it("follow the content rules: no processor name, no deposit, ID or arrival detail, and guest text is escaped", () => {
    for (const mail of all) {
      expect(mail.html).not.toMatch(/stripe|deposit|\bID\b|lockbox|door code|wi-?fi|rebook/i);
      expect(mail.html).not.toContain("<b>Dela Cruz</b>");
      expect(mail.html).not.toContain("<script>");
    }
    expect(all[1].html).toContain("Credit/Debit Card");
  });
});
