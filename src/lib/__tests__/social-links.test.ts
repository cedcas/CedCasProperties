import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { SOCIAL_LINKS, SOCIAL_LINK_URLS } from "@/lib/social-links";
import { BUSINESS_SAME_AS } from "@/lib/local-business-schema";

const OWNER_APPROVED_URLS = [
  "https://www.facebook.com/haveninlipa",
  "https://www.instagram.com/haven_inlipa/",
  "https://www.tiktok.com/@haven.in.lipa",
  "https://www.youtube.com/@Haven-in-Lipa",
];

const SRC_DIR = path.resolve(__dirname, "../../..", "src");

function walk(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    // Exclude test files themselves — this file legitimately references the
    // stale string as the pattern it's asserting against.
    if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name)) return [full];
    return [];
  });
}

describe("social links — owner-approved profiles (2026-10-16)", () => {
  it("SOCIAL_LINK_URLS is exactly the 4 owner-approved URLs", () => {
    expect(SOCIAL_LINK_URLS).toEqual(OWNER_APPROVED_URLS);
  });

  it("SOCIAL_LINKS names line up 1:1 with the owner-approved URLs", () => {
    expect(SOCIAL_LINKS.map((s) => s.name)).toEqual(["Facebook", "Instagram", "TikTok", "YouTube"]);
  });

  it("BUSINESS_SAME_AS (LodgingBusiness schema) contains all 4 owner-approved URLs", () => {
    expect(BUSINESS_SAME_AS).toEqual(expect.arrayContaining(OWNER_APPROVED_URLS));
  });

  it("the about-page Person sameAs is wired to the shared SOCIAL_LINK_URLS constant", () => {
    const source = fs.readFileSync(path.join(SRC_DIR, "app/about/page.tsx"), "utf-8");
    expect(source).toMatch(/sameAs:\s*\[\s*"https:\/\/airbnb\.com\/h\/fullhousebellavita",\s*\.\.\.SOCIAL_LINK_URLS,?\s*\]/);
  });

  it("no stale '@haven_inlipa' TikTok URL remains anywhere in src", () => {
    const offenders = walk(SRC_DIR).filter((file) =>
      fs.readFileSync(file, "utf-8").includes("tiktok.com/@haven_inlipa")
    );
    expect(offenders).toEqual([]);
  });
});
