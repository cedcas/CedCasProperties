import { describe, it, expect } from "vitest";
import {
  parseStayMatchArrival,
  propertySlugFromPath,
  stripStayMatchParams,
} from "@/lib/stay-match-arrival";

const BASE = "https://haveninlipa.com";

describe("propertySlugFromPath", () => {
  it("extracts the listing slug from property and book pages", () => {
    expect(propertySlugFromPath("/properties/spacious-2-bedroom")).toBe("spacious-2-bedroom");
    expect(propertySlugFromPath("/properties/spacious-2-bedroom/book")).toBe("spacious-2-bedroom");
    expect(propertySlugFromPath("/properties")).toBeUndefined();
    expect(propertySlugFromPath("/staycation")).toBeUndefined();
    expect(propertySlugFromPath("/properties/a/b")).toBeUndefined();
  });
});

describe("parseStayMatchArrival", () => {
  it("parses a property landing", () => {
    expect(
      parseStayMatchArrival(`${BASE}/properties/spacious-2-bedroom?hil_sm=property&hil_sm_post=barkada-getaway-lipa`)
    ).toEqual({ destination: "property", post_slug: "barkada-getaway-lipa", property: "spacious-2-bedroom" });
  });

  it("parses a book landing and ignores unrelated params", () => {
    expect(
      parseStayMatchArrival(`${BASE}/properties/cozy-1-bedroom/book?checkIn=2026-10-01&hil_sm=book&hil_sm_post=road-trip`)
    ).toEqual({ destination: "book", post_slug: "road-trip", property: "cozy-1-bedroom" });
  });

  it("omits property off a listing path", () => {
    expect(parseStayMatchArrival(`${BASE}/staycation?hil_sm=property&hil_sm_post=x`)).toEqual({
      destination: "property",
      post_slug: "x",
    });
  });

  it.each([
    `${BASE}/properties/a`,
    `${BASE}/properties/a?hil_sm=property`,
    `${BASE}/properties/a?hil_sm=elsewhere&hil_sm_post=x`,
    `${BASE}/properties/a?hil_sm=book&hil_sm_post=${encodeURIComponent("<script>")}`,
    `${BASE}/properties/a?hil_sm=book&hil_sm_post=${"a".repeat(201)}`,
    `${BASE}/properties/a?utm_source=blog`,
  ])("rejects %s", (href) => {
    expect(parseStayMatchArrival(href)).toBeNull();
  });
});

describe("stripStayMatchParams", () => {
  it("removes only the Stay Match params, keeping others and the hash", () => {
    expect(stripStayMatchParams(`${BASE}/properties/a?hil_sm=property&hil_sm_post=x`)).toBe("/properties/a");
    expect(stripStayMatchParams(`${BASE}/properties/a/book?checkIn=2026-10-01&hil_sm=book&hil_sm_post=x#book`)).toBe(
      "/properties/a/book?checkIn=2026-10-01#book"
    );
  });

  it("strips malformed Stay Match params too", () => {
    expect(stripStayMatchParams(`${BASE}/properties/a?hil_sm=junk`)).toBe("/properties/a");
  });

  it("returns null when there is nothing to strip", () => {
    expect(stripStayMatchParams(`${BASE}/properties/a?checkIn=x`)).toBeNull();
  });
});
