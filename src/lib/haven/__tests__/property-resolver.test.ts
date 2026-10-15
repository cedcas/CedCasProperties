import { describe, expect, it } from "vitest";
import {
  resolvePropertyMatch,
  resolveGuestPropertyMention,
  buildPropertyContextNote,
  dropUnknownPropertyClaims,
} from "../property-resolver";

const LISTINGS = [
  { slug: "cozy-1-bedroom", name: "Cozy 1BR Haven | Solar Power•Netflix•Wi-Fi•5 Pax", maxGuests: 5 },
  { slug: "spacious-2-bedroom", name: "Spacious 2BR Haven | Solar Power•Netflix•Wi-Fi•9 Pax", maxGuests: 9 },
  { slug: "mickey-in-lipa--family-staycation--sleeps-7", name: "Mickey in Lipa | Family Staycation•Sleeps 7", maxGuests: 7 },
  { slug: "mickey-in-lipa--family-house--sleeps-11", name: "Mickey in Lipa | Family House•Sleeps 11", maxGuests: 11 },
  { slug: "mickey-in-lipa--full-family-house--sleeps-15", name: "Mickey in Lipa | Full Family House•Sleeps 15", maxGuests: 15 },
];

describe("resolvePropertyMatch", () => {
  it("matches an exact slug outright, even if it would otherwise score ambiguously", () => {
    const result = resolvePropertyMatch("mickey-in-lipa--family-house--sleeps-11", LISTINGS);
    expect(result).toEqual({ status: "unique", slug: "mickey-in-lipa--family-house--sleeps-11", name: LISTINGS[3].name });
  });

  it('resolves "Mickey Full Family House" to the full family house, not a sibling', () => {
    const result = resolvePropertyMatch("Mickey Full Family House", LISTINGS);
    expect(result).toEqual({ status: "unique", slug: "mickey-in-lipa--full-family-house--sleeps-15", name: LISTINGS[4].name });
  });

  it('resolves "mickey 15" using the capacity number to disambiguate', () => {
    const result = resolvePropertyMatch("mickey 15", LISTINGS);
    expect(result).toEqual({ status: "unique", slug: "mickey-in-lipa--full-family-house--sleeps-15", name: LISTINGS[4].name });
  });

  it('resolves the Tagalog "yung malaking bahay ng Mickey" ("the big house of Mickey\'s") to the biggest Mickey configuration', () => {
    const result = resolvePropertyMatch("yung malaking bahay ng Mickey", LISTINGS);
    expect(result).toEqual({ status: "unique", slug: "mickey-in-lipa--full-family-house--sleeps-15", name: LISTINGS[4].name });
  });

  it('resolves "pinakamalaking bahay" ("the biggest house") to the largest-capacity listing', () => {
    const result = resolvePropertyMatch("pinakamalaking bahay", LISTINGS);
    expect(result).toEqual({ status: "unique", slug: "mickey-in-lipa--full-family-house--sleeps-15", name: LISTINGS[4].name });
  });

  it('resolves "biggest house" to the largest-capacity listing', () => {
    const result = resolvePropertyMatch("biggest house", LISTINGS);
    expect(result).toEqual({ status: "unique", slug: "mickey-in-lipa--full-family-house--sleeps-15", name: LISTINGS[4].name });
  });

  it('resolves "largest" alone to the largest-capacity listing', () => {
    const result = resolvePropertyMatch("largest", LISTINGS);
    expect(result).toEqual({ status: "unique", slug: "mickey-in-lipa--full-family-house--sleeps-15", name: LISTINGS[4].name });
  });

  it('resolves "big house" (no "Mickey" mentioned) to the largest-capacity listing', () => {
    const result = resolvePropertyMatch("big house", LISTINGS);
    expect(result).toEqual({ status: "unique", slug: "mickey-in-lipa--full-family-house--sleeps-15", name: LISTINGS[4].name });
  });

  it('resolves "malaki" alone to the largest-capacity listing', () => {
    const result = resolvePropertyMatch("malaki", LISTINGS);
    expect(result).toEqual({ status: "unique", slug: "mickey-in-lipa--full-family-house--sleeps-15", name: LISTINGS[4].name });
  });

  it('is ambiguous for "Mickey in Lipa" with no distinguishing size/capacity detail, listing all three', () => {
    const result = resolvePropertyMatch("Mickey in Lipa", LISTINGS);
    expect(result.status).toBe("ambiguous");
    if (result.status === "ambiguous") expect(result.candidates).toHaveLength(3);
  });

  it('resolves "spacious 2 bedroom" to the Spacious 2BR, not the Cozy 1BR', () => {
    const result = resolvePropertyMatch("spacious 2 bedroom", LISTINGS);
    expect(result).toEqual({ status: "unique", slug: "spacious-2-bedroom", name: LISTINGS[1].name });
  });

  it('resolves "the 1BR" to the Cozy 1BR', () => {
    const result = resolvePropertyMatch("the 1BR", LISTINGS);
    expect(result).toEqual({ status: "unique", slug: "cozy-1-bedroom", name: LISTINGS[0].name });
  });

  it('is ambiguous for a bare "B38" — all three Mickey listings qualify equally', () => {
    const result = resolvePropertyMatch("B38", LISTINGS);
    expect(result.status).toBe("ambiguous");
    if (result.status === "ambiguous") {
      expect(result.candidates.map((c) => c.slug).sort()).toEqual(
        [
          "mickey-in-lipa--family-staycation--sleeps-7",
          "mickey-in-lipa--family-house--sleeps-11",
          "mickey-in-lipa--full-family-house--sleeps-15",
        ].sort()
      );
    }
  });

  it('is ambiguous for a bare "Mickey" with no distinguishing detail', () => {
    const result = resolvePropertyMatch("Mickey", LISTINGS);
    expect(result.status).toBe("ambiguous");
    if (result.status === "ambiguous") expect(result.candidates).toHaveLength(3);
  });

  it("never matches a plausible-looking but unrelated query", () => {
    const result = resolvePropertyMatch("asdkjfhasdkjfh zzqqxx", LISTINGS);
    expect(result).toEqual({ status: "none" });
  });

  it("returns none for an empty/whitespace-only query", () => {
    expect(resolvePropertyMatch("   ", LISTINGS)).toEqual({ status: "none" });
  });
});

