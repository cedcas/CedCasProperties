import { describe, expect, it } from "vitest";
import {
  collectToolAmounts,
  enforcePriceClaims,
  collectBasePrices,
  collectDatedQuoteAmounts,
  ensureFromPrefix,
  extractAllowedLinks,
  isAllowedHref,
  normalizeHref,
  dedupeLinks,
  collectBookingLinks,
  ensureHandoffLink,
  needsAmenityHandoff,
  limitToOneProvisional,
  ensureBatanguenoMarker,
  stripBatanguenoFromTagalog,
  enforceTermsOfAddress,
  shortenPropertyNamesInText,
  fixDadalawPhrasing,
  isEnglishContext,
  stripTagalogWordsInEnglish,
  firstResolvedDateRange,
  formatDateRangeArrow,
  ensureDatesStated,
  fixStayRangeEndDate,
  FALLBACK_TOTAL_TEXT,
  FALLBACK_FEE_TEXT,
  FALLBACK_HOURLY_FEE_TEXT,
  MESSENGER_HREF,
  type ToolExchange,
} from "../post-process";
import { buildStayLabel } from "../dates";

describe("isAllowedHref", () => {
  it("allows a relative site path", () => {
    expect(isAllowedHref("/properties/cozy-1-bedroom/book")).toBe(true);
  });

  it("allows haveninlipa.com and www.haveninlipa.com", () => {
    expect(isAllowedHref("https://haveninlipa.com/properties")).toBe(true);
    expect(isAllowedHref("https://www.haveninlipa.com/contact")).toBe(true);
  });

  it("allows the Messenger handoff link", () => {
    expect(isAllowedHref("https://m.me/haveninlipa")).toBe(true);
    expect(isAllowedHref("m.me/haveninlipa")).toBe(true);
  });

  it("rejects an unrelated external domain", () => {
    expect(isAllowedHref("https://airbnb.com/rooms/123")).toBe(false);
  });

  it("rejects a malformed URL", () => {
    expect(isAllowedHref("not a url at all :: ??")).toBe(false);
  });
});

describe("normalizeHref", () => {
  it("rewrites a scheme-less m.me link to the https form", () => {
    expect(normalizeHref("m.me/haveninlipa")).toBe(MESSENGER_HREF);
  });

  it("leaves the https m.me link unchanged", () => {
    expect(normalizeHref(MESSENGER_HREF)).toBe(MESSENGER_HREF);
  });

  it("leaves an unrelated href unchanged", () => {
    expect(normalizeHref("/properties/cozy-1-bedroom/book")).toBe("/properties/cozy-1-bedroom/book");
  });
});

describe("extractAllowedLinks", () => {
  it("keeps an allowed markdown link as a button and leaves the label in the text", () => {
    const { reply, links } = extractAllowedLinks("Book here: [Book Now](/properties/cozy-1-bedroom/book).");
    expect(reply).toBe("Book here: Book Now.");
    expect(links).toEqual([{ label: "Book Now", href: "/properties/cozy-1-bedroom/book" }]);
  });

  it("strips a disallowed link down to plain label text and returns no button for it", () => {
    const { reply, links } = extractAllowedLinks("Check [this out](https://airbnb.com/rooms/123) instead.");
    expect(reply).toBe("Check this out instead.");
    expect(links).toEqual([]);
  });

  it("normalizes a scheme-less m.me markdown link to the https form", () => {
    const { links } = extractAllowedLinks("[Message us](m.me/haveninlipa) any time.");
    expect(links).toEqual([{ label: "Message us", href: MESSENGER_HREF }]);
  });
});

describe("dedupeLinks", () => {
  it("drops a later link with the same href, keeping the first label", () => {
    const links = dedupeLinks([
      { label: "Book Now", href: "/properties/a/book" },
      { label: "Book This", href: "/properties/a/book" },
      { label: "Contact", href: "/contact" },
    ]);
    expect(links).toEqual([
      { label: "Book Now", href: "/properties/a/book" },
      { label: "Contact", href: "/contact" },
    ]);
  });
});

describe("collectToolAmounts", () => {
  it("walks nested tool-result objects and arrays for amounts", () => {
    const amounts = collectToolAmounts([{ options: [{ properties: [{ quote: { total: 12000 } }] }] }]);
    expect(amounts.has(12000)).toBe(true);
  });
});

