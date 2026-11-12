import { describe, it, expect } from "vitest";
import { resolveBlogEmbedHref, resolveChatLink } from "@/lib/haven/chat-link";

describe("resolveBlogEmbedHref", () => {
  it("makes a relative href absolute with the blog-attribution UTMs", () => {
    expect(resolveBlogEmbedHref("/properties/cozy-1-bedroom/book")).toBe(
      "https://haveninlipa.com/properties/cozy-1-bedroom/book?utm_source=blog&utm_medium=haven_chat&utm_campaign=ask-haven"
    );
  });

  it("preserves an existing query string and hash", () => {
    const resolved = resolveBlogEmbedHref("/properties/cozy-1-bedroom?guests=2#book");
    const url = new URL(resolved);
    expect(url.pathname).toBe("/properties/cozy-1-bedroom");
    expect(url.searchParams.get("guests")).toBe("2");
    expect(url.searchParams.get("utm_source")).toBe("blog");
    expect(url.searchParams.get("utm_medium")).toBe("haven_chat");
    expect(url.searchParams.get("utm_campaign")).toBe("ask-haven");
    expect(url.hash).toBe("#book");
  });

  it("leaves an already-absolute href untouched", () => {
    expect(resolveBlogEmbedHref("https://m.me/haveninlipa")).toBe("https://m.me/haveninlipa");
  });
});

describe("resolveChatLink", () => {
  it("site surface: a relative href stays client-side (Next <Link>)", () => {
    const resolved = resolveChatLink("/properties/cozy-1-bedroom/book", "site");
    expect(resolved).toEqual({ href: "/properties/cozy-1-bedroom/book", useNextLink: true });
  });

  it("blog surface: a relative href becomes an absolute top-window link", () => {
    const resolved = resolveChatLink("/properties/cozy-1-bedroom/book", "blog");
    expect(resolved.useNextLink).toBe(false);
    expect(resolved.target).toBe("_top");
    expect(resolved.href).toContain("https://haveninlipa.com/properties/cozy-1-bedroom/book");
    expect(resolved.href).toContain("utm_campaign=ask-haven");
  });

  it("an already-external href (Messenger) opens in a new tab on either surface", () => {
    for (const surface of ["site", "blog"] as const) {
      const resolved = resolveChatLink("https://m.me/haveninlipa", surface);
      expect(resolved).toEqual({
        href: "https://m.me/haveninlipa",
        useNextLink: false,
        target: "_blank",
      });
    }
  });
});
