/**
 * Inventory lock — serialises every write that claims nights on a physical unit.
 *
 * Checking availability and then inserting is not atomic: two requests can both pass the
 * check before either writes, and wrapping them in a transaction does not help by itself,
 * because under InnoDB's default isolation neither transaction sees the other's
 * uncommitted row. What prevents the double booking is a lock both must take first.
 *
 * The lock is a `SELECT … FOR UPDATE` on the `Property` rows of the whole inventory scope:
 * the listing(s) involved plus every member of their shared-inventory groups, so a booking
 * on the 1BR and a booking on the 2BR of the same house contend for the same rows. Row
 * locks are released on commit or rollback, including when the connection dies — unlike
 * `GET_LOCK`, which would stay held on a pooled connection.
 *
 * Rows are locked in ascending id order in one statement, so two callers with overlapping
 * scopes cannot deadlock on ordering. The transaction runs READ COMMITTED so every read
 * after the lock sees whatever the previous holder committed.
 *
 * A writer OUTSIDE the lock can still deadlock with it — a post-commit reconciliation
 * inserting a derived block takes foreign-key share locks on the same rows in a different
 * order. InnoDB aborts one side; the whole transaction is then re-run (src/lib/db-retry.ts).
 * `fn` must therefore do database work only: it may execute more than once.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { retryOnDeadlock } from "@/lib/db-retry";

/** The listed properties plus every member of any inventory group they belong to. */
export async function inventoryScopePropertyIds(
  propertyIds: number[],
  db: Prisma.TransactionClient | typeof prisma = prisma
): Promise<number[]> {
  const ids = [...new Set(propertyIds)];
  const memberships = await db.inventoryGroupMember.findMany({
    where: { propertyId: { in: ids } },
    select: { inventoryGroup: { select: { members: { select: { propertyId: true } } } } },
  });
  for (const m of memberships) {
    for (const member of m.inventoryGroup.members) ids.push(member.propertyId);
  }
  return [...new Set(ids)].sort((a, b) => a - b);
}

export async function withInventoryLock<T>(
  propertyIds: number[],
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  opts: { maxWaitMs?: number; timeoutMs?: number } = {}
): Promise<T> {
  return retryOnDeadlock(() =>
    prisma.$transaction(
      async (tx) => {
        const scope = await inventoryScopePropertyIds(propertyIds, tx);
        await tx.$queryRaw`SELECT id FROM \`Property\` WHERE id IN (${Prisma.join(scope)}) ORDER BY id FOR UPDATE`;
        return fn(tx);
      },
      {
        maxWait: opts.maxWaitMs ?? 10_000,
        timeout: opts.timeoutMs ?? 25_000,
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    )
  );
}
