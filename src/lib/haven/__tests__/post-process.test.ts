import { describe, expect, it } from "vitest";
import { collectToolAmounts, enforcePriceClaims, extractAllowedLinks, isAllowedHref, FALLBACK_TOTAL_TEXT } from "../post-process";

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

describe("collectToolAmounts + enforcePriceClaims", () => {
  it("keeps a peso amount that matches a number returned by a tool this turn", () => {
    const amounts = collectToolAmounts([{ total: 4500, nights: 3 }]);
    expect(enforcePriceClaims("Your total is ₱4,500 for 3 nights.", amounts)).toBe(
      "Your total is ₱4,500 for 3 nights."
    );
  });

  it("replaces a peso amount that cannot be traced to this turn's tool results", () => {
    const amounts = collectToolAmounts([{ total: 4500 }]);
    expect(enforcePriceClaims("That'll be PHP 9999 total.", amounts)).toBe(`That'll be ${FALLBACK_TOTAL_TEXT} total.`);
  });

  it("replaces every unverified amount while keeping verified ones", () => {
    const amounts = collectToolAmounts([{ total: 4500 }]);
    const result = enforcePriceClaims("₱4,500 now, or ₱99,999 if you add extra nights.", amounts);
    expect(result).toBe(`₱4,500 now, or ${FALLBACK_TOTAL_TEXT} if you add extra nights.`);
  });

  it("walks nested tool-result objects and arrays for amounts", () => {
    const amounts = collectToolAmounts([{ options: [{ properties: [{ quote: { total: 12000 } }] }] }]);
    expect(amounts.has(12000)).toBe(true);
  });
});
