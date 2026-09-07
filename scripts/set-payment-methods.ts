// ONE-TIME, Owner-authorized maintenance script: sets Property.pricingNotes.
// paymentMethods to the approved customer-facing text on all 5 known
// properties, via a direct, transactional Prisma write.
//
// Usage: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/set-payment-methods.ts
//
// Safety model:
//   - Never prints the DATABASE_URL or any credential — only the parsed
//     database name (not a secret) for the pre-flight check.
//   - Aborts (no write) unless exactly 5 Property rows exist.
//   - Aborts (no write) unless every current paymentMethods value contains
//     the expected stale "Stripe / credit card" text — a different value
//     means something changed underneath this script and it should not
//     blindly overwrite it.
//   - Uses mergePricingNotesPaymentMethods() (src/lib/pricing-notes.ts) —
//     the same function the admin UI's PUT /api/admin/properties/[id] route
//     uses — so sibling pricingNotes keys (rate, discounts, deposit,
//     cancellation, etc.) can never be clobbered.
//   - All 5 writes in one prisma.$transaction — all or nothing.
//   - Re-queries and re-verifies after the write, including confirming a
//     second pass would find zero further changes needed (idempotency).
//   - Never wired into build/install/deploy/seed. Does not run any seed
//     script.
import { PrismaClient } from "@prisma/client";
import { mergePricingNotesPaymentMethods, safeParsePricingNotes } from "../src/lib/pricing-notes";

const EXPECTED_PROPERTIES = [
  { id: 1, slug: "cozy-1-bedroom" },
  { id: 2, slug: "spacious-2-bedroom" },
  { id: 3, slug: "mickey-in-lipa--family-staycation--sleeps-7" },
  { id: 4, slug: "mickey-in-lipa--family-house--sleeps-11" },
  { id: 5, slug: "mickey-in-lipa--full-family-house--sleeps-15" },
];

const APPROVED_TEXT = "GCash, BPI InstaPay (no fees), Credit/Debit Card (6% processing fee applies)";
const EXPECTED_STALE_SUBSTRING = "Stripe / credit card";

function dbNameFromUrl(url: string): string {
  // Only the path segment (database name) — never touches user/pass/host.
  try {
    return new URL(url).pathname.replace(/^\//, "");
  } catch {
    return "(unparseable)";
  }
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL is not set.");
  const dbName = dbNameFromUrl(dbUrl);
  console.log(`Target database name: ${dbName}`);
  if (dbName !== "u694568445_cedcasprop") {
    throw new Error(`ABORT: expected database "u694568445_cedcasprop", found "${dbName}".`);
  }

  const prisma = new PrismaClient();
  try {
    const rows = await prisma.property.findMany({
      select: { id: true, slug: true, pricingNotes: true },
      orderBy: { id: "asc" },
    });

    console.log(`\nFound ${rows.length} Property record(s).`);
    if (rows.length !== 5) {
      throw new Error(`ABORT: expected exactly 5 Property records, found ${rows.length}.`);
    }

    for (const expected of EXPECTED_PROPERTIES) {
      const match = rows.find((r) => r.id === expected.id);
      if (!match) throw new Error(`ABORT: no record found for id=${expected.id}.`);
      if (match.slug !== expected.slug) {
        throw new Error(
          `ABORT: id=${expected.id} slug mismatch — expected "${expected.slug}", found "${match.slug}".`
        );
      }
    }

    console.log("\n--- Pre-write snapshot ---");
    const beforeSnapshot: { id: number; slug: string; paymentMethods: unknown; pricingNotesRaw: string | null }[] = [];
    for (const row of rows) {
      const current = safeParsePricingNotes(row.pricingNotes);
      console.log(`id=${row.id} slug=${row.slug} paymentMethods=${JSON.stringify(current.paymentMethods)}`);
      const pm = current.paymentMethods;
      if (typeof pm !== "string" || !pm.includes(EXPECTED_STALE_SUBSTRING)) {
        throw new Error(
          `ABORT: id=${row.id} (${row.slug}) paymentMethods does not contain the expected stale text "${EXPECTED_STALE_SUBSTRING}". ` +
            `Found: ${JSON.stringify(pm)}. Refusing to overwrite an unexpected value.`
        );
      }
      beforeSnapshot.push({ id: row.id, slug: row.slug, paymentMethods: pm, pricingNotesRaw: row.pricingNotes });
    }

    console.log("\nAll 5 pre-flight checks passed. Proceeding with the transactional write.");

    const updates = rows.map((row) =>
      prisma.property.update({
        where: { id: row.id },
        data: { pricingNotes: mergePricingNotesPaymentMethods(row.pricingNotes, APPROVED_TEXT) },
      })
    );
    await prisma.$transaction(updates);
    console.log("\n✓ Transaction committed — 5 properties updated.");

    console.log("\n--- Post-write verification ---");
    const after = await prisma.property.findMany({
      where: { id: { in: EXPECTED_PROPERTIES.map((p) => p.id) } },
      select: { id: true, slug: true, pricingNotes: true, updatedAt: true },
      orderBy: { id: "asc" },
    });

    let allGood = true;
    for (const row of after) {
      const before = beforeSnapshot.find((b) => b.id === row.id)!;
      const beforeParsed = safeParsePricingNotes(before.pricingNotesRaw);
      const afterParsed = safeParsePricingNotes(row.pricingNotes);

      const valueOk = afterParsed.paymentMethods === APPROVED_TEXT;
      const siblingKeys = Object.keys(beforeParsed).filter((k) => k !== "paymentMethods");
      const siblingsOk = siblingKeys.every(
        (k) => JSON.stringify(beforeParsed[k]) === JSON.stringify(afterParsed[k])
      );

      console.log(
        `id=${row.id} slug=${row.slug} updatedAt=${row.updatedAt.toISOString()} ` +
          `paymentMethods=${valueOk ? "MATCH" : "*** MISMATCH ***"} siblings(${siblingKeys.join(",")})=${siblingsOk ? "PRESERVED" : "*** CHANGED ***"}`
      );
      if (!valueOk || !siblingsOk) allGood = false;
    }

    // Idempotency check: would a second pass find anything left to do?
    const secondPass = await prisma.property.findMany({
      where: { id: { in: EXPECTED_PROPERTIES.map((p) => p.id) } },
      select: { id: true, pricingNotes: true },
    });
    const stillNeedsChange = secondPass.filter((r) => {
      const pn = safeParsePricingNotes(r.pricingNotes);
      return pn.paymentMethods !== APPROVED_TEXT;
    });
    console.log(
      `\nIdempotency check: ${stillNeedsChange.length} of 5 properties would still need a change (expect 0).`
    );

    if (!allGood || stillNeedsChange.length > 0) {
      console.error("\n✗ VERIFICATION FAILED — see mismatches above.");
      process.exitCode = 1;
      return;
    }
    console.log("\n✓ All 5 properties verified: approved paymentMethods value stored, every sibling pricingNotes key preserved, idempotent.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("\n✗ ABORTED — no write was made (or the transaction was rolled back):");
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
