/**
 * Booking amendments against a REAL database (local MySQL/MariaDB — see vitest.db.config.ts).
 *
 * Everything here runs the production code paths end to end: Prisma queries, InnoDB row
 * locks, transactions, the reconciler and the route handlers. Only three things are
 * replaced: the session (`auth`), outbound mail/SMS, and Next's cache revalidation.
 * Nothing in this file can send an email or reach Stripe.
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from "vitest";
import type { NextRequest } from "next/server";

const { session, sendGuestMessage, sendMail, stripeRetrieve } = vi.hoisted(() => ({
  session: { current: null as null | { user: { id: string; name: string; role: string } } },
  sendGuestMessage: vi.fn(async (): Promise<unknown> => ({})),
  sendMail: vi.fn<(mail: { subject: string; to: string }) => Promise<unknown>>(async () => ({})),
  stripeRetrieve: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: async () => session.current }));
vi.mock("@/lib/guestMessages", () => ({ sendGuestMessage }));
vi.mock("@/lib/email", () => ({
  createMailer: () => ({ sendMail }),
  sendEmail: vi.fn(),
  FROM_ADDRESS: "test@example.com",
}));
vi.mock("stripe", () => ({ default: class { paymentIntents = { retrieve: stripeRetrieve }; } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: (fn: unknown) => fn }));

import { prisma } from "@/lib/prisma";
import { AmendmentError, commitAmendment, previewAmendment, resyncAmendedBooking } from "@/lib/booking-amendment";
import { reconcileBookingDerivedBlocks, reconcileExternalEventDerivedBlocks, checkBookingProjection } from "@/lib/inventory-groups";
import { assertInventoryScopeAvailable, AvailabilityConflictError, getPropertyConflicts } from "@/lib/availability";
import { withInventoryLock } from "@/lib/inventory-lock";
import { bookingDerivedBlockUid, bookingUid } from "@/lib/calendar-uids";
import { claimScheduledMessage, deliverClaimedScheduledMessage, flushDueScheduledMessages } from "@/lib/scheduler";
import { PUT as statusRoute } from "@/app/api/admin/bookings/[id]/route";
import { bookingIntentMetadata } from "@/lib/stripe-payment";
import { POST as amendRoute } from "@/app/api/admin/bookings/[id]/amend/route";
import { GET as calendarFeed } from "@/app/api/calendar/[slug]/route";
import { POST as createBookingRoute } from "@/app/api/bookings/route";
import { GET as threadsRoute } from "@/app/api/admin/guest-messages/threads/route";
import { formatStayRangeShort } from "@/lib/dates";
import { buildVars } from "@/lib/templates";

// Belt and braces on top of the config guard: never run against a non-local database.
const host = new URL(process.env.DATABASE_URL ?? "mysql://unset/").hostname;
if (host !== "127.0.0.1" && host !== "localhost") throw new Error(`refusing to run against ${host}`);

const d = (key: string) => new Date(`${key}T00:00:00Z`);
// "Now" for every amendment: 10 Jan 2027, midday in Manila. All stays are in Feb 2027.
const NOW = new Date("2027-01-10T04:00:00Z");

let admin: { id: number; name: string; role: "admin" };
let P: Record<"A" | "B" | "C" | "D" | "E" | "F", number>;

async function wipe() {
  await prisma.scheduledMessage.deleteMany();
  await prisma.guestMessage.deleteMany();
  await prisma.availabilityBlock.deleteMany();
  await prisma.externalCalendarEvent.deleteMany();
  await prisma.externalCalendarSyncState.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.quickReply.deleteMany();
  await prisma.inventoryGroupMember.deleteMany();
  await prisma.inventoryGroup.deleteMany();
  await prisma.propertyRate.deleteMany();
  await prisma.property.deleteMany();
  await prisma.adminLog.deleteMany();
  await prisma.adminPermission.deleteMany();
  await prisma.adminUser.deleteMany();
}

async function property(key: string, maxGuests = 6) {
  const p = await prisma.property.create({
    data: {
      slug: `listing-${key.toLowerCase()}`,
      name: `Listing ${key}`,
      description: "test",
      type: "2BR",
      pricePerNight: 2000,
      location: "Lipa",
      maxGuests,
      includedGuests: 2,
      extraGuestFeePerNight: 500,
      images: "[]",
      amenities: "[]",
      rates: { create: [5, 6].map((dayOfWeek) => ({ rateType: "weekend", dayOfWeek, rate: 3000 })) },
    },
  });
  return p.id;
}

async function booking(propertyId: number, checkIn: string, checkOut: string, over: Record<string, unknown> = {}) {
  const b = await prisma.booking.create({
    data: {
      propertyId,
      guestName: "Ana Santos",
      guestEmail: "ana@example.com",
      guestPhone: "+639171234567",
      checkIn: d(checkIn),
      checkOut: d(checkOut),
      guests: 2,
      totalPrice: 4000,
      nightlyTotal: 4000,
      paymentMethod: "gcash",
      status: "confirmed",
      ...over,
    },
  });
  await reconcileBookingDerivedBlocks(b.id);
  return b;
}

/**
 * Model a listing with a configured channel feed that was synced a moment ago, so the
 * pre-commit freshness check is satisfied without any network fetch. (A listing with NO
 * feed URL has its imported events retracted by design — not what these tests are about.)
 */
async function freshFeed(propertyId: number) {
  await prisma.property.update({ where: { id: propertyId }, data: { airbnbIcsUrl: "https://feed.invalid/calendar.ics" } });
  await prisma.externalCalendarSyncState.create({
    data: { propertyId, lastSyncedAt: new Date(), lastAttemptAt: new Date(), lastStatus: "ok" },
  });
}

const token = async (id: number) => (await prisma.booking.findUniqueOrThrow({ where: { id } })).updatedAt.toISOString();

async function amend(id: number, changes: Record<string, unknown>, over: Record<string, unknown> = {}) {
  return commitAmendment({
    bookingId: id,
    changes,
    reason: "Guest request by phone",
    expectedUpdatedAt: await token(id),
    actor: admin,
    now: NOW,
    ...over,
  });
}

/** Active derived blocks of a booking, as `{ propertyKey: "start→end" }`. */
async function blocksOf(bookingId: number) {
  const rows = await prisma.availabilityBlock.findMany({ where: { sourceBookingId: bookingId, status: "active" } });
  const name = (id: number) => Object.entries(P).find(([, v]) => v === id)![0];
  return Object.fromEntries(
    rows.map((r) => [name(r.propertyId), `${r.startDate.toISOString().slice(0, 10)}→${r.endDate.toISOString().slice(0, 10)}`])
  );
}

async function expectRejected(run: Promise<unknown>, code: string) {
  const err = await run.then(
    () => null,
    (e) => e
  );
  expect(err).toBeInstanceOf(AmendmentError);
  expect((err as AmendmentError).code).toBe(code);
  return err as AmendmentError;
}

beforeAll(async () => {
  await prisma.$connect();
});
afterAll(async () => {
  await wipe();
  await prisma.$disconnect();
});

