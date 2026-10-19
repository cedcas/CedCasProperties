import { describe, expect, it } from "vitest";
import { findStayCombinations, splitGuestsAcrossCombo, type StayCandidateProperty } from "../tools";

function prop(id: number, slug: string, maxGuests: number, groupKey: string): StayCandidateProperty {
  return { id, slug, name: slug, maxGuests, groupKey };
}

describe("splitGuestsAcrossCombo", () => {
  it("fills the smaller-capacity property first, giving the rest to the larger one", () => {
    const combo = [prop(1, "a", 5, "g-a"), prop(2, "b", 11, "g-b")];
    expect(splitGuestsAcrossCombo(combo, 12)).toEqual([5, 7]);
  });

  it("returns null when the combo's combined capacity can't cover the request", () => {
    const combo = [prop(1, "a", 5, "g-a"), prop(2, "b", 5, "g-b")];
    expect(splitGuestsAcrossCombo(combo, 20)).toBeNull();
  });
});

describe("findStayCombinations", () => {
  it("prefers a single property that fits over any combination", () => {
    const available = [
      prop(1, "cozy-1-bedroom", 5, "listing-cozy-1-bedroom"),
      prop(2, "spacious-2-bedroom", 9, "listing-spacious-2-bedroom"),
      prop(3, "sleeps-15", 15, "listing-sleeps-15"),
    ];
    const combos = findStayCombinations(available, 12);
    expect(combos).toHaveLength(1);
    expect(combos[0].properties).toHaveLength(1);
    expect(combos[0].properties[0].slug).toBe("sleeps-15");
  });

  it("picks the smallest single property that still fits, when more than one does", () => {
    const available = [
      prop(1, "spacious-2-bedroom", 9, "listing-spacious-2-bedroom"),
      prop(2, "sleeps-15", 15, "listing-sleeps-15"),
      prop(3, "sleeps-11", 11, "listing-sleeps-11"),
    ];
    const combos = findStayCombinations(available, 10);
    expect(combos[0].properties[0].slug).toBe("sleeps-11");
  });

  it("falls back to combinations when no single property fits", () => {
    const available = [
      prop(1, "cozy-1-bedroom", 5, "listing-cozy-1-bedroom"),
      prop(2, "spacious-2-bedroom", 9, "listing-spacious-2-bedroom"),
    ];
    const combos = findStayCombinations(available, 12);
    expect(combos.length).toBeGreaterThan(0);
    expect(combos[0].properties.map((p) => p.slug).sort()).toEqual(["cozy-1-bedroom", "spacious-2-bedroom"]);
    expect(combos[0].guestSplit.reduce((a, b) => a + b, 0)).toBe(12);
  });

  it("never assigns a property more guests than its own maxGuests, across every combo returned", () => {
    // A group bigger than any single property (18) forces multi-property combos; each
    // property's slice of the group must still respect that property's own capacity.
    const available = [
      prop(1, "cozy-1-bedroom", 5, "listing-cozy-1-bedroom"),
      prop(2, "spacious-2-bedroom", 9, "listing-spacious-2-bedroom"),
      prop(3, "sleeps-11", 11, "listing-sleeps-11"),
    ];
    const combos = findStayCombinations(available, 18);
    expect(combos.length).toBeGreaterThan(0);
    for (const combo of combos) {
      combo.properties.forEach((p, i) => {
        expect(combo.guestSplit[i]).toBeLessThanOrEqual(p.maxGuests);
      });
      expect(combo.guestSplit.reduce((a, b) => a + b, 0)).toBe(18);
    }
  });

  it("never combines two properties that share an inventory group (same physical house)", () => {
    // sleeps-7 and sleeps-11 are two configurations of the same house (same groupKey) and
    // can never both be booked — only sleeps-15 (a different house) may pair with either.
    const available = [
      prop(1, "sleeps-7", 7, "group-38"),
      prop(2, "sleeps-11", 11, "group-38"),
      prop(3, "cozy-1-bedroom", 5, "listing-cozy-1-bedroom"),
    ];
    const combos = findStayCombinations(available, 16);
    for (const combo of combos) {
      const groupKeys = combo.properties.map((p) => p.groupKey);
      expect(new Set(groupKeys).size).toBe(groupKeys.length);
    }
    // The only valid pairing available is sleeps-11 (11) + cozy-1-bedroom (5) = 16.
    expect(combos.some((c) => c.properties.map((p) => p.slug).sort().join(",") === "cozy-1-bedroom,sleeps-11")).toBe(
      true
    );
    expect(combos.some((c) => c.properties.some((p) => p.slug === "sleeps-7") && c.properties.some((p) => p.slug === "sleeps-11"))).toBe(
      false
    );
  });

  it("returns at most maxOptions combinations", () => {
    const available = Array.from({ length: 8 }, (_, i) => prop(i, `p${i}`, 3, `listing-p${i}`));
    const combos = findStayCombinations(available, 6, { maxOptions: 5 });
    expect(combos.length).toBeLessThanOrEqual(5);
  });

  it("returns no combos when nothing can cover the group size", () => {
    const available = [prop(1, "a", 5, "g-a")];
    expect(findStayCombinations(available, 20)).toEqual([]);
  });
});
