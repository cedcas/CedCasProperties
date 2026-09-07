import { describe, it, expect } from "vitest";
import { faqs, HOMEPAGE_FAQ_LIMIT } from "@/lib/faqs";

describe("faqs", () => {
  it("has exactly 23 items after consolidating the check-in/checkout FAQs", () => {
    expect(faqs).toHaveLength(23);
  });

  it("has no duplicate questions (confirms #12/#13 aren't both still present)", () => {
    const questions = faqs.map((f) => f.q);
    expect(new Set(questions).size).toBe(questions.length);
  });

  it("no longer contains the separate 'different for B34 and B38' check-in question", () => {
    expect(faqs.some((f) => /different for B34 and B38/i.test(f.q))).toBe(false);
  });

  it("the combined check-in/checkout answer states both times and doesn't defer to 'the next question'", () => {
    const item = faqs.find((f) => f.q === "What are the check-in and checkout times?");
    expect(item).toBeDefined();
    expect(item!.a).toContain("2:00 PM");
    expect(item!.a).toContain("3:00 PM");
    expect(item!.a).toContain("12:00 PM");
    expect(item!.a.toLowerCase()).not.toContain("next question");
  });

  it("preserves the separate early-check-in/late-checkout ₱200/hr FAQ", () => {
    const item = faqs.find((f) => f.q === "Can I check in early or check out late?");
    expect(item).toBeDefined();
    expect(item!.a).toContain("₱200 per hour");
  });

  it("HOMEPAGE_FAQ_LIMIT never exceeds the total item count", () => {
    expect(HOMEPAGE_FAQ_LIMIT).toBeLessThanOrEqual(faqs.length);
  });

  it("every link phrase actually appears in its own answer text (no dead link targets)", () => {
    for (const f of faqs) {
      for (const link of f.links ?? []) {
        expect(f.a.includes(link.phrase)).toBe(true);
      }
    }
  });

  it("FAQ #2 links all five properties directly to their booking section, not the generic listing", () => {
    const item = faqs.find((f) => f.q === "How many guests can each unit accommodate?");
    expect(item).toBeDefined();
    const hrefs = (item!.links ?? []).map((l) => l.href);
    expect(hrefs).toEqual([
      "/properties/cozy-1-bedroom#book",
      "/properties/spacious-2-bedroom#book",
      "/properties/mickey-in-lipa--family-staycation--sleeps-7#book",
      "/properties/mickey-in-lipa--family-house--sleeps-11#book",
      "/properties/mickey-in-lipa--full-family-house--sleeps-15#book",
    ]);
    for (const href of hrefs) {
      expect(href).not.toBe("/#properties");
      expect(href.endsWith("#book")).toBe(true);
    }
  });

  it("FAQ #2 still preserves the approved capacities and the 24-combined-guest fact", () => {
    const item = faqs.find((f) => f.q === "How many guests can each unit accommodate?");
    expect(item!.a).toContain("sleeps up to 5");
    expect(item!.a).toContain("sleeps up to 9");
    expect(item!.a).toContain("sleeps up to 7");
    expect(item!.a).toContain("sleeps up to 11");
    expect(item!.a).toContain("sleeps up to 15");
    expect(item!.a).toContain("two separate houses");
    expect(item!.a).toContain("up to 24 guests total");
  });
});
