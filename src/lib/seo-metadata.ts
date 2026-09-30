import type { Metadata } from "next";

// Shared helpers for page-level <title> and social (Open Graph / Twitter)
// metadata. Two App Router behaviours make these necessary:
//
// 1. The root layout's `title.template` ("%s | Haven in Lipa") is applied to
//    every page-level title string. The seeded `Property.seoTitle` values
//    already end in "| Haven in Lipa", so rendering them unmodified produced
//    "… | Haven in Lipa | Haven in Lipa" on every listing (2026-09-30 SEO audit).
//
// 2. `openGraph` and `twitter` do not merge across segments — a page that sets
//    its own object REPLACES the root's wholesale (dropping the share image),
//    and a page that sets none INHERITS the root's (homepage title and
//    `og:url` = "/" on /faq, /about, /privacy, /terms, /ambassadors). Every
//    public page should therefore build both through `socialMetadata()`.

export const SITE_NAME = "Haven in Lipa";

// Trailing brand, as the template would append it or as seeded copy already
// carries it: "| Haven in Lipa", "— Haven in Lipa", "- Haven in Lipa".
const BRAND_SUFFIX = /\s*[|—–-]\s*Haven in Lipa\s*$/i;

/** Removes a trailing brand suffix so the root title template adds it exactly once. */
export function stripBrandSuffix(title: string): string {
  let out = title.trim();
  // Loop so an already-doubled value ("… | Haven in Lipa | Haven in Lipa")
  // is fully cleaned; stop if stripping would leave nothing.
  while (BRAND_SUFFIX.test(out)) {
    const next = out.replace(BRAND_SUFFIX, "").trim();
    if (!next) break;
    out = next;
  }
  return out;
}

/** Soft targets shown in the admin editor (Google truncates beyond roughly these). */
export const SEO_TITLE_TARGET = 60; // excludes the " | Haven in Lipa" the template appends
export const SEO_DESCRIPTION_TARGET = 155;
/** Hard cap the admin API accepts for either field. */
export const SEO_FIELD_MAX = 300;

/**
 * Normalizes an admin-submitted seoTitle/seoDescription: trims, maps blank to
 * null (the page then falls back to its generated title/description), and
 * rejects anything over SEO_FIELD_MAX. Returns `{ error }` for a bad value.
 */
export function normalizeSeoField(value: unknown): { value: string | null } | { error: string } {
  if (value === null) return { value: null };
  if (typeof value !== "string") return { error: "must be text" };
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed) return { value: null };
  if (trimmed.length > SEO_FIELD_MAX) return { error: `must be ${SEO_FIELD_MAX} characters or fewer` };
  return { value: trimmed };
}

/**
 * 1200×630 branded fallback share image. The previous fallback was the square
 * 1024×1024 logo declared as 1200×630, which large-image cards cropped.
 */
export const DEFAULT_OG_IMAGE = {
  url: "/brand-assets/og-default.jpg",
  width: 1200,
  height: 630,
  alt: "Haven in Lipa — short-term rentals in Lipa City, Batangas",
};

type ShareImage = { url: string; width?: number; height?: number; alt?: string };

/**
 * Page-specific Open Graph + Twitter metadata. `title` is the page's own title
 * WITHOUT the brand suffix (social cards show `siteName` separately); `path` is
 * the page's canonical path, so `og:url` always matches the canonical.
 */
export function socialMetadata({
  title,
  description,
  path,
  image,
  type = "website",
}: {
  title: string;
  description: string;
  path: string;
  image?: ShareImage | null;
  type?: "website" | "article";
}): Pick<Metadata, "openGraph" | "twitter"> {
  const img = image?.url ? image : DEFAULT_OG_IMAGE;
  return {
    openGraph: {
      title,
      description,
      type,
      url: path,
      siteName: SITE_NAME,
      images: [img],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [img.url],
    },
  };
}
