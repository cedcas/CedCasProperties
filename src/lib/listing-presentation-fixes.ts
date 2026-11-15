// Pure planning/assertion logic for the one-time Owner-approved production
// correction of (a) `Property.name` — still the keyword-stuffed, Airbnb-style
// string in production/dev (e.g. "Spacious 2BR Getaway |
// Netflix•Wi-Fi•9Pax•Parking") — to the plain DEC-034 canonical name, and
// (b) the Mickey/B38 "up to 520 Mbps" wording in `tagline` and the other
// speed-bearing content fields, superseded by "500+ Mbps" (DEC-034, which
// extends DEC-032's B34-only 500+ Mbps correction to B38 for marketing-
// language consistency — not a new speed test, and B38 is not claimed slower).
//
// Caller: this module has no Prisma or database access so it can be unit
// tested offline against frozen fixtures — see src/lib/b34-speed-fixes.ts for
// the precedent this follows (DEC-012/DEC-016 pattern): GET = dry-run plan +
// planHash, POST = confirm string + planHash, one transaction, post-write
// re-verification, never a schema change.
//
// Two independent correction tables live in this one module because the task
// asked for ONE route covering both (DEC-034): a whole-field `name` rewrite
// (all 5 properties) and a targeted substring replacement for Mickey's Mbps
// wording (3 properties, several fields) — never B34, whose 500+ Mbps
// production correction already ran and was removed (DEC-032 addenda).
import { createHash } from "node:crypto";
import { basePropertyName } from "./property-name";
import { CANONICAL_PROPERTY_DISPLAY } from "./property-display";
import { excerptDiff, UnexpectedContentError } from "./property-content-fixes";

export type Replacement = { old: string; new: string };

// All 5 properties, by immutable id with slug as a second check — same shape
// and same ids as EXPECTED_PROPERTIES in property-content-fixes.ts, kept as
// its own literal here (not imported) so this module's scope is self-evident
// without cross-referencing another file.
export type PropertyTarget = { id: number; slug: string };
export const ALL_PROPERTIES: PropertyTarget[] = [
  { id: 1, slug: "cozy-1-bedroom" },
  { id: 2, slug: "spacious-2-bedroom" },
  { id: 3, slug: "mickey-in-lipa--family-staycation--sleeps-7" },
  { id: 4, slug: "mickey-in-lipa--family-house--sleeps-11" },
  { id: 5, slug: "mickey-in-lipa--full-family-house--sleeps-15" },
];

const MICKEY_SLUGS = new Set([
  "mickey-in-lipa--family-staycation--sleeps-7",
  "mickey-in-lipa--family-house--sleeps-11",
  "mickey-in-lipa--full-family-house--sleeps-15",
]);

// ── Part A: Property.name — whole-field, prefix-preserving ─────────────────
//
// A production row may carry a leading "[DEVDB] " (or similar bracket) tag —
// basePropertyName() already strips that before deriving the first
// pipe-segment, so re-prepending whatever was stripped keeps a dev-DB row
// recognizable as a dev row after the write. No exact "old full name" literal
// table is needed: the canonical target is already the single source of
// truth this repo's code-level display layer reads (src/lib/property-display.ts),
// and the safety gate below catches a name that doesn't look like the
// expected keyword-stuffed string instead of requiring one.
const BRACKET_PREFIX_RE = /^\s*(\[[^\]]*\]\s*)+/;

function devPrefixOf(name: string): string {
  const m = name.match(BRACKET_PREFIX_RE);
  return m ? m[0] : "";
}

/**
 * Throws if the stored name's derived base isn't a prefix of the canonical
 * target — i.e. it was expected to still be the keyword-stuffed string (or
 * already fixed) and isn't either. Catches an admin having since renamed the
 * listing to something unrelated, which this correction must not stomp on.
 */
export function planNameFix(slug: string, currentName: string): Replacement | null {
  const canonical = CANONICAL_PROPERTY_DISPLAY[slug]?.name;
  if (!canonical) throw new UnexpectedContentError(`No canonical display name defined for slug "${slug}".`);

  const prefix = devPrefixOf(currentName);
  const target = `${prefix}${canonical}`;
  if (currentName === target) return null; // already fixed

  const base = basePropertyName(currentName);
  if (!canonical.startsWith(base)) {
    throw new UnexpectedContentError(
      `${slug}.name: stored value "${currentName}" doesn't look like the expected keyword-stuffed name ` +
        `(derived base "${base}" is not a prefix of canonical "${canonical}"). Refusing to write.`
    );
  }
  return { old: currentName, new: target };
}

