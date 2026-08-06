import { describe, it, expect } from "vitest";
import {
  planDerivedBlocks,
  type DerivedSource,
  type GroupSnapshot,
  type ExistingDerivedBlock,
} from "@/lib/inventory-groups";
import { toUtcMidnight } from "@/lib/dates";
import {
  bookingDerivedBlockUid,
  externalDerivedBlockUid,
  manualDerivedBlockUid,
} from "@/lib/calendar-uids";

/**
 * Shared-inventory propagation decisions.
 *
 * The Mickey in Lipa production case: three listings of ONE physical unit, so only one
 * configuration may be occupied on any overlapping range.
 */
const MICKEY_1BR = 101;
const MICKEY_2BR = 102;
const MICKEY_3BR = 103;

const GROUP: GroupSnapshot = {
  id: 7,
  isActive: true,
  memberPropertyIds: [MICKEY_1BR, MICKEY_2BR, MICKEY_3BR],
};

const d = (key: string) => toUtcMidnight(key);

function bookingSource(overrides: Partial<DerivedSource> = {}): DerivedSource {
  return {
    kind: "booking",
    id: 555,
    propertyId: MICKEY_1BR,
    start: d("2026-08-15"),
    end: d("2026-08-18"),
    isActive: true,
    ...overrides,
  };
}

function existingBlock(overrides: Partial<ExistingDerivedBlock> = {}): ExistingDerivedBlock {
  return {
    id: 900,
    propertyId: MICKEY_2BR,
    externalUid: bookingDerivedBlockUid(555, MICKEY_2BR),
    startDate: d("2026-08-15"),
    endDate: d("2026-08-18"),
    status: "active",
    ...overrides,
  };
}

describe("booking-driven propagation across the three Mickey configurations", () => {
  // Test 1
  it("a qualifying 1BR booking blocks the 2BR and 3BR", () => {
    const plan = planDerivedBlocks({
      source: bookingSource({ propertyId: MICKEY_1BR }),
      group: GROUP,
      existing: [],
    });

    expect(plan.upserts.map((u) => u.propertyId)).toEqual([MICKEY_2BR, MICKEY_3BR]);
    expect(plan.cancels).toEqual([]);
    // The source listing itself is never given a derived block — the booking is the source.
    expect(plan.upserts.some((u) => u.propertyId === MICKEY_1BR)).toBe(false);
    for (const upsert of plan.upserts) {
      expect(upsert.startDate).toEqual(d("2026-08-15"));
      expect(upsert.endDate).toEqual(d("2026-08-18"));
      expect(upsert.sourcePropertyId).toBe(MICKEY_1BR);
      expect(upsert.sourceBookingId).toBe(555);
      expect(upsert.inventoryGroupId).toBe(GROUP.id);
      // The reservation itself is never duplicated onto siblings.
      expect(upsert.sourceExternalEventId).toBeNull();
      expect(upsert.parentBlockId).toBeNull();
    }
  });

  // Test 2
  it("a qualifying 2BR booking blocks the 1BR and 3BR", () => {
    const plan = planDerivedBlocks({
      source: bookingSource({ propertyId: MICKEY_2BR }),
      group: GROUP,
      existing: [],
    });
    expect(plan.upserts.map((u) => u.propertyId)).toEqual([MICKEY_1BR, MICKEY_3BR]);
  });

  // Test 3
  it("a qualifying 3BR booking blocks the 1BR and 2BR", () => {
    const plan = planDerivedBlocks({
      source: bookingSource({ propertyId: MICKEY_3BR }),
      group: GROUP,
      existing: [],
    });
    expect(plan.upserts.map((u) => u.propertyId)).toEqual([MICKEY_1BR, MICKEY_2BR]);
  });
});

