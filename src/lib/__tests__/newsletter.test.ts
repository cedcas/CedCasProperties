import { describe, it, expect } from "vitest";
import {
  buildNewsletterNote,
  normalizeNewsletterEmail,
  normalizeNewsletterFirstName,
  normalizeNewsletterPhone,
  normalizeNewsletterSource,
  sanitizeUtm,
  DEFAULT_NEWSLETTER_SOURCE,
} from "@/lib/newsletter";

describe("normalizeNewsletterEmail", () => {
  it("trims and lowercases a valid email", () => {
    expect(normalizeNewsletterEmail("  Guest@Example.COM  ")).toEqual({ value: "guest@example.com" });
  });

  it("rejects missing, malformed, or oversized input", () => {
    expect(normalizeNewsletterEmail("")).toHaveProperty("error");
    expect(normalizeNewsletterEmail(undefined)).toHaveProperty("error");
    expect(normalizeNewsletterEmail("not-an-email")).toHaveProperty("error");
    expect(normalizeNewsletterEmail("a@b")).toHaveProperty("error");
    expect(normalizeNewsletterEmail(`${"a".repeat(260)}@example.com`)).toHaveProperty("error");
  });
});

describe("normalizeNewsletterFirstName", () => {
  it("is optional — blank/missing maps to null", () => {
    expect(normalizeNewsletterFirstName(undefined)).toEqual({ value: null });
    expect(normalizeNewsletterFirstName(null)).toEqual({ value: null });
    expect(normalizeNewsletterFirstName("")).toEqual({ value: null });
    expect(normalizeNewsletterFirstName("   ")).toEqual({ value: null });
  });

  it("trims and collapses whitespace", () => {
    expect(normalizeNewsletterFirstName("  Juan   Dela  ")).toEqual({ value: "Juan Dela" });
  });

  it("rejects names over 50 characters", () => {
    expect(normalizeNewsletterFirstName("a".repeat(51))).toHaveProperty("error");
  });
});

describe("normalizeNewsletterPhone", () => {
  it("is optional — blank/missing maps to null", () => {
    expect(normalizeNewsletterPhone(undefined)).toEqual({ value: null });
    expect(normalizeNewsletterPhone("")).toEqual({ value: null });
  });

  it("accepts common PH mobile formats and normalizes to E.164", () => {
    for (const input of ["09171234567", "9171234567", "+639171234567", "639171234567", "0917-123-4567", "0917 123 4567"]) {
      expect(normalizeNewsletterPhone(input), input).toEqual({ value: "+639171234567" });
    }
  });

  it("rejects non-PH, landline-shaped, or garbage input", () => {
    for (const input of ["+1 555 123 4567", "not a phone", "123", "+639212345"]) {
      expect(normalizeNewsletterPhone(input), input).toHaveProperty("error");
    }
  });
});

describe("normalizeNewsletterSource", () => {
  it("passes through a known source", () => {
    expect(normalizeNewsletterSource("site:footer")).toBe("site:footer");
  });

  it("defaults on anything unrecognized", () => {
    expect(normalizeNewsletterSource("site:something-else")).toBe(DEFAULT_NEWSLETTER_SOURCE);
    expect(normalizeNewsletterSource(undefined)).toBe(DEFAULT_NEWSLETTER_SOURCE);
    expect(normalizeNewsletterSource(123)).toBe(DEFAULT_NEWSLETTER_SOURCE);
  });
});

describe("sanitizeUtm", () => {
  it("keeps only whitelisted keys and trims/caps values", () => {
    const out = sanitizeUtm({
      utm_source: "  sms  ",
      utm_medium: "text",
      utm_campaign: "holiday2026",
      not_a_utm_key: "dropped",
      utm_term: "a".repeat(200),
    });
    expect(out).toEqual({
      utm_source: "sms",
      utm_medium: "text",
      utm_campaign: "holiday2026",
      utm_term: "a".repeat(100),
    });
  });

  it("ignores non-string values and non-object input", () => {
    expect(sanitizeUtm({ utm_source: 123 })).toEqual({});
    expect(sanitizeUtm(null)).toEqual({});
    expect(sanitizeUtm("nope")).toEqual({});
  });
});

describe("buildNewsletterNote", () => {
  it("always includes source, then present UTM fields in order, then page", () => {
    const note = buildNewsletterNote({
      source: "site:footer",
      utm: { utm_source: "sms", utm_campaign: "holiday2026" },
      page: "/newsletter",
    });
    expect(note).toBe("source=site:footer; utm_source=sms; utm_campaign=holiday2026; page=/newsletter");
  });

  it("omits absent UTM fields and page", () => {
    expect(buildNewsletterNote({ source: "site:homepage", utm: {} })).toBe("source=site:homepage");
  });
});
