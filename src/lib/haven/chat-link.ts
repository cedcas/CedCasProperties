/**
 * Chat link rendering rules, shared between the site-mounted widget and the blog embed
 * (/embed/haven) — one implementation, both surfaces (haven-chat-usage-2026-11-09.md #5).
 */

export type ChatSurface = "site" | "blog";

/**
 * A relative in-site href (e.g. `/properties/cozy-1-bedroom/book`), as seen inside the blog
 * embed's iframe, must open the real site in the TOP window (not navigate the iframe) and
 * carry the attribution UTMs the blog brief specifies. `URL` handles query/hash correctly
 * for a bare path, a path with its own query string, or one with a `#book` fragment.
 */
export function resolveBlogEmbedHref(href: string): string {
  if (!href.startsWith("/")) return href;
  const url = new URL(href, "https://haveninlipa.com");
  url.searchParams.set("utm_source", "blog");
  url.searchParams.set("utm_medium", "haven_chat");
  url.searchParams.set("utm_campaign", "ask-haven");
  return url.toString();
}

export interface ResolvedChatLink {
  href: string;
  /** Relative hrefs on `chatSurface: "site"` stay client-side (Next `<Link>`); every other
   * case (external links, and any relative href once on the blog surface) is a plain `<a>`. */
  useNextLink: boolean;
  target?: "_top" | "_blank";
}

export function resolveChatLink(href: string, chatSurface: ChatSurface): ResolvedChatLink {
  const isRelative = href.startsWith("/");
  if (isRelative && chatSurface === "site") {
    return { href, useNextLink: true };
  }
  if (isRelative) {
    return { href: resolveBlogEmbedHref(href), useNextLink: false, target: "_top" };
  }
  return { href, useNextLink: false, target: "_blank" };
}
