import { describe, expect, it } from "vitest";
import { getWelcomeBook, isWelcomeBookSlug, WELCOME_BOOK_SLUGS } from "../welcome-book";

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /(?:\+?63[ -]?|0)9\d{2}[ -]?\d{3}[ -]?\d{4}\b/;

describe("getWelcomeBook", () => {
  it("returns B34 content for cozy-1-bedroom and spacious-2-bedroom", () => {
    expect(getWelcomeBook("cozy-1-bedroom")).not.toBeNull();
    expect(getWelcomeBook("spacious-2-bedroom")).not.toBeNull();
  });

  it("returns null for a Mickey in Lipa (B38) slug — never generalized from B34", () => {
    expect(getWelcomeBook("mickey-in-lipa--full-family-house--sleeps-15")).toBeNull();
    expect(getWelcomeBook("mickey-in-lipa--family-house--sleeps-11")).toBeNull();
  });

  it("returns null for an unknown slug", () => {
    expect(getWelcomeBook("not-a-real-property")).toBeNull();
  });

  it("WELCOME_BOOK_SLUGS is exactly the two B34 listings", () => {
    expect(WELCOME_BOOK_SLUGS).toEqual(["cozy-1-bedroom", "spacious-2-bedroom"]);
  });
});

describe("isWelcomeBookSlug", () => {
  it("is true only for the two B34 slugs", () => {
    expect(isWelcomeBookSlug("cozy-1-bedroom")).toBe(true);
    expect(isWelcomeBookSlug("spacious-2-bedroom")).toBe(true);
    expect(isWelcomeBookSlug("mickey-in-lipa--family-house--sleeps-11")).toBe(false);
  });
});

describe("B34 welcome book content", () => {
  const book = getWelcomeBook("cozy-1-bedroom")!;
  const serialized = JSON.stringify(book);

  it("includes real restaurants, things to do, house rules, how-tos, and check-out steps", () => {
    expect(book.restaurants.length).toBeGreaterThan(0);
    expect(book.restaurants.some((r) => r.name === "Casa Marikit")).toBe(true);
    expect(book.thingsToDo).toContain("Milea Bee Farm");
    expect(book.houseRules.length).toBeGreaterThan(0);
    expect(book.howTos.length).toBeGreaterThan(0);
    expect(book.checkOutSteps.length).toBeGreaterThan(0);
  });

  it("is attributed to a source", () => {
    expect(book.source).toMatch(/Welcome Book/);
  });

  // Excludes required by the owner-provided excerpt: Wi-Fi, access codes, address, phone
  // numbers, emails, host bio, the dialect page, and the bars list — see welcome-book.ts.
  it("contains no 'wifi' mention anywhere", () => {
    expect(serialized).not.toMatch(/wi-?fi/i);
  });

  it("contains no 'password' mention anywhere", () => {
    expect(serialized).not.toMatch(/password/i);
  });

  it("contains no phone numbers", () => {
    expect(serialized).not.toMatch(PHONE_RE);
  });

  it("contains no email addresses", () => {
    expect(serialized).not.toMatch(EMAIL_RE);
  });

  it("contains no street/lot address or door/gate/lock access codes", () => {
    expect(serialized).not.toMatch(/\blot\s*\d+\b|\bblock\s*\d+\b/i);
    expect(serialized).not.toMatch(/\b(?:door|gate|lock|keybox)\b[^.]{0,20}\bcode\b/i);
  });

  it("contains no bars list or dialect-page content", () => {
    expect(serialized.toLowerCase()).not.toContain("bar");
  });
});