// ── Part B: Mickey/B38 "up to 520 Mbps" → "500+ Mbps" ──────────────────────
// Reviewed, exact old→new substrings per slug/field, mirrored 1:1 from this
// PR's diff of prisma/property-content/mickey-content.ts. JSON fields are
// parsed/re-serialized with JSON.stringify, aborting if the stored text
// doesn't round-trip — same shape as src/lib/b34-speed-fixes.ts.
export type SpeedField = "tagline" | "seoDescription" | "heroSummary" | "description" | "amenityDetails" | "propertyFaqs";

export const SPEED_FIELDS: SpeedField[] = [
  "tagline",
  "seoDescription",
  "heroSummary",
  "description",
  "amenityDetails",
  "propertyFaqs",
];

const JSON_FIELDS = new Set<SpeedField>(["amenityDetails", "propertyFaqs"]);

export type SpeedRules = Partial<Record<SpeedField, Replacement[]>>;

export const MICKEY_SPEED_RULES: Record<string, SpeedRules> = {
  "mickey-in-lipa--family-staycation--sleeps-7": {
    seoDescription: [
      { old: "fiber up to 520 Mbps, garage", new: "fiber at 500+ Mbps, garage" },
    ],
    tagline: [{ old: "Mickey-Themed • Fiber up to 520 Mbps • Sleeps 7 • Garage", new: "Mickey-Themed • Fiber 500+ Mbps • Sleeps 7 • Garage" }],
    heroSummary: [
      { old: "dedicated fiber internet up to 520 Mbps. From ₱2,400 per night", new: "dedicated fiber internet at 500+ Mbps. From ₱2,400 per night" },
    ],
    description: [
      { old: "The fiber, up to 520 Mbps, means everyone streams", new: "The fiber, 500+ Mbps, means everyone streams" },
    ],
    amenityDetails: [{ old: "Dedicated fiber WiFi up to 520 Mbps", new: "Dedicated fiber WiFi at 500+ Mbps" }],
    propertyFaqs: [
      {
        old: "The house has dedicated fiber internet with speeds up to 520 Mbps",
        new: "The house has dedicated fiber internet at 500+ Mbps",
      },
    ],
  },
  "mickey-in-lipa--family-house--sleeps-11": {
    heroSummary: [
      { old: "dedicated fiber up to 520 Mbps. From ₱4,200 per night", new: "dedicated fiber at 500+ Mbps. From ₱4,200 per night" },
    ],
    description: [
      { old: "dedicated fiber up to 520 Mbps, and a quiet gated subdivision", new: "dedicated fiber at 500+ Mbps, and a quiet gated subdivision" },
    ],
    amenityDetails: [{ old: "Dedicated fiber WiFi up to 520 Mbps", new: "Dedicated fiber WiFi at 500+ Mbps" }],
    propertyFaqs: [
      {
        old: "The house has dedicated fiber internet with speeds up to 520 Mbps",
        new: "The house has dedicated fiber internet at 500+ Mbps",
      },
    ],
  },
  "mickey-in-lipa--full-family-house--sleeps-15": {
    heroSummary: [
      { old: "garage parking, and dedicated fiber up to 520 Mbps. From ₱7,000 per night", new: "garage parking, and dedicated fiber at 500+ Mbps. From ₱7,000 per night" },
    ],
    description: [
      { old: "dedicated fiber up to 520 Mbps, and garage parking", new: "dedicated fiber at 500+ Mbps, and garage parking" },
    ],
    amenityDetails: [{ old: "Dedicated fiber WiFi up to 520 Mbps", new: "Dedicated fiber WiFi at 500+ Mbps" }],
    propertyFaqs: [
      {
        old: "The house has dedicated fiber internet with speeds up to 520 Mbps",
        new: "The house has dedicated fiber internet at 500+ Mbps",
      },
    ],
  },
};

export const STALE_520 = /\b520\s*mbps\b/i;

function sentences(text: string): string[] {
  return text.split("\n").flatMap((line) => line.split(/(?<=[.!?])\s+/));
}

function collectStrings(value: unknown, out: string[]): void {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => collectStrings(v, out));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => collectStrings(v, out));
}

function textsOf(field: SpeedField, raw: string): string[] {
  if (!JSON_FIELDS.has(field)) return [raw];
  try {
    const out: string[] = [];
    collectStrings(JSON.parse(raw), out);
    return out;
  } catch {
    return [raw];
  }
}

export function findStale520Excerpts(field: SpeedField, raw: string): string[] {
  return textsOf(field, raw).flatMap((t) => sentences(t).filter((s) => STALE_520.test(s)));
}

function countOccurrences(haystack: string, needle: string): number {
  let n = 0;
  for (let i = haystack.indexOf(needle); i !== -1; i = haystack.indexOf(needle, i + needle.length)) n++;
  return n;
}

export type Fragment = { old: string; new: string };

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
  const rules = MICKEY_SPEED_RULES[slug]?.[field];
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

// ── Whole-run planning ──────────────────────────────────────────────────────
export type PropertyContentRow = { id: number; slug: string; name: string } & Partial<Record<SpeedField, string | null>>;

