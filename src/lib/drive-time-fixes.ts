// Pure planning/assertion logic for the one-time Owner-approved correction of
// the SM City Lipa / Casa Marikit drive times stored in the 5 properties'
// seed-derived content fields. Owner-confirmed 2026-09-27 from the homes:
// SM City Lipa about 7 km / about 20 minutes by car, Casa Marikit about 10 km /
// about 30 minutes by car, both varying with traffic.
//
// Callers: scripts/fix-property-content.ts (CLI, second pass after the
// Maculot/Mbps/parking pass) and the TEMPORARY DEC-012 route
// src/app/api/admin/dev/fix-drive-times/route.ts. Both do the Prisma I/O; this
// module has no Prisma or database access so it can be unit tested offline.
//
// Unlike the Maculot pass (whole-field overwrite from the seed modules), this
// pass makes TARGETED replacements: each rule below swaps one exact old
// substring for one exact new substring, so any unrelated admin edit elsewhere
// in a field survives. The table is self-contained on purpose — it must not
// read prisma/property-content/*, because dev carries the post-PR #26 content
// and main the pre-#26 content, and this file has to work unchanged on both.
// Wording mirrors commit db0cdbc (PR #26) exactly.
import { createHash } from "node:crypto";
import {
  CONTENT_FIELDS,
  EXPECTED_PROPERTIES,
  UnexpectedContentError,
  excerptDiff,
  type ContentFieldName,
} from "./property-content-fixes";

export type Replacement = { old: string; new: string };

// neighborhoodPlaces: move the SM Lipa and Casa Marikit entries out of their
// old short-radius band into a new band inserted just before the
// "30 to 45 minutes by car" band (where db0cdbc places it).
export type NeighborhoodMove = {
  fromBand: string;
  smOld: string;
  casaOld: string;
};

export const NEW_BAND_LABEL = "About 20 to 30 minutes by car";
export const INSERT_BEFORE_BAND = "30 to 45 minutes by car";
const SM_SUFFIX = " — about 20 minutes";
const CASA_SUFFIX = " — about 30 minutes";

export type DriveTimeRules = {
  description?: Replacement[];
  bestForSegments?: Replacement[];
  amenityDetails?: Replacement[];
  propertyFaqs?: Replacement[];
  neighborhoodPlaces?: NeighborhoodMove;
};

export type DriveTimeField = keyof DriveTimeRules;
export const DRIVE_TIME_FIELDS: DriveTimeField[] = [
  "description",
  "bestForSegments",
  "amenityDetails",
  "neighborhoodPlaces",
  "propertyFaqs",
];

const B34_AMENITY_NEW = "About 20 minutes by car to SM Lipa; hospitals within 10 minutes";
const MICKEY_AMENITY_NEW = "About 20 minutes by car to SM Lipa";
const MICKEY_FAQ: Replacement = {
  old: "Bring groceries from SM Lipa, five to ten minutes away.",
  new: "Bring groceries from SM Lipa, about 20 minutes away by car.",
};
const MICKEY_AMENITY: Replacement = {
  old: "5 to 10 minutes to SM Lipa, restaurants, hospitals",
  new: MICKEY_AMENITY_NEW,
};
const MICKEY_NEIGHBORHOOD: NeighborhoodMove = {
  fromBand: "5 to 10 minutes by car",
  smOld: "SM Lipa (mall, supermarket, pharmacy, food court)",
  casaOld: "Casa Marikit Restaurant",
};

