// Pure planning/assertion logic for the one-time Owner-approved retitle of
// Mickey Sleeps 11's "Groups of 12 or more" bestForSegments entry (2026-10-10,
// Cedric). Stay Match (blog plugin) scores an intent phrase against each
// segment's title (3x) + body (1x); that title made "groups of 12 or more"
// recommend the 11-guest house, which actually tops out at 11.
//
// Caller: scripts/fix-sleeps11-segment.ts, which does the Prisma I/O; this
// module has no Prisma or database access so it can be unit tested offline,
// following the same split as src/lib/drive-time-fixes.ts.
//
// Self-contained on purpose: the old/new strings are hardcoded here rather
// than imported from prisma/property-content/mickey-content.ts, because a
// production row may have drifted from the seed module via an admin edit
// (bestForSegments has no admin UI today, but DEC-015's narrow-field pattern
// could add one later) and this script's job is to check the row's *actual*
// stored title, not assume it matches the repo.
import { createHash } from "node:crypto";
import { UnexpectedContentError, excerptDiff } from "./property-content-fixes";

export const TARGET_PROPERTY = {
  id: 4,
  slug: "mickey-in-lipa--family-house--sleeps-11",
} as const;

export const OLD_TITLE = "Groups of 12 or more";
export const NEW_TITLE = "Need more room? See the full house";
export const NEW_BODY =
  "The rate covers 9 guests and this configuration sleeps up to 11, with an extra per-guest fee for the 10th and 11th guests. If you need more space, the full-house configuration opens a second bunk room.";

type Segment = {
  title: string;
  body: string;
  internalLinkLabel?: string;
  internalLinkUrl?: string;
};

// Replaces only the title/body of the one segment currently titled exactly
// OLD_TITLE. internalLinkLabel/internalLinkUrl, every other segment, and key
// order are passed through untouched. Refuses (throws) if the stored JSON
// doesn't round-trip, isn't an array, or doesn't contain exactly one segment
// with the expected old title — including the "already fixed" case, so this
// is intentionally not idempotent-by-silently-skipping: a second run must be
// a visible no-op decision, not a silent one.
export function applySleeps11SegmentFix(raw: string): {
  value: string;
  fragment: { old: string; new: string };
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new UnexpectedContentError("bestForSegments: not valid JSON. Refusing to write.");
  }
  if (JSON.stringify(parsed) !== raw) {
    throw new UnexpectedContentError(
      "bestForSegments: stored JSON is not in JSON.stringify format; re-serializing would reformat it. Refusing to write."
    );
  }
  if (!Array.isArray(parsed)) {
    throw new UnexpectedContentError("bestForSegments: expected an array of segments. Refusing to write.");
  }

  const segments = parsed as Segment[];
  const matches = segments.filter((s) => s && s.title === OLD_TITLE);
  if (matches.length !== 1) {
    throw new UnexpectedContentError(
      `bestForSegments: expected exactly one segment titled "${OLD_TITLE}", found ${matches.length}. ` +
        "Refusing to write — the current title may already differ from what this script expects."
    );
  }

  const next = segments.map((s) =>
    s.title === OLD_TITLE ? { ...s, title: NEW_TITLE, body: NEW_BODY } : s
  );
  const value = JSON.stringify(next);
  return { value, fragment: excerptDiff(raw, value) };
}

export type Sleeps11FixPlan = {
  id: number;
  slug: string;
  before: string;
  after: string;
  fragment: { old: string; new: string };
  planHash: string;
};

// Same {id, slug} gate as scripts/fix-property-content.ts / drive-time-fixes.ts:
// refuses to proceed unless the row is exactly the expected property.
export function planSleeps11SegmentFix(row: {
  id: number;
  slug: string;
  bestForSegments: string | null;
}): Sleeps11FixPlan {
  if (row.id !== TARGET_PROPERTY.id || row.slug !== TARGET_PROPERTY.slug) {
    throw new UnexpectedContentError(
      `Expected property id=${TARGET_PROPERTY.id} slug="${TARGET_PROPERTY.slug}", found id=${row.id} slug="${row.slug}". Refusing to proceed.`
    );
  }
  if (row.bestForSegments == null) {
    throw new UnexpectedContentError("bestForSegments is null — nothing to fix. Refusing to proceed.");
  }

  const { value, fragment } = applySleeps11SegmentFix(row.bestForSegments);
  const planHash = createHash("sha256")
    .update(JSON.stringify([row.id, row.slug, row.bestForSegments, value]))
    .digest("hex")
    .slice(0, 16);

  return { id: row.id, slug: row.slug, before: row.bestForSegments, after: value, fragment, planHash };
}
