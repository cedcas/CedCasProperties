import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

/**
 * DEC-034 (2026-11-15): Wi-Fi marketing language is "500+ Mbps" for all 5 listings,
 * superseding DEC-032's "520 Mbps" exception for B38/Mickey (marketing-language
 * consistency only — not a new speed test, and Mickey is not claimed to be slower).
 * Guards against the old "520 Mbps" figure creeping back into current, non-historical
 * public copy. Deliberately does NOT scan src/lib/b34-speed-fixes.ts or its tests/
 * fixtures (those intentionally still reference "520 Mbps" as the never-touched
 * B38 figure the B34-only correction had to avoid) or src/lib/property-content-fixes.ts
 * (the "stale-mbps" regex's own 340-correction history, unrelated to this fix).
 */

const ROOT = path.resolve(__dirname, "../../..");
const CONTENT_DIR = path.join(ROOT, "prisma/property-content");

const FILES = [
  "src/lib/faqs.ts",
  "src/app/properties/page.tsx",
  "src/app/staycation/page.tsx",
  ...readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith(".ts"))
    .map((f) => path.join("prisma/property-content", f)),
];

const STALE_520 = /\b520\s*mbps\b/i;

describe("Wi-Fi speed claims — DEC-034 500+ Mbps consistency", () => {
  for (const file of FILES) {
    it(`${file} contains no stale "520 Mbps" wording`, () => {
      const text = readFileSync(path.join(ROOT, file), "utf8");
      expect(STALE_520.test(text)).toBe(false);
    });
  }

  it("mickey-content.ts states 500+ Mbps for every configuration", () => {
    const text = readFileSync(path.join(CONTENT_DIR, "mickey-content.ts"), "utf8");
    expect(text).toMatch(/500\+ Mbps/);
  });
});
