/**
 * Retry a unit of database work that InnoDB aborted as a deadlock victim.
 *
 * Deadlocks here are expected, not exceptional. The inventory lock takes exclusive locks
 * on `Property` rows in id order, while any insert into a table with a foreign key to
 * `Property` (a booking, a derived block) takes shared locks on the rows it references in
 * whatever order its foreign keys are checked. Two such writers can wait on each other;
 * InnoDB resolves it by rolling one back with error 1213 and expects the caller to retry.
 *
 * Only safe for work that is atomic or idempotent and has no side effects outside the
 * database — which is true of the two things it wraps: one transaction (rolled back whole
 * by the deadlock, so nothing from the failed attempt survives) and the derived-block
 * reconciler (upserts keyed on a unique UID). Never wrap anything that sends email, calls
 * Stripe or fetches a feed.
 */

/**
 * True only for InnoDB's deadlock abort (error 1213 / SQLSTATE 40001), as Prisma reports
 * it: P2034 for model queries, P2010 with `meta.code` "1213" for raw queries.
 *
 * Deliberately narrow. A lock-wait timeout (1205) is NOT retried: on this server it only
 * fires after 50 seconds, so repeating it would just hold a request open. Connection
 * errors, Prisma's own transaction timeout (P2028) and everything else are not retried
 * either — the caller sees them.
 */
export function isDeadlock(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: unknown; message?: unknown; meta?: { code?: unknown } };
  if (e.code === "P2034") return true;
  if (e.code === "P2010" && String(e.meta?.code ?? "") === "1213") return true;
  return typeof e.message === "string" && e.message.includes("Deadlock found when trying to get lock");
}

/** Total attempts, including the first. */
export const DEADLOCK_ATTEMPTS = 3;

export async function retryOnDeadlock<T>(fn: () => Promise<T>, attempts = DEADLOCK_ATTEMPTS): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= attempts || !isDeadlock(err)) throw err;
      // Jittered backoff so the same two writers do not collide again in lockstep.
      await new Promise((resolve) => setTimeout(resolve, 25 * attempt + Math.random() * 50));
    }
  }
}
