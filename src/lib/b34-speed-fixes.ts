// Pure planning/assertion logic for the one-time Owner-approved correction of
// the B34 (Cozy 1-Bedroom / Spacious 2-Bedroom) internet-speed wording stored
// in these 2 properties' seed-derived content fields. Owner-confirmed
// 2026-11-04 (DEC-032): B34's fiber WiFi is now marketed at 500+ Mbps,
// superseding the "up to 340 Mbps" figure the 2026-09-07 Maculot/Mbps/parking
// correction established. B38 (Mickey in Lipa, "up to 520 Mbps") is untouched
// and out of scope for this module.
//
// Caller: the TEMPORARY DEC-012 route /api/admin/dev/fix-b34-speed, which does
// the Prisma I/O; this module has no Prisma or database access so it can be
// unit tested offline against frozen fixtures.
//
// Same TARGETED-replacement shape as src/lib/drive-time-fixes.ts (DEC-016
// extension): a hardcoded, reviewed table of exact old → new substrings per
// slug/field, built from `git show 5a2abfb -- prisma/property-content/b34-content.ts`
// (PR #105). JSON fields are edited on the parsed value and re-serialized with
// JSON.stringify, aborting if the stored text doesn't round-trip. Never a
// whole-field overwrite, so an unrelated admin edit elsewhere in a field
// survives. An absent old substring is treated as "already fixed" and skipped;
// more than one match is ambiguous and aborts.
//
// DEC-032 regex-collision gotcha (option (a), not (b)): this module is
// DELIBERATELY independent of src/lib/property-content-fixes.ts's
// STALE_PATTERNS / detectStalePatterns. That table's `stale-mbps` entry
// (`/400 ?mbps|500\+? ?mbps/i`) was built to catch the old, wrong 400/500 Mbps
// figures the 2026-09-07 correction replaced — it also matches the new,
// correct "500+ Mbps" wording this module writes. Reusing it here (or in a
// post-write re-scan) would make the write look permanently "stale" and could
// make scripts/fix-property-content.ts's assertFixedValueIsClean gate refuse
// to write if ever run again unmodified. Instead, this module's own residual
// check (`findStale340Excerpts` / `STALE_340`) looks only for a literal
// "340 Mbps"/"340Mbps" survivor in the 2 B34 properties' speed-bearing fields —
// a narrower, purpose-built pattern that can never fire on "500+ Mbps". Not
// wired into scripts/fix-property-content.ts or property-content-fixes.ts.
import { createHash } from "node:crypto";
import { excerptDiff, UnexpectedContentError } from "./property-content-fixes";

export type Replacement = { old: string; new: string };

// The 2 B34 properties this module is scoped to, by immutable id with slug as
// a second check — same shape as EXPECTED_PROPERTIES in property-content-fixes.ts,
// but deliberately not imported from there (that list is all 5 properties;
// this module must never touch the 3 Mickey/B38 rows).
export type PropertyTarget = { id: number; slug: string };
export const B34_PROPERTIES: PropertyTarget[] = [
  { id: 1, slug: "cozy-1-bedroom" },
  { id: 2, slug: "spacious-2-bedroom" },
];

// Plain-text fields on Property are stored as-is; these three are JSON arrays
// (JSON.stringify'd), parsed/re-serialized rather than string-replaced directly.
export type SpeedField =
  | "seoTitle"
  | "seoDescription"
  | "heroSummary"
  | "description"
  | "bestForSegments"
  | "amenityDetails"
  | "propertyFaqs";

export const SPEED_FIELDS: SpeedField[] = [
  "seoTitle",
  "seoDescription",
  "heroSummary",
  "description",
  "bestForSegments",
  "amenityDetails",
  "propertyFaqs",
];

const JSON_FIELDS = new Set<SpeedField>(["bestForSegments", "amenityDetails", "propertyFaqs"]);

export type SpeedRules = Partial<Record<SpeedField, Replacement[]>>;

