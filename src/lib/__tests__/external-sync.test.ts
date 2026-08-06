import { describe, it, expect } from "vitest";
import {
  planExternalEventSync,
  normalizeFeedEvents,
  type ExistingExternalEvent,
  type NormalizedFeedEvent,
} from "@/lib/external-calendar-sync";
import { parseIcsEvents } from "@/lib/ical";
import { toUtcMidnight } from "@/lib/dates";

const d = (key: string) => toUtcMidnight(key);

function feed(events: { uid: string; start: string; end: string; summary?: string }[]): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Airbnb Inc//Hosting Calendar 1.0.0//EN",
    ...events.flatMap((e) => [
      "BEGIN:VEVENT",
      `DTSTART;VALUE=DATE:${e.start.replace(/-/g, "")}`,
      `DTEND;VALUE=DATE:${e.end.replace(/-/g, "")}`,
      `UID:${e.uid}`,
      `SUMMARY:${e.summary ?? "Reserved"}`,
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

function existing(overrides: Partial<ExistingExternalEvent> = {}): ExistingExternalEvent {
  return {
    id: 10,
    externalUid: "abc-123",
    startDate: d("2026-09-01"),
    endDate: d("2026-09-05"),
    status: "active",
    ...overrides,
  };
}

describe("feed normalization", () => {
  it("parses an Airbnb-shaped feed into UTC-midnight ranges keyed by UID", () => {
    const events = normalizeFeedEvents(
      parseIcsEvents(feed([{ uid: "abc-123", start: "2026-09-01", end: "2026-09-05" }]))
    );

    expect(events).toHaveLength(1);
    expect(events[0].externalUid).toBe("abc-123");
    expect(events[0].startDate.toISOString()).toBe("2026-09-01T00:00:00.000Z");
    expect(events[0].endDate.toISOString()).toBe("2026-09-05T00:00:00.000Z");
  });

  it("de-duplicates a feed that repeats the same UID", () => {
    // Two rows with one UID would violate the [propertyId, externalUid] unique index and
    // abort the whole sync, so the first occurrence must win.
    const raw = parseIcsEvents(
      feed([
        { uid: "dup", start: "2026-09-01", end: "2026-09-03" },
        { uid: "dup", start: "2026-10-01", end: "2026-10-03" },
      ])
    );
    const events = normalizeFeedEvents(raw);

    expect(events).toHaveLength(1);
    expect(events[0].startDate).toEqual(d("2026-09-01"));
  });

  it("gives a UID-less event a stable synthetic id derived from its dates", () => {
    const ics = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "DTSTART;VALUE=DATE:20260901",
      "DTEND;VALUE=DATE:20260905",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const first = normalizeFeedEvents(parseIcsEvents(ics));
    const second = normalizeFeedEvents(parseIcsEvents(ics));

    // Same identity across runs → not treated as removed-then-recreated every sync.
    expect(first[0].externalUid).toBe(second[0].externalUid);
    expect(first[0].externalUid).toContain("synthetic-20260901-20260905");
  });

  it("skips inverted or empty ranges", () => {
    const events = normalizeFeedEvents([
      { uid: "bad", summary: null, start: d("2026-09-05"), end: d("2026-09-01") },
    ]);
    expect(events).toEqual([]);
  });
});

describe("sync planning", () => {
  const parsed = (rows: { uid: string; start: string; end: string }[]): NormalizedFeedEvent[] =>
    normalizeFeedEvents(parseIcsEvents(feed(rows)));

  // Test 7
  it("a new event is scheduled for creation", () => {
    const plan = planExternalEventSync(
      parsed([{ uid: "abc-123", start: "2026-09-01", end: "2026-09-05" }]),
      []
    );

    expect(plan.upserts).toHaveLength(1);
    expect(plan.changedIds).toEqual([]);
    expect(plan.removedIds).toEqual([]);
  });

  // Test 8
  it("reprocessing an unchanged feed is idempotent — nothing changed, nothing removed", () => {
    const events = parsed([{ uid: "abc-123", start: "2026-09-01", end: "2026-09-05" }]);
    const rows = [existing()];

    const first = planExternalEventSync(events, rows);
    const second = planExternalEventSync(events, rows);

    expect(first).toEqual(second);
    expect(first.changedIds).toEqual([]);
    expect(first.removedIds).toEqual([]);
    expect(first.revivedIds).toEqual([]);
  });

  // Test 9
  it("a modified event is flagged so its sibling blocks get re-derived", () => {
    const plan = planExternalEventSync(
      parsed([{ uid: "abc-123", start: "2026-09-02", end: "2026-09-06" }]),
      [existing()]
    );

    expect(plan.changedIds).toEqual([10]);
    expect(plan.removedIds).toEqual([]);
    expect(plan.upserts[0].startDate).toEqual(d("2026-09-02"));
  });

  // Test 10
  it("an event absent from the feed is marked removed — and only that one", () => {
    const plan = planExternalEventSync(
      parsed([{ uid: "still-here", start: "2026-10-01", end: "2026-10-03" }]),
      [
        existing({ id: 10, externalUid: "gone" }),
        existing({
          id: 11,
          externalUid: "still-here",
          startDate: d("2026-10-01"),
          endDate: d("2026-10-03"),
        }),
      ]
    );

    expect(plan.removedIds).toEqual([10]);
    expect(plan.changedIds).toEqual([]);
  });

  it("an already-removed event is not re-removed", () => {
    const plan = planExternalEventSync([], [existing({ status: "removed" })]);
    expect(plan.removedIds).toEqual([]);
  });

  it("a reappearing event is revived rather than duplicated", () => {
    const plan = planExternalEventSync(
      parsed([{ uid: "abc-123", start: "2026-09-01", end: "2026-09-05" }]),
      [existing({ status: "removed" })]
    );

    expect(plan.revivedIds).toEqual([10]);
    expect(plan.removedIds).toEqual([]);
    expect(plan.upserts).toHaveLength(1);
  });

  // Test 22
  it("concurrent runs on the same feed produce identical plans", () => {
    // Both runs see the same DB state and the same feed, so they compute the same desired
    // set. Convergence is then guaranteed by the unique indexes on
    // [propertyId, externalUid] and AvailabilityBlock.externalUid — a losing race becomes
    // an update, never a duplicate row.
    const events = parsed([
      { uid: "a", start: "2026-09-01", end: "2026-09-03" },
      { uid: "b", start: "2026-09-10", end: "2026-09-12" },
    ]);
    const rows = [
      existing({ id: 10, externalUid: "a", startDate: d("2026-09-01"), endDate: d("2026-09-03") }),
    ];

    const runA = planExternalEventSync(events, rows);
    const runB = planExternalEventSync(events, rows);

    expect(runA).toEqual(runB);
    expect(runA.upserts.map((u) => u.externalUid).sort()).toEqual(["a", "b"]);
    expect(runA.removedIds).toEqual([]);
  });

  it("an empty successful feed removes every active event but keeps the rows", () => {
    // Only ever reached on a VERIFIED-successful fetch. A failed or non-calendar response
    // skips planning entirely (see fetchFeed in external-calendar-sync.ts), which is what
    // stops a broken feed from unblocking real dates.
    const plan = planExternalEventSync(
      [],
      [existing({ id: 10 }), existing({ id: 11, externalUid: "def" })]
    );

    expect(plan.removedIds.sort()).toEqual([10, 11]);
    expect(plan.upserts).toEqual([]);
  });
});
