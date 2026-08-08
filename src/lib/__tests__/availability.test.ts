import { describe, it, expect } from "vitest";
import {
  conflictsFor,
  guestFacingConflictMessage,
  formatConflictRange,
  type ConflictCandidate,
} from "@/lib/availability";
import { BLOCKING_BOOKING_STATUSES, bookingBlocksAvailability } from "@/lib/booking-status";
import { toUtcMidnight } from "@/lib/dates";

const d = (key: string) => toUtcMidnight(key);

function booking(
  id: number,
  start: string,
  end: string,
  guestName = "Juan Dela Cruz"
): ConflictCandidate {
  return {
    kind: "booking",
    id,
    start: d(start),
    end: d(end),
    label: `Booking #${id}`,
    bookingId: id,
    guestName,
  };
}

function manualBlock(
  id: number,
  start: string,
  end: string,
  reason = "maintenance"
): ConflictCandidate {
  return { kind: "manual_block", id, start: d(start), end: d(end), label: "Maintenance", reason };
}

function inventoryBlock(
  id: number,
  start: string,
  end: string,
  sourceBookingId: number | null = null
): ConflictCandidate {
  return {
    kind: "inventory_block",
    id,
    start: d(start),
    end: d(end),
    label: "Shared inventory — Mickey 1BR",
    bookingId: sourceBookingId,
    sourcePropertyId: 101,
    sourcePropertyName: "Mickey 1BR",
  };
}

function externalEvent(id: number, start: string, end: string): ConflictCandidate {
  return {
    kind: "external_event",
    id,
    start: d(start),
    end: d(end),
    label: "Imported calendar event",
  };
}

describe("blocking statuses", () => {
  it("pending and confirmed block; cancelled does not", () => {
    // Preserves the site's long-standing rule, previously hard-coded in three routes.
    expect([...BLOCKING_BOOKING_STATUSES]).toEqual(["pending", "confirmed"]);
    expect(bookingBlocksAvailability("pending")).toBe(true);
    expect(bookingBlocksAvailability("confirmed")).toBe(true);
    expect(bookingBlocksAvailability("cancelled")).toBe(false);
  });
});

describe("conflict detection", () => {
  // Test 18
  it("rejects dates covered by a manual block", () => {
    const conflicts = conflictsFor(
      [manualBlock(31, "2026-08-15", "2026-08-18")],
      d("2026-08-16"),
      d("2026-08-17")
    );
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].kind).toBe("manual_block");
  });

  // Test 19
  it("rejects dates covered by a sibling reservation's derived block", () => {
    const conflicts = conflictsFor(
      [inventoryBlock(90, "2026-08-15", "2026-08-18", 555)],
      d("2026-08-15"),
      d("2026-08-18")
    );
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].kind).toBe("inventory_block");
    expect(conflicts[0].sourcePropertyName).toBe("Mickey 1BR");
  });

  it("rejects dates covered by an imported external event", () => {
    const conflicts = conflictsFor(
      [externalEvent(42, "2026-09-01", "2026-09-05")],
      d("2026-09-02"),
      d("2026-09-04")
    );
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].kind).toBe("external_event");
  });

  it("allows dates with no overlapping record", () => {
    expect(
      conflictsFor([booking(1, "2026-08-15", "2026-08-18")], d("2026-08-20"), d("2026-08-22"))
    ).toEqual([]);
  });

  // Test 20 — the same-day-turnover rule
  it("keeps the check-out date reusable as a new check-in", () => {
    const existing = [booking(1, "2026-08-15", "2026-08-18")];

    // Arriving ON the previous stay's check-out day is allowed.
    expect(conflictsFor(existing, d("2026-08-18"), d("2026-08-20"))).toEqual([]);
    // Departing ON the next stay's check-in day is allowed.
    expect(conflictsFor(existing, d("2026-08-13"), d("2026-08-15"))).toEqual([]);
    // Overlapping by a single night is NOT allowed.
    expect(conflictsFor(existing, d("2026-08-17"), d("2026-08-19"))).toHaveLength(1);
  });

  it("detects every overlap shape", () => {
    const existing = [booking(1, "2026-08-10", "2026-08-20")];
    // enclosed, enclosing, straddling each edge
    expect(conflictsFor(existing, d("2026-08-12"), d("2026-08-15"))).toHaveLength(1);
    expect(conflictsFor(existing, d("2026-08-01"), d("2026-08-28"))).toHaveLength(1);
    expect(conflictsFor(existing, d("2026-08-05"), d("2026-08-12"))).toHaveLength(1);
    expect(conflictsFor(existing, d("2026-08-18"), d("2026-08-25"))).toHaveLength(1);
  });

  // Test 13 at the availability layer — the Aug 15-18 / 17-20 requirement
  it("returns every overlapping record, so removing one source cannot reopen a date", () => {
    const candidates = [
      inventoryBlock(90, "2026-08-15", "2026-08-18", 555), // sibling reservation
      manualBlock(31, "2026-08-17", "2026-08-20"), // maintenance
    ];

    // Aug 17 is covered by BOTH.
    expect(conflictsFor(candidates, d("2026-08-17"), d("2026-08-18"))).toHaveLength(2);

    // With the sibling reservation cancelled, Aug 17-20 must STILL be unavailable.
    const afterCancellation = candidates.filter((c) => c.id !== 90);
    expect(conflictsFor(afterCancellation, d("2026-08-17"), d("2026-08-20"))).toHaveLength(1);
    // ...but Aug 15-16 reopens, because nothing else covered it.
    expect(conflictsFor(afterCancellation, d("2026-08-15"), d("2026-08-16"))).toEqual([]);
  });

  it("returns conflicts ordered by start date", () => {
    const conflicts = conflictsFor(
      [manualBlock(2, "2026-08-20", "2026-08-22"), booking(1, "2026-08-10", "2026-08-12")],
      d("2026-08-01"),
      d("2026-08-30")
    );
    expect(conflicts.map((c) => c.id)).toEqual([1, 2]);
  });
});