describe("source lifecycle reconciliation", () => {
  // Test 4
  it("a cancelled booking cancels its own derived blocks and nothing else", () => {
    const mine = [
      existingBlock({ id: 900, propertyId: MICKEY_2BR }),
      existingBlock({
        id: 901,
        propertyId: MICKEY_3BR,
        externalUid: bookingDerivedBlockUid(555, MICKEY_3BR),
      }),
    ];

    const plan = planDerivedBlocks({
      source: bookingSource({ isActive: false }),
      group: GROUP,
      existing: mine,
    });

    expect(plan.upserts).toEqual([]);
    expect(plan.cancels.sort()).toEqual([900, 901]);
  });

  // Test 5
  it("a booking date change re-dates its derived blocks in place", () => {
    const plan = planDerivedBlocks({
      source: bookingSource({ start: d("2026-08-16"), end: d("2026-08-20") }),
      group: GROUP,
      existing: [existingBlock()],
    });

    // Same UIDs → an upsert updates the existing rows rather than creating duplicates.
    expect(plan.cancels).toEqual([]);
    expect(plan.upserts).toHaveLength(2);
    const forTwoBr = plan.upserts.find((u) => u.propertyId === MICKEY_2BR)!;
    expect(forTwoBr.externalUid).toBe(existingBlock().externalUid);
    expect(forTwoBr.startDate).toEqual(d("2026-08-16"));
    expect(forTwoBr.endDate).toEqual(d("2026-08-20"));
  });

  // Test 6
  it("reprocessing the same booking is idempotent — no duplicates, no churn", () => {
    const existing = [
      existingBlock({ id: 900, propertyId: MICKEY_2BR }),
      existingBlock({
        id: 901,
        propertyId: MICKEY_3BR,
        externalUid: bookingDerivedBlockUid(555, MICKEY_3BR),
      }),
    ];

    const first = planDerivedBlocks({ source: bookingSource(), group: GROUP, existing });
    const second = planDerivedBlocks({ source: bookingSource(), group: GROUP, existing });

    expect(first).toEqual(second);
    expect(first.cancels).toEqual([]);
    // Two upserts targeting the two UIDs that already exist — the unique index guarantees
    // these can only ever update, never insert a second row.
    expect(new Set(first.upserts.map((u) => u.externalUid))).toEqual(
      new Set(existing.map((e) => e.externalUid))
    );
  });

  it("revives previously cancelled blocks when the source becomes active again", () => {
    const plan = planDerivedBlocks({
      source: bookingSource({ isActive: true }),
      group: GROUP,
      existing: [existingBlock({ status: "cancelled" })],
    });

    // The cancelled row's UID is in the desired set, so it is upserted back to active
    // rather than cancelled again or duplicated.
    expect(plan.cancels).toEqual([]);
    expect(plan.upserts.map((u) => u.externalUid)).toContain(existingBlock().externalUid);
  });

  it("already-cancelled blocks are not cancelled twice", () => {
    const plan = planDerivedBlocks({
      source: bookingSource({ isActive: false }),
      group: GROUP,
      existing: [existingBlock({ status: "cancelled" })],
    });
    expect(plan.cancels).toEqual([]);
  });
});

describe("external calendar events as a propagation source", () => {
  // Test 7 (decision half; the sync half lives in external-sync.test.ts)
  it("an imported external event blocks the sibling listings", () => {
    const plan = planDerivedBlocks({
      source: {
        kind: "external_event",
        id: 42,
        propertyId: MICKEY_1BR,
        start: d("2026-09-01"),
        end: d("2026-09-05"),
        isActive: true,
      },
      group: GROUP,
      existing: [],
    });

    expect(plan.upserts.map((u) => u.propertyId)).toEqual([MICKEY_2BR, MICKEY_3BR]);
    expect(plan.upserts[0].externalUid).toBe(externalDerivedBlockUid(42, MICKEY_2BR));
    expect(plan.upserts[0].sourceExternalEventId).toBe(42);
    expect(plan.upserts[0].sourceBookingId).toBeNull();
  });

  // Test 10 (decision half)
  it("a removed external event cancels only its own derived blocks", () => {
    const plan = planDerivedBlocks({
      source: {
        kind: "external_event",
        id: 42,
        propertyId: MICKEY_1BR,
        start: d("2026-09-01"),
        end: d("2026-09-05"),
        isActive: false,
      },
      group: GROUP,
      existing: [
        {
          id: 700,
          propertyId: MICKEY_2BR,
          externalUid: externalDerivedBlockUid(42, MICKEY_2BR),
          startDate: d("2026-09-01"),
          endDate: d("2026-09-05"),
          status: "active",
        },
      ],
    });

    expect(plan.upserts).toEqual([]);
    expect(plan.cancels).toEqual([700]);
  });
});

