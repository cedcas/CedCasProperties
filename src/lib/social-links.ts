/**
 * Owner-approved official social profiles (confirmed by Cedric, 2026-10-16).
 * Single source of truth — every place a social icon/link/sameAs entry
 * renders (footer, homepage, ContactForm, /about, LocalBusiness schema)
 * reads from here instead of repeating the URLs.
 *
 * Airbnb is intentionally NOT included — it isn't one of the owner's four
 * confirmed social profiles, and its `sameAs` inclusion is tracked separately
 * (see src/lib/local-business-schema.ts).
 */
export type SocialLink = {
  name: string;
  url: string;
  /** Font Awesome brands icon class, e.g. "fa-youtube" (used as `fa-brands ${icon}`). */
  icon: string;
};

export const SOCIAL_LINKS: readonly SocialLink[] = [
  { name: "Facebook", url: "https://www.facebook.com/haveninlipa", icon: "fa-facebook-f" },
  { name: "Instagram", url: "https://www.instagram.com/haven_inlipa/", icon: "fa-instagram" },
  { name: "TikTok", url: "https://www.tiktok.com/@haven.in.lipa", icon: "fa-tiktok" },
  { name: "YouTube", url: "https://www.youtube.com/@Haven-in-Lipa", icon: "fa-youtube" },
] as const;

export const SOCIAL_LINK_URLS: readonly string[] = SOCIAL_LINKS.map((s) => s.url);