beforeEach(async () => {
  vi.clearAllMocks();
  sendGuestMessage.mockImplementation(async () => ({}));
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_dummy");
  vi.spyOn(console, "error").mockImplementation(() => {});
  await wipe();
  const user = await prisma.adminUser.create({ data: { email: "owner@example.com", password: "x", name: "Owner", role: "admin" } });
  admin = { id: user.id, name: user.name, role: "admin" };
  session.current = { user: { id: String(user.id), name: user.name, role: "admin" } };

  P = {
    A: await property("A", 2),
    B: await property("B", 4),
    C: await property("C", 6),
    D: await property("D"),
    E: await property("E"),
    F: await property("F"),
  };
  // House 1 = A/B/C, house 2 = D/E, F stands alone.
  await prisma.inventoryGroup.create({
    data: { name: "House 1", isActive: true, members: { create: [P.A, P.B, P.C].map((propertyId) => ({ propertyId })) } },
  });
  await prisma.inventoryGroup.create({
    data: { name: "House 2", isActive: true, members: { create: [P.D, P.E].map((propertyId) => ({ propertyId })) } },
  });
});

describe("guest-only edits", () => {
  it("updates contact details and audits them without touching availability or price", async () => {
    const b = await booking(P.A, "2027-02-10", "2027-02-12");
    const blocksBefore = await prisma.availabilityBlock.findMany({ where: { sourceBookingId: b.id } });

    const result = await amend(b.id, { guestName: "  Ana  Reyes ", guestEmail: "ana.reyes@example.com", guestPhone: "0917 555 0000" });

    expect(result.outcome).toBe("applied");
    const after = await prisma.booking.findUniqueOrThrow({ where: { id: b.id } });
    expect(after).toMatchObject({ id: b.id, status: "confirmed", guestName: "Ana Reyes", guestEmail: "ana.reyes@example.com", guestPhone: "+639175550000" });
    expect(Number(after.totalPrice)).toBe(4000);
    expect(Number(after.nightlyTotal)).toBe(4000);
    expect(after.checkIn).toEqual(b.checkIn);

    // Derived blocks were not rewritten at all.
    expect(await prisma.availabilityBlock.findMany({ where: { sourceBookingId: b.id } })).toEqual(blocksBefore);

    const log = await prisma.adminLog.findFirstOrThrow({ where: { target: `booking-${b.id}`, action: { startsWith: "Amended booking" } } });
    expect(log).toMatchObject({ actor: "Owner", actorRole: "admin", actorId: admin.id, module: "bookings" });
    const meta = JSON.parse(log.metadata!);
    expect(meta.reason).toBe("Guest request by phone");
    expect(meta.before.guestEmail).toBe("ana@example.com");
    expect(meta.after.guestEmail).toBe("ana.reyes@example.com");
    expect(log.createdAt).toBeInstanceOf(Date);
  });

  it("warns when the new email already belongs to another booking, and moves no messages", async () => {
    const other = await booking(P.F, "2027-03-01", "2027-03-03", { guestEmail: "shared@example.com", guestName: "Ben Cruz" });
    await prisma.guestMessage.create({ data: { bookingId: other.id, trigger: "manual", subject: "Hi", body: "Other guest's thread" } });
    const b = await booking(P.A, "2027-02-10", "2027-02-12");

    const review = await previewAmendment({ bookingId: b.id, changes: { guestEmail: "shared@example.com" }, now: NOW });
    expect(review.warnings.join(" ")).toContain(`booking #${other.id} (Ben Cruz)`);

    await amend(b.id, { guestEmail: "shared@example.com" });
    expect(await prisma.guestMessage.count({ where: { bookingId: b.id } })).toBe(0);
    expect(await prisma.guestMessage.count({ where: { bookingId: other.id } })).toBe(1);
  });
});

describe("date changes on a grouped listing", () => {
  it("extends a stay and re-dates the SAME sibling blocks in place (stable UIDs)", async () => {
    const b = await booking(P.A, "2027-02-10", "2027-02-12");
    const before = await prisma.availabilityBlock.findMany({ where: { sourceBookingId: b.id }, orderBy: { propertyId: "asc" } });

    const result = await amend(b.id, { checkOut: "2027-02-14" });

    expect(result.outcome).toBe("applied");
    expect(await blocksOf(b.id)).toEqual({ B: "2027-02-10→2027-02-14", C: "2027-02-10→2027-02-14" });
    const after = await prisma.availabilityBlock.findMany({ where: { sourceBookingId: b.id }, orderBy: { propertyId: "asc" } });
    expect(after.map((r) => [r.id, r.externalUid])).toEqual(before.map((r) => [r.id, r.externalUid]));
    expect(after.map((r) => r.externalUid)).toEqual([bookingDerivedBlockUid(b.id, P.B), bookingDerivedBlockUid(b.id, P.C)]);
  });

  it("keeps the agreed price on an extension and reports the reference quote without applying it", async () => {
    const b = await booking(P.A, "2027-02-10", "2027-02-12"); // Wed→Fri, 2 × ₱2,000
    const result = await amend(b.id, { checkOut: "2027-02-13" }); // + Fri night at ₱3,000

    const after = await prisma.booking.findUniqueOrThrow({ where: { id: b.id } });
    expect([Number(after.totalPrice), Number(after.nightlyTotal), after.extraGuestFee, after.stripeFee, after.discountAmount]).toEqual([4000, 4000, null, null, null]);
    expect(result.review.financial).toMatchObject({ mode: "preserve", reference: { ok: true, total: 7000, difference: 3000 } });
    expect(await prisma.additionalCharge?.count?.() ?? 0).toBe(0);
  });

  it("shortens a stay and frees the released nights on every sibling", async () => {
    const b = await booking(P.A, "2027-02-10", "2027-02-14");
    await amend(b.id, { checkOut: "2027-02-12" });
    expect(await blocksOf(b.id)).toEqual({ B: "2027-02-10→2027-02-12", C: "2027-02-10→2027-02-12" });
    expect(await getPropertyConflicts({ propertyId: P.B, start: d("2027-02-12"), end: d("2027-02-14"), syncPolicy: "skip" })).toEqual([]);
  });

  it("does not conflict with itself when the new dates overlap the old ones", async () => {
    const b = await booking(P.A, "2027-02-10", "2027-02-13");
    const result = await amend(b.id, { checkIn: "2027-02-11", checkOut: "2027-02-15" });
    expect(result.outcome).toBe("applied");
    expect(await blocksOf(b.id)).toEqual({ B: "2027-02-11→2027-02-15", C: "2027-02-11→2027-02-15" });
  });

  it("allows same-day turnover: checking in on another booking's check-out day", async () => {
    await booking(P.A, "2027-02-05", "2027-02-10", { guestName: "Earlier Guest" });
    const b = await booking(P.A, "2027-02-12", "2027-02-14");
    expect((await amend(b.id, { checkIn: "2027-02-10" })).outcome).toBe("applied");
    await expectRejected(amend(b.id, { checkIn: "2027-02-09" }), "conflict");
  });
});

