// One-time migration: collapse the redundant `weekday` PropertyRate into the
// Property.pricePerNight column (which is now THE weekday/base rate, edited only
// on the Rates page). For every property with a `rateType="weekday"` row, copy
// its rate into pricePerNight, then delete the weekday row (in a transaction so a
// property whose only rate was the weekday row never loses its value).
//
// Also reports properties that are now "incomplete" — missing a base rate
// (pricePerNight <= 0) or a weekend rate (now required) — so they can be fixed.
//
// Usage: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/migrate-weekday-to-price-per-night.ts
// Optional flag: --dry to preview without writing.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const dry = process.argv.includes("--dry");

  const properties = await prisma.property.findMany({
    select: {
      id: true,
      name: true,
      pricePerNight: true,
      rates: { select: { id: true, rateType: true, rate: true } },
    },
    orderBy: { id: "asc" },
  });

  let migrated = 0;
  let weekdayRowsDeleted = 0;
  const incomplete: string[] = [];

  for (const p of properties) {
    const weekdayRows = p.rates.filter((r) => r.rateType === "weekday");
    const hasWeekend = p.rates.some((r) => r.rateType === "weekend");

    if (weekdayRows.length > 0) {
      // Use the first weekday row's rate as the base. (There should only be one.)
      const newBase = Number(weekdayRows[0].rate);
      const oldBase = Number(p.pricePerNight);
      const ids = weekdayRows.map((r) => r.id);

      if (dry) {
        console.log(`[dry] property #${p.id} (${p.name}): pricePerNight ${oldBase} → ${newBase}; delete weekday row(s) ${ids.join(", ")}`);
      } else {
        await prisma.$transaction([
          prisma.property.update({ where: { id: p.id }, data: { pricePerNight: newBase } }),
          prisma.propertyRate.deleteMany({ where: { id: { in: ids } } }),
        ]);
        console.log(`[ok]  property #${p.id} (${p.name}): pricePerNight ${oldBase} → ${newBase}; deleted ${ids.length} weekday row(s)`);
      }
      migrated++;
      weekdayRowsDeleted += ids.length;
    }

    // Completeness check uses the value pricePerNight WILL have after migration.
    const effectiveBase = weekdayRows.length > 0 ? Number(weekdayRows[0].rate) : Number(p.pricePerNight);
    if (effectiveBase <= 0 || !hasWeekend) {
      const missing = [
        effectiveBase <= 0 ? "base/weekday rate" : null,
        !hasWeekend ? "weekend rate" : null,
      ].filter(Boolean).join(" + ");
      incomplete.push(`#${p.id} ${p.name} — missing ${missing}`);
    }
  }

  console.log(`\nDone. ${migrated} propert${migrated === 1 ? "y" : "ies"} migrated, ${weekdayRowsDeleted} weekday row(s) ${dry ? "to delete" : "deleted"}.`);

  if (incomplete.length > 0) {
    console.log(`\n⚠️  ${incomplete.length} property(ies) need pricing completed on the Rates page:`);
    for (const line of incomplete) console.log(`   - ${line}`);
  } else {
    console.log("\n✓ All properties have a base rate and a weekend rate.");
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