// The reviewed replacement table, keyed by slug. Wording mirrors commit
// 5a2abfb (PR #105) exactly — built from its diff of
// prisma/property-content/b34-content.ts. A field not listed here is never
// modified. spacious-2-bedroom's seoTitle/seoDescription/heroSummary/
// bestForSegments never mentioned a Mbps figure, so they have no rules.
export const SPEED_RULES: Record<string, SpeedRules> = {
  "cozy-1-bedroom": {
    seoTitle: [
      {
        old: "Fiber WiFi up to 340 Mbps | Haven in Lipa",
        new: "Fiber WiFi at 500+ Mbps | Haven in Lipa",
      },
    ],
    seoDescription: [
      {
        old: "fiber WiFi up to 340 Mbps, Netflix",
        new: "fiber WiFi at 500+ Mbps, Netflix",
      },
    ],
    heroSummary: [
      {
        old: "fiber WiFi up to 340 Mbps (speed-tested)",
        new: "fiber WiFi at 500+ Mbps (speed-tested)",
      },
    ],
    description: [
      {
        old: "WiFi runs at up to 340 Mbps tested speeds",
        new: "WiFi runs at 500+ Mbps tested speeds",
      },
    ],
    bestForSegments: [
      {
        old: "Fiber WiFi up to 340 Mbps, dedicated workspace",
        new: "Fiber WiFi at 500+ Mbps, dedicated workspace",
      },
    ],
    amenityDetails: [
      {
        old: "Fiber WiFi up to 340 Mbps (speed-tested, tested again, still 340)",
        new: "Fiber WiFi at 500+ Mbps (speed-tested, tested again, still 500+)",
      },
    ],
    propertyFaqs: [
      {
        old: "Yes — fiber up to 340 Mbps, speed-tested by guests on multiple devices",
        new: "Yes — fiber at 500+ Mbps, speed-tested by guests on multiple devices",
      },
    ],
  },
  "spacious-2-bedroom": {
    description: [
      {
        old: "WiFi, up to 340 Mbps, means",
        new: "WiFi, 500+ Mbps, means",
      },
    ],
    amenityDetails: [
      {
        old: "Fiber WiFi up to 340 Mbps (speed-tested by guests, real number)",
        new: "Fiber WiFi at 500+ Mbps (speed-tested by guests, real number)",
      },
    ],
    propertyFaqs: [
      {
        old: "Speed-tested at up to 340 Mbps, with a backup internet connection available.",
        new: "Speed-tested at 500+ Mbps, with a backup internet connection available.",
      },
    ],
  },
};

// ── Residual (stale) detection ─────────────────────────────────────────────
// Narrow on purpose (see the DEC-032 gotcha note above): matches a literal
// "340 Mbps" / "340Mbps" survivor only. Never matches "500+ Mbps" or "520 Mbps"
// (B38), so it cannot flag this module's own output as stale.
export const STALE_340 = /\b340\s*mbps\b/i;

function sentences(text: string): string[] {
  return text.split("\n").flatMap((line) => line.split(/(?<=[.!?])\s+/));
}

export function isStale340Sentence(s: string): boolean {
  return STALE_340.test(s);
}

function collectStrings(value: unknown, out: string[]): void {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => collectStrings(v, out));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => collectStrings(v, out));
}

function textsOf(field: SpeedField, raw: string): string[] {
  if (!JSON_FIELDS.has(field)) return [raw];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [raw];
  }
  const out: string[] = [];
  collectStrings(parsed, out);
  return out;
}

export function findStale340Excerpts(field: SpeedField, raw: string): string[] {
  return textsOf(field, raw).flatMap((t) => sentences(t).filter(isStale340Sentence));
}

// ── Applying the rules ─────────────────────────────────────────────────────
function countOccurrences(haystack: string, needle: string): number {
  let n = 0;
  for (let i = haystack.indexOf(needle); i !== -1; i = haystack.indexOf(needle, i + needle.length)) n++;
  return n;
}