describe("enforcePriceClaims — whole sentence/bullet-line replacement", () => {
  it("keeps a sentence whose peso amount matches a number returned by a tool this turn", () => {
    const amounts = collectToolAmounts([{ total: 4500, nights: 3 }]);
    expect(enforcePriceClaims("Your total is ₱4,500 for 3 nights.", amounts)).toBe(
      "Your total is ₱4,500 for 3 nights."
    );
  });

  it("replaces the WHOLE sentence containing an unverified total, not just the number", () => {
    const amounts = collectToolAmounts([{ total: 4500 }]);
    expect(enforcePriceClaims("That'll be PHP 9999 total.", amounts)).toBe(FALLBACK_TOTAL_TEXT);
  });

  it("replaces the whole sentence even when it also contains an allowed amount alongside the unverified one", () => {
    const amounts = collectToolAmounts([{ total: 4500 }]);
    const result = enforcePriceClaims("₱4,500 now, or ₱99,999 if you add extra nights.", amounts);
    expect(result).toBe(FALLBACK_TOTAL_TEXT);
  });

  it("never leaves a dangling fragment like a trailing unit behind (the /hour regression)", () => {
    const amounts = collectToolAmounts([{ earlyCheckInPerHour: 200 }]);
    const result = enforcePriceClaims("Early check-in runs about ₱9999/hour if we can swing it.", amounts);
    expect(result).toBe(FALLBACK_HOURLY_FEE_TEXT);
    expect(result).not.toContain("9999");
  });

  it("states the real ₱200/hour fact (not the generic Messenger fallback) for an unverified early check-in/late checkout rate", () => {
    const amounts = new Set<number>();
    expect(enforcePriceClaims("Late checkout is ₱500/hour.", amounts)).toBe(FALLBACK_HOURLY_FEE_TEXT);
    expect(enforcePriceClaims("There's an extra fee of ₱500 for late checkout.", amounts)).toBe(FALLBACK_HOURLY_FEE_TEXT);
  });

  it("uses the generic fee-handoff fallback for an unverified rate unrelated to early check-in/late checkout", () => {
    const amounts = new Set<number>();
    expect(enforcePriceClaims("There's an extra fee of ₱500 per guest.", amounts)).toBe(FALLBACK_FEE_TEXT);
  });

  it("uses the checkout fallback for an unverified stay total with no fee language", () => {
    const amounts = new Set<number>();
    expect(enforcePriceClaims("Your total comes to ₱12,000.", amounts)).toBe(FALLBACK_TOTAL_TEXT);
  });

  it("replaces only the offending bullet line, leaving other lines intact", () => {
    const amounts = collectToolAmounts([{ total: 4500 }]);
    const text = ["Here's the breakdown:", "- Nightly total: ₱4,500", "- Early check-in fee: ₱9999/hour", "Let us know!"].join(
      "\n"
    );
    const result = enforcePriceClaims(text, amounts);
    expect(result).toBe(
      ["Here's the breakdown:", "- Nightly total: ₱4,500", `- ${FALLBACK_HOURLY_FEE_TEXT}`, "Let us know!"].join("\n")
    );
  });

  it("does not split a peso amount with centavos at its decimal point", () => {
    const amounts = new Set([4500.75]);
    expect(enforcePriceClaims("Your total is ₱4,500.75 today.", amounts)).toBe("Your total is ₱4,500.75 today.");
  });

  it("catches a hallucinated centavo amount that doesn't match the real figure", () => {
    const amounts = new Set([4500]);
    expect(enforcePriceClaims("Your total is ₱4,500.75 today.", amounts)).toBe(FALLBACK_TOTAL_TEXT);
  });

  it("leaves sentences with no peso amount untouched", () => {
    const amounts = new Set<number>();
    expect(enforcePriceClaims("We hope you enjoy your stay with us!", amounts)).toBe(
      "We hope you enjoy your stay with us!"
    );
  });

  it("recognizes P200/PHP 200/200 pesos as the same allowed amount as ₱200 (owner fact, any format)", () => {
    const amounts = new Set([200]);
    expect(enforcePriceClaims("Early check-in is P200/hour, subject to availability.", amounts)).toBe(
      "Early check-in is P200/hour, subject to availability."
    );
    expect(enforcePriceClaims("Late checkout runs PHP 200/hour, subject to confirmation.", amounts)).toBe(
      "Late checkout runs PHP 200/hour, subject to confirmation."
    );
    expect(enforcePriceClaims("Early check-in is 200 pesos/hour, subject to availability.", amounts)).toBe(
      "Early check-in is 200 pesos/hour, subject to availability."
    );
  });

  it("flags a disallowed amount written as 'P' or 'pesos' the same as a ₱-prefixed one", () => {
    const amounts = new Set<number>();
    expect(enforcePriceClaims("That'll be P9999 total.", amounts)).toBe(FALLBACK_TOTAL_TEXT);
    expect(enforcePriceClaims("That'll be 9999 pesos total.", amounts)).toBe(FALLBACK_TOTAL_TEXT);
  });

  it("rejects '₱2,800 × 2 = ₱5,600' style arithmetic even when every number involved happens to be allowed", () => {
    const amounts = new Set([2800, 2, 5600]);
    const result = enforcePriceClaims("The total is ₱2,800 × 2 = ₱5,600 for two nights.", amounts);
    expect(result).toBe(FALLBACK_TOTAL_TEXT);
    expect(result).not.toContain("5,600");
  });

  it("rejects the same arithmetic written with a lowercase 'x'", () => {
    const amounts = new Set<number>();
    expect(enforcePriceClaims("That's ₱2,800 x 2 for the stay.", amounts)).toBe(FALLBACK_TOTAL_TEXT);
  });

  it("still allows a tool-provided per-night breakdown with no arithmetic operator", () => {
    const amounts = collectToolAmounts([{ perNight: [{ rate: 2800 }, { rate: 3500 }], total: 6300 }]);
    const text = "Thursday: ₱2,800, Friday: ₱3,500. Total: ₱6,300.";
    expect(enforcePriceClaims(text, amounts)).toBe(text);
  });
});

describe("collectBasePrices", () => {
  it("collects a pricePerNight value from a list_properties-shaped result", () => {
    const amounts = collectBasePrices([[{ slug: "mickey-full", name: "Mickey in Lipa", pricePerNight: 6500 }]]);
    expect(amounts.has(6500)).toBe(true);
  });

  it("ignores a same-valued number under a different key", () => {
    const amounts = collectBasePrices([{ total: 6500 }]);
    expect(amounts.has(6500)).toBe(false);
  });
});

describe("collectDatedQuoteAmounts", () => {
  it("collects a get_quote total/nightlyTotal but not a sibling pricePerNight", () => {
    const amounts = collectDatedQuoteAmounts([{ pricePerNight: 6500, total: 13000, nightlyTotal: 13000 }]);
    expect(amounts.has(13000)).toBe(true);
    expect(amounts.has(6500)).toBe(false);
  });

  it("collects a perNight rate nested in a quote result", () => {
    const amounts = collectDatedQuoteAmounts([{ perNight: [{ date: "2026-12-24", rate: 6500 }] }]);
    expect(amounts.has(6500)).toBe(true);
  });
});

