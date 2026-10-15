import { describe, expect, it } from "vitest";
import { resolvePropertyMatch } from "../property-resolver";

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
