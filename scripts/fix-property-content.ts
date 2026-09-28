// ONE-TIME maintenance script: corrects stale Mt. Maculot mentions, internet-
// speed figures, and the "never had a parking incident" claim inside the 5
// known properties' seed-derived text/JSON fields, bringing the database in
// line with the Owner-approved facts already fixed in
// prisma/seed-property-seo.ts / prisma/seed-property-seo-mickey.ts.
//
// Second pass (added 2026-09-27): corrects the superseded SM City Lipa /
// Casa Marikit drive times (Owner-confirmed ~20 min / ~30 min by car) with
// TARGETED exact-substring replacements from src/lib/drive-time-fixes.ts —
// never a whole-field overwrite — applied on top of the first pass's output,
// in the same dry run / transaction / verification. Any stale drive-time
// phrase the reviewed table doesn't cover aborts the whole run. The same pure
// lib backed the TEMPORARY DEC-012 route /api/admin/dev/fix-drive-times,
// which ran once on production 2026-09-28 and was then removed (DEC-016).
//
// Usage:
//   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/fix-property-content.ts
//   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/fix-property-content.ts --execute
//
// SAFETY MODEL (deliberately stricter than this repo's other one-off scripts,
// which default to writing and use --dry to opt into a preview — see
// scripts/backfill-phone-e164.ts):
//   - Defaults to DRY RUN. Nothing is written unless --execute is passed.
//   - Asserts exactly 5 properties match the hardcoded {id, slug} pairs in
//     src/lib/property-content-fixes.ts — a mismatch on either aborts.
//   - Every "stale" field found must already be on that property's
//     pre-approved fix list; anything else is "unexpected content" and
//     aborts the ENTIRE run (see assertStaleFieldsAreExpected).
//   - Every proposed replacement is independently re-checked to be free of
//     the same stale patterns before it's trusted (assertFixedValueIsClean).
//   - All writes happen in a single prisma.$transaction — partial writes are
//     not possible; any assertion failure anywhere aborts before the
//     transaction is even opened.
//   - After a successful write, all 5 rows are re-queried and re-scanned;
//     any remaining stale pattern is reported as a verification failure.
//   - Idempotent: a second run (dry or --execute) finds zero stale fields
//     per property and proposes/writes nothing.
//
// This script is NEVER invoked by package.json's build/postinstall/seed
// scripts, and must not be added to any of them — it runs only when a human
// invokes it directly, once, with Owner approval of the printed dry-run.
import { PrismaClient } from "@prisma/client";
import {
  EXPECTED_PROPERTIES,
  CONTENT_FIELDS,
  detectStaleFields,
  assertStaleFieldsAreExpected,
  assertFixedValueIsClean,
  excerptDiff,
  UnexpectedContentError,
  type ContentFieldName,
} from "../src/lib/property-content-fixes";
import { planDriveTimeFixes, type PropertyContentRow } from "../src/lib/drive-time-fixes";
import { TWO_BR, ONE_BR, type PropertySeoContent as ContentA } from "../prisma/property-content/b34-content";
import {
  SLEEPS_7,
  SLEEPS_11,
  SLEEPS_15,
  type PropertySeoContent as ContentB,
} from "../prisma/property-content/mickey-content";

type Content = ContentA | ContentB;

const TARGET_CONTENT: Record<string, Content> = {
  "cozy-1-bedroom": ONE_BR,
  "spacious-2-bedroom": TWO_BR,
  "mickey-in-lipa--family-staycation--sleeps-7": SLEEPS_7,
  "mickey-in-lipa--family-house--sleeps-11": SLEEPS_11,
  "mickey-in-lipa--full-family-house--sleeps-15": SLEEPS_15,
};

const SELECT = {
  id: true,
  slug: true,
  description: true,
  seoTitle: true,
  seoDescription: true,
  tagline: true,
  heroSummary: true,
  bestForSegments: true,
  amenityDetails: true,
  neighborhoodPlaces: true,
  propertyFaqs: true,
  imageAlts: true,
} as const;

type Row = {
  id: number;
  slug: string;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  tagline: string | null;
  heroSummary: string | null;
  bestForSegments: string | null;
  amenityDetails: string | null;
  neighborhoodPlaces: string | null;
  propertyFaqs: string | null;
  imageAlts: string | null;
};

function rawValue(field: ContentFieldName, content: Content): string {
  const v = (content as unknown as Record<ContentFieldName, unknown>)[field];
  return typeof v === "string" ? v : JSON.stringify(v);
}

function fieldsOf(row: Row): Partial<Record<ContentFieldName, string>> {
  const out: Partial<Record<ContentFieldName, string>> = {};
  for (const f of CONTENT_FIELDS) {
    const v = row[f];
    if (v != null) out[f] = v;
  }
  return out;
}

