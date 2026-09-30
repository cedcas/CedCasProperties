import { describe, it, expect } from "vitest";
import { DEFAULT_OG_IMAGE, SEO_FIELD_MAX, normalizeSeoField, socialMetadata, stripBrandSuffix } from "@/lib/seo-metadata";

/**
 * Page-level title + social metadata contract (2026-09-30 SEO audit).
 *
 * - Seeded `Property.seoTitle` values end in "| Haven in Lipa" and the root layout's
 *   title template appends it again, so the property page must strip it first.
 * - Every public page must emit its OWN og:url (= canonical path) and a share image:
 *   App Router openGraph/twitter objects replace the root's instead of merging.
 */

describe("stripBrandSuffix", () => {
  it("removes a seeded '| Haven in Lipa' suffix", () => {
    expect(stripBrandSuffix("Spacious 2BR Vacation Rental in Lipa City, Batangas — Sleeps 9 | Haven in Lipa")).toBe(
      "Spacious 2BR Vacation Rental in Lipa City, Batangas — Sleeps 9"
    );
  });

  it("removes dash and em-dash forms, case-insensitively, with stray whitespace", () => {
    expect(stripBrandSuffix("Cozy 1BR — haven in lipa  ")).toBe("Cozy 1BR");
    expect(stripBrandSuffix("Cozy 1BR - Haven in Lipa")).toBe("Cozy 1BR");
  });

  it("cleans an already-doubled suffix completely", () => {
    expect(stripBrandSuffix("Mickey House — Sleeps 15 | Haven in Lipa | Haven in Lipa")).toBe("Mickey House — Sleeps 15");
  });

  it("leaves titles without a trailing brand untouched, including the brand mid-title", () => {
    expect(stripBrandSuffix("About Haven in Lipa")).toBe("About Haven in Lipa");
    expect(stripBrandSuffix("Become a Haven in Lipa Ambassador — Share Lipa, Earn Rewards")).toBe(
      "Become a Haven in Lipa Ambassador — Share Lipa, Earn Rewards"
    );
    // Hyphenated words must not be mistaken for a separator.
    expect(stripBrandSuffix("Mickey-Themed Family House in Lipa City")).toBe("Mickey-Themed Family House in Lipa City");
  });

  it("never strips a title down to nothing", () => {
    expect(stripBrandSuffix("| Haven in Lipa")).toBe("| Haven in Lipa");
  });
});

describe("socialMetadata", () => {
  it("sets og:url to the page's own path and restates siteName", () => {
    const meta = socialMetadata({ title: "FAQ", description: "d", path: "/faq" });
    expect(meta.openGraph).toMatchObject({ title: "FAQ", description: "d", url: "/faq", siteName: "Haven in Lipa" });
    expect(meta.twitter).toMatchObject({ card: "summary_large_image", title: "FAQ", description: "d" });
  });

  it("falls back to the 1200×630 default image when no page image is given", () => {
    for (const image of [undefined, null, { url: "" }]) {
      const meta = socialMetadata({ title: "t", description: "d", path: "/x", image });
      expect(meta.openGraph).toMatchObject({ images: [DEFAULT_OG_IMAGE] });
      expect(meta.twitter).toMatchObject({ images: [DEFAULT_OG_IMAGE.url] });
    }
    expect(DEFAULT_OG_IMAGE).toMatchObject({ width: 1200, height: 630 });
  });

  it("uses the page's own image when provided", () => {
    const image = { url: "https://example.public.blob.vercel-storage.com/a.jpg", alt: "Cozy 1BR" };
    const meta = socialMetadata({ title: "t", description: "d", path: "/properties/cozy-1-bedroom", image });
    expect(meta.openGraph).toMatchObject({ images: [image] });
    expect(meta.twitter).toMatchObject({ images: [image.url] });
  });
});

describe("normalizeSeoField (admin SEO title/description)", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeSeoField("  Cozy 1BR\n in   Lipa  ")).toEqual({ value: "Cozy 1BR in Lipa" });
  });

  it("maps blank or null to null so the page falls back to generated copy", () => {
    expect(normalizeSeoField("   ")).toEqual({ value: null });
    expect(normalizeSeoField(null)).toEqual({ value: null });
  });

  it("rejects non-strings and over-long values", () => {
    expect(normalizeSeoField(42)).toHaveProperty("error");
    expect(normalizeSeoField("x".repeat(SEO_FIELD_MAX + 1))).toHaveProperty("error");
    expect(normalizeSeoField("x".repeat(SEO_FIELD_MAX))).toEqual({ value: "x".repeat(SEO_FIELD_MAX) });
  });
});
