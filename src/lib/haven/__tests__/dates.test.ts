import { describe, expect, it } from "vitest";
import { resolveDates, buildStayLabel } from "../dates";

// Reference "today": Wednesday, 2026-10-14 (the date this feature was built), at a time
// safely before the Manila-midnight UTC boundary (16:00 UTC).
const NOW = new Date("2026-10-14T12:00:00Z");

describe("resolveDates", () => {
  it("returns null for an unparseable expression", () => {
    expect(resolveDates("banana", NOW)).toBeNull();
  });

  describe("Nth weekday of month", () => {
    it("resolves '2nd Saturday of November' within the current year when it hasn't passed yet", () => {
      const result = resolveDates("the 2nd Saturday of November", NOW);
      expect(result).not.toBeNull();
      expect(result!.checkIn).toBe("2026-11-14");
      expect(result!.checkOut).toBe("2026-11-15"); // single night default
    });

    it("rolls to next year once this year's occurrence has already passed", () => {
      const afterNovember = new Date("2026-12-01T12:00:00Z");
      const result = resolveDates("2nd Saturday of November", afterNovember);
      expect(result!.checkIn).toBe("2027-11-13");
    });

    it("handles '1st Friday in December'", () => {
      const result = resolveDates("1st Friday in December", NOW);
      expect(result).not.toBeNull();
      expect(new Date(result!.checkIn).getUTCDay()).toBe(5);
      expect(new Date(result!.checkIn).getUTCMonth()).toBe(11);
    });
  });

  describe("Manila timezone edge (UTC 16:00 boundary)", () => {
    it("treats a time just before 16:00 UTC as still today in Manila", () => {
      const justBefore = new Date("2026-10-14T15:59:00Z");
      const result = resolveDates("tomorrow", justBefore);
      expect(result!.checkIn).toBe("2026-10-15");
    });

    it("treats 16:00 UTC and later as already tomorrow in Manila", () => {
      const atBoundary = new Date("2026-10-14T16:00:00Z");
      const result = resolveDates("tomorrow", atBoundary);
      expect(result!.checkIn).toBe("2026-10-16");
    });
  });

  describe("today / tonight / tomorrow", () => {
    it("resolves 'today' to a single night starting today (Manila)", () => {
      const result = resolveDates("today", NOW);
      expect(result!.checkIn).toBe("2026-10-14");
      expect(result!.checkOut).toBe("2026-10-15");
    });

    it("resolves 'tonight' the same as 'today'", () => {
      expect(resolveDates("tonight", NOW)!.checkIn).toBe("2026-10-14");
    });
  });

  describe("this weekend", () => {
    it("resolves to the coming Friday–Sunday when today is a weekday", () => {
      const result = resolveDates("this weekend", NOW); // NOW is a Wednesday
      expect(result!.checkIn).toBe("2026-10-16"); // Friday
      expect(result!.checkOut).toBe("2026-10-18"); // Sunday
    });

    it("resolves to today's own weekend when today is already Saturday", () => {
      const saturday = new Date("2026-10-17T12:00:00Z");
      const result = resolveDates("this weekend", saturday);
      expect(result!.checkIn).toBe("2026-10-17");
      expect(result!.checkOut).toBe("2026-10-18");
    });
  });

  describe("next <weekday> to <weekday>, incl. year rollover", () => {
    it("resolves 'next Friday to Sunday'", () => {
      const result = resolveDates("next Friday to Sunday", NOW);
      expect(new Date(result!.checkIn).getUTCDay()).toBe(5);
      expect(new Date(result!.checkOut).getUTCDay()).toBe(0);
      expect(result!.checkIn > "2026-10-14").toBe(true);
    });

    it("rolls into the next calendar year when the next Friday falls in January", () => {
      const lateDecember = new Date("2026-12-30T12:00:00Z"); // Wednesday
      const result = resolveDates("next Friday to Sunday", lateDecember);
      expect(result!.checkIn).toBe("2027-01-01");
      expect(result!.checkOut).toBe("2027-01-03");
    });

    it("resolves a bare 'next Friday' to a single night", () => {
      const result = resolveDates("next Friday", NOW);
      expect(new Date(result!.checkIn).getUTCDay()).toBe(5);
      const nights = (new Date(result!.checkOut).getTime() - new Date(result!.checkIn).getTime()) / 86_400_000;
      expect(nights).toBe(1);
    });
  });

  describe("explicit month/day ranges", () => {
    it("resolves 'Dec 24-26'", () => {
      const result = resolveDates("Dec 24-26", NOW);
      expect(result!.checkIn).toBe("2026-12-24");
      expect(result!.checkOut).toBe("2026-12-26");
    });

    it("resolves a cross-month range 'Nov 30 to Dec 2'", () => {
      const result = resolveDates("Nov 30 to Dec 2", NOW);
      expect(result!.checkIn).toBe("2026-11-30");
      expect(result!.checkOut).toBe("2026-12-02");
    });

    it("rolls the checkout year forward across a Dec->Jan range", () => {
      const result = resolveDates("December 30 to January 2", NOW);
      expect(result!.checkIn).toBe("2026-12-30");
      expect(result!.checkOut).toBe("2027-01-02");
    });

    it("resolves a single explicit date to one night", () => {
      const result = resolveDates("December 24", NOW);
      expect(result!.checkIn).toBe("2026-12-24");
      expect(result!.checkOut).toBe("2026-12-25");
    });
  });

  describe("bare weekday", () => {
    it("resolves to the nearest future occurrence", () => {
      const result = resolveDates("Saturday", NOW);
      expect(result!.checkIn).toBe("2026-10-17");
    });
  });

  describe("Tagalog / Batangueño phrasing", () => {
    it("resolves 'ikalawang Sabado ng Nobyembre' embedded in a full Taglish question", () => {
      const result = resolveDates("May bakante ba kayo sa ikalawang Sabado ng Nobyembre para sa 12 tao?", NOW);
      expect(result).not.toBeNull();
      expect(result!.checkIn).toBe("2026-11-14");
      expect(result!.checkOut).toBe("2026-11-15");
    });

    it("resolves 'sa susunod na Sabado' the same as 'next Saturday'", () => {
      const result = resolveDates("Pwede ba sa susunod na Sabado?", NOW);
      expect(result).not.toBeNull();
      expect(new Date(result!.checkIn).getUTCDay()).toBe(6);
      expect(result!.checkIn > "2026-10-14").toBe(true);
    });

    it("resolves a bare Tagalog weekday ('Sabado')", () => {
      const result = resolveDates("Sabado", NOW);
      expect(result!.checkIn).toBe("2026-10-17");
    });

    it("resolves a Tagalog month name ('Disyembre 24')", () => {
      const result = resolveDates("Disyembre 24", NOW);
      expect(result!.checkIn).toBe("2026-12-24");
      expect(result!.checkOut).toBe("2026-12-25");
    });
  });

  describe("ISO dates", () => {
    it("passes through an explicit ISO range", () => {
      const result = resolveDates("2026-12-24 to 2026-12-26", NOW);
      expect(result).toEqual({
        checkIn: "2026-12-24",
        checkOut: "2026-12-26",
        interpreted: result!.interpreted,
        stayLabel: result!.stayLabel,
      });
    });

    it("defaults a single ISO date to one night", () => {
      const result = resolveDates("2026-12-24", NOW);
      expect(result!.checkIn).toBe("2026-12-24");
      expect(result!.checkOut).toBe("2026-12-25");
    });
  });
});