describe("ensureFromPrefix — owner guardrail: base rates always read 'from ₱X' (Cedric, 2026-10-15)", () => {
  it('prefixes a bare base rate with "from " in English', () => {
    const basePrices = new Set([6500]);
    const result = ensureFromPrefix("Mickey in Lipa — ₱6,500/night", basePrices, new Set(), true);
    expect(result).toBe("Mickey in Lipa — from ₱6,500/night");
  });

  it('prefixes a bare base rate with "simula " outside English mode', () => {
    const basePrices = new Set([6500]);
    const result = ensureFromPrefix("Mickey in Lipa — ₱6,500/gabi", basePrices, new Set(), false);
    expect(result).toBe("Mickey in Lipa — simula ₱6,500/gabi");
  });

  it("does not double up when the model already wrote \"from\"/\"simula\"", () => {
    const basePrices = new Set([6500]);
    expect(ensureFromPrefix("From ₱6,500/night.", basePrices, new Set(), true)).toBe("From ₱6,500/night.");
    expect(ensureFromPrefix("Simula ₱6,500 kada gabi.", basePrices, new Set(), false)).toBe("Simula ₱6,500 kada gabi.");
  });

  it("leaves a dated quote line untouched even when its total equals a base rate", () => {
    const basePrices = new Set([6500]);
    const datedAmounts = new Set([6500]);
    const result = ensureFromPrefix("Your total for that one night is ₱6,500.", basePrices, datedAmounts, true);
    expect(result).toBe("Your total for that one night is ₱6,500.");
  });

  it("leaves text untouched when there are no base prices to check against", () => {
    const text = "Your total is ₱6,500.";
    expect(ensureFromPrefix(text, new Set(), new Set(), true)).toBe(text);
  });

  it("is a no-op when the amount in the text doesn't match any base price", () => {
    const basePrices = new Set([6500]);
    const text = "That fee is ₱200/hour.";
    expect(ensureFromPrefix(text, basePrices, new Set(), true)).toBe(text);
  });
});

describe("needsAmenityHandoff", () => {
  it("is true when find_amenity found nothing anywhere", () => {
    const exchanges: ToolExchange[] = [
      { name: "find_amenity", input: { term: "karaoke" }, result: { found: false, properties: [] } },
    ];
    expect(needsAmenityHandoff(exchanges)).toBe(true);
  });

  it("is false when find_amenity found a match", () => {
    const exchanges: ToolExchange[] = [
      { name: "find_amenity", input: { term: "pool" }, result: { found: true, properties: [{ slug: "a", name: "A" }] } },
    ];
    expect(needsAmenityHandoff(exchanges)).toBe(false);
  });

  it("is false when find_amenity was never called", () => {
    expect(needsAmenityHandoff([{ name: "get_faq", input: { query: "wifi" }, result: { results: [] } }])).toBe(false);
  });
});

