import { describe, it, expect } from "vitest";
import { deriveHouses, totalHouseCapacity, buildShortNames } from "@/lib/listings";

/**
 * `/weddings-accommodation` leads with "sleeps up to 24 people" — a capacity claim a
 * couple plans a wedding around. It is the sum of two physical houses at their largest
 * configuration, NOT the sum of five listings, because each house takes one booking at a
 * time (see Shared Inventory Groups). Getting that wrong overstates what we can host on a
 * single date by roughly double, which is the kind of error that surfaces as a party of
 * twenty with nowhere to sleep.
 *
 * These pin the arithmetic without a database — Hostinger blocks DB access from laptops
 * and from CI.
 */

// The live five, as of 2026-08-17. Two groups: Block 34 and Block 38.
const BV34 = [
  { id: 1, slug: "cozy-1-bedroom", maxGuests: 5 },
  { id: 2, slug: "spacious-2-bedroom", maxGuests: 9 },
];
const BV38 = [
  { id: 3, slug: "mickey-in-lipa--family-staycation--sleeps-7", maxGuests: 7 },
  { id: 4, slug: "mickey-in-lipa--family-house--sleeps-11", maxGuests: 11 },
  { id: 5, slug: "mickey-in-lipa--full-family-house--sleeps-15", maxGuests: 15 },
];
const LISTINGS = [...BV38, ...BV34];
const MEMBERSHIPS = [
  ...BV34.map((p) => ({ propertyId: p.id, inventoryGroupId: 34 })),
  ...BV38.map((p) => ({ propertyId: p.id, inventoryGroupId: 38 })),
];

describe("deriveHouses", () => {
  it("collapses five listings into the two physical houses", () => {
    const houses = deriveHouses(LISTINGS, MEMBERSHIPS);

    expect(houses).toHaveLength(2);
    expect(houses.map((h) => h.maxGuests)).toEqual([15, 9]);
    expect(houses[0].largest.slug).toBe("mickey-in-lipa--full-family-house--sleeps-15");
    expect(houses[1].largest.slug).toBe("spacious-2-bedroom");
  });

  it("totals capacity per house, never per listing", () => {
    // 15 + 9, not 5 + 9 + 7 + 11 + 15.
    expect(totalHouseCapacity(deriveHouses(LISTINGS, MEMBERSHIPS))).toBe(24);
  });

  it("orders configurations smallest party first", () => {
    const [big] = deriveHouses(LISTINGS, MEMBERSHIPS);
    expect(big.configurations.map((c) => c.maxGuests)).toEqual([7, 11, 15]);
  });

  it("treats an ungrouped listing as its own house", () => {
    const houses = deriveHouses(LISTINGS, BV38.map((p) => ({ propertyId: p.id, inventoryGroupId: 38 })));
    expect(houses).toHaveLength(3); // Block 38, plus the two Block 34 listings standing alone
    expect(totalHouseCapacity(houses)).toBe(15 + 9 + 5);
  });

  it("follows the gate — a deactivated listing leaves its house smaller", () => {
    const withoutTheFullHouse = LISTINGS.filter((p) => p.maxGuests !== 15);
    const houses = deriveHouses(withoutTheFullHouse, MEMBERSHIPS);

    expect(houses).toHaveLength(2);
    expect(totalHouseCapacity(houses)).toBe(11 + 9);
  });

  it("drops a house entirely when none of its configurations are listed", () => {
    const houses = deriveHouses(BV34, MEMBERSHIPS);
    expect(houses).toHaveLength(1);
    expect(totalHouseCapacity(houses)).toBe(9);
  });

  it("returns nothing for an empty feed rather than throwing", () => {
    expect(deriveHouses([], MEMBERSHIPS)).toEqual([]);
    expect(totalHouseCapacity([])).toBe(0);
  });

  it("breaks ties deterministically by slug", () => {
    const tied = [
      { id: 10, slug: "b-house", maxGuests: 8 },
      { id: 11, slug: "a-house", maxGuests: 8 },
    ];
    expect(deriveHouses(tied, []).map((h) => h.largest.slug)).toEqual(["a-house", "b-house"]);
  });
});

describe("buildShortNames", () => {
  it("keeps the three Mickey configurations distinguishable", () => {
    const names = buildShortNames([
      { slug: "mickey-in-lipa--full-family-house--sleeps-15", name: "Mickey in Lipa | Full Family House | Sleeps 15" },
      { slug: "mickey-in-lipa--family-house--sleeps-11", name: "Mickey in Lipa | Family House | Sleeps 11" },
      { slug: "cozy-1-bedroom", name: "Cozy 1BR Haven | Solar Power•Netflix•Wi-Fi•5 Pax" },
    ]);

    expect(names.get("mickey-in-lipa--full-family-house--sleeps-15")).toBe("Mickey in Lipa — Full Family House");
    expect(names.get("mickey-in-lipa--family-house--sleeps-11")).toBe("Mickey in Lipa — Family House");
    expect(names.get("cozy-1-bedroom")).toBe("Cozy 1BR Haven");
  });
});