export type Fragment = { old: string; new: string };

// Applies each replacement to `text` if its old substring is present exactly
// once. Absent → nothing to do (already fixed, or rewritten by an admin — the
// residual scan decides whether that rewrite is still stale). More than once →
// ambiguous, abort.
function applyReplacements(where: string, text: string, rules: Replacement[], fragments: Fragment[]): string {
  let out = text;
  for (const r of rules) {
    const n = countOccurrences(out, r.old);
    if (n === 0) continue;
    if (n > 1) {
      throw new UnexpectedContentError(`${where}: "${r.old}" occurs ${n} times — ambiguous. Refusing to write.`);
    }
    out = out.replace(r.old, () => r.new);
    fragments.push({ old: r.old, new: r.new });
  }
  return out;
}

function parseRoundTrip(where: string, raw: string): unknown {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new UnexpectedContentError(`${where}: not valid JSON. Refusing to write.`);
  }
  // The seed writes these columns with plain JSON.stringify. If the stored text
  // doesn't round-trip, re-serializing would reformat bytes we weren't asked to
  // touch — abort instead.
  if (JSON.stringify(parsed) !== raw) {
    throw new UnexpectedContentError(
      `${where}: stored JSON is not in JSON.stringify format; re-serializing would reformat it. Refusing to write.`
    );
  }
  return parsed;
}

function replaceInJsonStrings(where: string, value: unknown, rules: Replacement[], fragments: Fragment[]): unknown {
  if (typeof value === "string") return applyReplacements(where, value, rules, fragments);
  if (Array.isArray(value)) return value.map((v) => replaceInJsonStrings(where, v, rules, fragments));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = replaceInJsonStrings(where, v, rules, fragments);
    return out;
  }
  return value;
}

export function applySpeedRulesToField(
  slug: string,
  field: SpeedField,
  raw: string
): { value: string; fragments: Fragment[] } {
  const rules = SPEED_RULES[slug]?.[field];
  const fragments: Fragment[] = [];
  if (!rules) return { value: raw, fragments };
  const where = `${slug}.${field}`;

  if (!JSON_FIELDS.has(field)) {
    return { value: applyReplacements(where, raw, rules, fragments), fragments };
  }
  const parsed = parseRoundTrip(where, raw);
  const next = replaceInJsonStrings(where, parsed, rules, fragments);
  return { value: fragments.length > 0 ? JSON.stringify(next) : raw, fragments };
}

// ── Whole-run planning ─────────────────────────────────────────────────────
export type PropertyContentRow = { id: number; slug: string } & Partial<Record<SpeedField, string | null>>;

export type SpeedFieldChange = {
  id: number;
  slug: string;
  field: SpeedField;
  before: string;
  after: string;
  fragments: Fragment[];
  excerpt: { old: string; new: string };
};

export type SpeedPlan = {
  changes: SpeedFieldChange[];
  updates: { id: number; slug: string; data: Partial<Record<SpeedField, string>> }[];
  planHash: string;
};

export function assertExpectedPropertyRows(rows: { id: number; slug: string }[]): void {
  if (rows.length !== B34_PROPERTIES.length) {
    throw new UnexpectedContentError(`Expected exactly ${B34_PROPERTIES.length} properties, found ${rows.length}.`);
  }
  for (const expected of B34_PROPERTIES) {
    const matches = rows.filter((r) => r.id === expected.id);
    if (matches.length !== 1) {
      throw new UnexpectedContentError(`Expected exactly 1 record for id=${expected.id}, found ${matches.length}.`);
    }
    if (matches[0].slug !== expected.slug) {
      throw new UnexpectedContentError(
        `id=${expected.id} slug mismatch: expected "${expected.slug}", found "${matches[0].slug}". Refusing to proceed.`
      );
    }
    if (!SPEED_RULES[expected.slug]) {
      throw new UnexpectedContentError(`No B34 speed rules defined for slug "${expected.slug}".`);
    }
  }
}