describe("buildStayLabel", () => {
  it("ends the range on the check-out date, never the last occupied night (DEC-029)", () => {
    // Thu, Nov 19 -> Sat, Nov 21, 2026: 2 nights (Thu, Fri), check-out Saturday.
    const label = buildStayLabel("2026-11-19", "2026-11-21");
    expect(label).toEqual({
      en: "Thu, Nov 19 → Sat, Nov 21, 2026 (check-out) · 2 nights",
      tl: "Huwebes, Nob 19 → Sabado, Nob 21, 2026 (check-out) · 2 gabi",
      btg: "Huwebes, Nob 19 → Sabado, Nob 21, 2026 (check-out) · 2 gabi",
    });
  });

  it("singularizes 'night' for a one-night stay", () => {
    const label = buildStayLabel("2026-11-14", "2026-11-15"); // Sat -> Sun
    expect(label!.en).toBe("Sat, Nov 14 → Sun, Nov 15, 2026 (check-out) · 1 night");
    expect(label!.tl).toBe("Sabado, Nob 14 → Linggo, Nob 15, 2026 (check-out) · 1 gabi");
  });

  it("handles a month rollover (Nov 30 -> Dec 2)", () => {
    const label = buildStayLabel("2026-11-30", "2026-12-02");
    expect(label!.en).toBe("Mon, Nov 30 → Wed, Dec 2, 2026 (check-out) · 2 nights");
  });

  it("returns null for an inverted or invalid range", () => {
    expect(buildStayLabel("2026-11-21", "2026-11-19")).toBeNull();
    expect(buildStayLabel("not-a-date", "2026-11-19")).toBeNull();
  });

  it("is included on every resolve_dates result, matching checkIn/checkOut", () => {
    const resolved = resolveDates("Dec 24-26", NOW);
    expect(resolved!.stayLabel).toEqual(buildStayLabel(resolved!.checkIn, resolved!.checkOut));
  });
});
