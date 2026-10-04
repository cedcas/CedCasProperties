import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * `/sitemap.xml` contract, pinned without a database (the listings loader is mocked).
 *
 * What must not regress (2026-09-30 SEO audit, LOW findings):
 * - `lastModified` is never the request time: inventory pages use the newest listing
 *   update, fixed-copy pages carry no date at all;
 * - `/ambassadors` is listed (Owner decision 2026-10-04: it should be findable).
 */

const loaders = vi.hoisted(() => ({ getPublicListings: vi.fn() }));
vi.mock("@/lib/listings", () => loaders);

import sitemap from "@/app/sitemap";

const BASE = process.env.NEXTAUTH_URL || "https://haveninlipa.com";
const byPath = async () => {
  const entries = await sitemap();
  return new Map(entries.map((e) => [e.url.replace(BASE, "") || "/", e]));
};

describe("sitemap", () => {
  beforeEach(() => {
    loaders.getPublicListings.mockReset();
  });

  it("dates inventory pages by the newest listing update, including string dates from the cache", async () => {
    loaders.getPublicListings.mockResolvedValue([
      { slug: "cozy-1-bedroom", updatedAt: new Date("2026-09-01T00:00:00Z") },
      { slug: "spacious-2-bedroom", updatedAt: "2026-09-28T04:11:00.000Z" },
    ]);
    const map = await byPath();
    const newest = new Date("2026-09-28T04:11:00.000Z").getTime();

    for (const path of ["/", "/properties", "/staycation", "/weddings-accommodation", "/about"]) {
      expect(new Date(map.get(path)!.lastModified as Date).getTime(), path).toBe(newest);
    }
    expect(new Date(map.get("/properties/cozy-1-bedroom")!.lastModified as Date).getTime()).toBe(
      new Date("2026-09-01T00:00:00Z").getTime()
    );
  });

  it("gives fixed-copy pages no lastModified", async () => {
    loaders.getPublicListings.mockResolvedValue([{ slug: "cozy-1-bedroom", updatedAt: new Date("2026-09-01T00:00:00Z") }]);
    const map = await byPath();
    for (const path of ["/faq", "/privacy", "/terms", "/ambassadors"]) {
      expect(map.has(path), path).toBe(true);
      expect(map.get(path)!.lastModified, path).toBeUndefined();
    }
  });

  it("never stamps the request time, even with no listings", async () => {
    loaders.getPublicListings.mockResolvedValue([]);
    const before = Date.now();
    const entries = await sitemap();
    for (const e of entries) {
      if (e.lastModified !== undefined) {
        expect(new Date(e.lastModified as Date).getTime(), e.url).toBeLessThan(before - 1000);
      }
    }
    expect(entries.some((e) => e.url.endsWith("/ambassadors"))).toBe(true);
  });
});