describe("collectBookingLinks", () => {
  it("builds a labeled booking-link button from a get_quote result, deduped and allowlisted", () => {
    const exchanges: ToolExchange[] = [
      {
        name: "get_quote",
        input: { slug: "cozy-1-bedroom", checkIn: "2026-11-14", checkOut: "2026-11-16", guests: 3 },
        result: { name: "Cozy 1BR Haven", total: 7500, bookingLink: "/properties/cozy-1-bedroom/book?checkIn=2026-11-14&checkOut=2026-11-16&guests=3" },
      },
    ];
    const links = collectBookingLinks(exchanges);
    expect(links).toEqual([
      {
        label: "Book Cozy 1BR Haven · 11/14–11/16",
        href: "/properties/cozy-1-bedroom/book?checkIn=2026-11-14&checkOut=2026-11-16&guests=3",
      },
    ]);
  });

  it("labels one button per property in a find_stay combo with its option number and guest count", () => {
    const exchanges: ToolExchange[] = [
      {
        name: "find_stay",
        input: { checkIn: "2026-11-14", checkOut: "2026-11-16", guests: 12 },
        result: {
          options: [
            {
              properties: [
                { slug: "cozy-1-bedroom", name: "Cozy 1BR", guests: 5, bookingLink: "/properties/cozy-1-bedroom/book?checkIn=2026-11-14&checkOut=2026-11-16&guests=5" },
                { slug: "spacious-2-bedroom", name: "Spacious 2BR", guests: 7, bookingLink: "/properties/spacious-2-bedroom/book?checkIn=2026-11-14&checkOut=2026-11-16&guests=7" },
              ],
            },
          ],
        },
      },
    ];
    const links = collectBookingLinks(exchanges);
    expect(links).toEqual([
      { label: "Option 1: Cozy 1BR (5 guests)", href: "/properties/cozy-1-bedroom/book?checkIn=2026-11-14&checkOut=2026-11-16&guests=5" },
      { label: "Option 1: Spacious 2BR (7 guests)", href: "/properties/spacious-2-bedroom/book?checkIn=2026-11-14&checkOut=2026-11-16&guests=7" },
    ]);
  });

  it("numbers each find_stay option in the same order the options array lists them", () => {
    const exchanges: ToolExchange[] = [
      {
        name: "find_stay",
        input: { checkIn: "2026-11-14", checkOut: "2026-11-16", guests: 15 },
        result: {
          options: [
            { properties: [{ slug: "mickey-full", name: "Mickey Full Family House", guests: 15, bookingLink: "/properties/mickey-full/book?g=15" }] },
            {
              properties: [
                { slug: "cozy-1-bedroom", name: "Cozy 1BR", guests: 8, bookingLink: "/properties/cozy-1-bedroom/book?g=8" },
                { slug: "spacious-2-bedroom", name: "Spacious 2BR", guests: 7, bookingLink: "/properties/spacious-2-bedroom/book?g=7" },
              ],
            },
          ],
        },
      },
    ];
    const links = collectBookingLinks(exchanges);
    expect(links.map((l) => l.label)).toEqual([
      "Option 1: Mickey Full Family House (15 guests)",
      "Option 2: Cozy 1BR (8 guests)",
      "Option 2: Spacious 2BR (7 guests)",
    ]);
  });

  it("strips a leading bracket tag and cuts at the first ' | ' or '•' in a link label", () => {
    const exchanges: ToolExchange[] = [
      {
        name: "get_quote",
        input: { slug: "cozy-1-bedroom", checkIn: "2026-11-14", checkOut: "2026-11-16", guests: 3 },
        result: {
          name: "[DEVDB] Cozy 1BR Haven | Solar Power•Netflix•Wi-Fi•5 Pax",
          bookingLink: "/properties/cozy-1-bedroom/book?checkIn=2026-11-14&checkOut=2026-11-16&guests=3",
        },
      },
    ];
    const links = collectBookingLinks(exchanges);
    expect(links[0].label).toBe("Book Cozy 1BR Haven · 11/14–11/16");
  });

  it("keeps the distinguishing second segment for properties sharing a base name", () => {
    const exchanges: ToolExchange[] = [
      {
        name: "find_stay",
        input: { checkIn: "2026-11-14", checkOut: "2026-11-16", guests: 15 },
        result: {
          options: [
            {
              properties: [
                { slug: "mickey-full", name: "Mickey in Lipa | Full Family House", guests: 11, bookingLink: "/properties/mickey-full/book?g=11" },
                { slug: "mickey-room-only", name: "Mickey in Lipa | Room Only", guests: 4, bookingLink: "/properties/mickey-room-only/book?g=4" },
              ],
            },
          ],
        },
      },
    ];
    const links = collectBookingLinks(exchanges);
    expect(links.map((l) => l.label)).toEqual([
      "Option 1: Mickey in Lipa — Full Family House (11 guests)",
      "Option 1: Mickey in Lipa — Room Only (4 guests)",
    ]);
  });

  it("drops a booking link that somehow isn't an allowed href", () => {
    const exchanges: ToolExchange[] = [
      {
        name: "get_quote",
        input: { slug: "cozy-1-bedroom", checkIn: "2026-11-14", checkOut: "2026-11-16" },
        result: { name: "Cozy 1BR", bookingLink: "https://evil.example/book" },
      },
    ];
    expect(collectBookingLinks(exchanges)).toEqual([]);
  });

  it("de-dupes the same property+guests link WITHIN one option, but keeps it once per option across options", () => {
    const sameLink = { slug: "spacious-2-bedroom", name: "Spacious 2BR", guests: 9, bookingLink: "/properties/spacious-2-bedroom/book?g=9" };
    const exchanges: ToolExchange[] = [
      {
        name: "find_stay",
        input: { checkIn: "2026-11-14", checkOut: "2026-11-16", guests: 9 },
        result: { options: [{ properties: [sameLink, sameLink] }, { properties: [sameLink] }] },
      },
    ];
    const links = collectBookingLinks(exchanges);
    // Option 1 repeats the link within itself (deduped to one); Option 2 repeats the same
    // property+guests link under a different option (e.g. a different combo) and is kept.
    expect(links.map((l) => l.label)).toEqual([
      "Option 1: Spacious 2BR (9 guests)",
      "Option 2: Spacious 2BR (9 guests)",
    ]);
  });

  it("caps the total number of booking links at 8, in reply order", () => {
    const properties = Array.from({ length: 10 }, (_, i) => ({
      slug: `p${i}`,
      name: `Property ${i}`,
      guests: 1,
      bookingLink: `/properties/p${i}/book?checkIn=2026-11-14&checkOut=2026-11-16&guests=1`,
    }));
    const exchanges: ToolExchange[] = [
      {
        name: "find_stay",
        input: { checkIn: "2026-11-14", checkOut: "2026-11-16", guests: 1 },
        result: { options: [{ properties }] },
      },
    ];
    const links = collectBookingLinks(exchanges);
    expect(links).toHaveLength(8);
    expect(links[0].label).toContain("Property 0");
    expect(links[7].label).toContain("Property 7");
  });

  it("drops the 'Option N:' prefix when the reply offers a single property with no combos", () => {
    const exchanges: ToolExchange[] = [
      {
        name: "find_stay",
        input: { checkIn: "2026-11-14", checkOut: "2026-11-16", guests: 12 },
        result: {
          options: [
            { properties: [{ slug: "mickey-full", name: "Mickey in Lipa", guests: 12, bookingLink: "/properties/mickey-full/book?g=12" }] },
          ],
        },
      },
    ];
    const links = collectBookingLinks(exchanges);
    expect(links).toEqual([{ label: "Book Mickey in Lipa (12 guests)", href: "/properties/mickey-full/book?g=12" }]);
  });

  it("keeps the 'Option N:' prefix when there are multiple single-property options to choose between", () => {
    const exchanges: ToolExchange[] = [
      {
        name: "find_stay",
        input: { checkIn: "2026-11-14", checkOut: "2026-11-16", guests: 2 },
        result: {
          options: [
            { properties: [{ slug: "cozy-1-bedroom", name: "Cozy 1BR", guests: 2, bookingLink: "/properties/cozy-1-bedroom/book?g=2" }] },
            { properties: [{ slug: "spacious-2-bedroom", name: "Spacious 2BR", guests: 2, bookingLink: "/properties/spacious-2-bedroom/book?g=2" }] },
          ],
        },
      },
    ];
    const links = collectBookingLinks(exchanges);
    expect(links.map((l) => l.label)).toEqual([
      "Option 1: Cozy 1BR (2 guests)",
      "Option 2: Spacious 2BR (2 guests)",
    ]);
  });

  it("ignores tools that don't return booking links", () => {
    const exchanges: ToolExchange[] = [
      { name: "get_faq", input: { query: "wifi" }, result: { results: [] } },
      { name: "check_availability", input: {}, result: { available: true, conflicts: [] } },
    ];
    expect(collectBookingLinks(exchanges)).toEqual([]);
  });
});