// The reviewed replacement table, keyed by slug. Built from `git show db0cdbc
// -- prisma/property-content/`. A field not listed here is never modified.
export const DRIVE_TIME_RULES: Record<string, DriveTimeRules> = {
  "cozy-1-bedroom": {
    description: [
      {
        old: "and a five-minute drive from SM Lipa for groceries.",
        new: "and about 20 minutes by car from SM Lipa for groceries.",
      },
    ],
    amenityDetails: [{ old: "5 minutes by car to SM Lipa, restaurants, hospitals", new: B34_AMENITY_NEW }],
    neighborhoodPlaces: {
      fromBand: "5 minutes by car",
      smOld: "SM Lipa (mall, supermarket, pharmacy, food court)",
      casaOld: "Casa Marikit Restaurant",
    },
  },
  "spacious-2-bedroom": {
    description: [
      {
        old: "The unit is a short drive to SM Lipa and Casa Marikit.",
        new: "SM City Lipa is about 20 minutes away by car and Casa Marikit about 30, depending on traffic.",
      },
    ],
    bestForSegments: [
      {
        old: "SM Lipa for diaper runs is 5 minutes away.",
        new: "SM Lipa for diaper runs is about 20 minutes away by car.",
      },
    ],
    amenityDetails: [{ old: "5 to 10 minutes to SM Lipa, restaurants, hospitals", new: B34_AMENITY_NEW }],
    neighborhoodPlaces: {
      fromBand: "5 minutes by car",
      smOld: "SM Lipa (mall, grocery, pharmacy, food court)",
      casaOld: "Casa Marikit Restaurant",
    },
    propertyFaqs: [
      {
        old: "SM Lipa five minutes away for diapers and supplies",
        new: "SM Lipa about 20 minutes away by car for diapers and supplies",
      },
    ],
  },
  "mickey-in-lipa--family-staycation--sleeps-7": {
    bestForSegments: [
      {
        old: "SM Lipa is five to ten minutes away for diaper and snack runs",
        new: "SM Lipa is about 20 minutes away by car for diaper and snack runs",
      },
    ],
    amenityDetails: [MICKEY_AMENITY],
    neighborhoodPlaces: MICKEY_NEIGHBORHOOD,
    propertyFaqs: [MICKEY_FAQ],
  },
  "mickey-in-lipa--family-house--sleeps-11": {
    description: [
      {
        old: "a quiet gated subdivision five to ten minutes from SM Lipa.",
        new: "a quiet gated subdivision about 20 minutes by car from SM Lipa.",
      },
    ],
    amenityDetails: [MICKEY_AMENITY],
    neighborhoodPlaces: MICKEY_NEIGHBORHOOD,
    propertyFaqs: [MICKEY_FAQ],
  },
  "mickey-in-lipa--full-family-house--sleeps-15": {
    description: [
      {
        old: "Everyone under one roof, five to ten minutes from SM Lipa and",
        new: "Everyone under one roof, about 20 minutes by car from SM Lipa and",
      },
    ],
    amenityDetails: [MICKEY_AMENITY],
    neighborhoodPlaces: MICKEY_NEIGHBORHOOD,
    propertyFaqs: [MICKEY_FAQ],
  },
};

// ── Residual (stale) drive-time detection ──────────────────────────────────
// Judged one sentence at a time and tied to the landmark in that sentence, so
// "a short drive from Taal and Tagaytay" or "hospitals within 10 minutes" are
// never flagged on their own. Same matcher family as
// src/lib/__tests__/drive-time-claims.test.ts.
const SM_LIPA = /\bSM (?:City )?Lipa\b/i;
const OLD_SM_TIME =
  /\b(?:five|5)(?:\s*(?:–|—|-|to)\s*(?:ten|10))?[\s-]*(?:minutes?|mins?)\b|\b(?:five|5)\s*(?:–|—|-|to)\s*(?:ten|10)\b/i;
const CASA_MARIKIT = /\bCasa Marikit\b/i;
const OLD_CASA_TIME =
  /\bshort drive\b|\b10\s*(?:–|—|-|to)\s*15\b|\bten to fifteen\b|\b45\b|\bforty-five\b|\b(?:five|5)[\s-]*(?:minutes?|mins?)\b/i;

function sentences(text: string): string[] {
  return text.split("\n").flatMap((line) => line.split(/(?<=[.!?])\s+/));
}

export function isStaleDriveTimeSentence(s: string): boolean {
  return (SM_LIPA.test(s) && OLD_SM_TIME.test(s)) || (CASA_MARIKIT.test(s) && OLD_CASA_TIME.test(s));
}

function collectStrings(value: unknown, out: string[]): void {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => collectStrings(v, out));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => collectStrings(v, out));
}

// The texts a stale claim could hide in, for one raw field value. JSON fields
// are judged per string value; neighborhoodPlaces entries are judged together
// with their band label ("5 minutes by car: SM Lipa (...)"), since the label
// carries the time claim.
function textsOf(field: ContentFieldName, raw: string): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [raw];
  }
  if (typeof parsed !== "object" || parsed === null) return [raw];
  const out: string[] = [];
  if (field === "neighborhoodPlaces" && Array.isArray(parsed)) {
    for (const g of parsed as { radiusLabel?: unknown; places?: unknown }[]) {
      if (g && Array.isArray(g.places)) {
        for (const p of g.places) if (typeof p === "string") out.push(`${String(g.radiusLabel ?? "")}: ${p}`);
      }
    }
  }
  collectStrings(parsed, out);
  return out;
}

