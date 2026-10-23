import { describe, expect, it } from "vitest";
import {
  collectToolAmounts,
  enforcePriceClaims,
  collectBasePrices,
  collectDatedQuoteAmounts,
  ensureFromPrefix,
  extractAllowedLinks,
  stripBareUrls,
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
  replaceTuklasinFamily,
  simplifyDeepTagalogWords,
  replaceSikatSaInyo,
  PROVISIONAL_CAVEAT_EN,
  PROVISIONAL_CAVEAT_TL,
  stripSystemMentions,
  fixBellaVitaMiscount,
  fixFivePropertiesWording,
  fixTitiginganTypo,
  fixUmabotGuestsPhrasing,
  isEnglishContext,
  stripTagalogWordsInEnglish,
  firstResolvedDateRange,
  formatDateRangeArrow,
  ensureDatesStated,
  fixStayRangeEndDate,
  dropDateReconfirmationQuestions,
  dropWhatYearQuestions,
  ensureSingleNightNudge,
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

describe("stripBareUrls (live bug: a bare URL, including an invented domain, slips past extractAllowedLinks)", () => {
  it("removes an invented-domain booking link and its Batangueño lead-in phrase", () => {
    const text =
      "Gusto n'yo na ga i-book? Ari ang link: " +
      "https://haven.com.ph/properties/spacious-2-bedroom/book?checkIn=2026-10-24&checkOut=2026-10-26&guests=4";
    expect(stripBareUrls(text)).toBe("Gusto n'yo na ga i-book?");
  });

  it("removes an invented-domain booking link and its English lead-in phrase", () => {
    const text =
      "Want me to help you book it? Here's the link: " +
      "https://haven.com.ph/properties/spacious-2-bedroom/book?checkIn=2026-10-24&checkOut=2026-10-26&guests=4";
    expect(stripBareUrls(text)).toBe("Want me to help you book it?");
  });

  it("removes an invented-domain booking link and its 'Heto ang link' lead-in phrase", () => {
    const text =
      "Gusto n'yo na bang i-book? Heto ang link: " +
      "https://haven.com.ph/properties/spacious-2-bedroom/book?checkIn=2026-10-24&checkOut=2026-10-26&guests=4";
    expect(stripBareUrls(text)).toBe("Gusto n'yo na bang i-book?");
  });

  it("removes an invented-domain booking link and its 'Eto po ang link' lead-in phrase", () => {
    const text =
      "Gusto n'yo na po bang i-book? Eto po ang link: " +
      "https://haven.com.ph/properties/spacious-2-bedroom/book?checkIn=2026-10-24&checkOut=2026-10-26&guests=4";
    expect(stripBareUrls(text)).toBe("Gusto n'yo na po bang i-book?");
  });

  it("removes a bare, allowlisted haveninlipa.com URL from the prose too, since its button already carries it", () => {
    const text = "You can also check https://haveninlipa.com/properties for more options.";
    expect(stripBareUrls(text)).toBe("You can also check for more options.");
  });

  it("removes a bare www.haveninlipa.com mention with no scheme", () => {
    const text = "Visit www.haveninlipa.com/contact kung may tanong pa kayo.";
    expect(stripBareUrls(text)).toBe("Visit kung may tanong pa kayo.");
  });

  it("leaves text with no bare URL untouched", () => {
    const text = "Gusto n'yo na bang i-book? Just tap the button above.";
    expect(stripBareUrls(text)).toBe(text);
  });

  it("does not touch a plain email address with no path", () => {
    const text = "Email us at customerservice@haveninlipa.com kung may tanong.";
    expect(stripBareUrls(text)).toBe(text);
  });

  it("leaves the Messenger handoff URL in place — it's deliberately written out, not just a button", () => {
    const text = `We don't have a documented age policy for that — our team will confirm directly, message us at ${MESSENGER_HREF}.`;
    expect(stripBareUrls(text)).toBe(text);
  });

  it("leaves a scheme-less bare m.me/haveninlipa mention in place", () => {
    const text = "Message us at m.me/haveninlipa, or use the contact page.";
    expect(stripBareUrls(text)).toBe(text);
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

  // Oct 22 2026 overview-question incident: a property-rundown bullet with an unverified
  // per-night/day/guest rate drops just the price, keeping the rest of the bullet (name,
  // capacity) — unlike a true fee/total bullet, which still replaces the whole line.
  describe("a property-rundown bullet's rate drops just the price, not the whole line", () => {
    it("drops only the disallowed price from a per-night property bullet, keeping the rest", () => {
      const amounts = new Set<number>();
      const result = enforcePriceClaims("- Cozy 1BR Haven: sleeps 5, from ₱99,000/night", amounts);
      expect(result).toBe("- Cozy 1BR Haven: sleeps 5");
    });

    it("keeps a per-night property bullet whose price IS allowed (e.g. a real listing's own pricePerNight)", () => {
      const amounts = new Set([3500]);
      const text = "- Cozy 1BR Haven: sleeps 5, from ₱3,500/night";
      expect(enforcePriceClaims(text, amounts)).toBe(text);
    });

    it("drops a disallowed 'per guest' rate the same way, with no 'fee' wording in the line", () => {
      const amounts = new Set<number>();
      const result = enforcePriceClaims("- Mickey in Lipa: sleeps 15, ₱9,500 per guest", amounts);
      expect(result).toBe("- Mickey in Lipa: sleeps 15");
    });

    it("still uses the fee-handoff fallback (whole line) for an explicit 'fee' bullet, even with 'per guest'", () => {
      const amounts = new Set<number>();
      const result = enforcePriceClaims("- Extra guest fee: ₱500 per guest", amounts);
      expect(result).toBe(`- ${FALLBACK_FEE_TEXT}`);
    });

    it("still uses the hourly-fee fallback (whole line) for an hourly bullet, not the price-drop path", () => {
      const amounts = new Set<number>();
      const result = enforcePriceClaims("- Early check-in fee: ₱9999/hour", amounts);
      expect(result).toBe(`- ${FALLBACK_HOURLY_FEE_TEXT}`);
    });

    it("still replaces the whole bullet for an arithmetic claim even in a per-night context", () => {
      const amounts = new Set<number>();
      const result = enforcePriceClaims("- Cozy 1BR Haven: ₱3,500 x 2 /night", amounts);
      expect(result).toBe(`- ${FALLBACK_TOTAL_TEXT}`);
    });
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

describe("replaceTuklasinFamily (owner incident, 2026-10-16)", () => {
  it("replaces the exact owner string with the plain Tagalog caveat", () => {
    const input = "Ang total ninyo ay ₱10,525 (provisional lang — tutuklasin ng tama sa checkout).";
    const result = replaceTuklasinFamily(input, false);
    expect(result).not.toMatch(/tuklas/i);
    expect(result).toContain(PROVISIONAL_CAVEAT_TL);
  });

  it("replaces an English occurrence with the English caveat", () => {
    const input = "Your total is ₱10,525. It will be tutuklasin ng tama at checkout.";
    const result = replaceTuklasinFamily(input, true);
    expect(result).not.toMatch(/tuklas/i);
    expect(result).toContain(PROVISIONAL_CAVEAT_EN);
  });

  it("catches other inflections sharing the 'tuklas' root, not just 'tutuklasin'", () => {
    expect(replaceTuklasinFamily("Matutuklasan n'yo ang eksaktong halaga sa checkout.", false)).not.toMatch(/tuklas/i);
    expect(replaceTuklasinFamily("Tinuklasan na namin ang totoong bayad.", false)).not.toMatch(/tuklas/i);
  });

  it("is a no-op when there's no 'tuklas' root present", () => {
    const input = "Provisional lang ito, kukumpirmahin sa checkout.";
    expect(replaceTuklasinFamily(input, false)).toBe(input);
  });
});

describe("replaceSikatSaInyo (owner incident, 2026-10-23)", () => {
  it("replaces the exact owner incident sentence", () => {
    const input = "Anong sikat sa inyo, o ilang guests ang dadalhan ninyo?";
    expect(replaceSikatSaInyo(input)).toBe("Ano ang type ninyo, o ilang guests ang dadalhan ninyo?");
  });

  it("maps 'ano ang sikat sa inyo/iyo' to 'ano ang type ninyo', preserving case", () => {
    expect(replaceSikatSaInyo("Ano ang sikat sa inyo?")).toBe("Ano ang type ninyo?");
    expect(replaceSikatSaInyo("ano ang sikat sa iyo?")).toBe("ano ang type ninyo?");
    expect(replaceSikatSaInyo("Anong sikat sa'yo?")).toBe("Ano ang type ninyo?");
  });

  it("maps any other 'sikat sa inyo/iyo/'yo' occurrence to 'gusto ninyo'", () => {
    expect(replaceSikatSaInyo("Alamin natin ang sikat sa inyo bago mag-book.")).toBe(
      "Alamin natin ang gusto ninyo bago mag-book."
    );
    expect(replaceSikatSaInyo("Malalaman namin ang sikat sa iyo.")).toBe("Malalaman namin ang gusto ninyo.");
    expect(replaceSikatSaInyo("Sikat sa'yo ba ang Mickey in Lipa?")).toBe("Gusto ninyo ba ang Mickey in Lipa?");
  });

  it("leaves a legitimate standalone 'sikat' untouched", () => {
    const input = "May sikat na kainan malapit sa amin.";
    expect(replaceSikatSaInyo(input)).toBe(input);
  });

  it("leaves 'Tinutulungan kita mamili' untouched", () => {
    const input = "Tinutulungan kita mamili ng tamang property para sa inyo.";
    expect(replaceSikatSaInyo(input)).toBe(input);
  });

  it("is a no-op when there's no 'sikat sa inyo/iyo' phrasing", () => {
    const input = "Ano ang type ninyo?";
    expect(replaceSikatSaInyo(input)).toBe(input);
  });
});

describe("simplifyDeepTagalogWords (plain-language pass, 2026-10-16)", () => {
  it("replaces each banned deep word with its plain conversational equivalent", () => {
    expect(simplifyDeepTagalogWords("Sukatin ko muna ang petsa.")).toBe("Tingnan ko muna ang petsa.");
    expect(simplifyDeepTagalogWords("Pwede kayong manatili dito.")).toBe("Pwede kayong mag-stay dito.");
    expect(simplifyDeepTagalogWords("Nawa'y makatulong ako.")).toBe("Sana'y makatulong ako.");
    expect(simplifyDeepTagalogWords("Datapwat kailangan muna naming kumpirmahin.")).toBe("Pero kailangan muna naming kumpirmahin.");
    expect(simplifyDeepTagalogWords("Subalit may bakante kami.")).toBe("Pero may bakante kami.");
    expect(simplifyDeepTagalogWords("Marapat na kumpirmahin muna.")).toBe("Dapat na kumpirmahin muna.");
    expect(simplifyDeepTagalogWords("Pagsapit ng check-out, aalis na kayo.")).toBe("Pagdating ng check-out, aalis na kayo.");
    expect(simplifyDeepTagalogWords("Tunay na maganda ang bahay.")).toBe("Talagang maganda ang bahay.");
    expect(simplifyDeepTagalogWords("Maaari kayong mag-book.")).toBe("Pwede kayong mag-book.");
    expect(simplifyDeepTagalogWords("Maaaring mag-book kayo.")).toBe("Pwedeng mag-book kayo.");
  });

  it("preserves capitalization when replacing a sentence-initial word", () => {
    expect(simplifyDeepTagalogWords("Manatili kayo nang matagal.")).toBe("Mag-stay kayo nang matagal.");
  });

  it("is a no-op when there are no deep words", () => {
    const input = "Pwede kayong mag-book. Sige po.";
    expect(simplifyDeepTagalogWords(input)).toBe(input);
  });
});

describe("stripSystemMentions", () => {
  it("drops a sentence mentioning 'the system' (English)", () => {
    const result = stripSystemMentions("Let me check the system for the exact total. We'll confirm shortly.");
    expect(result).toBe("We'll confirm shortly.");
    expect(result).not.toContain("system");
  });

  it("drops a sentence mentioning 'ang system' (Tagalog)", () => {
    const result = stripSystemMentions("Tama po. Titingnan ko muna ang system para sa eksaktong halaga.");
    expect(result).toBe("Tama po.");
  });

  it("drops a sentence mentioning 'sa system' (Tagalog/Batangueño)", () => {
    const result = stripSystemMentions("Kukunin ko muna ang eksaktong halaga sa system, tapos sasabihin ko sa'yo. Sige po.");
    expect(result).toBe("Sige po.");
  });

  it("drops a sentence mentioning 'our system' (English)", () => {
    const result = stripSystemMentions("That's not listed in our system. Message us on Messenger.");
    expect(result).toBe("Message us on Messenger.");
  });

  it("drops only the offending bullet line, keeping other bullets", () => {
    const input = "- Checking the system now\n- We have availability for those dates";
    expect(stripSystemMentions(input)).toBe("- We have availability for those dates");
  });

  it("does not touch an unrelated phrase like 'the sound system'", () => {
    const input = "The house has a sound system you can use for karaoke.";
    expect(stripSystemMentions(input)).toBe(input);
  });

  it("is a no-op when there's no system mention", () => {
    const input = "We have availability for that stay. Want me to help you book it?";
    expect(stripSystemMentions(input)).toBe(input);
  });
});

// Owner correction (Cedric, 2026-10-23): Haven kept saying "2 Bella Vita properties" / "two
// in the Bella Vita subdivision", implying only some of the 5 listings share that
// subdivision. All 5 do. Cheap backstop for exactly the miscounted phrasings flagged.
describe("fixBellaVitaMiscount", () => {
  it('rewrites "2 Bella Vita properties"', () => {
    const result = fixBellaVitaMiscount("We have 2 Bella Vita properties available.");
    expect(result).toBe("We have listings in the Bella Vita subdivision available.");
  });

  it('rewrites "two Bella Vita houses"', () => {
    const result = fixBellaVitaMiscount("Haven has two Bella Vita houses.");
    expect(result).toBe("Haven has listings in the Bella Vita subdivision.");
  });

  it('rewrites "two in the Bella Vita subdivision"', () => {
    const result = fixBellaVitaMiscount("Only two in the Bella Vita subdivision are bookable this week.");
    expect(result).toBe("Only listings in the Bella Vita subdivision are bookable this week.");
  });

  it('rewrites the Tagalog "dalawang Bella Vita listings"', () => {
    const result = fixBellaVitaMiscount("May dalawang Bella Vita listings kami.");
    expect(result).toBe("May listings in the Bella Vita subdivision kami.");
  });

  it("is a no-op when all 5 listings are correctly described as being in Bella Vita", () => {
    const input = "All 5 of our listings are in the Bella Vita subdivision.";
    expect(fixBellaVitaMiscount(input)).toBe(input);
  });

  it("does not touch an unrelated mention of the number two near Bella Vita", () => {
    const input = "We've been in the Bella Vita subdivision for two years.";
    expect(fixBellaVitaMiscount(input)).toBe(input);
  });
});

// DEC-029 addendum (Cedric, 2026-10-23): the full set of units is always "5 listings" — in
// English and Tagalog/Batangueño alike — never "5 properties"/"five properties".
describe("fixFivePropertiesWording", () => {
  it('rewrites "5 properties" to "5 listings"', () => {
    expect(fixFivePropertiesWording("We have 5 properties in Lipa.")).toBe("We have 5 listings in Lipa.");
  });

  it('rewrites "five properties" to "five listings"', () => {
    expect(fixFivePropertiesWording("We have five properties in Lipa.")).toBe("We have five listings in Lipa.");
  });

  it("preserves capitalization of the word being swapped", () => {
    expect(fixFivePropertiesWording("5 Properties are listed below.")).toBe("5 Listings are listed below.");
  });

  it("is case-insensitive on the match itself", () => {
    expect(fixFivePropertiesWording("FIVE PROPERTIES available.")).toBe("FIVE Listings available.");
  });

  it("works in a Tagalog sentence (the English word 'properties' stays swapped)", () => {
    expect(fixFivePropertiesWording("May 5 properties kami sa Bella Vita.")).toBe("May 5 listings kami sa Bella Vita.");
  });

  it("is a no-op when already saying listings", () => {
    const input = "We have 5 listings in Lipa.";
    expect(fixFivePropertiesWording(input)).toBe(input);
  });

  it("does not touch an unrelated count of properties", () => {
    const input = "We have 3 properties available this week.";
    expect(fixFivePropertiesWording(input)).toBe(input);
  });
});

// DEC-029 addendum (Cedric, 2026-10-23): "titigingan" is a model-generated typo of
// "titingnan" (will look at/check) — not in any of Haven's own prompt text.
describe("fixTitiginganTypo", () => {
  it('rewrites "titigingan" to "titingnan"', () => {
    expect(fixTitiginganTypo("Titigingan ko agad kung bakante.")).toBe("Titingnan ko agad kung bakante.");
  });

  it("preserves lowercase", () => {
    expect(fixTitiginganTypo("Sandali, titigingan ko muna.")).toBe("Sandali, titingnan ko muna.");
  });

  it("is a no-op when the word is already correct", () => {
    const input = "Titingnan ko agad kung bakante ito.";
    expect(fixTitiginganTypo(input)).toBe(input);
  });
});

// DEC-029 addendum (Cedric, 2026-10-23): "umabot sa/ng N guests/tao" (stating max capacity)
// always reads "kasya hanggang N tao" (fits up to N people) — "umabot" means "to reach/
// arrive at", which misreads as how many guests have arrived.
describe("fixUmabotGuestsPhrasing", () => {
  it('rewrites "umabot sa N guests"', () => {
    expect(fixUmabotGuestsPhrasing("Ang Mickey ay umabot sa 15 guests.")).toBe("Ang Mickey ay kasya hanggang 15 tao.");
  });

  it('rewrites "umabot ng N guests"', () => {
    expect(fixUmabotGuestsPhrasing("Umabot ng 9 guests ang Spacious 2BR.")).toBe("Kasya hanggang 9 tao ang Spacious 2BR.");
  });

  it('rewrites "umabot ng N tao"', () => {
    expect(fixUmabotGuestsPhrasing("Umabot ng 11 tao ang bahay na ito.")).toBe("Kasya hanggang 11 tao ang bahay na ito.");
  });

  it("preserves capitalization of the matched phrase", () => {
    expect(fixUmabotGuestsPhrasing("Umabot sa 7 guests ang Cozy 1BR.")).toBe("Kasya hanggang 7 tao ang Cozy 1BR.");
  });

  it("is a no-op when already saying kasya hanggang", () => {
    const input = "Kasya hanggang 15 tao ang Mickey in Lipa.";
    expect(fixUmabotGuestsPhrasing(input)).toBe(input);
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
  const stayLabel = buildStayLabel(resolved.checkIn, resolved.checkOut)!;

  it("prepends the resolved date range when English and the reply doesn't state it", () => {
    const result = ensureDatesStated("We have availability for that stay.", resolved, stayLabel, true);
    expect(result).toBe("For Saturday, November 14 → Sunday, November 15, 2026:\n\nWe have availability for that stay.");
  });

  it("leaves the reply untouched when it already states the check-in month/day", () => {
    const input = "For November 14, we have availability.";
    expect(ensureDatesStated(input, resolved, stayLabel, true)).toBe(input);
  });

  it("leaves the reply untouched when not in English context", () => {
    const input = "May bakante kami sa petsang iyan.";
    expect(ensureDatesStated(input, resolved, stayLabel, false)).toBe(input);
  });

  it("leaves the reply untouched when no dates were resolved this turn", () => {
    const input = "We have availability for that stay.";
    expect(ensureDatesStated(input, null, stayLabel, true)).toBe(input);
  });

  it("does NOT double up a header when the reply already contains the stayLabel verbatim (doubled-date-header regression)", () => {
    // stayLabel uses abbreviated month names ("Nov 19"), which the old full-month-name-only
    // check ("November 19") missed, so the "For <range>:" header got prepended on top of an
    // already-correct range.
    const twoNight = { checkIn: "2026-11-19", checkOut: "2026-11-21" };
    const label = buildStayLabel(twoNight.checkIn, twoNight.checkOut)!;
    const input = `Your stay is ${label.en}. Want me to help you book it?`;
    expect(ensureDatesStated(input, twoNight, label, true)).toBe(input);
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

describe("dropDateReconfirmationQuestions (Owner rule 1, 2026-10-16)", () => {
  // 2-night stay: Thu Nov 19 check-in, Sat Nov 21 check-out.
  const resolved = { checkIn: "2026-11-19", checkOut: "2026-11-21" };
  const stayLabel = buildStayLabel(resolved.checkIn, resolved.checkOut)!;

  it("fixes the exact Owner screenshot of the live bad reply (dev, pre-#86)", () => {
    const input =
      "Ala eh, Teka lang — mukhang ang system ay nag-interpret ng Nobyembre 19 hanggang 21 " +
      "bilang isang gabi lang (Nov 19–20). Totoo ba na isang gabi lang ang gusto n'yo, o " +
      "dalawang gabi (Nov 19–21) ang plan?";
    // The full pipeline runs stripSystemMentions BEFORE this guard (see chat-service.ts),
    // so the first ("ang system") sentence is already gone by the time this guard sees it
    // — composing both here mirrors production and leaves only the actual re-question.
    const result = dropDateReconfirmationQuestions(stripSystemMentions(input), true, stayLabel, false);
    expect(result).not.toMatch(/totoo ba/i);
    expect(result).not.toMatch(/dalawang gabi/i);
    expect(result).not.toMatch(/ang plan\?/i);
    // The whole reply was this kind of question, so it must fall back to a restatement
    // instead of going blank.
    expect(result.trim().length).toBeGreaterThan(0);
    expect(result).toContain(stayLabel.tl);
  });

  it("is a no-op when nothing was resolved this turn", () => {
    const input = "Totoo ba na isang gabi lang ang gusto n'yo?";
    expect(dropDateReconfirmationQuestions(input, false, stayLabel, false)).toBe(input);
  });

  it('drops an English "just to confirm" re-question, leaving the rest of the reply intact', () => {
    const input = "Just to confirm, is that 1 night or 2? We have availability either way.";
    const result = dropDateReconfirmationQuestions(input, true, stayLabel, true);
    expect(result).not.toMatch(/just to confirm/i);
    expect(result).toContain("We have availability either way.");
  });

  it('drops "do you want 1 night" without touching an unrelated sentence', () => {
    const input = "Do you want 1 night? Let me know and I'll send the quote.";
    const result = dropDateReconfirmationQuestions(input, true, stayLabel, true);
    expect(result).not.toMatch(/do you want 1 night/i);
    expect(result).toContain("Let me know and I'll send the quote.");
  });

  it('drops "ilang gabi" once dates are already resolved', () => {
    const input = "Ilang gabi ba ang gusto n'yo?";
    const result = dropDateReconfirmationQuestions(input, true, stayLabel, false);
    expect(result).not.toMatch(/ilang gabi/i);
  });

  it('drops "sigurado ga kayo" re-questioning the parsed range', () => {
    const input = "Sigurado ga kayo na Nov 19–20 o Nov 19–21 ang gusto n'yo?";
    const result = dropDateReconfirmationQuestions(input, true, stayLabel, false);
    expect(result).not.toMatch(/sigurado ga kayo/i);
  });

  it('never clobbers property-resolver.ts\'s legitimate "Did you mean <property>?" question', () => {
    const input = "Did you mean Mickey in Lipa — Full Family House?";
    expect(dropDateReconfirmationQuestions(input, true, stayLabel, true)).toBe(input);
  });

  it('drops an English "did you mean" only when nights/dates are named in the same sentence', () => {
    const input = "Did you mean 1 night or 2 nights? Either way we have availability.";
    const result = dropDateReconfirmationQuestions(input, true, stayLabel, true);
    expect(result).not.toMatch(/did you mean/i);
    expect(result).toContain("Either way we have availability.");
  });

  // Owner rule, 2026-10-19 — the live bad reply's closing question: Haven re-confirmed the
  // 1-night default resolveDates already applied for a bare single date.
  it('drops "kung 1 night lang ... tama ba?"', () => {
    const input = "At kung 1 night lang, check-in sabado at check-out linggo, tama ba? Sige po.";
    const result = dropDateReconfirmationQuestions(input, true, stayLabel, false);
    expect(result).not.toMatch(/kung\s+1\s+night\s+lang/i);
    expect(result).not.toMatch(/tama\s+ba/i);
    expect(result).toContain("Sige po.");
  });

  it('drops "1 night ba"', () => {
    const input = "1 night ba yan? Sige po, ibibigay ko ang quote.";
    const result = dropDateReconfirmationQuestions(input, true, stayLabel, false);
    expect(result).not.toMatch(/1\s+night\s+ba/i);
    expect(result).toContain("Sige po, ibibigay ko ang quote.");
  });

  it('drops a standalone "check-in sabado at check-out linggo, tama ba?"', () => {
    const input = "Check-in sabado at check-out linggo, tama ba? Meron pa kaming bakante.";
    const result = dropDateReconfirmationQuestions(input, true, stayLabel, false);
    expect(result).not.toMatch(/tama\s+ba/i);
    expect(result).toContain("Meron pa kaming bakante.");
  });
});

describe("dropWhatYearQuestions (Owner rule 2, 2026-10-16; extended 2026-10-19)", () => {
  it('drops "what year" in English', () => {
    const input = "What year do you mean? We'll check availability once I know.";
    const result = dropWhatYearQuestions(input);
    expect(result).not.toMatch(/what year/i);
    expect(result).toContain("We'll check availability once I know.");
  });

  it('drops "anong taon" in Tagalog/Batangueño', () => {
    const input = "Anong taon ang gusto n'yo? Sabihin n'yo lang po.";
    const result = dropWhatYearQuestions(input);
    expect(result).not.toMatch(/anong taon/i);
    expect(result).toContain("Sabihin n'yo lang po.");
  });

  it("is a no-op when no year question is present", () => {
    const input = "We have availability for those dates.";
    expect(dropWhatYearQuestions(input)).toBe(input);
  });

  it('drops "this year or next" in English', () => {
    const input = "Is that this year or next? Let me know and I'll confirm.";
    const result = dropWhatYearQuestions(input);
    expect(result).not.toMatch(/this year or next/i);
    expect(result).toContain("Let me know and I'll confirm.");
  });

  it('drops "taong ito ... o next year" in Tagalog/Batangueño', () => {
    const input = "10/24 ba yan ng taong ito, o next year? Sige po, ibibigay ko ang quote.";
    const result = dropWhatYearQuestions(input);
    expect(result).not.toMatch(/taong\s+ito/i);
    expect(result).not.toMatch(/next\s+year/i);
    expect(result).toContain("Sige po, ibibigay ko ang quote.");
  });

  it("drops any sentence naming a past year, given the current year, without hardcoding which year", () => {
    const input = "Oktubre 24, 2024 ba, o 2025 na? Meron pa kaming bakante.";
    const result = dropWhatYearQuestions(input, 2026);
    expect(result).not.toMatch(/2024/);
    expect(result).not.toMatch(/2025/);
    expect(result).toContain("Meron pa kaming bakante.");
  });

  it("leaves the current year and future years untouched", () => {
    const input = "We have a 2026 opening and a 2027 opening too.";
    expect(dropWhatYearQuestions(input, 2026)).toBe(input);
  });

  it("is a no-op for past years when currentYear is omitted (backward compatible)", () => {
    const input = "Oktubre 24, 2024 ba, o 2025 na?";
    expect(dropWhatYearQuestions(input)).toBe(input);
  });

  it("fixes the exact live bad reply (Owner screenshot, 2026-10-19)", () => {
    const stayLabel = buildStayLabel("2026-10-24", "2026-10-25")!;
    const input =
      "Ala eh, Ay, teka lang — kailangan ko ng mas specific. 10/24 ba yan ng taong ito, o next year? " +
      "Parang may confusion lang ng date format. 😅 Pwede ba i-confirm: Oktubre 24, 2024 ba, o 2025 na? " +
      "At kung 1 night lang, check-in sabado at check-out linggo, tama ba?";
    // Mirrors chat-service.ts's actual pipeline order: reconfirmation guard runs first,
    // then the year-question guard.
    const result = dropWhatYearQuestions(dropDateReconfirmationQuestions(input, true, stayLabel, false), 2026);
    expect(result).not.toMatch(/taong\s+ito/i);
    expect(result).not.toMatch(/next\s+year/i);
    expect(result).not.toMatch(/2024/);
    expect(result).not.toMatch(/2025/);
    expect(result).not.toMatch(/tama\s+ba/i);
    expect(result).not.toMatch(/kung\s+1\s+night\s+lang/i);
    expect(result.trim().length).toBeGreaterThan(0);
  });
});

describe("ensureSingleNightNudge (Owner rule, 2026-10-19)", () => {
  it("appends the English nudge when applies is true", () => {
    const result = ensureSingleNightNudge("Saturday, Oct 24, 2026 — 1 night.", true, "en", true);
    expect(result).toContain("Want to add more nights? Just tell me.");
  });

  it("appends the Tagalog nudge for lang 'tl'", () => {
    const result = ensureSingleNightNudge("Sabado, Okt 24, 2026 — 1 gabi.", true, "tl", false);
    expect(result).toContain("Pwede pong dagdagan ang gabi — sabihin n'yo lang.");
  });

  it("appends the Batangueño nudge for lang 'btg', regardless of the englishMode flag", () => {
    const result = ensureSingleNightNudge("Sabado, Okt 24, 2026 — 1 gabi.", true, "btg", false);
    expect(result).toContain("Pwede ga dagdagan ang gabi? Sabihin n'yo lang.");
  });

  it("is a no-op when applies is false", () => {
    const input = "Thursday, Nov 19 → Saturday, Nov 21, 2026 — 2 nights.";
    expect(ensureSingleNightNudge(input, false, "en", true)).toBe(input);
  });

  it("does not duplicate the nudge if already present", () => {
    const input = "Saturday, Oct 24, 2026 — 1 night.\n\nWant to add more nights? Just tell me.";
    expect(ensureSingleNightNudge(input, true, "en", true)).toBe(input);
  });
});