describe("conflicts leave the original booking intact", () => {
  async function untouched(id: number, expected: { propertyId: number; checkIn: string; checkOut: string }, blocks: Record<string, string>, updatedAt: string) {
    const after = await prisma.booking.findUniqueOrThrow({ where: { id } });
    expect(after.propertyId).toBe(expected.propertyId);
    expect(after.checkIn).toEqual(d(expected.checkIn));
    expect(after.checkOut).toEqual(d(expected.checkOut));
    expect(after.updatedAt.toISOString()).toBe(updatedAt);
    expect(await blocksOf(id)).toEqual(blocks);
    expect(await prisma.adminLog.count({ where: { action: { startsWith: "Amended booking" } } })).toBe(0);
  }

  it("rejects an unrelated booking on the same listing", async () => {
    await booking(P.A, "2027-02-14", "2027-02-16", { guestName: "Other Guest" });
    const b = await booking(P.A, "2027-02-10", "2027-02-12");
    const t = await token(b.id);
    const err = await expectRejected(amend(b.id, { checkOut: "2027-02-15" }), "conflict");
    expect(err.status).toBe(409);
    expect(err.details.conflicts![0].label).toContain("Other Guest");
    await untouched(b.id, { propertyId: P.A, checkIn: "2027-02-10", checkOut: "2027-02-12" }, { B: "2027-02-10→2027-02-12", C: "2027-02-10→2027-02-12" }, t);
  });

  it("rejects a pending booking on a sibling listing — pending blocks too", async () => {
    await booking(P.C, "2027-02-14", "2027-02-16", { status: "pending" });
    const b = await booking(P.A, "2027-02-10", "2027-02-12");
    await expectRejected(amend(b.id, { checkOut: "2027-02-15" }), "conflict");
  });

  it("still rejects a sibling booking whose derived block is missing (reads the source, not the projection)", async () => {
    const other = await booking(P.C, "2027-02-14", "2027-02-16");
    await prisma.availabilityBlock.deleteMany({ where: { sourceBookingId: other.id } });
    const b = await booking(P.A, "2027-02-10", "2027-02-12");
    const err = await expectRejected(amend(b.id, { checkOut: "2027-02-15" }), "conflict");
    expect(err.details.conflicts![0].label).toContain("shared inventory");
  });

  it("rejects a manual block", async () => {
    await prisma.availabilityBlock.create({
      data: { propertyId: P.A, startDate: d("2027-02-13"), endDate: d("2027-02-15"), type: "manual", reason: "maintenance" },
    });
    const b = await booking(P.A, "2027-02-10", "2027-02-12");
    const t = await token(b.id);
    await expectRejected(amend(b.id, { checkOut: "2027-02-14" }), "conflict");
    await untouched(b.id, { propertyId: P.A, checkIn: "2027-02-10", checkOut: "2027-02-12" }, { B: "2027-02-10→2027-02-12", C: "2027-02-10→2027-02-12" }, t);
  });

  it("rejects an imported channel event, and never clears one just because it overlaps the old stay", async () => {
    await freshFeed(P.A);
    const b = await booking(P.A, "2027-02-10", "2027-02-12");
    // An imported event sitting on the booking's own current nights (an echo, or a real
    // channel reservation — the code cannot know which, so it must not assume).
    const ev = await prisma.externalCalendarEvent.create({
      data: { propertyId: P.A, externalUid: "airbnb-1", summary: "Reserved", startDate: d("2027-02-10"), endDate: d("2027-02-12") },
    });
    const err = await expectRejected(amend(b.id, { checkOut: "2027-02-13" }), "conflict");
    expect(err.details.conflicts![0].kind).toBe("external_event");
    expect((await prisma.externalCalendarEvent.findUniqueOrThrow({ where: { id: ev.id } })).status).toBe("active");

    // Moving wholly clear of it is fine, and the event stays exactly where it was.
    expect((await amend(b.id, { checkIn: "2027-02-12", checkOut: "2027-02-14" })).outcome).toBe("applied");
    expect((await prisma.externalCalendarEvent.findUniqueOrThrow({ where: { id: ev.id } })).status).toBe("active");
  });

  it("an imported event the booking was covering resumes blocking siblings once the booking moves away", async () => {
    await freshFeed(P.A);
    const b = await booking(P.A, "2027-02-10", "2027-02-12");
    const ev = await prisma.externalCalendarEvent.create({
      data: { propertyId: P.A, externalUid: "airbnb-2", startDate: d("2027-02-10"), endDate: d("2027-02-12") },
    });
    await reconcileExternalEventDerivedBlocks(ev.id);
    // Fully covered by the HIL booking → suppressed as an echo (DEC-003).
    expect(await prisma.availabilityBlock.count({ where: { sourceExternalEventId: ev.id, status: "active" } })).toBe(0);

    await amend(b.id, { checkIn: "2027-02-20", checkOut: "2027-02-22" });

    // No longer covered: it must block B and C for its nights, in the same commit.
    const derived = await prisma.availabilityBlock.findMany({ where: { sourceExternalEventId: ev.id, status: "active" } });
    expect(derived.map((r) => r.propertyId).sort()).toEqual([P.B, P.C].sort());
  });
});

describe("property moves", () => {
  it("within a group: blocks the vacated listing, releases the new one, keeps UIDs stable", async () => {
    const b = await booking(P.A, "2027-02-10", "2027-02-12");
    const cBlock = await prisma.availabilityBlock.findUniqueOrThrow({ where: { externalUid: bookingDerivedBlockUid(b.id, P.C) } });

    const result = await amend(b.id, { propertyId: P.B });

    expect(result.outcome).toBe("applied");
    expect(result.review.inventory).toEqual({ alsoBlocks: ["Listing A", "Listing C"], releases: [] });
    expect(await blocksOf(b.id)).toEqual({ A: "2027-02-10→2027-02-12", C: "2027-02-10→2027-02-12" });
    // The block that used to sit on B is soft-cancelled, not deleted.
    const old = await prisma.availabilityBlock.findUniqueOrThrow({ where: { externalUid: bookingDerivedBlockUid(b.id, P.B) } });
    expect(old.status).toBe("cancelled");
    expect(old.cancelledAt).not.toBeNull();
    // C's block is the same row.
    expect((await prisma.availabilityBlock.findUniqueOrThrow({ where: { externalUid: bookingDerivedBlockUid(b.id, P.C) } })).id).toBe(cBlock.id);
  });

  it("between groups: releases the old house and blocks the new one", async () => {
    const b = await booking(P.A, "2027-02-10", "2027-02-12");
    const result = await amend(b.id, { propertyId: P.D });
    expect(result.review.inventory).toEqual({ alsoBlocks: ["Listing E"], releases: ["Listing B", "Listing C"] });
    expect(await blocksOf(b.id)).toEqual({ E: "2027-02-10→2027-02-12" });
    for (const p of [P.A, P.B, P.C]) {
      expect(await getPropertyConflicts({ propertyId: p, start: d("2027-02-10"), end: d("2027-02-12"), syncPolicy: "skip" })).toEqual([]);
    }
  });

  it("to and from an ungrouped listing", async () => {
    const b = await booking(P.A, "2027-02-10", "2027-02-12");
    await amend(b.id, { propertyId: P.F });
    expect(await blocksOf(b.id)).toEqual({});
    await amend(b.id, { propertyId: P.C, checkIn: "2027-02-11", checkOut: "2027-02-13", guests: 5 });
    expect(await blocksOf(b.id)).toEqual({ A: "2027-02-11→2027-02-13", B: "2027-02-11→2027-02-13" });
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: b.id } })).guests).toBe(5);
  });

  it("rejects a move onto a listing whose sibling is booked, and one that exceeds capacity", async () => {
    await booking(P.E, "2027-02-10", "2027-02-12", { guestName: "House Two Guest" });
    const b = await booking(P.A, "2027-02-10", "2027-02-12");
    await expectRejected(amend(b.id, { propertyId: P.D }), "conflict");

    const big = await booking(P.C, "2027-03-10", "2027-03-12", { guests: 5 });
    const err = await expectRejected(amend(big.id, { propertyId: P.A }), "invalid");
    expect(err.details.fieldErrors!.guests).toContain("up to 2");
  });

  it("works for a pending booking and keeps it pending", async () => {
    const b = await booking(P.A, "2027-02-10", "2027-02-12", { status: "pending" });
    await amend(b.id, { propertyId: P.D, checkOut: "2027-02-13" });
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: b.id } })).status).toBe("pending");
    expect(await blocksOf(b.id)).toEqual({ E: "2027-02-10→2027-02-13" });
  });
});

