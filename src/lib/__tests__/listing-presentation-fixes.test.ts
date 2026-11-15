import { describe, it, expect } from "vitest";
import {
  ALL_PROPERTIES,
  STALE_520,
  findStale520Excerpts,
  planListingPresentationFixes,
  planNameFix,
  type PropertyContentRow,
} from "@/lib/listing-presentation-fixes";
import { UnexpectedContentError } from "@/lib/property-content-fixes";

const PRE: Record<string, PropertyContentRow> = {
  "cozy-1-bedroom": {
    id: 1,
    slug: "cozy-1-bedroom",
    name: "Cozy 1BR Haven | Solar Power•Netflix•Wi-Fi•5 Pax",
  },
  "spacious-2-bedroom": {
    id: 2,
    slug: "spacious-2-bedroom",
    name: "Spacious 2BR Getaway | Netflix•Wi-Fi•9Pax•Parking",
  },
  "mickey-in-lipa--family-staycation--sleeps-7": {
    id: 3,
    slug: "mickey-in-lipa--family-staycation--sleeps-7",
    name: "Mickey in Lipa | Family Staycation | Sleeps 7",
    tagline: "Mickey-Themed • Fiber up to 520 Mbps • Sleeps 7 • Garage",
    seoDescription:
      "Mickey-themed 1-bedroom staycation house in Bella Vita, Lipa City. Sleeps 7, full kitchen, fiber up to 520 Mbps, garage. From ₱2,400/night. Book direct.",
    heroSummary:
      "...garage parking, and dedicated fiber internet up to 520 Mbps. From ₱2,400 per night (covers 5 guests).",
    description: "The fiber, up to 520 Mbps, means everyone streams and scrolls without the buffering arguments.",
    amenityDetails: JSON.stringify(["Dedicated fiber WiFi up to 520 Mbps", "Smart TV"]),
    propertyFaqs: JSON.stringify([
      {
        question: "How fast is the internet?",
        answer:
          "The house has dedicated fiber internet with speeds up to 520 Mbps — built for multiple devices streaming.",
      },
    ]),
  },
  "mickey-in-lipa--family-house--sleeps-11": {
    id: 4,
    slug: "mickey-in-lipa--family-house--sleeps-11",
    name: "Mickey in Lipa | Family House | Sleeps 11",
    heroSummary: "...dedicated fiber up to 520 Mbps. From ₱4,200 per night (covers 9 guests).",
    description: "...dedicated fiber up to 520 Mbps, and a quiet gated subdivision about 20 minutes by car.",
    amenityDetails: JSON.stringify(["Dedicated fiber WiFi up to 520 Mbps"]),
    propertyFaqs: JSON.stringify([
      {
        question: "How fast is the internet?",
        answer: "The house has dedicated fiber internet with speeds up to 520 Mbps.",
      },
    ]),
  },
  "mickey-in-lipa--full-family-house--sleeps-15": {
    id: 5,
    slug: "mickey-in-lipa--full-family-house--sleeps-15",
    name: "Mickey in Lipa | Full Family House | Sleeps 15",
    heroSummary: "...garage parking, and dedicated fiber up to 520 Mbps. From ₱7,000 per night (covers 13 guests).",
    description: "...a full kitchen, a large dining area, dedicated fiber up to 520 Mbps, and garage parking inside.",
    amenityDetails: JSON.stringify(["Dedicated fiber WiFi up to 520 Mbps"]),
    propertyFaqs: JSON.stringify([
      {
        question: "How fast is the internet?",
        answer: "The house has dedicated fiber internet with speeds up to 520 Mbps.",
      },
    ]),
  },
};

const freshRows = (): PropertyContentRow[] => ALL_PROPERTIES.map((p) => ({ ...PRE[p.slug] }));

describe("planNameFix", () => {
  it("strips the keyword suffix to the canonical plain name", () => {
    expect(planNameFix("cozy-1-bedroom", "Cozy 1BR Haven | Solar Power•Netflix•Wi-Fi•5 Pax")).toEqual({
      old: "Cozy 1BR Haven | Solar Power•Netflix•Wi-Fi•5 Pax",
      new: "Cozy 1BR Haven",
    });
  });

  it("disambiguates a Mickey configuration with the em-dash canonical form", () => {
    expect(planNameFix("mickey-in-lipa--full-family-house--sleeps-15", "Mickey in Lipa | Full Family House | Sleeps 15")).toEqual({
      old: "Mickey in Lipa | Full Family House | Sleeps 15",
      new: "Mickey in Lipa — Full Family House",
    });
  });

  it("preserves a leading [DEVDB] tag", () => {
    expect(planNameFix("cozy-1-bedroom", "[DEVDB] Cozy 1BR Haven | Solar Power•Netflix•Wi-Fi•5 Pax")).toEqual({
      old: "[DEVDB] Cozy 1BR Haven | Solar Power•Netflix•Wi-Fi•5 Pax",
      new: "[DEVDB] Cozy 1BR Haven",
    });
  });

  it("returns null once already fixed (idempotent)", () => {
    expect(planNameFix("cozy-1-bedroom", "Cozy 1BR Haven")).toBeNull();
  });

  it("aborts on a name that doesn't look like the expected keyword-stuffed string", () => {
    expect(() => planNameFix("cozy-1-bedroom", "Completely Different Listing Name")).toThrow(
      UnexpectedContentError
    );
  });
});

