// Pure planning/assertion logic for the one-time Owner-approved production
// correction of three related, still-stale content issues (DEC-034 and its
// 2026-11-15 addendum):
// (a) `Property.name` — still the keyword-stuffed, Airbnb-style string in
//     production/dev (e.g. "Spacious 2BR Getaway |
//     Netflix•Wi-Fi•9Pax•Parking") — rewritten to the plain DEC-034 canonical
//     name;
// (b) `tagline` — still the keyword-stuffed string (e.g. "Netflix • Wi-Fi •
//     9 Pax • Parking") — rewritten whole-field to the same plain "best for"
//     line src/lib/property-display.ts already renders in code
//     (CANONICAL_PROPERTY_DISPLAY[slug].bestFor), never inventing an
//     amenity;
// (c) stale Wi-Fi speed figures ("400 Mbps" for B34/cozy, "up to 520 Mbps"
//     for Mickey/B38) in `seoTitle` and the other speed-bearing content
//     fields, superseded by "500+ Mbps" — not a new speed test, and neither
//     building is claimed slower (DEC-032, extended to B38 by DEC-034, then
//     extended again to cover `seoTitle` and the B34/cozy "400 Mbps" wording
//     by the 2026-11-15 addendum, since dev's stored copy turned out to
//     differ from both the reviewed-and-run production fix and the current
//     seed).
//
// Caller: this module has no Prisma or database access so it can be unit
// tested offline against frozen fixtures — see src/lib/b34-speed-fixes.ts for
// the precedent this follows (DEC-012/DEC-016 pattern): GET = dry-run plan +
// planHash, POST = confirm string + planHash, one transaction, post-write
// re-verification, never a schema change.
//
// Three independent correction passes live in this one module because the
// task asked for ONE route covering all of them: a whole-field `name`
// rewrite (all 5 properties), a whole-field `tagline` rewrite (all 5
// properties), and a targeted substring replacement for stale Mbps wording
// (any of the 5 properties, several fields) — never B34's already-run
// "340 Mbps" production correction, which used a different figure and was
// removed (DEC-032 addenda).
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

// ── Part B: tagline — whole-field rewrite to the canonical "best for" ──────
//
// Allow-listed current/previous stored `tagline` values this run is
// permitted to overwrite — a production row may still carry the original
// keyword tagline, a dev-only variant, or the current (still keyword-based)
// seed value. Anything else is unexpected — abort rather than guess at it.
const KNOWN_TAGLINE_VARIANTS: Record<string, string[]> = {
  "cozy-1-bedroom": ["Solar Power • Netflix • Wi-Fi • 5 Pax"],
  "spacious-2-bedroom": ["Netflix • Wi-Fi • 9 Pax • Parking"],
  "mickey-in-lipa--family-staycation--sleeps-7": [
    "Mickey-Themed • Fiber up to 520 Mbps • Sleeps 7 • Garage", // production, pre-DEC-034
    "Mickey-Themed • 500 Mbps Wi-Fi • Sleeps 7 • Garage", // dev
    "Mickey-Themed • Fiber 500+ Mbps • Sleeps 7 • Garage", // current seed (still keyword-based)
  ],
  "mickey-in-lipa--family-house--sleeps-11": ["Mickey-Themed • Bunk Room • Sleeps 11 • Garage"],
  "mickey-in-lipa--full-family-house--sleeps-15": ["Whole House • Two Bunk Rooms • Sleeps 15 • Garage"],
};

/**
 * Whole-field tagline rewrite to the canonical "best for" line
 * (src/lib/property-display.ts) — never invents an amenity, just swaps the
 * keyword-stuffed tagline for the same plain line the public site already
 * renders in code. Only rewrites when the stored value is already the
 * target, or is one of the allow-listed current/previous variants above;
 * anything else aborts rather than overwriting an unexpected admin edit.
 */
export function planTaglineFix(slug: string, currentTagline: string): Replacement | null {
  const target = CANONICAL_PROPERTY_DISPLAY[slug]?.bestFor;
  if (!target) throw new UnexpectedContentError(`No canonical "best for" line defined for slug "${slug}".`);
  if (currentTagline === target) return null; // already fixed

  const known = KNOWN_TAGLINE_VARIANTS[slug] ?? [];
  if (!known.includes(currentTagline)) {
    throw new UnexpectedContentError(
      `${slug}.tagline: stored value "${currentTagline}" is not a known current/previous tagline and isn't ` +
        `already the target "${target}". Refusing to write.`
    );
  }
  return { old: currentTagline, new: target };
}

// ── Part C: stale "400 Mbps" (B34) / "520 Mbps" (Mickey/B38) → "500+ Mbps" ─
// Reviewed, exact old→new substrings per slug/field. The Mickey entries are
// mirrored 1:1 from this PR's diff of prisma/property-content/mickey-content.ts.
// JSON fields are parsed/re-serialized with JSON.stringify, aborting if the
// stored text doesn't round-trip. `tagline` is deliberately not a member of
// this field set — it is rewritten wholesale by Part B above instead.
export type SpeedField = "seoTitle" | "seoDescription" | "heroSummary" | "description" | "amenityDetails" | "propertyFaqs";

