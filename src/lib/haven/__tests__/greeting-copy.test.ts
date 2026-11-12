import { describe, it, expect } from "vitest";
import { havenGreetingText, resolveGreetingLang, HAVEN_GREETING_TEXT } from "@/lib/haven/greeting-copy";

describe("resolveGreetingLang / havenGreetingText", () => {
  it("defaults to English for en/auto/unset", () => {
    expect(resolveGreetingLang("en")).toBe("en");
    expect(resolveGreetingLang("auto")).toBe("en");
    expect(resolveGreetingLang(undefined)).toBe("en");
    expect(resolveGreetingLang(null)).toBe("en");
    expect(havenGreetingText("en")).toBe(HAVEN_GREETING_TEXT.en);
  });

  it("uses Tagalog for tl and btg (no separate Batangueño greeting copy)", () => {
    expect(resolveGreetingLang("tl")).toBe("tl");
    expect(resolveGreetingLang("btg")).toBe("tl");
    expect(havenGreetingText("tl")).toBe(HAVEN_GREETING_TEXT.tl);
    expect(havenGreetingText("btg")).toBe(HAVEN_GREETING_TEXT.tl);
  });

  it("never mentions Wi-Fi, door codes, 'the system', Airbnb, or a rate", () => {
    const banned = /wi-?fi|door code|the system|airbnb|₱/i;
    expect(HAVEN_GREETING_TEXT.en).not.toMatch(banned);
    expect(HAVEN_GREETING_TEXT.tl).not.toMatch(banned);
  });
});
