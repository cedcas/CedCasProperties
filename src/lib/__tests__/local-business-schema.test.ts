import { describe, it, expect } from "vitest";
import { buildLocalBusinessJsonLd, BUSINESS_PHONE, GBP_GEO, GBP_MAP_URL, BUSINESS_SAME_AS } from "@/lib/local-business-schema";

describe("buildLocalBusinessJsonLd", () => {
  const schema = buildLocalBusinessJsonLd();

  it("uses LodgingBusiness, a more specific LocalBusiness subtype", () => {
    expect(schema["@type"]).toBe("LodgingBusiness");
  });

  it("carries hasMap pointing at the verified GBP pin", () => {
    expect(schema.hasMap).toBe(GBP_MAP_URL);
    expect(schema.hasMap).toContain("Haven+in+Lipa");
  });

  it("carries geo matching the verified GBP coordinates", () => {
    expect(schema.geo).toEqual({
      "@type": "GeoCoordinates",
      latitude: GBP_GEO.latitude,
      longitude: GBP_GEO.longitude,
    });
  });

  it("telephone matches the GBP number exactly (E.164 for +63 906 655 4415)", () => {
    expect(schema.telephone).toBe("+639066554415");
    expect(schema.telephone).toBe(BUSINESS_PHONE);
    expect(schema.contactPoint.telephone).toBe(BUSINESS_PHONE);
  });

  it("sameAs includes the blog's Organization profiles (Facebook, Instagram, TikTok)", () => {
    expect(schema.sameAs).toEqual(expect.arrayContaining([
      "https://www.facebook.com/haveninlipa",
      "https://www.instagram.com/haven_inlipa/",
      "https://www.tiktok.com/@haven_inlipa",
    ]));
  });

  it("does not add a hardcoded aggregateRating (would drift from the live GBP rating)", () => {
    expect(schema).not.toHaveProperty("aggregateRating");
  });

  it("returns a fresh object each call (no shared mutable sameAs array)", () => {
    const a = buildLocalBusinessJsonLd();
    const b = buildLocalBusinessJsonLd();
    expect(a.sameAs).not.toBe(b.sameAs);
    expect(a.sameAs).not.toBe(BUSINESS_SAME_AS);
  });
});