export const SPEED_FIELDS: SpeedField[] = [
  "seoTitle",
  "seoDescription",
  "heroSummary",
  "description",
  "amenityDetails",
  "propertyFaqs",
];

const JSON_FIELDS = new Set<SpeedField>(["amenityDetails", "propertyFaqs"]);

export type SpeedRules = Partial<Record<SpeedField, Replacement[]>>;

export const SPEED_RULES: Record<string, SpeedRules> = {
  "cozy-1-bedroom": {
    // Dev's stored seoTitle differs from both the already-run production fix
    // and the current seed ("Fiber WiFi at 500+ Mbps") — a bare "400 Mbps"
    // with no surrounding literal this table can safely assume, hence a
    // minimal digit-only substring swap rather than a longer reviewed phrase.
    seoTitle: [{ old: "400 Mbps", new: "500+ Mbps" }],
  },
  "mickey-in-lipa--family-staycation--sleeps-7": {
    seoDescription: [
      { old: "fiber up to 520 Mbps, garage", new: "fiber at 500+ Mbps, garage" },
    ],
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

// A bare "500 Mbps" (no "+") is also stale — e.g. a dev row rewritten by hand
// to the wrong figure. Never matches "500+ Mbps" (there is no "+" in the
// literal substring "500 Mbps", and "500+ Mbps" always has one between "500"
// and the space), so it's safe to always try alongside whatever rule already
// applies to a field — but only there: this is not a blanket scan of every
// field for any mention of "500", which could collide with an unrelated
// number (a price, a guest count).
const BARE_500_FIX: Replacement = { old: "500 Mbps", new: "500+ Mbps" };

export const STALE_SPEED = /\b(?:400|520)\s*mbps\b/i;

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

export function findStaleSpeedExcerpts(field: SpeedField, raw: string): string[] {
  return textsOf(field, raw).flatMap((t) => sentences(t).filter((s) => STALE_SPEED.test(s)));
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
  const configured = SPEED_RULES[slug]?.[field];
  const fragments: Fragment[] = [];
  if (!configured) return { value: raw, fragments };
  const rules = [...configured, BARE_500_FIX];
  const where = `${slug}.${field}`;

  if (!JSON_FIELDS.has(field)) {
    return { value: applyReplacements(where, raw, rules, fragments), fragments };
  }
  const parsed = parseRoundTrip(where, raw);
  const next = replaceInJsonStrings(where, parsed, rules, fragments);
  return { value: fragments.length > 0 ? JSON.stringify(next) : raw, fragments };
}

// ── Whole-run planning ──────────────────────────────────────────────────────
export type PropertyContentRow = { id: number; slug: string; name: string; tagline?: string | null } & Partial<
  Record<SpeedField, string | null>
>;

export type FieldChange = {
  id: number;
  slug: string;
  field: "name" | "tagline" | SpeedField;
  before: string;
  after: string;
  fragments: Fragment[];
  excerpt: { old: string; new: string };
};

export type PresentationPlan = {
  changes: FieldChange[];
  updates: { id: number; slug: string; data: Partial<Record<"name" | "tagline" | SpeedField, string>> }[];
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
 * Builds the full plan or throws UnexpectedContentError. Name and tagline
 * corrections apply to all 5 properties; the Mbps substring correction is
 * also evaluated for all 5 (most have no reviewed rule and are therefore a
 * no-op). After the targeted replacements, every speed-bearing field of
 * every property is re-scanned for a residual "400 Mbps"/"520 Mbps" the
 * reviewed table didn't cover — found → abort the whole run, nothing
 * written.
 */
export function planListingPresentationFixes(rows: PropertyContentRow[]): PresentationPlan {
  assertExpectedPropertyRows(rows);
  const ordered = ALL_PROPERTIES.map((p) => rows.find((r) => r.id === p.id)!);

  const changes: FieldChange[] = [];
  const updates: PresentationPlan["updates"] = [];
  const residual: string[] = [];

  for (const row of ordered) {
    const data: Partial<Record<"name" | "tagline" | SpeedField, string>> = {};

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

    if (row.tagline != null) {
      const taglineFix = planTaglineFix(row.slug, row.tagline);
      if (taglineFix) {
        data.tagline = taglineFix.new;
        changes.push({
          id: row.id,
          slug: row.slug,
          field: "tagline",
          before: taglineFix.old,
          after: taglineFix.new,
          fragments: [taglineFix],
          excerpt: excerptDiff(taglineFix.old, taglineFix.new),
        });
      }
    }

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
      for (const s of findStaleSpeedExcerpts(field, value)) {
        residual.push(`id=${row.id} ${row.slug}.${field}: "${s.length > 200 ? `${s.slice(0, 200)}…` : s}"`);
      }
    }

    if (Object.keys(data).length > 0) updates.push({ id: row.id, slug: row.slug, data });
  }

  if (residual.length > 0) {
    throw new UnexpectedContentError(
      `Stale "400 Mbps"/"520 Mbps" wording not covered by the reviewed replacement table — fix by hand in admin, then re-run. Nothing was written.\n  ${residual.join("\n  ")}`
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
