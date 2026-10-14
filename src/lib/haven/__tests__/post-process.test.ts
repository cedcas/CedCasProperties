import { describe, expect, it } from "vitest";
import {
  collectToolAmounts,
  enforcePriceClaims,
  extractAllowedLinks,
  isAllowedHref,
  normalizeHref,
  dedupeLinks,
  collectBookingLinks,
  ensureHandoffLink,
  limitToOneProvisional,
  ensureBatanguenoMarker,
  FALLBACK_TOTAL_TEXT,
  FALLBACK_FEE_TEXT,
  MESSENGER_HREF,
  type ToolExchange,
} from "../post-process";

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
    expect(result).toBe(FALLBACK_FEE_TEXT);
    expect(result).not.toContain("/hour");
    expect(result).not.toContain("9999");
  });

  it("uses the fee-handoff fallback (not the checkout fallback) for an unverified per-hour/per-night rate", () => {
    const amounts = new Set<number>();
    expect(enforcePriceClaims("Late checkout is ₱500/hour.", amounts)).toBe(FALLBACK_FEE_TEXT);
    expect(enforcePriceClaims("There's an extra fee of ₱500 for late checkout.", amounts)).toBe(FALLBACK_FEE_TEXT);
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
      ["Here's the breakdown:", "- Nightly total: ₱4,500", `- ${FALLBACK_FEE_TEXT}`, "Let us know!"].join("\n")
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

  it("never outputs the same property+guests link twice even if two options repeat it", () => {
    const sameLink = { slug: "cozy-1-bedroom", name: "Cozy 1BR", guests: 5, bookingLink: "/properties/cozy-1-bedroom/book?g=5" };
    const exchanges: ToolExchange[] = [
      {
        name: "find_stay",
        input: { checkIn: "2026-11-14", checkOut: "2026-11-16", guests: 5 },
        result: { options: [{ properties: [sameLink] }, { properties: [sameLink] }] },
      },
    ];
    expect(collectBookingLinks(exchanges)).toHaveLength(1);
  });

  it("caps the total number of booking links at 6", () => {
    const properties = Array.from({ length: 8 }, (_, i) => ({
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
    expect(collectBookingLinks(exchanges)).toHaveLength(6);
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
});

describe("ensureBatanguenoMarker", () => {
  it("leaves a reply with a natural marker unchanged", () => {
    const input = "Ay ga, meron pa kaming bakante sa petsang 'yan!";
    expect(ensureBatanguenoMarker(input)).toBe(input);
  });

  it("recognizes each documented marker", () => {
    for (const marker of ["ala eh", "aba'y", "ga", "nga", "ari", "are"]) {
      expect(ensureBatanguenoMarker(`Teka lang, ${marker} titingnan ko.`)).toBe(`Teka lang, ${marker} titingnan ko.`);
    }
  });

  it("prepends a natural opener when the reply has no marker at all", () => {
    const input = "Meron pa kaming bakante sa petsang iyan para sa inyo.";
    expect(ensureBatanguenoMarker(input)).toBe(`Ala eh, ${input}`);
  });
});
