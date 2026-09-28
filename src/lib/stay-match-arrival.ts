/**
 * Landing-side confirmation of a Stay Match click (blog → main site).
 *
 * The blog's `stay_match_click` depends entirely on a GA4 beacon leaving the
 * blog page as it unloads, and referrers are origin-only, so a Stay Match click
 * can't otherwise be told apart from an ordinary in-article link. From plugin
 * v1.0.2, every Stay Match href carries two non-UTM params:
 *
 *   ?hil_sm=<property|book>&hil_sm_post=<post_slug>
 *
 * The main site fires `stay_match_arrival` once and strips them. Not UTMs on
 * purpose: UTMs would start a new GA4 session and overwrite the real source
 * (organic/Facebook) of a blog → main-site journey in the same property.
 *
 * Pure functions; wired up in src/components/Analytics.tsx.
 */

export const STAY_MATCH_PARAM = "hil_sm";
export const STAY_MATCH_POST_PARAM = "hil_sm_post";

const DESTINATIONS = new Set(["property", "book"]);
// WordPress post slugs are lowercase, hyphenated, and may be percent-encoded
// for non-ASCII titles. Anything else is dropped rather than sent to GA4.
const SLUG_RE = /^[a-z0-9][a-z0-9%_-]{0,199}$/i;

export interface StayMatchArrival {
  destination: "property" | "book";
  post_slug: string;
  /** Listing slug from the landing path, when it's a property or /book page. */
  property?: string;
}

/** `/properties/<slug>` or `/properties/<slug>/book` → `<slug>`. */
export function propertySlugFromPath(pathname: string): string | undefined {
  const m = /^\/properties\/([^/]+)(?:\/book)?\/?$/.exec(pathname);
  return m ? decodeURIComponent(m[1]) : undefined;
}

/** Returns the arrival to report, or null if the URL isn't a valid Stay Match landing. */
export function parseStayMatchArrival(href: string): StayMatchArrival | null {
  const url = new URL(href);
  const destination = url.searchParams.get(STAY_MATCH_PARAM);
  const postSlug = url.searchParams.get(STAY_MATCH_POST_PARAM);
  if (!destination || !DESTINATIONS.has(destination)) return null;
  if (!postSlug || !SLUG_RE.test(postSlug)) return null;
  const property = propertySlugFromPath(url.pathname);
  return {
    destination: destination as StayMatchArrival["destination"],
    post_slug: postSlug,
    ...(property ? { property } : {}),
  };
}

/**
 * The same URL without the Stay Match params (other params and the hash are
 * kept), as a path+search+hash string suitable for history.replaceState.
 * Returns null when there is nothing to strip.
 */
export function stripStayMatchParams(href: string): string | null {
  const url = new URL(href);
  if (!url.searchParams.has(STAY_MATCH_PARAM) && !url.searchParams.has(STAY_MATCH_POST_PARAM)) {
    return null;
  }
  url.searchParams.delete(STAY_MATCH_PARAM);
  url.searchParams.delete(STAY_MATCH_POST_PARAM);
  return `${url.pathname}${url.search}${url.hash}`;
}
