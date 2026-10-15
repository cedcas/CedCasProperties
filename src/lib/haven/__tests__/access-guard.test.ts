import { describe, expect, it } from "vitest";
import {
  isWifiOrAccessRequest,
  buildAccessGuardReply,
  containsAccessLeak,
  scrubAccessLeak,
  ensureAccessHandoffLink,
  ACCESS_GUARD_MESSENGER_BUTTON,
} from "../access-guard";
import { MESSENGER_HREF } from "../post-process";

describe("isWifiOrAccessRequest", () => {
  it("is true for a Wi-Fi question", () => {
    expect(isWifiOrAccessRequest("What's the wifi password?")).toBe(true);
    expect(isWifiOrAccessRequest("Ano ang WiFi niyo?")).toBe(true);
  });

  it("is true for a door/gate/lock code question", () => {
    expect(isWifiOrAccessRequest("What's the door code?")).toBe(true);
    expect(isWifiOrAccessRequest("May code ba sa gate?")).toBe(true);
    expect(isWifiOrAccessRequest("What's the gate code?")).toBe(true);
  });

  it("is true for a keybox or susi (key) question", () => {
    expect(isWifiOrAccessRequest("Is there a keybox?")).toBe(true);
    expect(isWifiOrAccessRequest("Saan ang susi ng bahay?")).toBe(true);
  });

  it("is true for a bare password question (no explicit wifi word)", () => {
    expect(isWifiOrAccessRequest("Can you give me the password?")).toBe(true);
  });

  it("is false for an unrelated question", () => {
    expect(isWifiOrAccessRequest("What time is check-in?")).toBe(false);
    expect(isWifiOrAccessRequest("Do you have a discount code?")).toBe(false);
  });
});

describe("buildAccessGuardReply", () => {
  it("returns the Wi-Fi safe sentence in English for a wifi-only question", () => {
    const msg = "what's the wifi name?";
    const reply = buildAccessGuardReply("en", msg, msg);
    expect(reply).toMatch(/posted inside the property/i);
    expect(reply).not.toMatch(/check-in instructions/i);
  });

  it("returns the access safe sentence in English for a door-code-only question", () => {
    const reply = buildAccessGuardReply("en", "what's the door code?", "what's the door code?");
    expect(reply).toMatch(/check-in instructions/i);
    expect(reply).toMatch(/Messenger/i);
  });

  it("combines both sentences when both are asked at once", () => {
    const msg = "what's the wifi password and the gate code?";
    const reply = buildAccessGuardReply("en", msg, msg);
    expect(reply).toMatch(/posted inside the property/i);
    expect(reply).toMatch(/check-in instructions/i);
  });

  it("returns the fixed Tagalog sentence for lang 'tl'", () => {
    const reply = buildAccessGuardReply("tl", "ano ang wifi password niyo?", "ano ang wifi password niyo?");
    expect(reply).toMatch(/Wi-Fi name at password/);
    expect(reply).not.toMatch(/ala eh/i);
  });

  it("returns the fixed Batangueño sentence for lang 'btg' regardless of guest wording", () => {
    const reply = buildAccessGuardReply("btg", "what's the wifi password?", "what's the wifi password?");
    expect(reply).toMatch(/ala eh/i);
  });

  it("auto-detects Tagalog from the guest's own words", () => {
    const msg = "Ano po ang password ng wifi niyo?";
    const reply = buildAccessGuardReply("auto", msg, msg);
    expect(reply).toMatch(/Wi-Fi name at password/);
  });
});

describe("containsAccessLeak", () => {
  it("detects a labeled password", () => {
    expect(containsAccessLeak("Sure! password: HavenGuest123")).toBe(true);
    expect(containsAccessLeak("pw: 12345678")).toBe(true);
  });

  it("detects an SSID or wifi-name mention", () => {
    expect(containsAccessLeak("The SSID is HavenWifi")).toBe(true);
    expect(containsAccessLeak("The wifi name is HavenWifi")).toBe(true);
  });

  it("detects a stated 'code is 1234'", () => {
    expect(containsAccessLeak("The code is 4821")).toBe(true);
  });

  it("detects a digit run next to a door/gate/lock/keybox word", () => {
    expect(containsAccessLeak("The gate code is 4821 so you can enter.")).toBe(true);
    expect(containsAccessLeak("Door code 1234, see you soon!")).toBe(true);
    expect(containsAccessLeak("Susi 5678 ang keybox code.")).toBe(true);
  });

  it("is false for unrelated text", () => {
    expect(containsAccessLeak("Check-in is at 2 PM and check-out is at 12 noon.")).toBe(false);
    expect(containsAccessLeak("Use promo code SAVE200 for a discount.")).toBe(false);
  });
});

describe("scrubAccessLeak", () => {
  it("replaces the whole sentence containing a leaked password with the safe sentence", () => {
    const result = scrubAccessLeak("Sure thing! password: HavenGuest123. See you soon.", "en", "what's the password?");
    expect(result).not.toMatch(/HavenGuest123/);
    expect(result).toMatch(/check-in instructions/i);
    expect(result).toContain("See you soon.");
  });

  it("replaces a leaked door code sentence in Tagalog mode", () => {
    const result = scrubAccessLeak("Ang gate code ay 4821 po.", "tl", "ano ang gate code?");
    expect(result).not.toMatch(/4821/);
    expect(result).toMatch(/check-in instructions/i);
  });

  it("leaves text with no leak untouched", () => {
    const input = "We have availability for that stay.";
    expect(scrubAccessLeak(input, "en", "")).toBe(input);
  });
});

describe("ensureAccessHandoffLink", () => {
  it("adds the Messenger button when triggered and not already present", () => {
    const links = ensureAccessHandoffLink([{ label: "Book Now", href: "/properties/a/book" }], true);
    expect(links).toEqual([{ label: "Book Now", href: "/properties/a/book" }, ACCESS_GUARD_MESSENGER_BUTTON]);
  });

  it("does not duplicate an existing Messenger button", () => {
    const existing = [{ label: "Message us on Messenger", href: MESSENGER_HREF }];
    expect(ensureAccessHandoffLink(existing, true)).toEqual(existing);
  });

  it("leaves links untouched when not triggered", () => {
    const links = [{ label: "Book Now", href: "/properties/a/book" }];
    expect(ensureAccessHandoffLink(links, false)).toBe(links);
  });
});
