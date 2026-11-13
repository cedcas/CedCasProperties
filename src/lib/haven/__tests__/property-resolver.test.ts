import { describe, expect, it } from "vitest";
import {
  resolvePropertyMatch,
  resolveGuestPropertyMention,
  resolveGuestPropertyMentionAcrossTurns,
  buildPropertyContextNote,
  dropUnknownPropertyClaims,
  isCapacityQuestion,
  isAvailabilityQuestion,
  buildCapacityQuestionContextNote,
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

  it("never matches a listing on a bare number alone with no real name/alias overlap (Owner incident, 2026-11-13)", () => {
    // "11/28" tokenizes to include a bare "11", which must not alone "match" the 11-guest
    // Mickey Family House — the live bug where "which listing fits 2 adults on 11/28?"
    // wrongly resolved to that listing regardless of the actual party size.
    expect(resolvePropertyMatch("which listing fits 2 adults on 11/28", LISTINGS)).toEqual({ status: "none" });
    expect(resolvePropertyMatch("is anything open 28/11 for 2 adults", LISTINGS)).toEqual({ status: "none" });
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

// Owner rule 3, 2026-10-16: a follow-up message carrying only dates/guests must still
// resolve to a property named earlier in the conversation.
describe("resolveGuestPropertyMentionAcrossTurns", () => {
  it("prefers a property named in the latest message itself over anything in history", () => {
    const result = resolveGuestPropertyMentionAcrossTurns("Cozy 1BR po", LISTINGS, [
      "Magkano ga ang Spacious 2BR?",
    ]);
    expect(result).toEqual({ status: "unique", slug: "cozy-1-bedroom", label: "Cozy 1BR Haven" });
  });

  it("falls back to the most recent property-naming message in history when the latest message names none", () => {
    const result = resolveGuestPropertyMentionAcrossTurns("Nobyembre 19 hanggang 21, 4 kami", LISTINGS, [
      "Magkano ga ang Spacious 2BR?",
    ]);
    expect(result).toEqual({ status: "unique", slug: "spacious-2-bedroom", label: "Spacious 2BR Haven" });
  });

  it("scans history most-recent-first", () => {
    const result = resolveGuestPropertyMentionAcrossTurns("Nov 19 to 21, we are 4", LISTINGS, [
      "Magkano ga ang Spacious 2BR?",
      "Ay ga, pwede namán! Ilan po kayo at anong petsa?",
      "Actually, Cozy 1BR nalang",
    ]);
    expect(result).toEqual({ status: "unique", slug: "cozy-1-bedroom", label: "Cozy 1BR Haven" });
  });

  it("returns none when neither the latest message nor history names a property", () => {
    const result = resolveGuestPropertyMentionAcrossTurns("Nov 19 to 21, we are 4", LISTINGS, [
      "Do you have a pool?",
    ]);
    expect(result).toEqual({ status: "none" });
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

describe("isCapacityQuestion", () => {
  it("detects an English capacity question", () => {
    expect(isCapacityQuestion("How many guests can it fit?")).toBe(true);
    expect(isCapacityQuestion("What's the max capacity?")).toBe(true);
  });

  it("detects a Tagalog capacity question", () => {
    expect(isCapacityQuestion("Ilang tao ang kasya sa Cozy 1BR?")).toBe(true);
    expect(isCapacityQuestion("Kasya ba ilang tao sa Spacious 2BR?")).toBe(true);
  });

  it("does not fire for an unrelated or plain availability question", () => {
    expect(isCapacityQuestion("May bakante ba sa 12/5?")).toBe(false);
    expect(isCapacityQuestion("What time is check-in?")).toBe(false);
  });
});

describe("isAvailabilityQuestion (Owner incident, 2026-11-13)", () => {
  it("detects an English availability question", () => {
    expect(isAvailabilityQuestion("Is anything available on 11/28?")).toBe(true);
    expect(isAvailabilityQuestion("Any vacant units this weekend?")).toBe(true);
    expect(isAvailabilityQuestion("Is anything open 28/11?")).toBe(true);
  });

  it("detects a Tagalog/Batangueño availability question", () => {
    expect(isAvailabilityQuestion("May bakante po ba sa 28 ng Nobyembre?")).toBe(true);
    expect(isAvailabilityQuestion("Libre pa ba ang Cozy 1BR sa Dis 5?")).toBe(true);
  });

  it("does not fire for an unrelated question that happens to mention a date", () => {
    expect(isAvailabilityQuestion("What time is check-in on 11/28?")).toBe(false);
    expect(isAvailabilityQuestion("Magkano ang Cozy 1BR sa Dis 5?")).toBe(false);
  });
});

describe("buildCapacityQuestionContextNote", () => {
  const COZY = { status: "unique" as const, slug: "cozy-1-bedroom", label: "Cozy 1BR Haven" };

  it("states the exact maxGuests for a uniquely-resolved property's capacity question", () => {
    const note = buildCapacityQuestionContextNote(
      "Ilang tao ang kasya sa Cozy 1BR? May bakante ba sa 12/5?",
      COZY,
      LISTINGS
    );
    expect(note).toMatch(/maxGuests is 5/);
    expect(note).toMatch(/kasya hanggang 5 tao/);
    expect(note).toMatch(/never skip the capacity question/i);
  });

  it("returns empty when the message isn't a capacity question", () => {
    expect(buildCapacityQuestionContextNote("May bakante ba sa 12/5?", COZY, LISTINGS)).toBe("");
  });

  it("returns empty when no single property is uniquely resolved", () => {
    expect(buildCapacityQuestionContextNote("Ilang tao ang kasya?", { status: "none" }, LISTINGS)).toBe("");
  });
});