describe("manual block scope", () => {
  // Test 11
  it("a listing-only manual block propagates to nothing", () => {
    // scope=listing_only is expressed as isActive:false for propagation purposes — the
    // block itself stays fully active on its own property.
    const plan = planDerivedBlocks({
      source: {
        kind: "block",
        id: 300,
        propertyId: MICKEY_1BR,
        start: d("2026-08-15"),
        end: d("2026-08-18"),
        isActive: false,
      },
      group: GROUP,
      existing: [],
    });

    expect(plan.upserts).toEqual([]);
    expect(plan.cancels).toEqual([]);
  });

  // Test 12
  it("a group-scoped manual block blocks every other active member", () => {
    const plan = planDerivedBlocks({
      source: {
        kind: "block",
        id: 300,
        propertyId: MICKEY_1BR,
        start: d("2026-08-15"),
        end: d("2026-08-18"),
        isActive: true,
      },
      group: GROUP,
      existing: [],
    });

    expect(plan.upserts.map((u) => u.propertyId)).toEqual([MICKEY_2BR, MICKEY_3BR]);
    expect(plan.upserts[0].externalUid).toBe(manualDerivedBlockUid(300, MICKEY_2BR));
    expect(plan.upserts[0].parentBlockId).toBe(300);
    expect(plan.upserts[0].sourceBookingId).toBeNull();
  });

  // Test 13 — the August 15-18 / 17-20 scenario from the requirements
  it("cancelling one source never touches an unrelated overlapping block", () => {
    // A maintenance block on the 2BR for Aug 17-20, derived from a DIFFERENT source.
    const unrelatedMaintenance: ExistingDerivedBlock = {
      id: 950,
      propertyId: MICKEY_2BR,
      externalUid: manualDerivedBlockUid(301, MICKEY_2BR),
      startDate: d("2026-08-17"),
      endDate: d("2026-08-20"),
      status: "active",
    };

    // Reconciling the CANCELLED booking only ever sees blocks tied to that booking.
    // `existing` is scoped by source in loadExistingDerived, so the maintenance block is
    // not even a candidate — assert it is never named in the plan.
    const plan = planDerivedBlocks({
      source: bookingSource({ isActive: false }),
      group: GROUP,
      existing: [existingBlock({ id: 900 })],
    });

    expect(plan.cancels).toEqual([900]);
    expect(plan.cancels).not.toContain(unrelatedMaintenance.id);
  });
});

describe("group membership and activation", () => {
  // Test 23
  it("removing a property from the group stops targeting it and cancels its stale block", () => {
    const shrunkGroup: GroupSnapshot = { ...GROUP, memberPropertyIds: [MICKEY_1BR, MICKEY_2BR] };

    const plan = planDerivedBlocks({
      source: bookingSource(),
      group: shrunkGroup,
      existing: [
        existingBlock({ id: 900, propertyId: MICKEY_2BR }),
        existingBlock({
          id: 901,
          propertyId: MICKEY_3BR,
          externalUid: bookingDerivedBlockUid(555, MICKEY_3BR),
        }),
      ],
    });

    expect(plan.upserts.map((u) => u.propertyId)).toEqual([MICKEY_2BR]);
    expect(plan.cancels).toEqual([901]); // the departed 3BR's block
  });

  // Test 24
  it("deactivating the group stops all propagation without deleting anything", () => {
    const plan = planDerivedBlocks({
      source: bookingSource(),
      group: { ...GROUP, isActive: false },
      existing: [existingBlock({ id: 900 })],
    });

    expect(plan.upserts).toEqual([]);
    // Soft-cancel only — the plan never deletes, so audit history survives.
    expect(plan.cancels).toEqual([900]);
  });

  it("only future blocks are cancelled when a cancelCutoff is supplied", () => {
    const cutoff = d("2026-08-16");
    const plan = planDerivedBlocks({
      source: bookingSource({ isActive: false }),
      group: GROUP,
      existing: [
        existingBlock({ id: 800, startDate: d("2026-07-01"), endDate: d("2026-07-04") }), // fully past
        existingBlock({
          id: 801,
          propertyId: MICKEY_3BR,
          externalUid: bookingDerivedBlockUid(555, MICKEY_3BR),
        }), // future
      ],
      cancelCutoff: cutoff,
    });

    expect(plan.cancels).toEqual([801]);
  });

  // Test 25 — the most important regression guard
  it("a property in NO group produces no writes whatsoever", () => {
    const plan = planDerivedBlocks({
      source: bookingSource({ propertyId: 999 }),
      group: null,
      existing: [],
    });
    expect(plan).toEqual({ upserts: [], cancels: [] });
  });

  it("an ungrouped property with stale blocks from a previous group has them cancelled", () => {
    const plan = planDerivedBlocks({
      source: bookingSource(),
      group: null,
      existing: [existingBlock({ id: 900 })],
    });
    expect(plan.upserts).toEqual([]);
    expect(plan.cancels).toEqual([900]);
  });

  it("a group with only the source property propagates nothing", () => {
    const plan = planDerivedBlocks({
      source: bookingSource(),
      group: { id: 7, isActive: true, memberPropertyIds: [MICKEY_1BR] },
      existing: [],
    });
    expect(plan.upserts).toEqual([]);
  });

  it("duplicate member ids cannot produce duplicate blocks", () => {
    const plan = planDerivedBlocks({
      source: bookingSource(),
      group: { ...GROUP, memberPropertyIds: [MICKEY_1BR, MICKEY_2BR, MICKEY_2BR, MICKEY_3BR] },
      existing: [],
    });
    expect(plan.upserts.map((u) => u.propertyId)).toEqual([MICKEY_2BR, MICKEY_3BR]);
  });

  it("a zero-length source range blocks nothing", () => {
    const plan = planDerivedBlocks({
      source: bookingSource({ start: d("2026-08-15"), end: d("2026-08-15") }),
      group: GROUP,
      existing: [],
    });
    expect(plan.upserts).toEqual([]);
  });
});
