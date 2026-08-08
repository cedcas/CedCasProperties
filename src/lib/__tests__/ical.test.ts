import { describe, it, expect } from "vitest";
import {
  buildVCalendar,
  parseIcsEvents,
  parseIcsDuration,
  escapeIcsText,
  foldIcsLine,
  looksLikeVCalendar,
  type IcsExportEvent,
} from "@/lib/ical";
import { toUtcMidnight } from "@/lib/dates";
import {
  bookingUid,
  manualBlockUid,
  bookingDerivedBlockUid,
  externalDerivedBlockUid,
  manualDerivedBlockUid,
  derivedBlockUid,
} from "@/lib/calendar-uids";

const d = (key: string) => toUtcMidnight(key);
const STAMP = new Date("2026-08-01T09:30:00.000Z");

function uidsIn(ics: string): string[] {
  return ics
    .split("\r\n")
    .filter((l) => l.startsWith("UID:"))
    .map((l) => l.slice(4));
}

describe("iCal export", () => {
  // Test 14
  it("exports an active manual block", () => {
    const ics = buildVCalendar({
      calendarName: "Mickey 2BR - HavenInLipa",
      events: [
        {
          uid: manualBlockUid(31),
          start: d("2026-08-15"),
          end: d("2026-08-18"),
          summary: "Not available (Maintenance)",
          stamp: STAMP,
        },
      ],
    });

    expect(uidsIn(ics)).toEqual(["manual-block-31@haveninlipa.com"]);
    expect(ics).toContain("DTSTART;VALUE=DATE:20260815");
    // DTEND is exclusive — the 18th stays bookable for a same-day check-in.
    expect(ics).toContain("DTEND;VALUE=DATE:20260818");
    expect(ics).toContain("SUMMARY:Not available (Maintenance)");
  });

  // Test 15
  it("exports an active derived sibling block", () => {
    const ics = buildVCalendar({
      calendarName: "Mickey 2BR - HavenInLipa",
      events: [
        {
          uid: bookingDerivedBlockUid(555, 102),
          start: d("2026-08-15"),
          end: d("2026-08-18"),
          summary: "Not available",
          stamp: STAMP,
        },
      ],
    });

    expect(uidsIn(ics)).toEqual(["inventory-block-booking-555-property-102@haveninlipa.com"]);
  });

  // Test 16
  it("does not echo an imported event back through the same property's feed", () => {
    // The export route selects only bookings and AvailabilityBlock rows; ExternalCalendarEvent
    // rows are never converted to export events. Simulate a feed built for a property that
    // HAS an imported event and assert the event's own UID never appears.
    const importedUid = "airbnb-reservation-xyz";
    const ics = buildVCalendar({
      calendarName: "Mickey 1BR - HavenInLipa",
      events: [
        // Its own booking...
        {
          uid: bookingUid(555),
          start: d("2026-08-15"),
          end: d("2026-08-18"),
          summary: "Not available",
          stamp: STAMP,
        },
        // ...and a block derived from the imported event, which belongs on OTHER properties.
        {
          uid: externalDerivedBlockUid(42, 102),
          start: d("2026-09-01"),
          end: d("2026-09-05"),
          summary: "Not available",
          stamp: STAMP,
        },
      ],
    });

    expect(ics).not.toContain(importedUid);
    expect(uidsIn(ics)).not.toContain(importedUid);
  });

  // Test 17
  it("UIDs are deterministic and stable across regenerations", () => {
    const events: IcsExportEvent[] = [
      {
        uid: bookingUid(555),
        start: d("2026-08-15"),
        end: d("2026-08-18"),
        summary: "Not available",
        stamp: STAMP,
      },
      {
        uid: manualBlockUid(31),
        start: d("2026-08-20"),
        end: d("2026-08-22"),
        summary: "Not available",
        stamp: STAMP,
      },
    ];

    const first = buildVCalendar({ calendarName: "X", events });
    const second = buildVCalendar({ calendarName: "X", events });

    // Byte-identical: no per-request UIDs, and DTSTAMP comes from the record's updatedAt
    // rather than the current time, so consumers can detect real changes.
    expect(first).toBe(second);
    expect(first).toContain("DTSTAMP:20260801T093000Z");
  });

  it("the legacy booking UID format is preserved exactly", () => {
    // Changing this would orphan every event already in an external calendar.
    expect(bookingUid(555)).toBe("booking-555@haveninlipa.com");
  });

  it("each derived source kind gets its own non-colliding UID namespace", () => {
    const uids = [
      bookingDerivedBlockUid(1, 2),
      externalDerivedBlockUid(1, 2),
      manualDerivedBlockUid(1, 2),
      manualBlockUid(1),
      bookingUid(1),
    ];
    expect(new Set(uids).size).toBe(uids.length);
  });

  it("derivedBlockUid dispatches to the matching builder", () => {
    expect(derivedBlockUid("booking", 7, 9)).toBe(bookingDerivedBlockUid(7, 9));
    expect(derivedBlockUid("external_event", 7, 9)).toBe(externalDerivedBlockUid(7, 9));
    expect(derivedBlockUid("block", 7, 9)).toBe(manualDerivedBlockUid(7, 9));
  });

  it("uses CRLF line endings and a trailing newline", () => {
    const ics = buildVCalendar({ calendarName: "X", events: [] });
    expect(ics.endsWith("\r\n")).toBe(true);
    expect(ics).toContain("BEGIN:VCALENDAR\r\nVERSION:2.0");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("escapes special characters in text values", () => {
    expect(escapeIcsText("Repair; kitchen, unit A\\B")).toBe("Repair\\; kitchen\\, unit A\\\\B");
    const ics = buildVCalendar({
      calendarName: "Mickey; 2BR, Lipa",
      events: [],
    });
    expect(ics).toContain("X-WR-CALNAME:Mickey\\; 2BR\\, Lipa");
  });

  it("folds content lines longer than 75 octets", () => {
    const long = `UID:${"x".repeat(120)}@haveninlipa.com`;
    const folded = foldIcsLine(long);
    const lines = folded.split("\r\n");
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.slice(1).every((l) => l.startsWith(" "))).toBe(true);
    // Unfolding must return the original.
    expect(lines.map((l, i) => (i === 0 ? l : l.slice(1))).join("")).toBe(long);
  });
});

describe("iCal import parsing", () => {
  it("unfolds folded lines, which the previous inline parsers corrupted", () => {
    const ics = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "DTSTART;VALUE=DATE:20260815",
      "DTEND;VALUE=DATE:20260818",
      "UID:very-long-uid-that-was",
      " -folded-across-lines",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const events = parseIcsEvents(ics);
    expect(events).toHaveLength(1);
    expect(events[0].uid).toBe("very-long-uid-that-was-folded-across-lines");
  });

  it("reads UID and SUMMARY, which the previous parsers ignored entirely", () => {
    const ics = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "UID:abc-123",
      "SUMMARY:Reserved - Juan",
      "DTSTART;VALUE=DATE:20260815",
      "DTEND;VALUE=DATE:20260818",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const [event] = parseIcsEvents(ics);
    expect(event.uid).toBe("abc-123");
    expect(event.summary).toBe("Reserved - Juan");
  });

  it("falls back to DURATION when DTEND is absent", () => {
    const ics = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "UID:dur",
      "DTSTART;VALUE=DATE:20260815",
      "DURATION:P3D",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const [event] = parseIcsEvents(ics);
    // Previously such an event was silently dropped, leaving the dates bookable.
    expect(event.end.toISOString()).toBe("2026-08-18T00:00:00.000Z");
  });

  it("parses DURATION forms", () => {
    expect(parseIcsDuration("P3D")).toBe(3);
    expect(parseIcsDuration("P1W")).toBe(7);
    expect(parseIcsDuration("PT24H")).toBe(1);
    expect(parseIcsDuration("PT6H")).toBe(1); // partial day still occupies a night
    expect(parseIcsDuration("P1DT12H")).toBe(2);
    expect(parseIcsDuration("nonsense")).toBeNull();
  });

  it("skips CANCELLED events — they are tombstones, not blocks", () => {
    const ics = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "UID:gone",
      "STATUS:CANCELLED",
      "DTSTART;VALUE=DATE:20260815",
      "DTEND;VALUE=DATE:20260818",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    expect(parseIcsEvents(ics)).toEqual([]);
  });

  it("keeps a TZID-qualified datetime on its own calendar date", () => {
    // The old parser appended Z only when the raw value ended in Z, so a floating or
    // TZID-qualified time was parsed in the SERVER's zone and could shift a day.
    const ics = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "UID:tz",
      "DTSTART;TZID=Asia/Manila:20260815T140000",
      "DTEND;TZID=Asia/Manila:20260818T110000",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const [event] = parseIcsEvents(ics);
    expect(event.start.toISOString()).toBe("2026-08-15T00:00:00.000Z");
    expect(event.end.toISOString()).toBe("2026-08-18T00:00:00.000Z");
  });

  it("treats a zero-length all-day event as one night", () => {
    const ics = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "UID:single",
      "DTSTART;VALUE=DATE:20260815",
      "DTEND;VALUE=DATE:20260815",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const [event] = parseIcsEvents(ics);
    expect(event.end.toISOString()).toBe("2026-08-16T00:00:00.000Z");
  });

  it("recognises a calendar payload and rejects an HTML error page", () => {
    expect(looksLikeVCalendar("BEGIN:VCALENDAR\r\nEND:VCALENDAR")).toBe(true);
    // A login redirect or error page arrives as HTTP 200 with a useless body. Treating it
    // as an empty calendar would remove every imported event.
    expect(looksLikeVCalendar("<!DOCTYPE html><html><body>Not found</body></html>")).toBe(false);
    expect(looksLikeVCalendar("")).toBe(false);
  });
});