// DEC-029, 2026-10-15 live-retest fix: pre-resolution run on the guest's latest message
// BEFORE the model is called, independent of whether the model calls a tool — the two
// exact live failures were Haiku answering free-text without ever calling a tool.
describe("resolveGuestPropertyMention", () => {
  it('live failure #1 — "Mickey in lipa" (no distinguishing detail) resolves ambiguous with short, undisambiguated-suffix-free labels', () => {
    const result = resolveGuestPropertyMention("Mickey in lipa", LISTINGS);
    expect(result.status).toBe("ambiguous");
    if (result.status !== "ambiguous") return;
    expect(result.options).toHaveLength(3);
    expect(result.options.map((o) => o.label).sort()).toEqual(
      [
        "Mickey in Lipa — Family Staycation",
        "Mickey in Lipa — Family House",
        "Mickey in Lipa — Full Family House",
      ].sort()
    );
    expect(result.options.map((o) => o.maxGuests).sort((a, b) => a - b)).toEqual([7, 11, 15]);
  });

  it('live failure #2 — "malaking bahay ng Mickey" resolves uniquely to the full family house with a clean short label', () => {
    const result = resolveGuestPropertyMention("yung malaking bahay ng Mickey", LISTINGS);
    expect(result).toEqual({
      status: "unique",
      slug: "mickey-in-lipa--full-family-house--sleeps-15",
      label: "Mickey in Lipa — Full Family House",
    });
  });

  it("returns none for an unrelated message", () => {
    expect(resolveGuestPropertyMention("What time is checkout?", LISTINGS)).toEqual({ status: "none" });
  });
});