export type FieldChange = {
  id: number;
  slug: string;
  field: "name" | SpeedField;
  before: string;
  after: string;
  fragments: Fragment[];
  excerpt: { old: string; new: string };
};

export type PresentationPlan = {
  changes: FieldChange[];
  updates: { id: number; slug: string; data: Partial<Record<"name" | SpeedField, string>> }[];
  planHash: string;
};

export function assertExpectedPropertyRows(rows: { id: number; slug: string }[]): void {
  if (rows.length !== ALL_PROPERTIES.length) {
    throw new UnexpectedContentError(`Expected exactly ${ALL_PROPERTIES.length} properties, found ${rows.length}.`);
  }
  for (const expected of ALL_PROPERTIES) {
    const matches = rows.filter((r) => r.id === expected.id);
    if (matches.length !== 1) {
      throw new UnexpectedContentError(`Expected exactly 1 record for id=${expected.id}, found ${matches.length}.`);
    }
    if (matches[0].slug !== expected.slug) {
      throw new UnexpectedContentError(
        `id=${expected.id} slug mismatch: expected "${expected.slug}", found "${matches[0].slug}". Refusing to proceed.`
      );
    }
    if (!CANONICAL_PROPERTY_DISPLAY[expected.slug]) {
      throw new UnexpectedContentError(`No canonical display name defined for slug "${expected.slug}".`);
    }
  }
}

export function computePlanHash(changes: FieldChange[]): string {
  const canonical = changes.map((c) => [c.id, c.slug, c.field, c.before, c.after]);
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex").slice(0, 16);
}

/**
 * Builds the full plan or throws UnexpectedContentError. Name correction
 * applies to all 5 properties; the Mbps substring correction applies only to
 * the 3 Mickey/B38 properties. After the targeted replacements, every
 * Mickey speed-bearing field is re-scanned for a residual "520 Mbps" the
 * reviewed table didn't cover — found → abort the whole run, nothing written.
 */
export function planListingPresentationFixes(rows: PropertyContentRow[]): PresentationPlan {
  assertExpectedPropertyRows(rows);
  const ordered = ALL_PROPERTIES.map((p) => rows.find((r) => r.id === p.id)!);

  const changes: FieldChange[] = [];
  const updates: PresentationPlan["updates"] = [];
  const residual: string[] = [];

  for (const row of ordered) {
    const data: Partial<Record<"name" | SpeedField, string>> = {};

    const nameFix = planNameFix(row.slug, row.name);
    if (nameFix) {
      data.name = nameFix.new;
      changes.push({
        id: row.id,
        slug: row.slug,
        field: "name",
        before: nameFix.old,
        after: nameFix.new,
        fragments: [nameFix],
        excerpt: excerptDiff(nameFix.old, nameFix.new),
      });
    }

    if (MICKEY_SLUGS.has(row.slug)) {
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
        for (const s of findStale520Excerpts(field, value)) {
          residual.push(`id=${row.id} ${row.slug}.${field}: "${s.length > 200 ? `${s.slice(0, 200)}…` : s}"`);
        }
      }
    }

    if (Object.keys(data).length > 0) updates.push({ id: row.id, slug: row.slug, data });
  }

  if (residual.length > 0) {
    throw new UnexpectedContentError(
      `Stale "520 Mbps" wording not covered by the reviewed replacement table — fix by hand in admin, then re-run. Nothing was written.\n  ${residual.join("\n  ")}`
    );
  }

  return { changes, updates, planHash: computePlanHash(changes) };
}

// ── Route-only POST gate ────────────────────────────────────────────────────
// Used only by the TEMPORARY route /api/admin/dev/fix-listing-presentation.
// Same precedent as DRIVE_TIME_CONFIRM / APPLY_B34_SPEED_CONFIRM. Deleted
// together with the route once the Owner's run is confirmed;
// planListingPresentationFixes above stays.
export const APPLY_LISTING_PRESENTATION_CONFIRM = "APPLY-LISTING-PRESENTATION";

export type ApplyGateResult = { ok: true } | { ok: false; status: 400 | 409; error: string };

export function checkApplyRequest(body: unknown, currentPlanHash: string): ApplyGateResult {
  if (!body || typeof body !== "object") {
    return {
      ok: false,
      status: 400,
      error: `JSON body required: {"confirm":"${APPLY_LISTING_PRESENTATION_CONFIRM}","planHash":"<from GET>"}`,
    };
  }
  const { confirm, planHash } = body as { confirm?: unknown; planHash?: unknown };
  if (confirm !== APPLY_LISTING_PRESENTATION_CONFIRM) {
    return { ok: false, status: 400, error: `Missing or wrong confirm — expected "${APPLY_LISTING_PRESENTATION_CONFIRM}".` };
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
