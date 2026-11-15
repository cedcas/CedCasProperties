import { describe, it, expect } from "vitest";
import { CANONICAL_PROPERTY_DISPLAY, getBestFor, getDisplayName } from "@/lib/property-display";
import { buildShortNames } from "@/lib/listings";
import { buildPropertyPageH1 } from "@/lib/property-name";

const SLUGS = [
  "cozy-1-bedroom",
  "spacious-2-bedroom",
  "mickey-in-lipa--family-staycation--sleeps-7",
  "mickey-in-lipa--family-house--sleeps-11",
  "mickey-in-lipa--full-family-house--sleeps-15",
];

// Current (still-live, keyword-stuffed) Property.name per slug, per the
// 2026-11-15 LIVE CONTEXT audit of /properties on both sites.
const KEYWORD_NAMES: Record<string, string> = {
  "cozy-1-bedroom": "Cozy 1BR Haven | Solar Power•Netflix•Wi-Fi•5 Pax",
  "spacious-2-bedroom": "Spacious 2BR Getaway | Netflix•Wi-Fi•9Pax•Parking",
  "mickey-in-lipa--family-staycation--sleeps-7": "Mickey in Lipa | Family Staycation | Sleeps 7",
  "mickey-in-lipa--family-house--sleeps-11": "Mickey in Lipa | Family House | Sleeps 11",
  "mickey-in-lipa--full-family-house--sleeps-15": "Mickey in Lipa | Full Family House | Sleeps 15",
};

describe("CANONICAL_PROPERTY_DISPLAY", () => {
  it("has a plain name and a best-for line for all 5 current slugs", () => {
    for (const slug of SLUGS) {
      const entry = CANONICAL_PROPERTY_DISPLAY[slug];
      expect(entry, `missing entry for ${slug}`).toBeDefined();
      expect(entry.name.includes("|")).toBe(false);
      expect(entry.bestFor.length).toBeGreaterThan(0);
    }
  });

  it("gives each Mickey configuration a distinguishable em-dash name", () => {
    expect(CANONICAL_PROPERTY_DISPLAY["mickey-in-lipa--family-staycation--sleeps-7"].name).toBe(
      "Mickey in Lipa — Family Staycation"
    );
    expect(CANONICAL_PROPERTY_DISPLAY["mickey-in-lipa--family-house--sleeps-11"].name).toBe(
      "Mickey in Lipa — Family House"
    );
    expect(CANONICAL_PROPERTY_DISPLAY["mickey-in-lipa--full-family-house--sleeps-15"].name).toBe(
      "Mickey in Lipa — Full Family House"
    );
  });
});

describe("getDisplayName / getBestFor", () => {
  it("returns the canonical name for every known slug", () => {
    expect(getDisplayName("cozy-1-bedroom", "fallback")).toBe("Cozy 1BR Haven");
  });

  it("falls back to the given name for an unmapped slug (a future 6th listing)", () => {
    expect(getDisplayName("some-new-listing", "Brand New Place")).toBe("Brand New Place");
    expect(getBestFor("some-new-listing")).toBeUndefined();
  });
});

describe("buildShortNames + getDisplayName override — DEC-034 public pages", () => {
  // buildShortNames() itself is deliberately left unmodified (Haven AI's
  // src/lib/haven/* also calls it directly) — the canonical override is
  // applied on top of its result at the public-page call site
  // (src/app/properties/page.tsx), the same pattern pinned here.
  it("maps every slug to its canonical name once the getDisplayName override is applied", () => {
    const props = SLUGS.map((slug) => ({ slug, name: KEYWORD_NAMES[slug] }));
    const shortNames = buildShortNames(props);
    for (const p of props) {
      shortNames.set(p.slug, getDisplayName(p.slug, shortNames.get(p.slug) ?? p.name));
    }
    for (const slug of SLUGS) {
      expect(shortNames.get(slug)).toBe(CANONICAL_PROPERTY_DISPLAY[slug].name);
    }
  });

  it("the plain getDisplayName override also works for a [DEVDB]-prefixed name — keyed by slug, not by name", () => {
    expect(getDisplayName("cozy-1-bedroom", `[DEVDB] ${KEYWORD_NAMES["cozy-1-bedroom"]}`)).toBe("Cozy 1BR Haven");
  });
});

describe("buildPropertyPageH1 — uses the canonical name when a slug is given", () => {
  it("names the home and the city using the canonical name, not the keyword string", () => {
    expect(
      buildPropertyPageH1(KEYWORD_NAMES["spacious-2-bedroom"], "Lipa City, Batangas", "spacious-2-bedroom")
    ).toBe("Spacious 2BR Getaway in Lipa City");
  });

  it("disambiguates a Mickey configuration correctly, unlike the plain first-pipe-segment fallback", () => {
    expect(
      buildPropertyPageH1(
        KEYWORD_NAMES["mickey-in-lipa--full-family-house--sleeps-15"],
        "Lipa City, Batangas",
        "mickey-in-lipa--full-family-house--sleeps-15"
      )
    ).toBe("Mickey in Lipa — Full Family House in Lipa City");
  });

  it("falls back to the derived first-pipe-segment when no slug is given (back-compat)", () => {
    expect(buildPropertyPageH1(KEYWORD_NAMES["cozy-1-bedroom"], "Lipa City, Batangas")).toBe(
      "Cozy 1BR Haven in Lipa City"
    );
  });
});