describe("ensureHandoffLink", () => {
  it("adds a Messenger button with the https href when the reply mentions m.me/haveninlipa as plain text", () => {
    const text = "Let me get you to a real person for this one — message us at m.me/haveninlipa, or use the contact page.";
    const links = ensureHandoffLink(text, []);
    expect(links).toEqual([{ label: "Message us on Messenger", href: MESSENGER_HREF }]);
  });

  it("recognizes the https form too and doesn't duplicate the button if one is already present", () => {
    const text = `Message us at ${MESSENGER_HREF}.`;
    const existing = [{ label: "Message us on Messenger", href: MESSENGER_HREF }];
    expect(ensureHandoffLink(text, existing)).toEqual(existing);
  });

  it("leaves links untouched when the reply never mentions Messenger", () => {
    const links = [{ label: "Book Now", href: "/properties/a/book" }];
    expect(ensureHandoffLink("Your stay is all set!", links)).toBe(links);
  });
});

describe("limitToOneProvisional", () => {
  it("keeps only the first occurrence of the word 'provisional' in a reply", () => {
    const input = "This total is provisional. Everything here is provisional, truly provisional.";
    expect(limitToOneProvisional(input)).toBe("This total is provisional. Everything here is, truly.");
  });

  it("leaves a reply with a single 'provisional' unchanged", () => {
    const input = "This total is provisional until checkout.";
    expect(limitToOneProvisional(input)).toBe(input);
  });

  it("leaves a reply with no 'provisional' unchanged", () => {
    const input = "Your stay is all set!";
    expect(limitToOneProvisional(input)).toBe(input);
  });

  it("removes a repeated **provisional** along with its bold markers, not just the word", () => {
    const input = "This total is provisional. **Option 2** — **provisional** total ₱10,525.";
    expect(limitToOneProvisional(input)).toBe("This total is provisional. **Option 2** — total ₱10,525.");
  });

  it("cleans up the exact reported regression (empty bold markers left behind)", () => {
    // Reproduces the field report: a second *provisional* wrapped in its own bold run.
    const input = "**Option 1** is provisional. **Option 2** — **provisional** total ₱10,525";
    const result = limitToOneProvisional(input);
    expect(result).toBe("**Option 1** is provisional. **Option 2** — total ₱10,525");
    expect(result).not.toContain("** total");
    expect(result).not.toMatch(/\*\*\s*\*\*/);
  });

  it("removes a repeated *provisional* wrapped in single-asterisk emphasis", () => {
    const input = "The total is provisional. *provisional* pricing applies until checkout.";
    expect(limitToOneProvisional(input)).toBe("The total is provisional. pricing applies until checkout.");
  });

  it("removes a repeated _provisional_ wrapped in underscore emphasis", () => {
    const input = "The total is provisional. _provisional_ until checkout.";
    expect(limitToOneProvisional(input)).toBe("The total is provisional. until checkout.");
  });

  it("cleans up a stray '( ' left behind by a removed word (the field-reported artifact)", () => {
    const input = "**Option 2** ( total: ₱10,525)";
    expect(limitToOneProvisional(input)).toBe("**Option 2** (total: ₱10,525)");
  });

  it("removes a fully empty '()' left behind by a removed parenthetical", () => {
    const input = "This total is provisional. **Option 2** total ₱10,525 (provisional)";
    expect(limitToOneProvisional(input)).toBe("This total is provisional. **Option 2** total ₱10,525");
  });

  it("removes a fully empty '( )' left behind by a removed parenthetical", () => {
    const input = "This total is provisional. **Option 2** total ₱10,525 ( provisional )";
    expect(limitToOneProvisional(input)).toBe("This total is provisional. **Option 2** total ₱10,525");
  });

  it("strips a stray leading separator left inside parens by a removed word", () => {
    const input = "This total is provisional. **Option 2** (, total: ₱10,525)";
    expect(limitToOneProvisional(input)).toBe("This total is provisional. **Option 2** (total: ₱10,525)");
  });

  it("collapses a double space left behind by a removal", () => {
    const input = "This  is  fine.";
    expect(limitToOneProvisional(input)).toBe("This is fine.");
  });
});

