import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

/**
 * Guard against the superseded drive-time claims creeping back. Owner-confirmed
 * 2026-09-27 from the homes (Bella Vita): SM City Lipa about 7 km / about 20 minutes,
 * Casa Marikit about 10 km / about 30 minutes, both varying with traffic. The old copy
 * said SM Lipa was "5 minutes" / "5–10 minutes" / "five to ten minutes" away and Casa
 * Marikit "a short drive" away.
 *
 * Plain source scan, one sentence at a time, over the files that carry these claims
 * (the property-content modules are what `seed:property-seo` wrote to production).
 */

const ROOT = path.resolve(__dirname, "../../..");
const CONTENT_DIR = path.join(ROOT, "prisma/property-content");
const FILES = [
  "src/lib/faqs.ts",
  "src/app/weddings-accommodation/page.tsx",
  ...readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith(".ts"))
    .map((f) => path.join("prisma/property-content", f)),
];

const SM_LIPA = /\bSM (?:City )?Lipa\b/i;
const OLD_SM_TIME = /\b(?:five|5)(?:\s*(?:–|-|to)\s*(?:ten|10))?[\s-]minutes?\b/i;
const CASA_MARIKIT = /\bCasa Marikit\b/i;
const SHORT_DRIVE = /\bshort drive\b/i;

/** Source split into lines, then sentences, so a claim is judged by its own sentence. */
function sentences(source: string): string[] {
  return source.split("\n").flatMap((line) => line.split(/(?<=[.!?])\s+/));
}

function offending(source: string): string[] {
  return sentences(source).filter(
    (s) => (SM_LIPA.test(s) && OLD_SM_TIME.test(s)) || (CASA_MARIKIT.test(s) && SHORT_DRIVE.test(s)),
  );
}

describe("drive-time claims for SM Lipa and Casa Marikit", () => {
  it("the matcher catches every superseded phrasing", () => {
    for (const old of [
      "it's roughly 5–10 minutes to SM Lipa for groceries",
      "SM Lipa five minutes away for diapers",
      "5 minutes by car to SM Lipa, restaurants, hospitals",
      "5 to 10 minutes to SM Lipa, restaurants, hospitals",
      "Bring groceries from SM Lipa, five to ten minutes away.",
      "a five-minute drive from SM Lipa for groceries.",
      "Casa Marikit is a short drive away.",
      "The unit is a short drive to SM Lipa and Casa Marikit.",
    ]) {
      expect(offending(old), old).toHaveLength(1);
    }
    expect(offending("SM City Lipa is about 20 minutes away by car.")).toEqual([]);
    expect(offending("Casa Marikit is about 10 km away, roughly 30 minutes by car.")).toEqual([]);
  });

  it.each(FILES)("%s has no superseded SM Lipa / Casa Marikit drive time", (file) => {
    expect(offending(readFileSync(path.join(ROOT, file), "utf8"))).toEqual([]);
  });
});
