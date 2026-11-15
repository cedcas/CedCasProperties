import { describe, it, expect } from "vitest";
import {
  ALL_PROPERTIES,
  STALE_SPEED,
  applySpeedRulesToField,
  findStaleSpeedExcerpts,
  planListingPresentationFixes,
  planNameFix,
  planTaglineFix,
  type PropertyContentRow,
} from "@/lib/listing-presentation-fixes";
import { UnexpectedContentError } from "@/lib/property-content-fixes";

const AIRBNB_FAQ = {
  question: "Why book direct instead of Airbnb?",
  answer: "You save on Airbnb's service fees and talk to a real host instead of a call center.",
};

const PRE: Record<string, PropertyContentRow> = {
  "cozy-1-bedroom": {
    id: 1,
    slug: "cozy-1-bedroom",
    name: "Cozy 1BR Haven | Solar Power•Netflix•Wi-Fi•5 Pax",
    tagline: "Solar Power • Netflix • Wi-Fi • 5 Pax",
    seoTitle: "Cozy 1BR Vacation Rental in Lipa City, Batangas — 400 Mbps WiFi | Haven in Lipa",
  },
  "spacious-2-bedroom": {
    id: 2,
    slug: "spacious-2-bedroom",
    name: "Spacious 2BR Getaway | Netflix•Wi-Fi•9Pax•Parking",
    tagline: "Netflix • Wi-Fi • 9 Pax • Parking",
    seoTitle: "Spacious 2BR Vacation Rental in Lipa City, Batangas — Sleeps 9 | Haven in Lipa",
  },
  "mickey-in-lipa--family-staycation--sleeps-7": {
    id: 3,
    slug: "mickey-in-lipa--family-staycation--sleeps-7",
    name: "Mickey in Lipa | Family Staycation | Sleeps 7",
    tagline: "Mickey-Themed • 500 Mbps Wi-Fi • Sleeps 7 • Garage", // dev variant
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
      AIRBNB_FAQ,
    ]),
  },
  "mickey-in-lipa--family-house--sleeps-11": {
    id: 4,
    slug: "mickey-in-lipa--family-house--sleeps-11",
    name: "Mickey in Lipa | Family House | Sleeps 11",
    tagline: "Mickey-Themed • Bunk Room • Sleeps 11 • Garage",
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
    tagline: "Whole House • Two Bunk Rooms • Sleeps 15 • Garage",
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

describe("planTaglineFix", () => {
  it("rewrites every known current/previous tagline variant to the exact bestFor line", () => {
    expect(planTaglineFix("cozy-1-bedroom", "Solar Power • Netflix • Wi-Fi • 5 Pax")).toEqual({
      old: "Solar Power • Netflix • Wi-Fi • 5 Pax",
      new: "For couples and remote workers — sleeps 5",
    });
    expect(planTaglineFix("spacious-2-bedroom", "Netflix • Wi-Fi • 9 Pax • Parking")).toEqual({
      old: "Netflix • Wi-Fi • 9 Pax • Parking",
      new: "For barkadas and two families — up to 9",
    });
    expect(
      planTaglineFix("mickey-in-lipa--family-staycation--sleeps-7", "Mickey-Themed • Fiber up to 520 Mbps • Sleeps 7 • Garage")
    ).toEqual({
      old: "Mickey-Themed • Fiber up to 520 Mbps • Sleeps 7 • Garage",
      new: "For families with kids — up to 7",
    });
    // the dev variant
    expect(
      planTaglineFix("mickey-in-lipa--family-staycation--sleeps-7", "Mickey-Themed • 500 Mbps Wi-Fi • Sleeps 7 • Garage")
    ).toEqual({
      old: "Mickey-Themed • 500 Mbps Wi-Fi • Sleeps 7 • Garage",
      new: "For families with kids — up to 7",
    });
    // the current seed variant
    expect(
      planTaglineFix("mickey-in-lipa--family-staycation--sleeps-7", "Mickey-Themed • Fiber 500+ Mbps • Sleeps 7 • Garage")
    ).toEqual({
      old: "Mickey-Themed • Fiber 500+ Mbps • Sleeps 7 • Garage",
      new: "For families with kids — up to 7",
    });
    expect(planTaglineFix("mickey-in-lipa--family-house--sleeps-11", "Mickey-Themed • Bunk Room • Sleeps 11 • Garage")).toEqual({
      old: "Mickey-Themed • Bunk Room • Sleeps 11 • Garage",
      new: "For big groups — up to 11",
    });
    expect(
      planTaglineFix("mickey-in-lipa--full-family-house--sleeps-15", "Whole House • Two Bunk Rooms • Sleeps 15 • Garage")
    ).toEqual({
      old: "Whole House • Two Bunk Rooms • Sleeps 15 • Garage",
      new: "For everyone — up to 15",
    });
  });

  it("returns null once already fixed (idempotent)", () => {
    expect(planTaglineFix("cozy-1-bedroom", "For couples and remote workers — sleeps 5")).toBeNull();
  });

  it("aborts on a tagline that isn't the target and isn't a known current/previous variant", () => {
    expect(() => planTaglineFix("cozy-1-bedroom", "Something an admin typed in by hand")).toThrow(
      UnexpectedContentError
    );
  });
});

describe("STALE_SPEED / findStaleSpeedExcerpts", () => {
  it("matches a literal 400 Mbps or 520 Mbps survivor", () => {
    expect(STALE_SPEED.test("400 Mbps WiFi")).toBe(true);
    expect(STALE_SPEED.test("fiber up to 520 Mbps")).toBe(true);
  });

  it("never matches the new 500+ Mbps wording", () => {
    expect(STALE_SPEED.test("fiber at 500+ Mbps")).toBe(false);
    expect(STALE_SPEED.test("500+ Mbps WiFi")).toBe(false);
  });

  it("finds a stale sentence inside a JSON array field", () => {
    const raw = JSON.stringify(["Garage parking", "Dedicated fiber WiFi up to 520 Mbps"]);
    expect(findStaleSpeedExcerpts("amenityDetails", raw).length).toBe(1);
  });
});

describe("applySpeedRulesToField", () => {
  it("fixes cozy's stale '400 Mbps' seoTitle, preserving the rest of the string", () => {
    const { value, fragments } = applySpeedRulesToField(
      "cozy-1-bedroom",
      "seoTitle",
      "Cozy 1BR Vacation Rental in Lipa City, Batangas — 400 Mbps WiFi | Haven in Lipa"
    );
    expect(value).toBe("Cozy 1BR Vacation Rental in Lipa City, Batangas — 500+ Mbps WiFi | Haven in Lipa");
    expect(fragments).toEqual([{ old: "400 Mbps", new: "500+ Mbps" }]);
  });

  it("is a no-op when the seoTitle already says 500+ Mbps", () => {
    const already = "Cozy 1BR Vacation Rental in Lipa City, Batangas — Fiber WiFi at 500+ Mbps | Haven in Lipa";
    const { value, fragments } = applySpeedRulesToField("cozy-1-bedroom", "seoTitle", already);
    expect(value).toBe(already);
    expect(fragments).toEqual([]);
  });

  it("is a no-op for a slug/field with no configured rule", () => {
    const { value, fragments } = applySpeedRulesToField("spacious-2-bedroom", "seoTitle", "Anything at all");
    expect(value).toBe("Anything at all");
    expect(fragments).toEqual([]);
  });

  it("also fixes a bare '500 Mbps' alongside the configured rule in the same field", () => {
    const { value, fragments } = applySpeedRulesToField(
      "cozy-1-bedroom",
      "seoTitle",
      "Cozy 1BR — 400 Mbps WiFi, with a 500 Mbps backup link | Haven in Lipa"
    );
    expect(value).toBe("Cozy 1BR — 500+ Mbps WiFi, with a 500+ Mbps backup link | Haven in Lipa");
    expect(fragments).toContainEqual({ old: "400 Mbps", new: "500+ Mbps" });
    expect(fragments).toContainEqual({ old: "500 Mbps", new: "500+ Mbps" });
  });
});

describe("planListingPresentationFixes", () => {
  it("plans the plain-name and tagline fixes for all 5 properties, and the Mbps fix wherever a rule applies", () => {
    const plan = planListingPresentationFixes(freshRows());

    const nameChanges = plan.changes.filter((c) => c.field === "name");
    expect(nameChanges).toHaveLength(5);
    expect(nameChanges.find((c) => c.slug === "cozy-1-bedroom")!.after).toBe("Cozy 1BR Haven");
    expect(nameChanges.find((c) => c.slug === "spacious-2-bedroom")!.after).toBe("Spacious 2BR Getaway");
    expect(nameChanges.find((c) => c.slug === "mickey-in-lipa--full-family-house--sleeps-15")!.after).toBe(
      "Mickey in Lipa — Full Family House"
    );

    const taglineChanges = plan.changes.filter((c) => c.field === "tagline");
    expect(taglineChanges).toHaveLength(5);
    expect(taglineChanges.find((c) => c.slug === "cozy-1-bedroom")!.after).toBe(
      "For couples and remote workers — sleeps 5"
    );
    expect(taglineChanges.find((c) => c.slug === "mickey-in-lipa--family-staycation--sleeps-7")!.after).toBe(
      "For families with kids — up to 7"
    );

    const cozySeoTitleChange = plan.changes.find((c) => c.slug === "cozy-1-bedroom" && c.field === "seoTitle")!;
    expect(cozySeoTitleChange.after).toBe(
      "Cozy 1BR Vacation Rental in Lipa City, Batangas — 500+ Mbps WiFi | Haven in Lipa"
    );

    const spaciousUpdate = plan.updates.find((u) => u.slug === "spacious-2-bedroom")!;
    expect(Object.keys(spaciousUpdate.data).sort()).toEqual(["name", "tagline"]); // no Mbps fields touched for spacious

    const mickeyChanges = plan.changes.filter(
      (c) => c.slug === "mickey-in-lipa--family-staycation--sleeps-7" && c.field !== "name" && c.field !== "tagline"
    );
    expect(mickeyChanges.map((c) => c.field).sort()).toEqual(
      ["amenityDetails", "description", "heroSummary", "propertyFaqs", "seoDescription"].sort()
    );
    expect(mickeyChanges.every((c) => !/520/.test(c.after))).toBe(true);
    expect(mickeyChanges.every((c) => c.after.includes("500+ Mbps"))).toBe(true);

    // the Airbnb FAQ entry survives untouched — only the speed figure changes elsewhere
    const faqChange = plan.changes.find(
      (c) => c.slug === "mickey-in-lipa--family-staycation--sleeps-7" && c.field === "propertyFaqs"
    )!;
    expect(faqChange.after).toContain(AIRBNB_FAQ.answer);

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

  it("is a no-op when name and tagline are already at the target", () => {
    const rows = freshRows();
    const cozy = rows.find((r) => r.slug === "cozy-1-bedroom")!;
    cozy.name = "Cozy 1BR Haven";
    cozy.tagline = "For couples and remote workers — sleeps 5";
    cozy.seoTitle = "Cozy 1BR Vacation Rental in Lipa City, Batangas — Fiber WiFi at 500+ Mbps | Haven in Lipa";
    const plan = planListingPresentationFixes(rows);
    expect(plan.updates.find((u) => u.slug === "cozy-1-bedroom")).toBeUndefined();
  });

  it("aborts the whole run if a residual 520 Mbps isn't covered by the table", () => {
    const rows = freshRows();
    const target = rows.find((r) => r.slug === "mickey-in-lipa--family-staycation--sleeps-7")!;
    target.seoDescription = `${target.seoDescription} Also mentions 520 Mbps again in the garage section.`;
    expect(() => planListingPresentationFixes(rows)).toThrow(UnexpectedContentError);
  });

  it("aborts the whole run if a residual 400 Mbps isn't covered by the table", () => {
    const rows = freshRows();
    const cozy = rows.find((r) => r.slug === "cozy-1-bedroom")!;
    cozy.description = "Unexpectedly, this field also says 400 Mbps somewhere.";
    expect(() => planListingPresentationFixes(rows)).toThrow(UnexpectedContentError);
  });

  it("aborts on an unexpected tagline rather than overwriting it", () => {
    const rows = freshRows();
    rows.find((r) => r.slug === "cozy-1-bedroom")!.tagline = "An admin typed this in by hand";
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
