import { describe, expect, it } from "vitest";
import {
  MAX_TOTAL_CAPACITY,
  OWNER_FACT_ALLOWED_AMOUNTS,
  buildOwnerFactsPrompt,
  stripBudgetQuestions,
  removeKidsFreeClaims,
  needsCapacityHandoff,
  ensureCapacityHandoffLink,
  parseGuestCount,
  buildCapacityContextNote,
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

  it("instructs calling find_amenity across all properties instead of asking which house", () => {
    expect(prompt).toMatch(/find_amenity/);
    expect(prompt).toMatch(/never ask the guest which house first/i);
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

describe("parseGuestCount", () => {
  it("parses the exact field-reported sentence ('Kami ay 24 na tao ...')", () => {
    expect(parseGuestCount("Kami ay 24 na tao sa ikalawang Sabado ng Nobyembre. Saan kami pwede?")).toBe(24);
  });

  it("parses '24 people'/'24 pax'/'24 guests'/'24 adults'", () => {
    expect(parseGuestCount("We are 24 people for that weekend.")).toBe(24);
    expect(parseGuestCount("24 pax po kami.")).toBe(24);
    expect(parseGuestCount("Can you fit 24 guests?")).toBe(24);
    expect(parseGuestCount("There will be 24 adults.")).toBe(24);
  });

  it("parses '24 katao' (Tagalog compound for 'people')", () => {
    expect(parseGuestCount("24 katao kami sa darating na Sabado.")).toBe(24);
  });

  it("parses a bare 'kami ay 24' idiom with no trailing noun", () => {
    expect(parseGuestCount("Kami ay 24, available ba kayo?")).toBe(24);
  });

  it("sums a split group like '8 adults + 4 kids'", () => {
    expect(parseGuestCount("We're 8 adults + 4 kids for that weekend.")).toBe(12);
  });

  it("ignores a bare number next to a date, time, or price with no people-noun adjacent", () => {
    expect(parseGuestCount("Pwede ba sa Nov 24? ₱2,800 per night, 9am check-in.")).toBeNull();
  });

  it("returns null when no guest count is mentioned", () => {
    expect(parseGuestCount("Do you have WiFi and parking?")).toBeNull();
  });
});

describe("needsCapacityHandoff — parsed guest count from the guest's own message", () => {
  it("is true for the exact field-reported sentence, with no tool call at all", () => {
    expect(
      needsCapacityHandoff("Kami ay 24 na tao sa ikalawang Sabado ng Nobyembre. Saan kami pwede?", [])
    ).toBe(true);
  });

  it("is true for '24 people' stated in plain English with no tool call", () => {
    expect(needsCapacityHandoff("Can we book for 24 people?", [])).toBe(true);
  });

  it("is false for a guest count under the cap parsed from the message alone", () => {
    expect(needsCapacityHandoff("We are 10 people for that weekend.", [])).toBe(false);
  });
});

describe("buildCapacityContextNote", () => {
  it("includes the parsed count and the Messenger handoff instruction for 24+", () => {
    const note = buildCapacityContextNote("Kami ay 24 na tao sa ikalawang Sabado ng Nobyembre. Saan kami pwede?");
    expect(note).toContain("24");
    expect(note).toContain(MESSENGER_HREF);
    expect(note).toMatch(/do not ask how many nights/i);
  });

  it("is empty when the guest count is under the cap", () => {
    expect(buildCapacityContextNote("We are 10 people for that weekend.")).toBe("");
  });

  it("is empty when no guest count is mentioned", () => {
    expect(buildCapacityContextNote("Do you have WiFi?")).toBe("");
  });
});
