// ONE-TIME maintenance script: retitles/rewords Mickey Sleeps 11's
// "Groups of 12 or more" bestForSegments entry on production, per the
// Owner-approved fix (Cedric, 2026-10-10). Stay Match (blog plugin) scores an
// intent phrase against each segment's title (3x) + body (1x), so that title
// made "groups of 12 or more" recommend the 11-guest house, which actually
// tops out at 11. bestForSegments has no admin UI (DEC-015), so this targeted
// script is the production update path — see src/lib/sleeps11-segment-fix.ts
// for the pure transform this script applies.
//
// Usage:
//   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/fix-sleeps11-segment.ts
//   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/fix-sleeps11-segment.ts --execute
//
// SAFETY MODEL (same posture as scripts/fix-property-content.ts):
//   - Defaults to DRY RUN. Nothing is written unless --execute is passed.
//   - Asserts the row is exactly {id: 4, slug: "mickey-in-lipa--family-house--sleeps-11"}.
//   - Refuses if the stored bestForSegments doesn't contain exactly one
//     segment currently titled exactly "Groups of 12 or more" — including if
//     it's already been changed (by this script or an admin edit), so a
//     second run is a visible refusal, not a silent no-op.
//   - The write is a single-property update; after it, the row is re-queried
//     and re-checked that the new title is present and the old title is gone.
//
// This script is NEVER invoked by package.json's build/postinstall/seed
// scripts, and must not be added to any of them — it runs only when a human
// invokes it directly, once, with Owner approval of the printed dry-run.
import { PrismaClient } from "@prisma/client";
import { planSleeps11SegmentFix, TARGET_PROPERTY, NEW_TITLE, OLD_TITLE } from "../src/lib/sleeps11-segment-fix";

async function main() {
  const EXECUTE = process.argv.includes("--execute");
  const prisma = new PrismaClient();

  try {
    const row = await prisma.property.findUnique({
      where: { id: TARGET_PROPERTY.id },
      select: { id: true, slug: true, bestForSegments: true },
    });

    if (!row) {
      throw new Error(`No property found with id=${TARGET_PROPERTY.id}. Refusing to proceed.`);
    }

    const plan = planSleeps11SegmentFix(row);

    console.log(`\n${EXECUTE ? "EXECUTE MODE" : "DRY RUN"} — id=${plan.id} slug=${plan.slug}\n`);
    console.log("=".repeat(72));
    console.log(`\nOLD: ${plan.fragment.old}`);
    console.log(`NEW: ${plan.fragment.new}`);
    console.log("\n" + "=".repeat(72));
    console.log(`\nPlan hash: ${plan.planHash}`);

    if (!EXECUTE) {
      console.log("\nDry run only — no database write was made. Re-run with --execute to apply, after Owner review of this report.");
      return;
    }

    await prisma.property.update({ where: { id: plan.id }, data: { bestForSegments: plan.after } });
    console.log(`\n✓ Written — property id=${plan.id} bestForSegments updated.`);

    const verify = await prisma.property.findUnique({
      where: { id: plan.id },
      select: { bestForSegments: true },
    });
    const stillHasOldTitle = (verify?.bestForSegments ?? "").includes(`"${OLD_TITLE}"`);
    const hasNewTitle = (verify?.bestForSegments ?? "").includes(`"${NEW_TITLE}"`);
    if (stillHasOldTitle || !hasNewTitle) {
      console.error("\n✗ POST-WRITE VERIFICATION FAILED (the write above DID commit):");
      console.error(`  old title present: ${stillHasOldTitle}, new title present: ${hasNewTitle}`);
      process.exitCode = 1;
      return;
    }
    console.log("\n✓ Post-write verification: new title present, old title gone.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("\n✗ ABORTED — no write was made (or the transaction was rolled back):");
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
