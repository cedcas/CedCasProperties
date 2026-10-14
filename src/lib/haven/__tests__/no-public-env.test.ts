import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

/**
 * Haven AI's API keys and other provider config are server-only. A `NEXT_PUBLIC_*` env
 * var is inlined into the client bundle at build time — using one here would ship a
 * secret (or at least the provider/model choice) to every browser. Scans the actual
 * source tree rather than trusting a comment, so a future edit can't silently regress it.
 */
const root = path.resolve(__dirname, "../../../..");
const HAVEN_DIRS = ["src/lib/haven", "src/app/api/haven", "src/app/api/cron/haven-retention"];

function allFiles(dir: string): string[] {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap((entry) => {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) return allFiles(rel);
    return entry.name.endsWith(".ts") || entry.name.endsWith(".tsx") ? [rel] : [];
  });
}

describe("Haven AI server code never reads a NEXT_PUBLIC_ env var", () => {
  const files = HAVEN_DIRS.flatMap(allFiles).filter((f) => !f.includes("__tests__"));

  it("found the expected library files (sanity-checks the scan itself)", () => {
    expect(files.length).toBeGreaterThan(5);
  });

  it.each(files)("%s", (file) => {
    const contents = fs.readFileSync(path.join(root, file), "utf8");
    // Matches an actual env var reference (NEXT_PUBLIC_FOO), not prose mentioning the term.
    expect(contents).not.toMatch(/NEXT_PUBLIC_[A-Z0-9_]+/);
  });
});