describe("excludeBookingId", () => {
  it("lets a stay be re-checked against its own dates", () => {
    const candidates = [booking(555, "2026-08-15", "2026-08-18")];
    expect(
      conflictsFor(candidates, d("2026-08-15"), d("2026-08-18"), { excludeBookingId: 555 })
    ).toEqual([]);
    expect(
      conflictsFor(candidates, d("2026-08-15"), d("2026-08-18"), { excludeBookingId: 999 })
    ).toHaveLength(1);
  });

  it("also excludes the sibling blocks that booking generated", () => {
    // Otherwise a stay would conflict with its own shadow on a sibling listing.
    const candidates = [inventoryBlock(90, "2026-08-15", "2026-08-18", 555)];
    expect(
      conflictsFor(candidates, d("2026-08-15"), d("2026-08-18"), { excludeBookingId: 555 })
    ).toEqual([]);
  });
});

describe("guest-facing messages", () => {
  it("uses the original wording for a booking conflict", () => {
    expect(guestFacingConflictMessage([booking(1, "2026-08-15", "2026-08-18") as never])).toBe(
      "Those dates are already booked. Please choose different dates."
    );
  });

  it("uses the original wording for an imported channel conflict", () => {
    expect(
      guestFacingConflictMessage([externalEvent(42, "2026-09-01", "2026-09-05") as never])
    ).toBe("Those dates are not available (blocked on Airbnb). Please choose different dates.");
  });

  it("never leaks why a block exists", () => {
    const message = guestFacingConflictMessage([
      manualBlock(31, "2026-08-15", "2026-08-18", "owner_use") as never,
    ]);
    expect(message).toBe("Those dates are not available. Please choose different dates.");
    expect(message.toLowerCase()).not.toContain("owner");
    expect(message.toLowerCase()).not.toContain("maintenance");
  });

  it("never leaks a sibling listing name", () => {
    const message = guestFacingConflictMessage([
      inventoryBlock(90, "2026-08-15", "2026-08-18", 555) as never,
    ]);
    expect(message).not.toContain("Mickey");
  });
});

describe("public conflict range formatting", () => {
  it("matches the shape the public API has always returned", () => {
    expect(formatConflictRange(booking(1, "2026-08-15", "2026-08-18") as never)).toBe(
      "2026-08-15 – 2026-08-18"
    );
  });
});