describe("eligibility", () => {
  it("never amends — or reactivates — a cancelled booking", async () => {
    const b = await booking(P.A, "2027-02-10", "2027-02-12", { status: "cancelled" });
    await expectRejected(amend(b.id, { guestName: "New Name" }), "not_editable");
    await expectRejected(amend(b.id, { checkOut: "2027-02-13" }), "not_editable");
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: b.id } })).status).toBe("cancelled");
    expect(await blocksOf(b.id)).toEqual({});
  });

  it("in-progress stay: check-out and guests can change, check-in and property cannot", async () => {
    const b = await booking(P.C, "2027-01-09", "2027-01-11");
    await expectRejected(amend(b.id, { checkIn: "2027-01-10" }), "not_editable");
    await expectRejected(amend(b.id, { propertyId: P.F }), "not_editable");
    expect((await amend(b.id, { checkOut: "2027-01-12", guests: 4 })).outcome).toBe("applied");
  });

  it("past stay: contact details only", async () => {
    const b = await booking(P.A, "2027-01-02", "2027-01-04");
    await expectRejected(amend(b.id, { checkOut: "2027-01-12" }), "not_editable");
    expect((await amend(b.id, { guestEmail: "fixed@example.com" })).outcome).toBe("applied");
  });
});

describe("pricing and field allowlist", () => {
  it("rejects financial or status fields and any re-pricing mode", async () => {
    const b = await booking(P.A, "2027-02-10", "2027-02-12");
    await expectRejected(amend(b.id, { guestName: "X Y", totalPrice: 1 }), "invalid");
    await expectRejected(amend(b.id, { status: "confirmed" }), "invalid");
    await expectRejected(amend(b.id, { checkOut: "2027-02-13" }, { pricing: "reprice" }), "unsupported");
    const after = await prisma.booking.findUniqueOrThrow({ where: { id: b.id } });
    expect(Number(after.totalPrice)).toBe(4000);
    expect(after.checkOut).toEqual(d("2027-02-12"));
  });

  it("requires a reason", async () => {
    const b = await booking(P.A, "2027-02-10", "2027-02-12");
    const err = await expectRejected(amend(b.id, { guests: 1 }, { reason: "  " }), "invalid");
    expect(err.details.fieldErrors!.reason).toBeTruthy();
  });
});

describe("stale edits, rollback and retry", () => {
  it("rejects a save made against an out-of-date copy of the booking", async () => {
    const b = await booking(P.A, "2027-02-10", "2027-02-12");
    const stale = await token(b.id);
    await amend(b.id, { guests: 1 });
    await expectRejected(amend(b.id, { checkOut: "2027-02-14" }, { expectedUpdatedAt: stale }), "stale");
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: b.id } })).checkOut).toEqual(d("2027-02-12"));
  });

  it("rolls back the booking, blocks and messages together when the commit fails late, and a retry succeeds", async () => {
    const b = await booking(P.A, "2027-02-10", "2027-02-12");
    const t = await token(b.id);
    // The audit insert is the LAST write in the transaction; an actor id with no AdminUser
    // row violates its foreign key, so the failure lands after every other write.
    await expect(amend(b.id, { propertyId: P.D, checkOut: "2027-02-14" }, { actor: { ...admin, id: 999_999 } })).rejects.toThrow();

    const after = await prisma.booking.findUniqueOrThrow({ where: { id: b.id } });
    expect([after.propertyId, after.checkOut, after.updatedAt.toISOString()]).toEqual([P.A, d("2027-02-12"), t]);
    expect(await blocksOf(b.id)).toEqual({ B: "2027-02-10→2027-02-12", C: "2027-02-10→2027-02-12" });
    expect(await prisma.availabilityBlock.count({ where: { propertyId: P.E } })).toBe(0);
    expect(await prisma.adminLog.count({ where: { action: { startsWith: "Amended booking" } } })).toBe(0);

    // Same request again, same token — safe to retry.
    expect((await amend(b.id, { propertyId: P.D, checkOut: "2027-02-14" }, { expectedUpdatedAt: t })).outcome).toBe("applied");
    expect(await blocksOf(b.id)).toEqual({ E: "2027-02-10→2027-02-14" });
  });

  it("detects an incomplete projection and resync repairs it idempotently", async () => {
    const b = await booking(P.A, "2027-02-10", "2027-02-12");
    await prisma.availabilityBlock.updateMany({ where: { sourceBookingId: b.id, propertyId: P.C }, data: { status: "cancelled" } });
    expect((await checkBookingProjection(b.id)).inSync).toBe(false);
    expect((await resyncAmendedBooking(b.id, NOW)).verified).toBe(true);
    const second = await resyncAmendedBooking(b.id, NOW);
    expect(second).toEqual({ verified: true, blocks: { created: 0, updated: 0, cancelled: 0 } });
  });
});