describe("ensureBatanguenoMarker", () => {
  it("leaves a reply with a natural marker unchanged", () => {
    const input = "Ay ga, meron pa kaming bakante sa petsang 'yan!";
    expect(ensureBatanguenoMarker(input)).toBe(input);
  });

  it("recognizes each documented marker, including ire and baga", () => {
    for (const marker of ["ala eh", "aba'y", "ga", "nga", "ari", "are", "ire", "baga"]) {
      expect(ensureBatanguenoMarker(`Teka lang, ${marker} titingnan ko.`)).toBe(`Teka lang, ${marker} titingnan ko.`);
    }
  });

  it("prepends a natural opener when the reply has no marker at all", () => {
    const input = "Meron pa kaming bakante sa petsang iyan para sa inyo.";
    expect(ensureBatanguenoMarker(input)).toBe(`Ala eh, ${input}`);
  });

  it("does not count a misused 'Oo ga' as a bare affirmation as a genuine marker", () => {
    const input = "Oo ga, may bakante kami sa petsang 'yan.";
    expect(ensureBatanguenoMarker(input)).toBe(`Ala eh, ${input}`);
  });

  it("does not count a misused 'Oo baga' as a bare affirmation as a genuine marker", () => {
    const input = "Oo baga, may bakante kami sa petsang 'yan.";
    expect(ensureBatanguenoMarker(input)).toBe(`Ala eh, ${input}`);
  });

  it("still counts 'ga' as a marker when used correctly as a question particle elsewhere in the same reply", () => {
    const input = "Oo ga, may bakante kami — ilan ga kayo talaga?";
    expect(ensureBatanguenoMarker(input)).toBe(input);
  });

  it("counts 'baga' used correctly as a question particle", () => {
    const input = "Totoo baga, meron pa kaming bakante?";
    expect(ensureBatanguenoMarker(input)).toBe(input);
  });
});

describe("stripBatanguenoFromTagalog", () => {
  it("converts a question-particle 'ga' to 'ba' in tl mode", () => {
    expect(stripBatanguenoFromTagalog("Ilan ga kayo talaga?", "tl", false)).toBe("Ilan ba kayo talaga?");
  });

  it("converts 'baga' to 'ba' in tl mode", () => {
    expect(stripBatanguenoFromTagalog("Totoo baga, meron pa kaming bakante?", "tl", false)).toBe(
      "Totoo ba, meron pa kaming bakante?"
    );
  });

  it("converts 'ari'/'ire' used as 'this/here' to 'ito' in tl mode", () => {
    expect(stripBatanguenoFromTagalog("Ari ang bahay na bagay sa inyo.", "tl", false)).toBe("Ito ang bahay na bagay sa inyo.");
    expect(stripBatanguenoFromTagalog("Ire ang link.", "tl", false)).toBe("Ito ang link.");
  });

  it("does not touch a misused 'Oo ga' bare affirmation (same carve-out as btg mode)", () => {
    const input = "Oo ga, may bakante kami.";
    expect(stripBatanguenoFromTagalog(input, "tl", false)).toBe(input);
  });

  it("leaves btg mode untouched", () => {
    const input = "Ay ga, ilan ga kayo talaga?";
    expect(stripBatanguenoFromTagalog(input, "btg", false)).toBe(input);
  });

  it("leaves explicit English mode untouched", () => {
    const input = "Ga is not an English word anyway.";
    expect(stripBatanguenoFromTagalog(input, "en", false)).toBe(input);
  });

  it("applies in auto mode when the turn isn't in English", () => {
    expect(stripBatanguenoFromTagalog("Ilan ga kayo?", "auto", false)).toBe("Ilan ba kayo?");
  });

  it("does not apply in auto mode when the turn is in English", () => {
    const input = "Ga is fine here, it's English mode.";
    expect(stripBatanguenoFromTagalog(input, "auto", true)).toBe(input);
  });

  it("leaves a reply with no Batangueño particle untouched", () => {
    const input = "Ilan tao kayo?";
    expect(stripBatanguenoFromTagalog(input, "tl", false)).toBe(input);
  });
});

describe("enforceTermsOfAddress", () => {
  it("replaces a banned term in English mode with 'friend' when the guest never used it", () => {
    const result = enforceTermsOfAddress("Sure thing, bro — I'll sort that out.", "Hi, got a 2BR free?", "en");
    expect(result).toBe("Sure thing, friend — I'll sort that out.");
  });

  it("replaces a banned term in non-English mode with 'kaibigan' when the guest never used it", () => {
    const result = enforceTermsOfAddress("Sige lang, pare, tingnan ko.", "May bakante ba kayo?", "tl");
    expect(result).toBe("Sige lang, kaibigan, tingnan ko.");
  });

  it("keeps a banned term the guest used first, earlier in the conversation", () => {
    const result = enforceTermsOfAddress("Sure thing, bro!", "hey bro, got a 2BR free?", "en");
    expect(result).toBe("Sure thing, bro!");
  });

  it("preserves capitalization when substituting at the start of a sentence", () => {
    const result = enforceTermsOfAddress("Bro, that's all set.", "May bakante ba?", "en");
    expect(result).toBe("Friend, that's all set.");
  });

  it("replaces every banned term independently, each checked against the guest's own usage", () => {
    const result = enforceTermsOfAddress("Hey partner, hey dude, hey sis!", "hey dude!", "en");
    expect(result).toBe("Hey friend, hey dude, hey friend!");
  });

  it("leaves text with no banned term untouched", () => {
    const result = enforceTermsOfAddress("Hello kabayan, how can I help?", "Hi there", "en");
    expect(result).toBe("Hello kabayan, how can I help?");
  });
});