describe("STALE_520 / findStale520Excerpts", () => {
  it("matches a literal 520 Mbps survivor", () => {
    expect(STALE_520.test("fiber up to 520 Mbps")).toBe(true);
  });

  it("never matches the new 500+ Mbps wording", () => {
    expect(STALE_520.test("fiber at 500+ Mbps")).toBe(false);
  });

  it("finds a stale sentence inside a JSON array field", () => {
    const raw = JSON.stringify(["Garage parking", "Dedicated fiber WiFi up to 520 Mbps"]);
    expect(findStale520Excerpts("amenityDetails", raw).length).toBe(1);
  });
});

describe("planListingPresentationFixes", () => {
  it("plans the plain-name fix for all 5 properties and the Mbps fix for the 3 Mickey properties only", () => {
    const plan = planListingPresentationFixes(freshRows());

    const nameChanges = plan.changes.filter((c) => c.field === "name");
    expect(nameChanges).toHaveLength(5);
    expect(nameChanges.find((c) => c.slug === "cozy-1-bedroom")!.after).toBe("Cozy 1BR Haven");
    expect(nameChanges.find((c) => c.slug === "spacious-2-bedroom")!.after).toBe("Spacious 2BR Getaway");
    expect(nameChanges.find((c) => c.slug === "mickey-in-lipa--full-family-house--sleeps-15")!.after).toBe(
      "Mickey in Lipa — Full Family House"
    );

    const b34Updates = plan.updates.find((u) => u.slug === "cozy-1-bedroom")!;
    expect(Object.keys(b34Updates.data)).toEqual(["name"]); // no Mbps fields touched for B34

    const mickeyChanges = plan.changes.filter(
      (c) => c.slug === "mickey-in-lipa--family-staycation--sleeps-7" && c.field !== "name"
    );
    expect(mickeyChanges.map((c) => c.field).sort()).toEqual(
      ["amenityDetails", "description", "heroSummary", "propertyFaqs", "seoDescription", "tagline"].sort()
    );
    expect(mickeyChanges.every((c) => !/520/.test(c.after))).toBe(true);
    expect(mickeyChanges.every((c) => c.after.includes("500+ Mbps"))).toBe(true);

    expect(plan.planHash).toMatch(/^[0-9a-f]{16}$/);
  });

  it("is idempotent: planning again on the fixed output yields zero changes", () => {
    const first = planListingPresentationFixes(freshRows());
    const fixed = freshRows().map((row) => {
      const update = first.updates.find((u) => u.id === row.id);
      return update ? { ...row, ...update.data } : row;
    });
    const second = planListingPresentationFixes(fixed);
    expect(second.changes).toHaveLength(0);
    expect(second.updates).toHaveLength(0);
  });

  it("aborts the whole run (writing nothing conceptually) if a residual 520 Mbps isn't covered by the table", () => {
    const rows = freshRows();
    const target = rows.find((r) => r.slug === "mickey-in-lipa--family-staycation--sleeps-7")!;
    target.seoDescription = `${target.seoDescription} Also mentions 520 Mbps again in the garage section.`;
    expect(() => planListingPresentationFixes(rows)).toThrow(UnexpectedContentError);
  });

  it("aborts if a row count or slug doesn't match the expected 5 properties", () => {
    expect(() => planListingPresentationFixes(freshRows().slice(0, 4))).toThrow(UnexpectedContentError);
  });

  it("produces a planHash that changes when the underlying data changes", () => {
    const planA = planListingPresentationFixes(freshRows());
    const rows = freshRows();
    rows.find((r) => r.slug === "cozy-1-bedroom")!.name = "[DEVDB] Cozy 1BR Haven | Solar Power•Netflix•Wi-Fi•5 Pax";
    const planB = planListingPresentationFixes(rows);
    expect(planA.planHash).not.toBe(planB.planHash);
  });
});
