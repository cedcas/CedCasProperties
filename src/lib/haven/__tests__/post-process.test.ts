import { describe, expect, it } from "vitest";
import {
  collectToolAmounts,
  enforcePriceClaims,
  extractAllowedLinks,
  isAllowedHref,
  dedupeLinks,
  collectBookingLinks,
  ensureHandoffLink,
  limitToOneProvisional,
  FALLBACK_TOTAL_TEXT,
  FALLBACK_FEE_TEXT,
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

  it("builds one button per property across find_stay options, deduped by href, capped at 5", () => {
    const exchanges: ToolExchange[] = [
      {
        name: "find_stay",
        input: { checkIn: "2026-11-14", checkOut: "2026-11-16", guests: 12 },
        result: {
          options: [
            {
              properties: [
                { name: "Cozy 1BR", bookingLink: "/properties/cozy-1-bedroom/book?checkIn=2026-11-14&checkOut=2026-11-16&guests=5" },
                { name: "Spacious 2BR", bookingLink: "/properties/spacious-2-bedroom/book?checkIn=2026-11-14&checkOut=2026-11-16&guests=7" },
              ],
            },
          ],
        },
      },
    ];
    const links = collectBookingLinks(exchanges);
    expect(links).toHaveLength(2);
    expect(links[0].label).toBe("Book Cozy 1BR · 11/14–11/16");
    expect(links[1].label).toBe("Book Spacious 2BR · 11/14–11/16");
  });

  it("drops a booking link that somehow isn't an allowed href", () => {
    const exchanges: ToolExchange[] = [
      {
        name: "get_quote",
        input: { checkIn: "2026-11-14", checkOut: "2026-11-16" },
        result: { name: "Cozy 1BR", bookingLink: "https://evil.example/book" },
      },
    ];
    expect(collectBookingLinks(exchanges)).toEqual([]);
  });

  it("caps the total number of booking links at 5", () => {
    const properties = Array.from({ length: 8 }, (_, i) => ({
      name: `Property ${i}`,
      bookingLink: `/properties/p${i}/book?checkIn=2026-11-14&checkOut=2026-11-16&guests=1`,
    }));
    const exchanges: ToolExchange[] = [
      {
        name: "find_stay",
        input: { checkIn: "2026-11-14", checkOut: "2026-11-16", guests: 1 },
        result: { options: [{ properties }] },
      },
    ];
    expect(collectBookingLinks(exchanges)).toHaveLength(5);
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
  it("adds a Messenger button when the reply mentions m.me/haveninlipa as plain text", () => {
    const text = "Let me get you to a real person for this one — message us at m.me/haveninlipa, or use the contact page.";
    const links = ensureHandoffLink(text, []);
    expect(links).toEqual([{ label: "Message us on Messenger", href: "m.me/haveninlipa" }]);
  });

  it("doesn't duplicate the button if one is already present", () => {
    const text = "Message us at m.me/haveninlipa.";
    const existing = [{ label: "Message us on Messenger", href: "m.me/haveninlipa" }];
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
});
