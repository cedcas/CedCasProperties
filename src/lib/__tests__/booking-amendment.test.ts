/**
 * Booking amendment rules — the pure layer (no database, no network). Runs under
 * America/Chicago, UTC and Asia/Manila (vitest.config.ts), so any rule that leaned on the
 * runtime's local time would fail in at least one of them.
 *
 * The transactional behaviour (locks, rollback, propagation) is covered against a real
 * database in src/lib/__tests__/db/booking-amendment.dbtest.ts (`npm run test:db`).
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/guestMessages", () => ({ sendGuestMessage: vi.fn() }));

import {
  AmendmentError,
  classifyStayPhase,
  dayAfter,
  editableFieldsFor,
  parseAmendmentChanges,
  parseReason,
  parseStayDateStrict,
  resolveAmendment,
  snapshotOf,
  type BookingSnapshot,
  type TargetProperty,
} from "@/lib/booking-amendment";
import { todayInManila, nightsBetween } from "@/lib/dates";
import { conflictsFor, dedupeSiblingBookingConflicts, type ConflictCandidate } from "@/lib/availability";
import { planScheduledMessageAmendment, type AmendmentReplyInfo } from "@/lib/scheduler";
import { bookingUid, bookingDerivedBlockUid } from "@/lib/calendar-uids";

const d = (key: string) => new Date(`${key}T00:00:00Z`);

const CURRENT: BookingSnapshot = {
  guestName: "Ana Santos",
  guestEmail: "ana@example.com",
  guestPhone: "+639171234567",
  guests: 2,
  propertyId: 1,
  checkIn: "2027-03-13",
  checkOut: "2027-03-15",
};
const TARGET: TargetProperty = { id: 1, name: "Cozy 1BR", maxGuests: 4, isActive: true };
const TODAY = d("2027-03-01");

const resolve = (changes: Partial<BookingSnapshot>, over: Partial<Parameters<typeof resolveAmendment>[0]> = {}) =>
  resolveAmendment({ current: CURRENT, status: "confirmed", changes, today: TODAY, target: TARGET, ...over });

function rejected(fn: () => unknown): AmendmentError {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(AmendmentError);
    return e as AmendmentError;
  }
  throw new Error("expected an AmendmentError");
}

describe("todayInManila — the property's calendar date, whatever the server's zone", () => {
  it("rolls over at Manila midnight (16:00 UTC), not at UTC or local midnight", () => {
    expect(todayInManila(new Date("2027-03-13T15:59:59Z"))).toEqual(d("2027-03-13"));
    expect(todayInManila(new Date("2027-03-13T16:00:00Z"))).toEqual(d("2027-03-14"));
  });

  it("is unaffected by the US daylight-saving changes (14 Mar and 7 Nov 2027)", () => {
    // 02:30 local does not exist in Chicago on 14 Mar; these instants straddle the jump.
    expect(todayInManila(new Date("2027-03-14T07:59:00Z"))).toEqual(d("2027-03-14"));
    expect(todayInManila(new Date("2027-03-14T08:01:00Z"))).toEqual(d("2027-03-14"));
    expect(todayInManila(new Date("2027-11-07T06:30:00Z"))).toEqual(d("2027-11-07"));
    expect(todayInManila(new Date("2027-11-07T16:00:00Z"))).toEqual(d("2027-11-08"));
  });
});

describe("classifyStayPhase / editableFieldsFor", () => {
  const stay = { status: "confirmed", checkIn: d("2027-03-13"), checkOut: d("2027-03-15") };

  it("classifies by Manila date, counting the check-out day as still in progress", () => {
    expect(classifyStayPhase(stay, d("2027-03-12"))).toBe("upcoming");
    expect(classifyStayPhase(stay, d("2027-03-13"))).toBe("in_progress");
    expect(classifyStayPhase(stay, d("2027-03-15"))).toBe("in_progress");
    expect(classifyStayPhase(stay, d("2027-03-16"))).toBe("past");
  });

  it("a stay starts at Manila midnight even though it is still the previous day in Chicago and UTC", () => {
    expect(classifyStayPhase(stay, todayInManila(new Date("2027-03-12T15:59:00Z")))).toBe("upcoming");
    expect(classifyStayPhase(stay, todayInManila(new Date("2027-03-12T16:00:00Z")))).toBe("in_progress");
  });

  it("treats pending like confirmed and anything non-blocking as cancelled", () => {
    expect(classifyStayPhase({ ...stay, status: "pending" }, d("2027-03-01"))).toBe("upcoming");
    expect(classifyStayPhase({ ...stay, status: "cancelled" }, d("2027-03-01"))).toBe("cancelled");
  });

  it("narrows the editable fields as the stay progresses", () => {
    expect(editableFieldsFor("upcoming")).toHaveLength(7);
    expect(editableFieldsFor("in_progress")).toEqual(["guestName", "guestEmail", "guestPhone", "guests", "checkOut"]);
    expect(editableFieldsFor("past")).toEqual(["guestName", "guestEmail", "guestPhone"]);
    expect(editableFieldsFor("cancelled")).toEqual([]);
  });
});

describe("parseAmendmentChanges — allowlist and types", () => {
  it("rejects any field outside the allowlist instead of ignoring it", () => {
    for (const bad of [{ totalPrice: 1 }, { status: "confirmed" }, { stripePaymentIntentId: "pi_x" }, { id: 9 }, { guestName: "A B", nightlyTotal: 0 }]) {
      expect(rejected(() => parseAmendmentChanges(bad)).message).toContain("cannot be amended");
    }
    for (const bad of [null, "x", []]) expect(rejected(() => parseAmendmentChanges(bad)).status).toBe(400);
  });

  it("normalises contact details", () => {
    expect(parseAmendmentChanges({ guestName: "  Ana   Reyes ", guestEmail: " a@b.co ", guestPhone: "0917 123 4567" })).toEqual({
      guestName: "Ana Reyes",
      guestEmail: "a@b.co",
      guestPhone: "+639171234567",
    });
  });

  it("reports every invalid field at once", () => {
    const err = rejected(() =>
      parseAmendmentChanges({ guestName: " ", guestEmail: "not-an-email", guestPhone: "123", guests: 2.5, propertyId: "abc", checkIn: "2027-02-31", checkOut: "13/03/2027" })
    );
    expect(Object.keys(err.details.fieldErrors!).sort()).toEqual(["checkIn", "checkOut", "guestEmail", "guestName", "guestPhone", "guests", "propertyId"]);
  });

  it("accepts only whole guest counts of 1 or more", () => {
    expect(parseAmendmentChanges({ guests: "3" })).toEqual({ guests: 3 });
    for (const bad of [0, -1, 1.5, "2.0", "", null, "three"]) rejected(() => parseAmendmentChanges({ guests: bad }));
  });

  it("parseStayDateStrict accepts real calendar dates only, as UTC midnight", () => {
    expect(parseStayDateStrict("2027-03-14")).toEqual(d("2027-03-14"));
    expect(parseStayDateStrict("2028-02-29")).toEqual(d("2028-02-29"));
    for (const bad of ["2027-02-29", "2027-02-31", "2027-13-01", "2027-3-4", "2027-03-14T00:00:00Z", "", 20270314, null]) {
      expect(parseStayDateStrict(bad)).toBeNull();
    }
  });

  it("requires a reason of sensible length", () => {
    expect(parseReason("  Guest asked to extend  ")).toBe("Guest asked to extend");
    for (const bad of ["", "   ", "ok", undefined, "x".repeat(501)]) expect(rejected(() => parseReason(bad)).details.fieldErrors!.reason).toBeTruthy();
  });
});

describe("resolveAmendment — business rules", () => {
  it("separates guest-only edits from stay changes", () => {
    expect(resolve({ guestName: "Ana Reyes", guests: 3 })).toMatchObject({ changed: ["guestName", "guests"], stayChanged: false });
    expect(resolve({ checkOut: "2027-03-16" })).toMatchObject({ changed: ["checkOut"], stayChanged: true });
    expect(resolve({ propertyId: 2 }, { target: { ...TARGET, id: 2 } }).stayChanged).toBe(true);
  });

  it("rejects a request that changes nothing", () => {
    expect(rejected(() => resolve({ guests: 2, checkIn: "2027-03-13" })).code).toBe("no_changes");
  });

  it("enforces date order, including across the US spring-forward night", () => {
    expect(rejected(() => resolve({ checkOut: "2027-03-13" })).details.fieldErrors!.checkOut).toContain("after check-in");
    expect(rejected(() => resolve({ checkIn: "2027-03-15" })).details.fieldErrors!.checkOut).toBeTruthy();
    // 13→15 Mar spans the 23-hour Chicago day; it is still exactly two nights.
    expect(nightsBetween(d(CURRENT.checkIn), d(CURRENT.checkOut))).toBe(2);
    expect(nightsBetween(d("2027-11-06"), d("2027-11-08"))).toBe(2);
    expect(rejected(() => resolve({ checkOut: "2028-06-01" })).details.fieldErrors!.checkOut).toContain("365");
  });

  it("will not move check-in into the past", () => {
    expect(rejected(() => resolve({ checkIn: "2027-02-28" })).details.fieldErrors!.checkIn).toBeTruthy();
    expect(resolve({ checkIn: "2027-03-01" }).after.checkIn).toBe("2027-03-01"); // today is allowed
  });

  it("checks capacity against the listing the booking would be on", () => {
    expect(rejected(() => resolve({ guests: 5 })).details.fieldErrors!.guests).toContain("up to 4");
    const small: TargetProperty = { id: 2, name: "Studio", maxGuests: 1, isActive: true };
    expect(rejected(() => resolve({ propertyId: 2 }, { target: small })).details.fieldErrors!.guests).toContain("up to 1");
    expect(rejected(() => resolve({ propertyId: 2 }, { target: null })).details.fieldErrors!.propertyId).toBeTruthy();
    expect(rejected(() => resolve({ propertyId: 2 }, { target: { ...small, maxGuests: 9, isActive: false } })).details.fieldErrors!.propertyId).toContain("not an active");
  });

  it("locks check-in and property once the stay has started; allows check-out and guests", () => {
    const inProgress = { today: d("2027-03-14") };
    expect(rejected(() => resolve({ checkIn: "2027-03-14" }, inProgress)).code).toBe("not_editable");
    expect(rejected(() => resolve({ propertyId: 2 }, { ...inProgress, target: { ...TARGET, id: 2 } })).code).toBe("not_editable");
    expect(resolve({ checkOut: "2027-03-17", guests: 3 }, inProgress).changed).toEqual(["guests", "checkOut"]);
    // Leaving today is fine; a check-out before today is not.
    expect(resolve({ checkOut: "2027-03-14" }, inProgress).after.checkOut).toBe("2027-03-14");
  });

  it("allows only contact corrections after the stay, and nothing on a cancelled booking", () => {
    const past = { today: d("2027-04-01") };
    expect(resolve({ guestEmail: "new@example.com" }, past).changed).toEqual(["guestEmail"]);
    expect(rejected(() => resolve({ guests: 1 }, past)).code).toBe("not_editable");
    const err = rejected(() => resolve({ guestName: "Someone Else" }, { status: "cancelled" }));
    expect([err.code, err.status]).toEqual(["not_editable", 409]);
    expect(err.message).toContain("never reactivates");
  });

  it("snapshotOf reads stay dates as UTC calendar dates in every timezone", () => {
    const snap = snapshotOf({ ...CURRENT, checkIn: d("2027-03-14"), checkOut: d("2027-11-07") });
    expect([snap.checkIn, snap.checkOut]).toEqual(["2027-03-14", "2027-11-07"]);
    expect(dayAfter("2027-03-13")).toBe("2027-03-14");
    expect(dayAfter("2027-11-07")).toBe("2027-11-08");
    expect(dayAfter("2027-12-31")).toBe("2028-01-01");
  });
});

describe("availability exclusion for an amended booking", () => {
  const candidates: ConflictCandidate[] = [
    { kind: "booking", id: 7, start: d("2027-03-13"), end: d("2027-03-15"), label: "self", bookingId: 7 },
    { kind: "inventory_block", id: 70, start: d("2027-03-13"), end: d("2027-03-15"), label: "own derived", bookingId: 7 },
    { kind: "booking", id: 8, start: d("2027-03-15"), end: d("2027-03-17"), label: "other booking", bookingId: 8 },
    { kind: "inventory_block", id: 80, start: d("2027-03-16"), end: d("2027-03-18"), label: "other derived", bookingId: 9 },
    { kind: "manual_block", id: 81, start: d("2027-03-13"), end: d("2027-03-14"), label: "Maintenance" },
    { kind: "external_event", id: 82, start: d("2027-03-13"), end: d("2027-03-15"), label: "Imported" },
  ];

  it("excludes only the booking and its own derived blocks", () => {
    const hits = conflictsFor(candidates, d("2027-03-13"), d("2027-03-17"), { excludeBookingId: 7 });
    expect(hits.map((c) => c.label).sort()).toEqual(["Imported", "Maintenance", "other booking", "other derived"]);
  });

  it("keeps a manual block and an imported event that overlap the booking's OWN current nights", () => {
    const hits = conflictsFor(candidates, d("2027-03-13"), d("2027-03-15"), { excludeBookingId: 7 });
    expect(hits.map((c) => c.kind).sort()).toEqual(["external_event", "manual_block"]);
  });

  it("same-day turnover is not a conflict", () => {
    expect(conflictsFor(candidates, d("2027-03-11"), d("2027-03-13"), { excludeBookingId: null })).toEqual([]);
    expect(conflictsFor(candidates, d("2027-03-18"), d("2027-03-20"), {})).toEqual([]);
  });

  it("a sibling booking seen both directly and through its derived block counts once", () => {
    const direct = { kind: "booking" as const, id: 9, start: d("2027-03-16"), end: d("2027-03-18"), label: "sibling direct", bookingId: 9, sourcePropertyId: 2 };
    const projected = { kind: "inventory_block" as const, id: 80, start: d("2027-03-16"), end: d("2027-03-18"), label: "derived", bookingId: 9 };
    expect(dedupeSiblingBookingConflicts([direct, projected]).map((c) => c.label)).toEqual(["derived"]);
    // No projection yet (the race window): the direct sighting must survive.
    expect(dedupeSiblingBookingConflicts([direct]).map((c) => c.label)).toEqual(["sibling direct"]);
    // A booking on the listing itself is never dropped.
    const own = { kind: "booking" as const, id: 9, start: d("2027-03-16"), end: d("2027-03-18"), label: "own listing", bookingId: 9 };
    expect(dedupeSiblingBookingConflicts([own, projected])).toHaveLength(2);
  });
});

describe("iCal identity", () => {
  it("booking and derived-block UIDs depend only on ids — never on dates or the booking's listing", () => {
    expect(bookingUid(130)).toBe("booking-130@haveninlipa.com");
    expect(bookingDerivedBlockUid(130, 4)).toBe("inventory-block-booking-130-property-4@haveninlipa.com");
  });
});

describe("planScheduledMessageAmendment", () => {
  const reply = (id: number, name: string, anchor: string, offsetHours: number, propertyIds: number[] | null = null, over: Partial<AmendmentReplyInfo> = {}): AmendmentReplyInfo => ({
    id, name, anchor, offsetHours, isActive: true, trigger: "auto", channel: "email", propertyIds: propertyIds ? JSON.stringify(propertyIds) : null, ...over,
  });
  const REPLIES = [
    reply(1, "Reminder", "checkIn", -24),
    reply(2, "Thanks", "checkOut", 4),
    reply(3, "Welcome", "confirmation", 0),
    reply(4, "House 1", "checkIn", -48, [1]),
    reply(5, "House 2", "checkIn", -48, [2]),
    reply(6, "House 2 welcome", "confirmation", 0, [2]),
  ];
  const NOW = new Date("2027-03-01T04:00:00Z");
  const booking = { status: "confirmed", propertyId: 1, checkIn: d("2027-03-20"), checkOut: d("2027-03-22") };
  const plan = (over: Partial<Parameters<typeof planScheduledMessageAmendment>[0]> = {}) =>
    planScheduledMessageAmendment({ booking, previousPropertyId: 1, replies: REPLIES, existing: [], now: NOW, ...over });

  it("moves pending stay-anchored rows by exact hours from the UTC-midnight anchor (DST-proof)", () => {
    const p = plan({
      booking: { ...booking, checkIn: d("2027-03-15"), checkOut: d("2027-11-08") },
      existing: [
        { id: 10, quickReplyId: 1, sendAt: new Date("2027-03-12T00:00:00Z"), status: "pending" },
        { id: 11, quickReplyId: 2, sendAt: new Date("2027-03-15T04:00:00Z"), status: "pending" },
      ],
    });
    expect(p.reschedule.map((r) => [r.id, r.to.toISOString()])).toEqual([
      [10, "2027-03-14T00:00:00.000Z"],
      [11, "2027-11-08T04:00:00.000Z"],
    ]);
  });

  it("never touches sent rows or confirmation messages, and reports what will not be re-sent", () => {
    const p = plan({
      existing: [
        { id: 10, quickReplyId: 1, sendAt: new Date("2027-03-12T00:00:00Z"), status: "sent" },
        { id: 12, quickReplyId: 3, sendAt: new Date("2027-02-01T00:00:00Z"), status: "sent" },
        { id: 13, quickReplyId: 3, sendAt: new Date("2027-02-01T00:00:00Z"), status: "pending" },
      ],
    });
    expect([p.reschedule, p.withdraw, p.create, p.held]).toEqual([[], [], [], []]);
    expect(p.alreadySent).toEqual(["Reminder"]);
  });

  it("on a move: withdraws templates for the old listing, adds the new listing's, never replays its confirmation", () => {
    const p = plan({
      booking: { ...booking, propertyId: 2 },
      existing: [{ id: 14, quickReplyId: 4, sendAt: new Date("2027-03-18T00:00:00Z"), status: "pending" }],
    });
    expect(p.withdraw.map((w) => w.name)).toEqual(["House 1"]);
    expect(p.create.map((c) => [c.name, c.sendAt.toISOString()])).toEqual([["House 2", "2027-03-18T00:00:00.000Z"]]);
    expect(p.notReplayed).toEqual(["House 2 welcome"]);
  });

  it("holds reminders whose new time has passed instead of sending them", () => {
    const p = plan({
      booking: { ...booking, checkIn: d("2027-03-02"), checkOut: d("2027-03-04") },
      existing: [{ id: 10, quickReplyId: 1, sendAt: new Date("2027-03-19T00:00:00Z"), status: "pending" }],
    });
    expect(p.reschedule).toEqual([]);
    expect(p.held).toEqual([{ rowId: 10, quickReplyId: 1, name: "Reminder", wouldHaveSentAt: new Date("2027-03-01T00:00:00Z") }]);
  });

  it("is idempotent, creates no duplicates, and does not retro-fit templates the booking never had", () => {
    const existing = [
      { id: 10, quickReplyId: 1, sendAt: new Date("2027-03-19T00:00:00Z"), status: "pending" },
      { id: 11, quickReplyId: 2, sendAt: new Date("2027-03-22T04:00:00Z"), status: "pending" },
    ];
    const p = plan({ existing });
    // "House 1" applies but was never materialized for this booking — left alone.
    expect([p.reschedule, p.withdraw, p.create, p.held, p.notReplayed]).toEqual([[], [], [], [], []]);
  });

  it("re-creates a reminder that was previously skipped once its time is in the future again", () => {
    const p = plan({ existing: [{ id: 10, quickReplyId: 1, sendAt: new Date("2027-02-01T00:00:00Z"), status: "skipped" }] });
    expect(p.create.map((c) => c.name)).toEqual(["Reminder"]);
  });

  it("leaves a row the worker has already claimed alone, and reports it as in flight", () => {
    const p = plan({
      booking: { ...booking, checkIn: d("2027-04-10"), checkOut: d("2027-04-12") },
      existing: [{ id: 10, quickReplyId: 1, sendAt: new Date("2027-03-19T00:00:00Z"), status: "sending" }],
    });
    expect([p.reschedule, p.withdraw, p.create, p.held]).toEqual([[], [], [], []]);
    expect(p.inFlight).toEqual(["Reminder"]);
  });

  it("does nothing for a booking that is not confirmed", () => {
    const p = plan({ booking: { ...booking, status: "pending", propertyId: 2 }, existing: [{ id: 10, quickReplyId: 1, sendAt: NOW, status: "pending" }] });
    expect(Object.values(p).every((list) => list.length === 0)).toBe(true);
  });
});