describe("buildPropertyContextNote", () => {
  it("returns an empty string when nothing resolved", () => {
    expect(buildPropertyContextNote({ status: "none" })).toBe("");
  });

  it("tells the model the slug and forbids asking for the name again, on a unique match", () => {
    const note = buildPropertyContextNote({
      status: "unique",
      slug: "mickey-in-lipa--full-family-house--sleeps-15",
      label: "Mickey in Lipa — Full Family House",
    });
    expect(note).toContain("Mickey in Lipa — Full Family House");
    expect(note).toContain("slug mickey-in-lipa--full-family-house--sleeps-15");
    expect(note).toMatch(/do not ask the guest to name or confirm/i);
  });

  it("tells the model to call get_quote immediately when dates and guest count are also already known", () => {
    const note = buildPropertyContextNote(
      {
        status: "unique",
        slug: "mickey-in-lipa--full-family-house--sleeps-15",
        label: "Mickey in Lipa — Full Family House",
      },
      { checkIn: "2026-11-14", checkOut: "2026-11-15", guests: 10 }
    );
    expect(note).toMatch(/call get_quote now/i);
    expect(note).toContain("slug=mickey-in-lipa--full-family-house--sleeps-15");
    expect(note).toContain("checkIn=2026-11-14");
    expect(note).toContain("checkOut=2026-11-15");
    expect(note).toContain("guests=10");
  });

  it("does not instruct a get_quote call when the guest count is still missing", () => {
    const note = buildPropertyContextNote(
      {
        status: "unique",
        slug: "mickey-in-lipa--full-family-house--sleeps-15",
        label: "Mickey in Lipa — Full Family House",
      },
      { checkIn: "2026-11-14", checkOut: "2026-11-15" }
    );
    expect(note).not.toMatch(/call get_quote now/i);
  });

  it("lists each candidate's short name and capacity, and bans the 'unknown property' claim, on an ambiguous match", () => {
    const note = buildPropertyContextNote({
      status: "ambiguous",
      options: [
        { slug: "mickey-in-lipa--family-staycation--sleeps-7", label: "Mickey in Lipa — Family Staycation", maxGuests: 7 },
        { slug: "mickey-in-lipa--family-house--sleeps-11", label: "Mickey in Lipa — Family House", maxGuests: 11 },
        { slug: "mickey-in-lipa--full-family-house--sleeps-15", label: "Mickey in Lipa — Full Family House", maxGuests: 15 },
      ],
    });
    expect(note).toContain("Mickey in Lipa — Family Staycation (sleeps up to 7)");
    expect(note).toContain("Mickey in Lipa — Family House (sleeps up to 11)");
    expect(note).toContain("Mickey in Lipa — Full Family House (sleeps up to 15)");
    expect(note).toMatch(/never say the property is unknown/i);
  });
});

describe("dropUnknownPropertyClaims", () => {
  const UNIQUE = {
    status: "unique" as const,
    slug: "mickey-in-lipa--full-family-house--sleeps-15",
    label: "Mickey in Lipa — Full Family House",
  };
  const AMBIGUOUS = {
    status: "ambiguous" as const,
    options: [
      { slug: "mickey-in-lipa--family-staycation--sleeps-7", label: "Mickey in Lipa — Family Staycation", maxGuests: 7 },
      { slug: "mickey-in-lipa--family-house--sleeps-11", label: "Mickey in Lipa — Family House", maxGuests: 11 },
      { slug: "mickey-in-lipa--full-family-house--sleeps-15", label: "Mickey in Lipa — Full Family House", maxGuests: 15 },
    ],
  };

  it('live failure #1 — drops "hindi ko alam ang property na \'yan" (btg) and asks which of the three candidates instead', () => {
    const result = dropUnknownPropertyClaims(
      "Hindi ko alam ang property na 'yan.",
      AMBIGUOUS,
      "btg",
      "Mickey in lipa"
    );
    expect(result).not.toMatch(/hindi ko alam/i);
    expect(result).toContain("Mickey in Lipa — Family Staycation");
    expect(result).toContain("Mickey in Lipa — Family House");
    expect(result).toContain("Mickey in Lipa — Full Family House");
  });

  it('drops an English "not in our system" claim and asks a "did you mean" question for a unique match', () => {
    const result = dropUnknownPropertyClaims(
      "Sorry, that property is not in our system.",
      UNIQUE,
      "en",
      "Mickey in lipa"
    );
    expect(result).not.toMatch(/not in our system/i);
    expect(result).toBe("Did you mean Mickey in Lipa — Full Family House?");
  });

  it("leaves the text untouched when nothing resolved", () => {
    const text = "Sorry, that property is not in our system.";
    expect(dropUnknownPropertyClaims(text, { status: "none" }, "en", "anything")).toBe(text);
  });

  it("leaves unrelated text untouched when a match exists but the claim never appears", () => {
    const text = "Yes, we have that! It sleeps up to 15 guests.";
    expect(dropUnknownPropertyClaims(text, UNIQUE, "en", "Mickey")).toBe(text);
  });
});