export function findStaleDriveTimeExcerpts(field: ContentFieldName, raw: string): string[] {
  return textsOf(field, raw).flatMap((t) => sentences(t).filter(isStaleDriveTimeSentence));
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
function applyReplacements(
  where: string,
  text: string,
  rules: Replacement[],
  fragments: Fragment[]
): string {
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

function replaceInJsonStrings(
  where: string,
  value: unknown,
  rules: Replacement[],
  fragments: Fragment[]
): unknown {
  if (typeof value === "string") return applyReplacements(where, value, rules, fragments);
  if (Array.isArray(value)) return value.map((v) => replaceInJsonStrings(where, v, rules, fragments));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = replaceInJsonStrings(where, v, rules, fragments);
    return out;
  }
  return value;
}

type Group = { radiusLabel: string; places: string[] };

function moveNeighborhood(where: string, parsed: unknown, move: NeighborhoodMove, fragments: Fragment[]): unknown {
  if (!Array.isArray(parsed)) throw new UnexpectedContentError(`${where}: expected an array of bands.`);
  const groups = parsed as Group[];
  const holders = (entry: string) => groups.filter((g) => Array.isArray(g?.places) && g.places.includes(entry));
  const smHolders = holders(move.smOld);
  const casaHolders = holders(move.casaOld);

  if (smHolders.length === 0 && casaHolders.length === 0) return parsed; // already moved (or rewritten)

  const problems: string[] = [];
  if (smHolders.length !== 1 || casaHolders.length !== 1) {
    problems.push("expected both the SM Lipa and the Casa Marikit entry exactly once");
  } else {
    if (smHolders[0].radiusLabel !== move.fromBand || casaHolders[0] !== smHolders[0]) {
      problems.push(`expected both entries in the "${move.fromBand}" band`);
    }
    if (smHolders[0].places.filter((p) => p === move.smOld).length !== 1) problems.push("duplicate SM Lipa entry");
    if (smHolders[0].places.filter((p) => p === move.casaOld).length !== 1) problems.push("duplicate Casa Marikit entry");
    if (smHolders[0].places.length <= 2) problems.push(`moving both entries would empty the "${move.fromBand}" band`);
  }
  if (groups.some((g) => g?.radiusLabel === NEW_BAND_LABEL)) problems.push(`a "${NEW_BAND_LABEL}" band already exists`);
  const anchor = groups.findIndex((g) => g?.radiusLabel === INSERT_BEFORE_BAND);
  if (anchor === -1) problems.push(`no "${INSERT_BEFORE_BAND}" band to insert before`);
  if (problems.length > 0) {
    throw new UnexpectedContentError(`${where}: unexpected band layout — ${problems.join("; ")}. Refusing to write.`);
  }

  const from = smHolders[0];
  const out: unknown[] = [];
  groups.forEach((g, i) => {
    if (i === anchor) {
      out.push({ radiusLabel: NEW_BAND_LABEL, places: [move.smOld + SM_SUFFIX, move.casaOld + CASA_SUFFIX] });
    }
    // Rebuild only the source band (same key order); every other band is passed
    // through as the parsed object, so it re-serializes byte-identically.
    out.push(g === from ? { ...g, places: g.places.filter((p) => p !== move.smOld && p !== move.casaOld) } : g);
  });
  fragments.push({
    old: `"${move.fromBand}": ${move.smOld}, ${move.casaOld}`,
    new: `"${NEW_BAND_LABEL}": ${move.smOld + SM_SUFFIX}, ${move.casaOld + CASA_SUFFIX}`,
  });
  return out;
}

export function applyDriveTimeRulesToField(
  slug: string,
  field: DriveTimeField,
  raw: string
): { value: string; fragments: Fragment[] } {
  const rules = DRIVE_TIME_RULES[slug]?.[field];
  const fragments: Fragment[] = [];
  if (!rules) return { value: raw, fragments };
  const where = `${slug}.${field}`;

  if (field === "description") {
    return { value: applyReplacements(where, raw, rules as Replacement[], fragments), fragments };
  }
  const parsed = parseRoundTrip(where, raw);
  const next =
    field === "neighborhoodPlaces"
      ? moveNeighborhood(where, parsed, rules as NeighborhoodMove, fragments)
      : replaceInJsonStrings(where, parsed, rules as Replacement[], fragments);
  return { value: fragments.length > 0 ? JSON.stringify(next) : raw, fragments };
}

// ── Whole-run planning ─────────────────────────────────────────────────────
export type PropertyContentRow = { id: number; slug: string } & Partial<Record<ContentFieldName, string | null>>;

export type DriveTimeFieldChange = {
  id: number;
  slug: string;
  field: DriveTimeField;
  before: string;
  after: string;
  fragments: Fragment[];
  excerpt: { old: string; new: string };
};

export type DriveTimePlan = {
  changes: DriveTimeFieldChange[];
  updates: { id: number; slug: string; data: Partial<Record<DriveTimeField, string>> }[];
  planHash: string;
};

// Same {id, slug} gate as scripts/fix-property-content.ts: exactly the 5 known
// properties, each by immutable id with its slug as a second check.
export function assertExpectedPropertyRows(rows: { id: number; slug: string }[]): void {
  if (rows.length !== EXPECTED_PROPERTIES.length) {
    throw new UnexpectedContentError(`Expected exactly ${EXPECTED_PROPERTIES.length} properties, found ${rows.length}.`);
  }
  for (const expected of EXPECTED_PROPERTIES) {
    const matches = rows.filter((r) => r.id === expected.id);
    if (matches.length !== 1) {
      throw new UnexpectedContentError(`Expected exactly 1 record for id=${expected.id}, found ${matches.length}.`);
    }
    if (matches[0].slug !== expected.slug) {
      throw new UnexpectedContentError(
        `id=${expected.id} slug mismatch: expected "${expected.slug}", found "${matches[0].slug}". Refusing to proceed.`
      );
    }
    if (!DRIVE_TIME_RULES[expected.slug]) {
      throw new UnexpectedContentError(`No drive-time rules defined for slug "${expected.slug}".`);
    }
  }
}

// Short fingerprint of exactly what would be written, including the current
// ("before") values, so any change to the rows since the dry run changes it.
export function computePlanHash(changes: DriveTimeFieldChange[]): string {
  const canonical = changes.map((c) => [c.id, c.slug, c.field, c.before, c.after]);
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex").slice(0, 16);
}

// Builds the full plan or throws UnexpectedContentError. After the targeted
// replacements, EVERY content field of every property is re-scanned; any
// stale SM Lipa / Casa Marikit drive time left anywhere aborts the whole run
// with a property/field/excerpt list for a human to fix by hand.
export function planDriveTimeFixes(rows: PropertyContentRow[]): DriveTimePlan {
  assertExpectedPropertyRows(rows);
  const ordered = EXPECTED_PROPERTIES.map((p) => rows.find((r) => r.id === p.id)!);

  const changes: DriveTimeFieldChange[] = [];
  const updates: DriveTimePlan["updates"] = [];
  const residual: string[] = [];

  for (const row of ordered) {
    const data: Partial<Record<DriveTimeField, string>> = {};
    for (const field of DRIVE_TIME_FIELDS) {
      const before = row[field];
      if (before == null) continue;
      const { value, fragments } = applyDriveTimeRulesToField(row.slug, field, before);
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
    for (const field of CONTENT_FIELDS) {
      const value = (data as Partial<Record<ContentFieldName, string>>)[field] ?? row[field];
      if (value == null) continue;
      for (const s of findStaleDriveTimeExcerpts(field, value)) {
        residual.push(`id=${row.id} ${row.slug}.${field}: "${s.length > 200 ? `${s.slice(0, 200)}…` : s}"`);
      }
    }
    if (Object.keys(data).length > 0) updates.push({ id: row.id, slug: row.slug, data });
  }

  if (residual.length > 0) {
    throw new UnexpectedContentError(
      `Stale SM Lipa / Casa Marikit drive time(s) not covered by the reviewed replacement table — fix by hand in admin, then re-run. Nothing was written.\n  ${residual.join("\n  ")}`
    );
  }

  return { changes, updates, planHash: computePlanHash(changes) };
}

// ── Temporary-route POST gate (pure, so it's testable without a DB) ────────
export const DRIVE_TIME_CONFIRM = "APPLY-DRIVE-TIMES";

export type ApplyGateResult = { ok: true } | { ok: false; status: 400 | 409; error: string };

export function checkApplyRequest(body: unknown, currentPlanHash: string): ApplyGateResult {
  if (!body || typeof body !== "object") {
    return { ok: false, status: 400, error: `JSON body required: {"confirm":"${DRIVE_TIME_CONFIRM}","planHash":"<from GET>"}` };
  }
  const { confirm, planHash } = body as { confirm?: unknown; planHash?: unknown };
  if (confirm !== DRIVE_TIME_CONFIRM) {
    return { ok: false, status: 400, error: `Missing or wrong confirm — expected "${DRIVE_TIME_CONFIRM}".` };
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