describe("concurrency (real row locks)", () => {
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  /** What the public booking route does to claim nights: lock, re-check, insert. */
  const createLocked = (propertyId: number, checkIn: string, checkOut: string) =>
    withInventoryLock([propertyId], async (tx) => {
      await assertInventoryScopeAvailable({ propertyId, start: d(checkIn), end: d(checkOut), db: tx });
      await sleep(150); // widen the window a race would need
      return tx.booking.create({
        data: { propertyId, guestName: "Racer", guestEmail: "racer@example.com", guestPhone: "+639170000000", checkIn: d(checkIn), checkOut: d(checkOut), totalPrice: 1, status: "pending" },
      });
    });

  it("CONTROL: the same race WITHOUT the lock double-books, even inside transactions", async () => {
    const unlocked = () =>
      prisma.$transaction(async (tx) => {
        await assertInventoryScopeAvailable({ propertyId: P.F, start: d("2027-04-01"), end: d("2027-04-03"), db: tx });
        await sleep(150);
        return tx.booking.create({
          data: { propertyId: P.F, guestName: "Racer", guestEmail: "r@example.com", guestPhone: "+639170000000", checkIn: d("2027-04-01"), checkOut: d("2027-04-03"), totalPrice: 1, status: "pending" },
        });
      });
    const results = await Promise.allSettled([unlocked(), unlocked()]);
    // Both pass their check and both insert: a transaction alone prevents nothing.
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(2);
  });

  it("two guests booking the same nights: exactly one wins", async () => {
    const results = await Promise.allSettled([createLocked(P.F, "2027-04-01", "2027-04-03"), createLocked(P.F, "2027-04-02", "2027-04-04")]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((results.find((r) => r.status === "rejected") as PromiseRejectedResult).reason).toBeInstanceOf(AvailabilityConflictError);
    expect(await prisma.booking.count({ where: { propertyId: P.F } })).toBe(1);
  });

  it("two guests booking DIFFERENT listings of the same house: exactly one wins", async () => {
    const results = await Promise.allSettled([createLocked(P.A, "2027-04-01", "2027-04-03"), createLocked(P.C, "2027-04-02", "2027-04-04")]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  });

  it("the real POST /api/bookings route: concurrent guests, same house — one booking, one 409, blocks written", async () => {
    const post = (propertyId: number, guestEmail: string) =>
      createBookingRoute(
        new Request("http://localhost/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ propertyId, guestName: "Web Guest", guestEmail, guestPhone: "09171234567", checkIn: "2027-05-03", checkOut: "2027-05-05", guests: 2, paymentMethod: "gcash" }),
        }) as unknown as NextRequest
      );
    const responses = await Promise.all([post(P.A, "one@example.com"), post(P.B, "two@example.com"), post(P.C, "three@example.com")]);
    expect(responses.map((r) => r.status).sort()).toEqual([200, 409, 409]);
    const made = await prisma.booking.findMany({ where: { checkIn: d("2027-05-03") } });
    expect(made).toHaveLength(1);
    expect(made[0]).toMatchObject({ status: "pending", paymentMethod: "gcash" });
    expect(Number(made[0].totalPrice)).toBe(4000); // server-priced: 2 weeknights × ₱2,000
    expect(Object.keys(await blocksOf(made[0].id))).toHaveLength(2);
  });

  it("an amendment and a new booking racing for the same nights: exactly one wins", async () => {
    const b = await booking(P.A, "2027-02-10", "2027-02-12");
    const [amended, created] = await Promise.allSettled([
      amend(b.id, { checkOut: "2027-02-14" }),
      createLocked(P.B, "2027-02-12", "2027-02-14"),
    ]);
    expect([amended.status, created.status].filter((s) => s === "fulfilled")).toHaveLength(1);
    const final = await prisma.booking.findUniqueOrThrow({ where: { id: b.id } });
    if (amended.status === "fulfilled") {
      expect(final.checkOut).toEqual(d("2027-02-14"));
      expect(await prisma.booking.count({ where: { propertyId: P.B } })).toBe(0);
    } else {
      expect((amended.reason as AmendmentError).code).toBe("conflict");
      expect(final.checkOut).toEqual(d("2027-02-12"));
    }
  });

  it("two bookings amended onto the same free nights on sibling listings: exactly one wins", async () => {
    const one = await booking(P.A, "2027-02-10", "2027-02-12");
    const two = await booking(P.C, "2027-02-20", "2027-02-22", { guestName: "Second Guest" });
    const results = await Promise.allSettled([
      amend(one.id, { checkIn: "2027-02-15", checkOut: "2027-02-17" }),
      amend(two.id, { checkIn: "2027-02-16", checkOut: "2027-02-18" }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const loser = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect((loser.reason as AmendmentError).code).toBe("conflict");
    // Neither listing ends up with overlapping claims.
    for (const b of [one, two]) expect((await checkBookingProjection(b.id)).inSync).toBe(true);
  });

  it("the same booking saved twice from one stale form: one applies, one is rejected as stale", async () => {
    const b = await booking(P.A, "2027-02-10", "2027-02-12");
    const t = await token(b.id);
    const results = await Promise.allSettled([
      amend(b.id, { checkOut: "2027-02-13" }, { expectedUpdatedAt: t }),
      amend(b.id, { checkOut: "2027-02-14" }, { expectedUpdatedAt: t }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(((results.find((r) => r.status === "rejected") as PromiseRejectedResult).reason as AmendmentError).code).toBe("stale");
    expect(await prisma.adminLog.count({ where: { action: { startsWith: "Amended booking" } } })).toBe(1);
  });
});

describe("scheduled messages", () => {
  async function templates() {
    const mk = (name: string, anchor: string, offsetHours: number, propertyIds: number[] | null = null) =>
      prisma.quickReply.create({
        data: { name, subject: name, bodyTemplate: "Hi {{guestFirstName}}, check-in {{checkIn}} at {{propertyName}}", trigger: "auto", anchor, offsetHours, propertyIds: propertyIds ? JSON.stringify(propertyIds) : null },
      });
    return {
      reminder: await mk("Check-in reminder", "checkIn", -24),
      thanks: await mk("Thanks for staying", "checkOut", 4),
      welcome: await mk("Welcome", "confirmation", 0),
      houseOne: await mk("House 1 directions", "checkIn", -48, [P.A, P.B, P.C]),
      houseTwo: await mk("House 2 directions", "checkIn", -48, [P.D, P.E]),
      houseTwoWelcome: await mk("House 2 welcome", "confirmation", 0, [P.D, P.E]),
    };
  }
  const row = (bookingId: number, quickReplyId: number, sendAt: string, status = "pending") =>
    prisma.scheduledMessage.create({ data: { bookingId, quickReplyId, sendAt: new Date(sendAt), status, sentAt: status === "sent" ? new Date(sendAt) : null } });
  const rows = async (bookingId: number) =>
    (await prisma.scheduledMessage.findMany({ where: { bookingId }, include: { quickReply: true }, orderBy: { id: "asc" } })).map(
      (r) => `${r.quickReply.name} | ${r.status} | ${r.sendAt.toISOString()}`
    );

  it("re-times unsent reminders, keeps sent history, withdraws and adds listing-specific templates, replays nothing", async () => {
    const t = await templates();
    const b = await booking(P.A, "2027-02-10", "2027-02-12");
    await row(b.id, t.reminder.id, "2027-02-09T00:00:00Z");
    await row(b.id, t.thanks.id, "2027-02-12T04:00:00Z");
    await row(b.id, t.welcome.id, "2027-01-05T00:00:00Z", "sent");
    await row(b.id, t.houseOne.id, "2027-02-08T00:00:00Z");

    const result = await amend(b.id, { propertyId: P.D, checkIn: "2027-02-20", checkOut: "2027-02-23" });

    expect(await rows(b.id)).toEqual([
      "Check-in reminder | pending | 2027-02-19T00:00:00.000Z",
      "Thanks for staying | pending | 2027-02-23T04:00:00.000Z",
      "Welcome | sent | 2027-01-05T00:00:00.000Z",
      "House 1 directions | skipped | 2027-02-08T00:00:00.000Z",
      "House 2 directions | pending | 2027-02-18T00:00:00.000Z",
    ]);
    expect(result.review.messages!.notReplayed).toEqual(["House 2 welcome"]);
    expect(sendGuestMessage).not.toHaveBeenCalled();

    // Amending again creates no duplicates.
    await amend(b.id, { checkOut: "2027-02-24" });
    expect((await rows(b.id)).filter((r) => r.startsWith("House 2 directions"))).toHaveLength(1);
    expect((await rows(b.id)).filter((r) => r.startsWith("Check-in reminder"))).toHaveLength(1);
  });

  it("holds — does not send — a reminder whose amended time is already in the past", async () => {
    const t = await templates();
    const b = await booking(P.F, "2027-02-10", "2027-02-12");
    await row(b.id, t.reminder.id, "2027-02-09T00:00:00Z");

    // Check-in moves to 11 Jan; "24h before" was 10 Jan 00:00Z — four hours before NOW.
    const result = await amend(b.id, { checkIn: "2027-01-11", checkOut: "2027-01-13" });

    expect(result.review.messages!.held.map((h) => h.name)).toEqual(["Check-in reminder"]);
    expect(await rows(b.id)).toEqual(["Check-in reminder | skipped | 2027-02-09T00:00:00.000Z"]);
    await flushDueScheduledMessages({ bookingId: b.id });
    expect(sendGuestMessage).not.toHaveBeenCalled();
  });

  it("the sending worker does not fire a reminder an amendment has just moved, and never double-sends", async () => {
    const t = await templates();
    const past = new Date(Date.now() - 60_000);
    const b = await booking(P.F, past.toISOString().slice(0, 10), "2099-01-05");
    // A reminder that is due right now for the current check-in.
    const due = await prisma.scheduledMessage.create({ data: { bookingId: b.id, quickReplyId: t.reminder.id, sendAt: past, status: "pending" } });

    // Two overlapping worker runs: the conditional claim lets exactly one send.
    await Promise.all([flushDueScheduledMessages({ bookingId: b.id }), flushDueScheduledMessages({ bookingId: b.id })]);
    expect(sendGuestMessage).toHaveBeenCalledTimes(1);
    expect((await prisma.scheduledMessage.findUniqueOrThrow({ where: { id: due.id } })).status).toBe("sent");

    // A row that looks due, but whose booking has since moved a year out: handed back, not sent.
    sendGuestMessage.mockClear();
    const later = await booking(P.F, "2099-06-10", "2099-06-12");
    const stale = await prisma.scheduledMessage.create({ data: { bookingId: later.id, quickReplyId: t.reminder.id, sendAt: past, status: "pending" } });
    await flushDueScheduledMessages({ bookingId: later.id });
    expect(sendGuestMessage).not.toHaveBeenCalled();
    expect(await prisma.scheduledMessage.findUniqueOrThrow({ where: { id: stale.id } })).toMatchObject({ status: "pending", sendAt: new Date("2099-06-09T00:00:00Z") });
  });
});

describe("Messages: labels follow the booking, history does not change", () => {
  it("the thread shows the amended guest, listing and dates; sent messages keep their original text", async () => {
    const b = await booking(P.A, "2027-02-10", "2027-02-12");
    const sent = await prisma.guestMessage.create({
      data: { bookingId: b.id, trigger: "auto", subject: "See you soon", body: "Hi Ana, check-in is Wed, February 10, 2027 at Listing A.", sentAt: new Date("2027-01-05T00:00:00Z") },
    });

    await amend(b.id, { guestName: "Ana Reyes", propertyId: P.D, checkIn: "2027-02-20", checkOut: "2027-02-23" });

    // Thread identity is the booking id — same thread, same message, untouched.
    expect(await prisma.guestMessage.findMany({ where: { bookingId: b.id } })).toEqual([sent]);

    const { NextRequest } = await import("next/server");
    const res = await threadsRoute(new NextRequest("http://localhost/api/admin/guest-messages/threads"));
    const thread = (await res.json()).threads.find((t: { bookingId: number }) => t.bookingId === b.id);
    expect(thread).toMatchObject({ guestName: "Ana Reyes", property: { name: "Listing D" }, lastPreview: sent.body });
    expect(formatStayRangeShort(thread.checkIn, thread.checkOut)).toBe("2/20–2/23");

    // Templates render at send time from the booking as it is now.
    const now = await prisma.booking.findUniqueOrThrow({ where: { id: b.id }, include: { property: true } });
    expect(buildVars({ booking: now, property: now.property })).toMatchObject({
      guestFirstName: "Ana", guestLastName: "Reyes", propertyName: "Listing D", nights: "3", checkInShort: "2/20", checkOutShort: "2/23", totalPrice: "₱4,000",
    });
  });
});

describe("iCal feeds", () => {
  const uids = async (key: string) => {
    const res = await calendarFeed(new Request("http://localhost/"), { params: Promise.resolve({ slug: `listing-${key.toLowerCase()}.ics` }) });
    return [...(await res.text()).matchAll(/UID:(.+)/g)].map((m) => m[1].trim()).sort();
  };

  it("keeps the booking's UID through a move and shows the right events on every affected feed", async () => {
    const b = await booking(P.A, "2099-02-10", "2099-02-12");
    expect(await uids("A")).toEqual([bookingUid(b.id)]);
    expect(await uids("B")).toEqual([bookingDerivedBlockUid(b.id, P.B)]);

    await amend(b.id, { propertyId: P.D, checkOut: "2099-02-13" });

    // Old house: nothing left of this booking on any of its three feeds.
    expect([await uids("A"), await uids("B"), await uids("C")]).toEqual([[], [], []]);
    // New house: the SAME booking UID on its listing, a derived block on the sibling.
    expect(await uids("D")).toEqual([bookingUid(b.id)]);
    expect(await uids("E")).toEqual([bookingDerivedBlockUid(b.id, P.E)]);
    const feed = await (await calendarFeed(new Request("http://localhost/"), { params: Promise.resolve({ slug: "listing-d" }) })).text();
    expect(feed).toContain("DTSTART;VALUE=DATE:20990210");
    expect(feed).toContain("DTEND;VALUE=DATE:20990213");
  });
});

describe("POST /api/admin/bookings/[id]/amend — permissions on real AdminUser rows", () => {
  const call = (id: number, body: unknown) =>
    amendRoute(
      new Request("http://localhost/api", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }) as unknown as NextRequest,
      { params: Promise.resolve({ id: String(id) }) }
    );
  const manager = async (bookings: boolean) => {
    const u = await prisma.adminUser.create({
      data: { email: `m${Math.random()}@example.com`, password: "x", name: "Manager", role: "manager", permissions: { create: { bookings, messages: true } } },
    });
    session.current = { user: { id: String(u.id), name: u.name, role: "manager" } };
    return u;
  };

  it("401 without a session; 403 for a manager lacking `bookings`; nothing is written", async () => {
    const b = await booking(P.A, "2027-02-10", "2027-02-12");
    const body = { action: "commit", changes: { guestName: "Hacked Name" }, reason: "trying it on", expectedUpdatedAt: await token(b.id) };

    session.current = null;
    expect((await call(b.id, body)).status).toBe(401);

    await manager(false);
    const res = await call(b.id, body);
    expect(res.status).toBe(403);
    expect((await call(b.id, { action: "preview", changes: { guestName: "X Y" } })).status).toBe(403);
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: b.id } })).guestName).toBe("Ana Santos");
  });

  it("a session whose user was deleted, or whose JWT still says admin after a demotion, is refused", async () => {
    const b = await booking(P.A, "2027-02-10", "2027-02-12");
    session.current = { user: { id: "424242", name: "Ghost", role: "admin" } };
    expect((await call(b.id, { action: "preview", changes: { guests: 1 } })).status).toBe(401);

    const u = await manager(false);
    session.current = { user: { id: String(u.id), name: u.name, role: "admin" } }; // stale token
    expect((await call(b.id, { action: "preview", changes: { guests: 1 } })).status).toBe(403);
  });

  it("a manager WITH `bookings` can preview and commit; the audit names them", async () => {
    const b = await booking(P.A, "2027-02-10", "2027-02-12");
    const u = await manager(true);

    const preview = await call(b.id, { action: "preview", changes: { guests: 1 } });
    expect(preview.status).toBe(200);
    const { review } = await preview.json();

    const res = await call(b.id, { action: "commit", changes: { guests: 1 }, reason: "One guest dropped out", expectedUpdatedAt: review.expectedUpdatedAt });
    expect(res.status).toBe(200);
    expect((await res.json()).outcome).toBe("applied");
    const log = await prisma.adminLog.findFirstOrThrow({ where: { action: { startsWith: "Amended booking" } } });
    expect(log).toMatchObject({ actor: "Manager", actorRole: "manager", actorId: u.id });
  });

  it("maps conflicts and stale saves to 409 with a machine-readable code", async () => {
    await booking(P.A, "2027-02-12", "2027-02-14", { guestName: "Other Guest" });
    const b = await booking(P.A, "2027-02-10", "2027-02-12");
    const conflict = await call(b.id, { action: "commit", changes: { checkOut: "2027-02-13" }, reason: "extend one night", expectedUpdatedAt: await token(b.id) });
    expect(conflict.status).toBe(409);
    expect(await conflict.json()).toMatchObject({ code: "conflict", conflicts: [{ kind: "booking" }] });

    const stale = await call(b.id, { action: "commit", changes: { guests: 1 }, reason: "one fewer guest", expectedUpdatedAt: "2020-01-01T00:00:00.000Z" });
    expect(stale.status).toBe(409);
    expect((await stale.json()).code).toBe("stale");
  });
});

describe("amendment vs. reminder send — both orders, on real rows", () => {
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  // These run on the real clock: the reminder is due now, the stay starts in a day.
  const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

  async function dueReminder(propertyIds: number[] | null = null) {
    const reply = await prisma.quickReply.create({
      data: { name: "Arrival details", subject: "Arrival", bodyTemplate: "See you {{checkIn}}", trigger: "auto", anchor: "checkIn", offsetHours: -48, propertyIds: propertyIds ? JSON.stringify(propertyIds) : null },
    });
    const b = await booking(P.F, day(1), day(3));
    const row = await prisma.scheduledMessage.create({
      data: { bookingId: b.id, quickReplyId: reply.id, sendAt: new Date(b.checkIn.getTime() - 48 * 3_600_000), status: "pending" },
    });
    return { b, row };
  }
  const liveAmend = (id: number, changes: Record<string, unknown>) => amend(id, changes, { now: new Date() });
  const state = async (id: number) => {
    const r = await prisma.scheduledMessage.findUniqueOrThrow({ where: { id } });
    return `${r.status} @ ${r.sendAt.toISOString().slice(0, 10)}`;
  };

  it("ORDER 1 — amendment commits, then the worker reaches the row: not sent, re-timed", async () => {
    const { b, row } = await dueReminder();
    // The worker has already read this row as due…
    const seenByWorker = { id: row.id, sendAt: row.sendAt };
    // …the amendment moves the stay a month out and commits…
    const result = await liveAmend(b.id, { checkIn: day(30), checkOut: day(32) });
    expect(result.propagation.messages).toMatchObject({ rescheduled: 1 });
    // …so the worker's claim fails and nothing is sent.
    expect(await claimScheduledMessage(seenByWorker)).toBe(false);
    expect(sendGuestMessage).not.toHaveBeenCalled();
    expect(await state(row.id)).toBe(`pending @ ${day(28)}`);
  });

  it("ORDER 1b — the claim arrives while the amendment is still uncommitted: it waits, then loses", async () => {
    const { row } = await dueReminder();
    const later = new Date(Date.now() + 28 * 86_400_000);
    let claim!: Promise<boolean>;
    await prisma.$transaction(async (tx) => {
      await tx.scheduledMessage.update({ where: { id: row.id }, data: { sendAt: later } });
      claim = claimScheduledMessage({ id: row.id, sendAt: row.sendAt }); // blocks on the row lock
      await sleep(150);
    });
    expect(await claim).toBe(false);
  });

  it("ORDER 2 — worker claims first, amendment commits before the worker's re-check: handed back, not sent", async () => {
    const { b, row } = await dueReminder();
    expect(await claimScheduledMessage(row)).toBe(true);

    const result = await liveAmend(b.id, { checkIn: day(30), checkOut: day(32) });
    // The amendment could not touch the claimed row, and says so instead of claiming it did.
    expect(result.propagation.messages).toMatchObject({ rescheduled: 0 });
    expect(result.review.messages!.inFlight).toEqual(["Arrival details"]);
    expect(await state(row.id)).toBe(`sending @ ${row.sendAt.toISOString().slice(0, 10)}`);

    expect(await deliverClaimedScheduledMessage(row.id)).toBe("handed_back");
    expect(sendGuestMessage).not.toHaveBeenCalled();
    expect(await state(row.id)).toBe(`pending @ ${day(28)}`);
  });

  it("ORDER 2 — …and a move to a listing the template is not for is skipped at the re-check", async () => {
    const { b, row } = await dueReminder([P.F]);
    expect(await claimScheduledMessage(row)).toBe(true);
    await liveAmend(b.id, { propertyId: P.D });
    expect(await deliverClaimedScheduledMessage(row.id)).toBe("skipped");
    expect(sendGuestMessage).not.toHaveBeenCalled();
  });

  it("ORDER 2 — …a cancellation before the re-check is honoured too", async () => {
    const { b, row } = await dueReminder();
    expect(await claimScheduledMessage(row)).toBe(true);
    await prisma.booking.update({ where: { id: b.id }, data: { status: "cancelled" } });
    expect(await deliverClaimedScheduledMessage(row.id)).toBe("skipped");
    expect(sendGuestMessage).not.toHaveBeenCalled();
  });

  it("TOO LATE — an amendment that commits after the re-check cannot stop the send (the honest limit)", async () => {
    const { b, row } = await dueReminder();
    expect(await claimScheduledMessage(row)).toBe(true);
    // The amendment lands while the message is being handed to the mail server.
    let amended!: Awaited<ReturnType<typeof amend>>;
    sendGuestMessage.mockImplementationOnce(async () => {
      amended = await liveAmend(b.id, { checkIn: day(30), checkOut: day(32) });
      return {};
    });

    expect(await deliverClaimedScheduledMessage(row.id)).toBe("sent");

    expect(sendGuestMessage).toHaveBeenCalledTimes(1);
    expect(amended.outcome).toBe("applied"); // the booking itself is amended correctly
    expect(amended.review.messages!.inFlight).toEqual(["Arrival details"]); // …and the admin was told
    expect(await state(row.id)).toMatch(/^sent @/);
    // Nothing is queued to send it a second time for the new dates.
    expect(await prisma.scheduledMessage.count({ where: { bookingId: b.id, status: "pending" } })).toBe(0);
  });

  it("truly concurrent, 15 rounds: never sent twice, never both sent and re-queued", async () => {
    for (let round = 0; round < 15; round++) {
      sendGuestMessage.mockClear();
      await prisma.scheduledMessage.deleteMany();
      await prisma.quickReply.deleteMany();
      await prisma.booking.deleteMany();
      const { b, row } = await dueReminder();
      await Promise.all([
        flushDueScheduledMessages({ bookingId: b.id }),
        liveAmend(b.id, { checkIn: day(30), checkOut: day(32) }),
        flushDueScheduledMessages({ bookingId: b.id }),
      ]);
      const sends = sendGuestMessage.mock.calls.length;
      const final = await state(row.id);
      expect(sends).toBeLessThanOrEqual(1);
      expect(sends === 1 ? final.startsWith("sent") : final === `pending @ ${day(28)}`).toBe(true);
      expect(await prisma.scheduledMessage.count({ where: { bookingId: b.id } })).toBe(1);
    }
  });
});

describe("PUT /api/admin/bookings/[id] — cancelled → active is protected like a new booking", () => {
  const setStatus = (id: number, status: string) =>
    statusRoute(
      new Request("http://localhost/api", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }) as unknown as NextRequest,
      { params: Promise.resolve({ id: String(id) }) }
    );
  const statusOf = async (id: number) => (await prisma.booking.findUniqueOrThrow({ where: { id } })).status;

  it("refuses to reactivate when the dates were taken — on the listing or on a sibling", async () => {
    const cancelled = await booking(P.A, "2027-02-10", "2027-02-12", { status: "cancelled" });
    await booking(P.C, "2027-02-11", "2027-02-13", { guestName: "Later Guest" });

    for (const target of ["confirmed", "pending"]) {
      const res = await setStatus(cancelled.id, target);
      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body).toMatchObject({ code: "conflict" });
      expect(body.conflicts[0].label).toContain("Listing C");
    }
    expect(await statusOf(cancelled.id)).toBe("cancelled");
    expect(await blocksOf(cancelled.id)).toEqual({});
    expect(sendMail).not.toHaveBeenCalled(); // no "Booking Confirmed" email for a refused change
    expect(await prisma.adminLog.count({ where: { action: { startsWith: "Refused to change booking" } } })).toBe(2);
  });

  it("also refuses over a manual block or an imported event", async () => {
    await freshFeed(P.F);
    const one = await booking(P.F, "2027-02-10", "2027-02-12", { status: "cancelled" });
    await prisma.externalCalendarEvent.create({ data: { propertyId: P.F, externalUid: "airbnb-9", startDate: d("2027-02-11"), endDate: d("2027-02-14") } });
    expect((await setStatus(one.id, "confirmed")).status).toBe(409);

    const two = await booking(P.D, "2027-03-10", "2027-03-12", { status: "cancelled" });
    await prisma.availabilityBlock.create({ data: { propertyId: P.D, startDate: d("2027-03-11"), endDate: d("2027-03-12"), type: "manual", reason: "repair" } });
    expect((await setStatus(two.id, "pending")).status).toBe(409);
  });

  it("reactivates when the dates are free, with sibling blocks written in the same step", async () => {
    const b = await booking(P.A, "2027-02-10", "2027-02-12", { status: "cancelled" });
    const res = await setStatus(b.id, "confirmed");
    expect(res.status).toBe(200);
    expect(await statusOf(b.id)).toBe("confirmed");
    expect(await blocksOf(b.id)).toEqual({ B: "2027-02-10→2027-02-12", C: "2027-02-10→2027-02-12" });
    expect(sendMail).toHaveBeenCalled(); // existing confirmation emails still go out
  });

  it("a reactivation racing a new booking for the same nights: exactly one wins", async () => {
    for (let round = 0; round < 5; round++) {
      await prisma.availabilityBlock.deleteMany();
      await prisma.booking.deleteMany();
      const b = await booking(P.A, "2027-02-10", "2027-02-12", { status: "cancelled" });
      const [reactivated, created] = await Promise.allSettled([
        setStatus(b.id, "pending"),
        withInventoryLock([P.B], async (tx) => {
          await assertInventoryScopeAvailable({ propertyId: P.B, start: d("2027-02-11"), end: d("2027-02-13"), db: tx });
          return tx.booking.create({ data: { propertyId: P.B, guestName: "Racer", guestEmail: "r@example.com", guestPhone: "+639170000000", checkIn: d("2027-02-11"), checkOut: d("2027-02-13"), totalPrice: 1, status: "pending" } });
        }),
      ]);
      const reactivationWon = reactivated.status === "fulfilled" && reactivated.value.status === 200;
      expect([reactivationWon, created.status === "fulfilled"].filter(Boolean)).toHaveLength(1);
      expect(await statusOf(b.id)).toBe(reactivationWon ? "pending" : "cancelled");
    }
  });

  it("leaves every other transition as it was: no availability check, blocks follow the status", async () => {
    // pending → confirmed over an overlapping record is NOT blocked (it already holds its dates).
    const b = await booking(P.A, "2027-02-10", "2027-02-12", { status: "pending" });
    await prisma.availabilityBlock.create({ data: { propertyId: P.A, startDate: d("2027-02-10"), endDate: d("2027-02-12"), type: "manual", reason: "other" } });
    expect((await setStatus(b.id, "confirmed")).status).toBe(200);
    expect(await statusOf(b.id)).toBe("confirmed");
    // confirmed → cancelled releases the siblings.
    expect((await setStatus(b.id, "cancelled")).status).toBe(200);
    expect(await blocksOf(b.id)).toEqual({});
  });
});