describe("shortenPropertyNamesInText", () => {
  it("shortens a raw list_properties name with a bracket tag and '|' suffix in reply prose", () => {
    const exchanges: ToolExchange[] = [
      {
        name: "list_properties",
        input: {},
        result: [{ slug: "cozy-1-bedroom", name: "[DEVDB] Cozy 1BR Haven | Solar Power•Netflix•Wi-Fi•5 Pax" }],
      },
    ];
    const text = "We have [DEVDB] Cozy 1BR Haven | Solar Power•Netflix•Wi-Fi•5 Pax available!";
    expect(shortenPropertyNamesInText(text, exchanges)).toBe("We have Cozy 1BR Haven available!");
  });

  it("shortens a get_property_details name in reply prose", () => {
    const exchanges: ToolExchange[] = [
      { name: "get_property_details", input: { slug: "cozy-1-bedroom" }, result: { slug: "cozy-1-bedroom", name: "Cozy 1BR Haven | 5 Pax" } },
    ];
    expect(shortenPropertyNamesInText("Cozy 1BR Haven | 5 Pax has WiFi.", exchanges)).toBe("Cozy 1BR Haven has WiFi.");
  });

  it("keeps the distinguishing second segment when two properties share a base name", () => {
    const exchanges: ToolExchange[] = [
      {
        name: "find_stay",
        input: { checkIn: "2026-11-14", checkOut: "2026-11-16", guests: 15 },
        result: {
          options: [
            {
              properties: [
                { slug: "mickey-full", name: "Mickey in Lipa | Full Family House", bookingLink: "/x" },
                { slug: "mickey-room-only", name: "Mickey in Lipa | Room Only", bookingLink: "/y" },
              ],
            },
          ],
        },
      },
    ];
    const text = "Both Mickey in Lipa | Full Family House and Mickey in Lipa | Room Only are free.";
    expect(shortenPropertyNamesInText(text, exchanges)).toBe(
      "Both Mickey in Lipa — Full Family House and Mickey in Lipa — Room Only are free."
    );
  });

  it("leaves text unchanged when no tool result mentions a property name", () => {
    expect(shortenPropertyNamesInText("Hello there!", [])).toBe("Hello there!");
  });

  it("leaves text unchanged when the raw name already matches the short form", () => {
    const exchanges: ToolExchange[] = [{ name: "get_property_details", input: {}, result: { slug: "cozy-1-bedroom", name: "Cozy 1BR" } }];
    expect(shortenPropertyNamesInText("Cozy 1BR is available.", exchanges)).toBe("Cozy 1BR is available.");
  });

  it("prefers a tool-provided shortName over the turn-scoped computed one (DEC-029, 2026-10-15)", () => {
    // Only ONE Mickey configuration appears in this turn's exchange — the turn-scoped
    // computation alone can't tell it apart from its siblings, but get_property_details'
    // own `shortName` (computed in tools.ts against the FULL listing set) already can.
    const exchanges: ToolExchange[] = [
      {
        name: "get_property_details",
        input: { slug: "mickey-in-lipa--full-family-house--sleeps-15" },
        result: {
          slug: "mickey-in-lipa--full-family-house--sleeps-15",
          name: "Mickey in Lipa | Full Family House",
          shortName: "Mickey in Lipa — Full Family House",
        },
      },
    ];
    const text = "Mickey in Lipa | Full Family House — from ₱6,500/night";
    expect(shortenPropertyNamesInText(text, exchanges)).toBe("Mickey in Lipa — Full Family House — from ₱6,500/night");
  });
});

describe("fixDadalawPhrasing", () => {
  it("replaces an 'ilang guests ang dadalaw' question in Tagalog mode", () => {
    expect(fixDadalawPhrasing("Sige, ilang guests ang dadalaw sa inyo?", "tl")).toBe("Sige, Ilang guests kayo?");
  });

  it("replaces it with the Batangueño form in btg mode", () => {
    expect(fixDadalawPhrasing("Ilang tao ang dadalaw?", "btg")).toBe("Ilan ga kayo?");
  });

  it("leaves text with no 'dadalaw' phrasing untouched", () => {
    const input = "Ilang guests kayo?";
    expect(fixDadalawPhrasing(input, "tl")).toBe(input);
  });
});

describe("isEnglishContext", () => {
  it("is always true for explicit lang 'en'", () => {
    expect(isEnglishContext("en", "may bakante ba kayo")).toBe(true);
  });

  it("is always false for explicit lang 'tl'/'btg'", () => {
    expect(isEnglishContext("tl", "Do you have WiFi?")).toBe(false);
    expect(isEnglishContext("btg", "Do you have WiFi?")).toBe(false);
  });

  it("is true for 'auto' when the guest's message has no Tagalog marker word", () => {
    expect(isEnglishContext("auto", "Do you have WiFi and parking?")).toBe(true);
  });

  it("is false for 'auto' when the guest's message carries a Tagalog marker word", () => {
    expect(isEnglishContext("auto", "May WiFi po ba kayo?")).toBe(false);
  });
});

describe("stripTagalogWordsInEnglish", () => {
  it("replaces 'grupo' with 'group'", () => {
    expect(stripTagalogWordsInEnglish("Your grupo of 10 is welcome.")).toBe("Your group of 10 is welcome.");
  });

  it("drops a trailing 'po' and tidies the spacing", () => {
    expect(stripTagalogWordsInEnglish("Sure thing po, we have availability.")).toBe("Sure thing, we have availability.");
  });

  it("replaces 'kabayan' with 'friend', preserving capitalization", () => {
    expect(stripTagalogWordsInEnglish("Kabayan, we have a 2BR free.")).toBe("Friend, we have a 2BR free.");
  });

  it("leaves an all-English reply untouched", () => {
    const input = "We have a 2BR available for those dates.";
    expect(stripTagalogWordsInEnglish(input)).toBe(input);
  });
});