async function scan(prisma: PrismaClient) {
  const rows = (await prisma.property.findMany({
    where: { id: { in: EXPECTED_PROPERTIES.map((p) => p.id) } },
    select: SELECT,
  })) as Row[];

  if (rows.length !== 5) {
    throw new UnexpectedContentError(`Expected exactly 5 properties, found ${rows.length}.`);
  }
  for (const expected of EXPECTED_PROPERTIES) {
    const matches = rows.filter((r) => r.id === expected.id);
    if (matches.length !== 1) {
      throw new UnexpectedContentError(
        `Expected exactly 1 record for id=${expected.id}, found ${matches.length}.`
      );
    }
    if (matches[0].slug !== expected.slug) {
      throw new UnexpectedContentError(
        `id=${expected.id} slug mismatch: expected "${expected.slug}", found "${matches[0].slug}". Refusing to proceed.`
      );
    }
    if (!TARGET_CONTENT[expected.slug]) {
      throw new UnexpectedContentError(`No target content defined for slug "${expected.slug}".`);
    }
  }

  type ReportRow = {
    id: number;
    slug: string;
    field: ContentFieldName;
    oldFragment: string;
    newFragment: string;
  };
  const report: ReportRow[] = [];
  const updates: { id: number; slug: string; data: Record<string, string> }[] = [];

  for (const row of rows) {
    const current = fieldsOf(row);
    const staleFields = detectStaleFields(current);

    // Safety gate: only pre-approved fields may be stale.
    assertStaleFieldsAreExpected(row.slug, staleFields);

    if (staleFields.length === 0) continue; // already clean

    const target = TARGET_CONTENT[row.slug];
    const data: Record<string, string> = {};
    for (const field of staleFields) {
      const oldRaw = current[field] as string;
      const newRaw = rawValue(field, target);

      // Safety gate: the proposed fix must itself be clean.
      assertFixedValueIsClean(row.slug, field, newRaw);

      data[field] = newRaw;
      const { old: oldFragment, new: newFragment } = excerptDiff(oldRaw, newRaw);
      report.push({ id: row.id, slug: row.slug, field, oldFragment, newFragment });
    }
    if (Object.keys(data).length > 0) {
      updates.push({ id: row.id, slug: row.slug, data });
    }
  }

  // ── Second pass: SM Lipa / Casa Marikit drive times, on top of pass 1 ──
  // Throws UnexpectedContentError (aborting everything) on any residual stale
  // drive-time phrase, before any transaction is opened.
  const afterPass1: PropertyContentRow[] = rows.map((r) => ({
    ...r,
    ...(updates.find((u) => u.id === r.id)?.data ?? {}),
  }));
  const driveTimes = planDriveTimeFixes(afterPass1);
  for (const c of driveTimes.changes) {
    for (const f of c.fragments) {
      report.push({ id: c.id, slug: c.slug, field: c.field, oldFragment: f.old, newFragment: f.new });
    }
    const existing = updates.find((u) => u.id === c.id);
    if (existing) existing.data[c.field] = c.after;
    else updates.push({ id: c.id, slug: c.slug, data: { [c.field]: c.after } });
  }

  return { rows, report, updates, driveTimePlanHash: driveTimes.planHash };
}

async function main() {
  const EXECUTE = process.argv.includes("--execute");
  const prisma = new PrismaClient();

  try {
    const { report, updates, driveTimePlanHash } = await scan(prisma);

    console.log(`\n${EXECUTE ? "EXECUTE MODE" : "DRY RUN"} — 5/5 properties evaluated, ${updates.length} need changes\n`);
    console.log("=".repeat(72));
    for (const r of report) {
      console.log(`\nid=${r.id}  slug=${r.slug}  field=${r.field}`);
      console.log(`  OLD: ${r.oldFragment}`);
      console.log(`  NEW: ${r.newFragment}`);
    }
    console.log("\n" + "=".repeat(72));
    const fieldCount = updates.reduce((n, u) => n + Object.keys(u.data).length, 0);
    console.log(`\nTotal: ${report.length} fragment change(s) in ${fieldCount} field(s) across ${updates.length} propert${updates.length === 1 ? "y" : "ies"}.`);
    console.log(`Drive-time planHash: ${driveTimePlanHash}`);

    if (!EXECUTE) {
      console.log("\nDry run only — no database write was made. Re-run with --execute to apply, after Owner review of this report.");
      return;
    }

    if (updates.length === 0) {
      console.log("\nNothing to write — already clean (idempotent). No transaction opened.");
      return;
    }

    // ── One transaction, all-or-nothing ──
    await prisma.$transaction(updates.map((u) => prisma.property.update({ where: { id: u.id }, data: u.data })));
    console.log(`\n✓ Transaction committed — ${updates.length} propert${updates.length === 1 ? "y" : "ies"} updated.`);

    // ── Re-query all 5 and verify zero stale patterns remain ──
    let verify: Awaited<ReturnType<typeof scan>>;
    try {
      verify = await scan(prisma);
    } catch (e) {
      // The transaction already committed — don't let main()'s catch claim otherwise.
      console.error("\n✗ POST-WRITE VERIFICATION FAILED (the write above DID commit):");
      console.error(e instanceof Error ? e.message : e);
      process.exitCode = 1;
      return;
    }
    if (verify.report.length > 0) {
      console.error("\n✗ POST-WRITE VERIFICATION FAILED — stale content still detected:");
      for (const r of verify.report) {
        console.error(`  id=${r.id} slug=${r.slug} field=${r.field}`);
      }
      process.exitCode = 1;
      return;
    }
    console.log("\n✓ Post-write verification: zero stale patterns (Maculot/Mbps/parking or SM Lipa/Casa Marikit drive times) remain across all 5 properties.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("\n✗ ABORTED — no write was made (or the transaction was rolled back):");
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