// Short fingerprint of exactly what would be written, including the current
// ("before") values, so any change to the rows since the dry run changes it.
export function computePlanHash(changes: SpeedFieldChange[]): string {
  const canonical = changes.map((c) => [c.id, c.slug, c.field, c.before, c.after]);
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex").slice(0, 16);
}

// Builds the full plan or throws UnexpectedContentError. After the targeted
// replacements, every speed-bearing field of both B34 properties is
// re-scanned; any stale "340 Mbps" left anywhere aborts the whole run with a
// property/field/excerpt list for a human to fix by hand.
export function planB34SpeedFixes(rows: PropertyContentRow[]): SpeedPlan {
  assertExpectedPropertyRows(rows);
  const ordered = B34_PROPERTIES.map((p) => rows.find((r) => r.id === p.id)!);

  const changes: SpeedFieldChange[] = [];
  const updates: SpeedPlan["updates"] = [];
  const residual: string[] = [];

  for (const row of ordered) {
    const data: Partial<Record<SpeedField, string>> = {};
    for (const field of SPEED_FIELDS) {
      const before = row[field];
      if (before == null) continue;
      const { value, fragments } = applySpeedRulesToField(row.slug, field, before);
      if (value === before) continue;
      data[field] = value;
      changes.push({
        id: row.id,
        slug: row.slug,
        field,
        before,
        after: value,
        fragments,
        excerpt: excerptDiff(before, value),
      });
    }
    for (const field of SPEED_FIELDS) {
      const value = data[field] ?? row[field];
      if (value == null) continue;
      for (const s of findStale340Excerpts(field, value)) {
        residual.push(`id=${row.id} ${row.slug}.${field}: "${s.length > 200 ? `${s.slice(0, 200)}…` : s}"`);
      }
    }
    if (Object.keys(data).length > 0) updates.push({ id: row.id, slug: row.slug, data });
  }

  if (residual.length > 0) {
    throw new UnexpectedContentError(
      `Stale "340 Mbps" wording not covered by the reviewed replacement table — fix by hand in admin, then re-run. Nothing was written.\n  ${residual.join("\n  ")}`
    );
  }

  return { changes, updates, planHash: computePlanHash(changes) };
}

// ── Route-only POST gate ────────────────────────────────────────────────────
// Used only by the TEMPORARY route /api/admin/dev/fix-b34-speed. Kept here
// (not in the route file) so it's unit-testable without a Next.js request
// object — same precedent as the old DRIVE_TIME_CONFIRM/checkApplyRequest in
// src/lib/drive-time-fixes.ts. Deleted together with the route and this
// function's tests in the follow-up PR once the Owner's run is confirmed;
// planB34SpeedFixes above stays.
export const APPLY_B34_SPEED_CONFIRM = "APPLY-B34-SPEED";

export type ApplyGateResult = { ok: true } | { ok: false; status: 400 | 409; error: string };

export function checkApplyRequest(body: unknown, currentPlanHash: string): ApplyGateResult {
  if (!body || typeof body !== "object") {
    return {
      ok: false,
      status: 400,
      error: `JSON body required: {"confirm":"${APPLY_B34_SPEED_CONFIRM}","planHash":"<from GET>"}`,
    };
  }
  const { confirm, planHash } = body as { confirm?: unknown; planHash?: unknown };
  if (confirm !== APPLY_B34_SPEED_CONFIRM) {
    return { ok: false, status: 400, error: `Missing or wrong confirm — expected "${APPLY_B34_SPEED_CONFIRM}".` };
  }
  if (typeof planHash !== "string" || planHash.length === 0) {
    return { ok: false, status: 400, error: "Missing planHash — run GET first and pass its planHash." };
  }
  if (planHash !== currentPlanHash) {
    return {
      ok: false,
      status: 409,
      error: `planHash mismatch (sent ${planHash}, current ${currentPlanHash}) — the data changed since the dry run. Re-run GET and review again.`,
    };
  }
  return { ok: true };
}