describe("card paid, dates taken — POST /api/bookings on real rows (Stripe mocked)", () => {
  const STAY = { checkIn: "2027-05-03", checkOut: "2027-05-05", guests: 2 }; // 2 × ₱2,000 + 6% = ₱4,240
  const intent = (id: string, propertyId: number, over: Record<string, unknown> = {}) => ({
    id, status: "succeeded", currency: "php", amount: 424000, amount_received: 424000,
    metadata: bookingIntentMetadata({ propertyId, checkIn: d(STAY.checkIn), checkOut: d(STAY.checkOut), guests: 2, discountCode: null, amount: 424000 }),
    ...over,
  });
  const pay = (propertyId: number, intentId: string, email: string) =>
    createBookingRoute(
      new Request("http://localhost/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, guestName: "Card Guest", guestEmail: email, guestPhone: "09171234567", ...STAY, paymentMethod: "stripe", stripePaymentIntentId: intentId }),
      }) as unknown as NextRequest
    );
  const alerts = () => sendMail.mock.calls.filter(([m]) => m.subject.includes("Card charged, booking NOT saved"));

  it("two paid cards for the same house: one booking; the other is told, referenced, logged and alerted once", async () => {
    const intents: Record<string, ReturnType<typeof intent>> = { pi_one: intent("pi_one", P.A), pi_two: intent("pi_two", P.B) };
    stripeRetrieve.mockImplementation(async (id: string) => intents[id]);

    const responses = await Promise.all([pay(P.A, "pi_one", "one@example.com"), pay(P.B, "pi_two", "two@example.com")]);
    expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);
    const lost = responses.find((r) => r.status === 409)!;
    const body = await lost.json();
    const loser = body.paymentReference as string;

    // Guest response
    expect(body.code).toBe("paid_unavailable");
    expect(["pi_one", "pi_two"]).toContain(loser);
    expect(body.error).toContain("Your card payment went through");
    expect(body.error).toContain("do not pay again");
    expect(body.error).toContain(loser);

    // Exactly one confirmed booking, holding the WINNER's payment
    const made = await prisma.booking.findMany({ where: { checkIn: d(STAY.checkIn) } });
    expect(made).toHaveLength(1);
    expect(made[0].stripePaymentIntentId).not.toBe(loser);

    // Admin visibility: one log row and one alert email carrying the reference
    const log = await prisma.adminLog.findMany({ where: { target: `stripe-${loser}` } });
    expect(log).toHaveLength(1);
    expect(JSON.parse(log[0].metadata!)).toMatchObject({ stripePaymentIntentId: loser, amount: 4240, checkIn: STAY.checkIn });
    expect(alerts()).toHaveLength(1);
    expect(alerts()[0][0]).toMatchObject({ to: "customerservice@haveninlipa.com" });
    expect(JSON.stringify(alerts()[0][0])).toContain(loser);

    // Retry of the same paid request: same answer, no second booking, no second alert.
    const again = await pay(loser === "pi_one" ? P.A : P.B, loser, "retry@example.com");
    expect(again.status).toBe(409);
    expect((await again.json()).paymentReference).toBe(loser);
    expect(await prisma.booking.count({ where: { checkIn: d(STAY.checkIn) } })).toBe(1);
    expect(await prisma.adminLog.count({ where: { target: `stripe-${loser}` } })).toBe(1);
    expect(alerts()).toHaveLength(1);
  });

  it("an unpaid or mismatched payment reference gets the ordinary message and triggers no alert", async () => {
    await booking(P.A, STAY.checkIn, STAY.checkOut);
    stripeRetrieve.mockResolvedValue(intent("pi_unpaid", P.A, { status: "requires_payment_method" }));
    const unpaid = await pay(P.A, "pi_unpaid", "x@example.com");
    expect([unpaid.status, (await unpaid.json()).code]).toEqual([409, undefined]);

    stripeRetrieve.mockResolvedValue(intent("pi_other", P.F)); // paid, but for another listing
    const other = await pay(P.A, "pi_other", "x@example.com");
    expect((await other.json()).code).toBeUndefined();
    expect(alerts()).toHaveLength(0);
    expect(await prisma.adminLog.count({ where: { target: { startsWith: "stripe-" } } })).toBe(0);
  });
});
