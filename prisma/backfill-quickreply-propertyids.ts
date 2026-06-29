/**
 * One-time backfill: migrate QuickReply single-property `propertyId` → multi-property `propertyIds`.
 *
 * For every QuickReply with a non-null `propertyId` that hasn't been migrated yet
 * (propertyIds null/empty), set `propertyIds = "[<propertyId>]"`. Rows with a null
 * `propertyId` already mean "all properties" — leave them null.
 *
 * Idempotent: re-running skips rows that already have a non-empty `propertyIds`.
 *
 * Run (locally or on prod) after the schema with `propertyIds` has been pushed:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/backfill-quickreply-propertyids.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const replies = await prisma.quickReply.findMany({
    select: { id: true, name: true, propertyId: true, propertyIds: true },
  });

  let migrated = 0;
  for (const r of replies) {
    const alreadyMigrated = !!r.propertyIds && r.propertyIds.trim() !== "" && r.propertyIds.trim() !== "[]";
    if (r.propertyId == null || alreadyMigrated) continue;

    await prisma.quickReply.update({
      where: { id: r.id },
      data: { propertyIds: JSON.stringify([r.propertyId]) },
    });
    migrated++;
    console.log(`  ✓ "${r.name}" (id ${r.id}) → propertyIds [${r.propertyId}]`);
  }

  console.log(`\nBackfill complete. Migrated ${migrated} of ${replies.length} Quick Replies.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