describe("firstResolvedDateRange", () => {
  it("reads checkIn/checkOut from a resolve_dates tool result", () => {
    const exchanges: ToolExchange[] = [
      { name: "resolve_dates", input: { expression: "next Friday" }, result: { checkIn: "2026-11-14", checkOut: "2026-11-15", interpreted: "x" } },
    ];
    expect(firstResolvedDateRange(exchanges)).toEqual({ checkIn: "2026-11-14", checkOut: "2026-11-15" });
  });

  it("falls back to a later tool's input checkIn/checkOut when no result carries dates", () => {
    const exchanges: ToolExchange[] = [
      { name: "list_properties", input: {}, result: [] },
      { name: "get_quote", input: { slug: "a", checkIn: "2026-12-24", checkOut: "2026-12-26", guests: 2 }, result: {} },
    ];
    expect(firstResolvedDateRange(exchanges)).toEqual({ checkIn: "2026-12-24", checkOut: "2026-12-26" });
  });

  it("returns null when no exchange carries a date range", () => {
    expect(firstResolvedDateRange([{ name: "get_faq", input: { query: "wifi" }, result: { results: [] } }])).toBeNull();
  });
});

describe("formatDateRangeArrow", () => {
  it("formats an arrow-separated range with the year on the end date only", () => {
    expect(formatDateRangeArrow("2026-11-14", "2026-11-15")).toBe("Saturday, November 14 → Sunday, November 15, 2026");
  });
});

describe("ensureDatesStated", () => {
  const resolved = { checkIn: "2026-11-14", checkOut: "2026-11-15" };

  it("prepends the resolved date range when English and the reply doesn't state it", () => {
    const result = ensureDatesStated("We have availability for that stay.", resolved, true);
    expect(result).toBe("For Saturday, November 14 → Sunday, November 15, 2026:\n\nWe have availability for that stay.");
  });

  it("leaves the reply untouched when it already states the check-in month/day", () => {
    const input = "For November 14, we have availability.";
    expect(ensureDatesStated(input, resolved, true)).toBe(input);
  });

  it("leaves the reply untouched when not in English context", () => {
    const input = "May bakante kami sa petsang iyan.";
    expect(ensureDatesStated(input, resolved, false)).toBe(input);
  });

  it("leaves the reply untouched when no dates were resolved this turn", () => {
    const input = "We have availability for that stay.";
    expect(ensureDatesStated(input, null, true)).toBe(input);
  });
});

describe("fixStayRangeEndDate (DEC-029: end date must be check-out, never the last night)", () => {
  // Thu check-in, Sat check-out, 2 nights — the exact live-bug stay.
  const resolved = { checkIn: "2026-11-19", checkOut: "2026-11-21" };
  const stayLabel = buildStayLabel(resolved.checkIn, resolved.checkOut)!;

  it("fixes the exact bad Batangueño/mixed string from the live bug", () => {
    const input =
      "Ala eh, ganito po: Thursday, November 19 hanggang Friday, November 20, 2026 (2 nights) — gusto n'yo na ga i-book?";
    const result = fixStayRangeEndDate(input, resolved, stayLabel, false);
    expect(result).toBe(`Ala eh, ganito po: ${stayLabel.tl} — gusto n'yo na ga i-book?`);
    expect(result).not.toContain("Friday, November 20");
  });

  it("fixes an English variant with no year and no night-count suffix", () => {
    const input = "Your stay is Thursday, November 19 to Friday, November 20.";
    const result = fixStayRangeEndDate(input, resolved, stayLabel, true);
    expect(result).toBe(`Your stay is ${stayLabel.en}.`);
    expect(result).not.toContain("Friday, November 20");
  });

  it("leaves an already-correct range (ending on the check-out date) untouched", () => {
    const input = "Your stay is Thursday, November 19 to Saturday, November 21, 2026 (2 nights).";
    expect(fixStayRangeEndDate(input, resolved, stayLabel, true)).toBe(input);
  });

  it("is a no-op for a single-night stay whose correct range already ends on check-out", () => {
    const singleNight = { checkIn: "2026-11-14", checkOut: "2026-11-15" }; // Sat -> Sun
    const label = buildStayLabel(singleNight.checkIn, singleNight.checkOut)!;
    const input = "Your stay is Saturday, November 14 to Sunday, November 15, 2026 (1 night).";
    expect(fixStayRangeEndDate(input, singleNight, label, true)).toBe(input);
  });

  it("fixes a single-night stay wrongly stated as the same day twice (start == last night)", () => {
    const singleNight = { checkIn: "2026-11-14", checkOut: "2026-11-15" }; // Sat -> Sun
    const label = buildStayLabel(singleNight.checkIn, singleNight.checkOut)!;
    const input = "Your stay is Saturday, November 14 to Saturday, November 14.";
    expect(fixStayRangeEndDate(input, singleNight, label, true)).toBe(`Your stay is ${label.en}.`);
  });

  it("handles a month-rollover stay (Nov 30 -> Dec 2) ending on the last night (Dec 1)", () => {
    const rollover = { checkIn: "2026-11-30", checkOut: "2026-12-02" };
    const label = buildStayLabel(rollover.checkIn, rollover.checkOut)!;
    const input = "Your stay is Monday, November 30 to Tuesday, December 1, 2026 (2 nights).";
    expect(fixStayRangeEndDate(input, rollover, label, true)).toBe(`Your stay is ${label.en}.`);
  });

  it("never touches a per-night breakdown line (a single date, no range)", () => {
    const input = "- Thursday, November 19: ₱2,800\n- Friday, November 20: ₱3,500";
    expect(fixStayRangeEndDate(input, resolved, stayLabel, true)).toBe(input);
  });

  it("is a no-op when nothing was resolved this turn", () => {
    const input = "Thursday, November 19 to Friday, November 20.";
    expect(fixStayRangeEndDate(input, null, stayLabel, true)).toBe(input);
  });
});
