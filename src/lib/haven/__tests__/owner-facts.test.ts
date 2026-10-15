import { describe, expect, it } from "vitest";
import {
  MAX_TOTAL_CAPACITY,
  OWNER_FACT_ALLOWED_AMOUNTS,
  buildOwnerFactsPrompt,
  stripBudgetQuestions,
  removeKidsFreeClaims,
  needsCapacityHandoff,
  ensureCapacityHandoffLink,
} from "../owner-facts";
import { MESSENGER_HREF, type ToolExchange } from "../post-process";

describe("buildOwnerFactsPrompt", () => {
  const prompt = buildOwnerFactsPrompt();

  it("states the max combined capacity and that it counts adults", () => {
    expect(prompt).toContain(`${MAX_TOTAL_CAPACITY} guests`);
    expect(prompt).toMatch(/counts? adults|includes adults/i);
  });

  it("states full payment up front with no half payment or deposit", () => {
    expect(prompt).toMatch(/full payment/i);
    expect(prompt).toMatch(/no half payment/i);
    expect(prompt).toMatch(/no down payment\/deposit/i);
  });

  it("states the ₱200/hour early check-in/late checkout rate, subject to availability", () => {
    expect(prompt).toContain("₱200 per hour");
    expect(prompt).toMatch(/subject to availability/i);
  });

  it("states quiet hours and the general house rules", () => {
    expect(prompt).toMatch(/10:00 PM to 8:00 AM/);
    expect(prompt).toMatch(/no pets/i);
    expect(prompt).toMatch(/no smoking inside/i);
    expect(prompt).toMatch(/no parties\/events without host approval/i);
  });

  it("instructs never to infer karaoke/amenities from marketing copy", () => {
    expect(prompt).toMatch(/amenities\/amenityDetails/);
    expect(prompt).toMatch(/karaoke-and-lechon dinner/);
    expect(prompt).toMatch(/never infer equipment/i);
  });

  it("is sourced and dated to the Owner", () => {
    expect(prompt).toMatch(/Cedric, 2026-10-14/);
  });
});

describe("OWNER_FACT_ALLOWED_AMOUNTS", () => {
  it("allows the ₱200/hour early check-in/late checkout rate through the price guard", () => {
    expect(OWNER_FACT_ALLOWED_AMOUNTS.has(200)).toBe(true);
  });
});

describe("stripBudgetQuestions", () => {
  it("drops a sentence asking the guest's budget", () => {
    const result = stripBudgetQuestions("Sure thing! What's your budget for this stay?");
    expect(result).not.toMatch(/budget/i);
    expect(result).toBe("Sure thing!");
  });

  it("drops a Tagalog budget question (magkano ang budget)", () => {
    const result = stripBudgetQuestions("Sige lang. Magkano ang budget n'yo para dito?");
    expect(result).not.toMatch(/budget/i);
  });

  it("drops a 'how much are you willing to spend' question", () => {
    const result = stripBudgetQuestions("Got it. How much are you willing to spend for the group?");
    expect(result).not.toMatch(/willing to spend/i);
  });

  it("leaves a reply with no budget question untouched", () => {
    const input = "We have a 2BR available for those dates.";
    expect(stripBudgetQuestions(input)).toBe(input);
  });
});

describe("removeKidsFreeClaims", () => {
  it("replaces a claim that kids don't count toward capacity", () => {
    const result = removeKidsFreeClaims("Sure! Kids don't count toward the capacity, so you're fine.", "en");
    expect(result).not.toMatch(/don'?t count/i);
    expect(result).toContain(MESSENGER_HREF);
  });

  it("replaces a claim that babies stay free of charge", () => {
    const result = removeKidsFreeClaims("Babies stay free of charge with us.", "en");
    expect(result).not.toMatch(/free of charge/i);
    expect(result).toContain(MESSENGER_HREF);
  });

  it("replaces a Tagalog claim that kids aren't counted in the headcount", () => {
    const result = removeKidsFreeClaims("Hindi kasama sa bilang ang mga bata.", "tl");
    expect(result).not.toMatch(/hindi kasama sa bilang/i);
    expect(result).toContain(MESSENGER_HREF);
  });

  it("leaves a reply with no such claim untouched", () => {
    const input = "We can host up to 15 guests at that property.";
    expect(removeKidsFreeClaims(input, "en")).toBe(input);
  });
});

describe("needsCapacityHandoff", () => {
  it("is true when find_stay was called for 24 or more guests", () => {
    const exchanges: ToolExchange[] = [
      { name: "find_stay", input: { checkIn: "2026-12-01", checkOut: "2026-12-02", guests: 24 }, result: { options: [] } },
    ];
    expect(needsCapacityHandoff("Can we fit 24 people?", exchanges)).toBe(true);
  });

  it("is true when get_quote was called for exactly 24 guests", () => {
    const exchanges: ToolExchange[] = [
      { name: "get_quote", input: { slug: "mickey-full", checkIn: "2026-12-01", checkOut: "2026-12-02", guests: 24 }, result: {} },
    ];
    expect(needsCapacityHandoff("quote please", exchanges)).toBe(true);
  });

  it("is false for a guest count under the cap", () => {
    const exchanges: ToolExchange[] = [
      { name: "find_stay", input: { checkIn: "2026-12-01", checkOut: "2026-12-02", guests: 10 }, result: { options: [] } },
    ];
    expect(needsCapacityHandoff("10 of us", exchanges)).toBe(false);
  });

  it("is true when the guest asks whether kids count toward capacity", () => {
    expect(needsCapacityHandoff("Do kids count toward the guest capacity?", [])).toBe(true);
  });

  it("is true for a Tagalog kids/bilang capacity question", () => {
    expect(needsCapacityHandoff("Kasama ba sa bilang ang mga bata namin?", [])).toBe(true);
  });

  it("is true when the guest asks about squeezing in extra people", () => {
    expect(needsCapacityHandoff("Can we squeeze in 2 more people?", [])).toBe(true);
  });

  it("is true when the guest asks for an extra mattress", () => {
    expect(needsCapacityHandoff("Can you add an extra mattress for one more?", [])).toBe(true);
  });

  it("is true for a Tagalog 'dagdag tao' question", () => {
    expect(needsCapacityHandoff("Pwede ba ng dagdag tao?", [])).toBe(true);
  });

  it("is false for an unrelated question", () => {
    expect(needsCapacityHandoff("Do you have WiFi?", [])).toBe(false);
  });
});

describe("ensureCapacityHandoffLink", () => {
  it("adds the Messenger button when forced and not already present", () => {
    const links = ensureCapacityHandoffLink([{ label: "Book Now", href: "/properties/a/book" }], true);
    expect(links).toEqual([
      { label: "Book Now", href: "/properties/a/book" },
      { label: "Message us on Messenger", href: MESSENGER_HREF },
    ]);
  });

  it("does not duplicate an existing Messenger button", () => {
    const existing = [{ label: "Message us on Messenger", href: MESSENGER_HREF }];
    expect(ensureCapacityHandoffLink(existing, true)).toEqual(existing);
  });

  it("leaves links untouched when not forced", () => {
    const links = [{ label: "Book Now", href: "/properties/a/book" }];
    expect(ensureCapacityHandoffLink(links, false)).toBe(links);
  });
});
