import { describe, it, expect } from "vitest";
import { readdirSync } from "fs";
import path from "path";
import { BLOG_REDIRECT_SLUGS, buildBlogSlugRedirects } from "@/lib/blog-redirect-slugs";

/** Every real top-level route segment under src/app (the app's actual route table). */
function appTopLevelSegments(): string[] {
  const appDir = path.resolve(__dirname, "../../app");
  return readdirSync(appDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => !name.startsWith("_") && !name.startsWith("."));
}

describe("BLOG_REDIRECT_SLUGS", () => {
  it("has no duplicates", () => {
    expect(new Set(BLOG_REDIRECT_SLUGS).size).toBe(BLOG_REDIRECT_SLUGS.length);
  });

  it("never shadows an existing top-level app route", () => {
    const routes = new Set(appTopLevelSegments());
    for (const slug of BLOG_REDIRECT_SLUGS) {
      expect(routes.has(slug)).toBe(false);
    }
  });
});

describe("buildBlogSlugRedirects", () => {
  const redirects = buildBlogSlugRedirects();

  it("emits a permanent redirect for every slug, with and without a trailing slash", () => {
    expect(redirects.length).toBe(BLOG_REDIRECT_SLUGS.length * 2);
    for (const r of redirects) expect(r.permanent).toBe(true);
  });

  it("points at the matching blog.haveninlipa.com post, trailing slash included", () => {
    const sample = redirects.find((r) => r.source === "/meet-haven-ai-assistant");
    expect(sample).toEqual({
      source: "/meet-haven-ai-assistant",
      destination: "https://blog.haveninlipa.com/meet-haven-ai-assistant/",
      permanent: true,
    });
    const sampleSlash = redirects.find((r) => r.source === "/meet-haven-ai-assistant/");
    expect(sampleSlash?.destination).toBe("https://blog.haveninlipa.com/meet-haven-ai-assistant/");
  });

  it("every source is unique (no self-collision within the redirect list)", () => {
    const sources = redirects.map((r) => r.source);
    expect(new Set(sources).size).toBe(sources.length);
  });
});
