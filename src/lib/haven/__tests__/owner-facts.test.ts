import { describe, expect, it } from "vitest";
import {
  MAX_TOTAL_CAPACITY,
  OWNER_FACT_ALLOWED_AMOUNTS,
  buildOwnerFactsPrompt,
  stripBudgetQuestions,
  removeKidsFreeClaims,
  replaceBannedAffordPhrasing,
  needsCapacityHandoff,
  ensureCapacityHandoffLink,
  parseGuestCount,
  buildCapacityContextNote,
  isLargeGroupMessage,
  isLargeGroupToolCall,
  buildLargeGroupHandoffReply,
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

  it("points local-places/how-things-work questions to the Welcome Book, with Alfamart + minimarts as fixed facts (Cedric, 2026-10-15)", () => {
    expect(prompt).toMatch(/Cedric, 2026-10-15/);
    expect(prompt).toMatch(/Welcome Book/);
    expect(prompt).toMatch(/Alfamart/);
    expect(prompt).toMatch(/minimarts/);
    expect(prompt).toMatch(/never look up or invent/i);
    expect(prompt).toMatch(/neighborhoodPlaces/);
  });

  it("scopes the B34 Welcome Book to the two B34 slugs and never generalizes it to a B38/Mickey listing", () => {
    expect(prompt).toMatch(/B34 Welcome Book/);
    expect(prompt).toMatch(/cozy-1-bedroom/);
    expect(prompt).toMatch(/spacious-2-bedroom/);
    expect(prompt).toMatch(/NEVER apply the B34 Welcome Book list to a Mickey in Lipa \(B38\) listing/i);
    expect(prompt).toMatch(/get_local_guide/);
  });

  it("bans 'can you afford it' phrasing and instructs a booking nudge after a quote", () => {
    expect(prompt).toMatch(/Kaya mo na ba\?/);
    expect(prompt).toMatch(/Kaya n['’]yo ba\?/);
    expect(prompt).toMatch(/Can you afford it\?/);
    expect(prompt).toMatch(/within your budget/i);
    expect(prompt).toMatch(/kaya ba ng budget/i);
    expect(prompt).toMatch(/Want me to help you book it\?/);
  });

  it("bans sharing Wi-Fi or access codes, pointing to Messenger instead", () => {
    expect(prompt).toMatch(/Never share a Wi-Fi name\/password/i);
    expect(prompt).toMatch(/door\/gate\/lock\/keybox code/i);
    expect(prompt).toContain(MESSENGER_HREF);
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

describe("replaceBannedAffordPhrasing", () => {
  it("replaces 'Kaya mo na ba?' with the English booking nudge", () => {
    const result = replaceBannedAffordPhrasing("That'll be ₱5,600 total. Kaya mo na ba?", "en", "How much for two nights?");
    expect(result).not.toMatch(/kaya mo na ba/i);
    expect(result).toContain("Want me to help you book it?");
  });

  it("replaces \"Kaya n'yo ba?\" with the Tagalog booking nudge", () => {
    const result = replaceBannedAffordPhrasing("₱5,600 po lahat. Kaya n'yo ba?", "tl", "Magkano po?");
    expect(result).not.toMatch(/kaya n['’]yo ba/i);
    expect(result).toContain("Gusto n'yo na bang i-book?");
  });

  it("replaces 'Can you afford it?' with the booking nudge", () => {
    const result = replaceBannedAffordPhrasing("The total is ₱5,600. Can you afford it?", "en", "quote please");
    expect(result).not.toMatch(/afford/i);
    expect(result).toContain("Want me to help you book it?");
  });

  it("replaces 'within your budget' with the booking nudge instead of silently dropping it", () => {
    const result = replaceBannedAffordPhrasing("Is ₱5,600 within your budget?", "en", "quote please");
    expect(result).not.toMatch(/budget/i);
    expect(result).toContain("Want me to help you book it?");
  });

  it("replaces 'kaya ba ng budget n'yo' with the Tagalog booking nudge", () => {
    const result = replaceBannedAffordPhrasing("Kaya ba ng budget n'yo ang ₱5,600?", "tl", "magkano po");
    expect(result).not.toMatch(/budget/i);
    expect(result).toContain("Gusto n'yo na bang i-book?");
  });

  it("returns the fixed Batangueño nudge for lang 'btg' regardless of guest wording", () => {
    const result = replaceBannedAffordPhrasing("Kaya mo na ba?", "btg", "magkano po");
    expect(result).toBe("Gusto n'yo na ga i-book?");
  });

  it("leaves a reply with no banned phrasing untouched", () => {
    const input = "The total is ₱5,600 for two nights.";
    expect(replaceBannedAffordPhrasing(input, "en", "")).toBe(input);
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

describe("isLargeGroupMessage", () => {
  it("is true for a split group that sums to 24 ('8 adults + 16 kids')", () => {
    expect(isLargeGroupMessage("We're 8 adults + 16 kids for that weekend.")).toBe(true);
  });

  it("is true for a plain '24 people' claim", () => {
    expect(isLargeGroupMessage("Can we book for 24 people?")).toBe(true);
  });

  it("is false under the cap", () => {
    expect(isLargeGroupMessage("We are 10 people for that weekend.")).toBe(false);
  });

  it("is false when no guest count is mentioned at all", () => {
    expect(isLargeGroupMessage("Do you have WiFi?")).toBe(false);
  });
});

describe("isLargeGroupToolCall", () => {
  it("is true for a find_stay call with guests >= cap", () => {
    const exchanges: ToolExchange[] = [{ name: "find_stay", input: { guests: 24 }, result: {} }];
    expect(isLargeGroupToolCall(exchanges)).toBe(true);
  });

  it("is true for a get_quote call with guests > cap", () => {
    const exchanges: ToolExchange[] = [{ name: "get_quote", input: { guests: 30 }, result: {} }];
    expect(isLargeGroupToolCall(exchanges)).toBe(true);
  });

  it("is false for a guest count under the cap", () => {
    const exchanges: ToolExchange[] = [{ name: "find_stay", input: { guests: 12 }, result: {} }];
    expect(isLargeGroupToolCall(exchanges)).toBe(false);
  });

  it("is false for an unrelated tool call", () => {
    const exchanges: ToolExchange[] = [{ name: "get_faq", input: { query: "parking" }, result: {} }];
    expect(isLargeGroupToolCall(exchanges)).toBe(false);
  });
});

describe("buildLargeGroupHandoffReply", () => {
  it("returns the fixed English script for lang 'en'", () => {
    expect(buildLargeGroupHandoffReply("en", "24 people please")).toBe(
      "What a big group! For 24 or more guests, our team will plan it with you personally — tap below to message us on Messenger."
    );
  });

  it("returns the fixed Tagalog script for lang 'tl'", () => {
    expect(buildLargeGroupHandoffReply("tl", "24 katao po kami")).toBe(
      "Ang saya, ang dami ninyo! Para sa 24 o higit pang bisita, ang team namin mismo ang tutulong sa inyo — i-tap lang sa ibaba para mag-message sa Messenger."
    );
  });

  it("returns the fixed Batangueño script for lang 'btg', regardless of guest wording", () => {
    expect(buildLargeGroupHandoffReply("btg", "24 people please")).toBe(
      "Aba'y ang dami ninyo, ala eh ang saya! Para sa 24 o higit pa, ang team namin mismo ang aasikaso sa inyo — pindutin lang sa ibaba para mag-message sa Messenger."
    );
  });

  it("auto-detects English from the guest's own message", () => {
    expect(buildLargeGroupHandoffReply("auto", "Can you fit 24 of us next weekend?")).toContain("What a big group!");
  });

  it("auto-detects Tagalog from the guest's own message", () => {
    expect(buildLargeGroupHandoffReply("auto", "Kami ay 24 na tao po, pwede ba kami?")).toContain("Ang saya, ang dami ninyo!");
  });
});
