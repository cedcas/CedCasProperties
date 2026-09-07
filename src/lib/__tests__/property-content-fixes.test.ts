import { describe, it, expect } from "vitest";
import {
  detectStalePatterns,
  detectStaleFields,
  assertStaleFieldsAreExpected,
  assertFixedValueIsClean,
  excerptDiff,
  UnexpectedContentError,
  EXPECTED_PROPERTIES,
  EXPECTED_STALE_FIELDS,
  CONTENT_FIELDS,
} from "@/lib/property-content-fixes";

// All fixtures below are synthetic test data — never real production content.

describe("property-content-fixes", () => {
  describe("detectStalePatterns", () => {
    it("flags Maculot in any casing/spacing", () => {
      expect(detectStalePatterns("A short drive to Mt. Maculot")).toContain("maculot");
      expect(detectStalePatterns("visit MOUNT MACULOT trailhead")).toContain("maculot");
      expect(detectStalePatterns("Mt Maculot (no period)")).toContain("maculot");
    });
    it("flags stale Mbps figures", () => {
      expect(detectStalePatterns("Fiber runs at 400 Mbps here")).toContain("stale-mbps");
      expect(detectStalePatterns("dedicated 500+ Mbps fiber")).toContain("stale-mbps");
      expect(detectStalePatterns("500 Mbps fiber")).toContain("stale-mbps");
    });
    it("flags the parking-incident guarantee", () => {
      expect(detectStalePatterns("We've never had a parking incident.")).toContain(
        "parking-incident"
      );
    });
    it("does not flag clean content", () => {
      expect(detectStalePatterns("Fiber up to 340 Mbps, near Taal Volcano.")).toEqual([]);
    });
  });

  describe("detectStaleFields", () => {
    it("returns only the fields that actually contain a stale pattern", () => {
      const fields = {
        description: "Short drive to Mt. Maculot and Taal.",
        heroSummary: "Clean text, no issues here.",
        tagline: "Fiber up to 340 Mbps",
      };
      expect(detectStaleFields(fields)).toEqual(["description"]);
    });
    it("returns an empty array when every field is clean", () => {
      expect(
        detectStaleFields({ description: "Clean.", heroSummary: "Also clean." })
      ).toEqual([]);
    });
  });

  describe("assertStaleFieldsAreExpected", () => {
    it("passes silently when every stale field is on the pre-approved list", () => {
      const slug = Object.keys(EXPECTED_STALE_FIELDS)[0];
      const expectedField = EXPECTED_STALE_FIELDS[slug][0];
      expect(() => assertStaleFieldsAreExpected(slug, [expectedField])).not.toThrow();
    });
    it("throws UnexpectedContentError when a stale field is NOT on the list", () => {
      // "tagline" is never on cozy-1-bedroom's own expected list in isolation from
      // the others — use a field guaranteed absent for a known slug to prove the gate.
      const slug = "spacious-2-bedroom";
      const notExpected = CONTENT_FIELDS.find(
        (f) => !EXPECTED_STALE_FIELDS[slug].includes(f)
      )!;
      expect(() => assertStaleFieldsAreExpected(slug, [notExpected])).toThrow(
        UnexpectedContentError
      );
    });
    it("throws for a slug with no pre-approved list at all", () => {
      expect(() => assertStaleFieldsAreExpected("not-a-real-slug", ["description"])).toThrow(
        UnexpectedContentError
      );
    });
  });

  describe("assertFixedValueIsClean", () => {
    it("passes silently when the proposed replacement has no stale pattern", () => {
      expect(() =>
        assertFixedValueIsClean("cozy-1-bedroom", "description", "Fiber up to 340 Mbps near Taal.")
      ).not.toThrow();
    });
    it("throws when the 'fix' still contains a stale pattern (fix-list gone stale)", () => {
      expect(() =>
        assertFixedValueIsClean("cozy-1-bedroom", "description", "Still mentions Mt. Maculot")
      ).toThrow(UnexpectedContentError);
    });
  });

  describe("excerptDiff", () => {
    it("isolates just the changed fragment out of a larger unchanged string", () => {
      const oldStr = "A short drive to SM Lipa, Casa Marikit, and the Mt. Maculot trailhead.";
      const newStr = "A short drive to SM Lipa and Casa Marikit.";
      const { old: oldFrag, new: newFrag } = excerptDiff(oldStr, newStr);
      expect(oldFrag).toContain("Maculot");
      expect(newFrag).not.toContain("Maculot");
    });
    it("reports '(unchanged)' when the strings are identical", () => {
      const { old: oldFrag, new: newFrag } = excerptDiff("same text", "same text");
      expect(oldFrag).toBe("(unchanged)");
      expect(newFrag).toBe("(unchanged)");
    });
    it("caps very long fragments rather than dumping full field values", () => {
      const oldStr = "x".repeat(1000) + "OLD" + "y".repeat(1000);
      const newStr = "x".repeat(1000) + "NEW" + "y".repeat(1000);
      const { old: oldFrag } = excerptDiff(oldStr, newStr, 50);
      expect(oldFrag.length).toBeLessThanOrEqual(51); // capped length + ellipsis
    });
  });

  describe("idempotency", () => {
    it("a field with the target (already-fixed) value reports zero stale fields", () => {
      const alreadyFixed = {
        description: "Fiber up to 340 Mbps, a short drive to Taal Volcano.",
        propertyFaqs: JSON.stringify([{ question: "Parking?", answer: "Garage fits a Fortuner." }]),
      };
      expect(detectStaleFields(alreadyFixed)).toEqual([]);
    });
  });

  it("exactly 5 properties are configured, matching EXPECTED_STALE_FIELDS keys", () => {
    expect(EXPECTED_PROPERTIES).toHaveLength(5);
    for (const p of EXPECTED_PROPERTIES) {
      expect(EXPECTED_STALE_FIELDS[p.slug]).toBeDefined();
    }
  });
});
