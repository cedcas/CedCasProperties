// Pure helpers shared by the release gate (scripts/migration-gate.mjs), the operator
// migration command (scripts/db-migrate.mjs) and their tests. No database, no network.
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const BASELINE_MIGRATION = "20261005000000_baseline";
export const MIGRATIONS_DIR = "prisma/migrations";

/** Local migrations in apply order, with the checksum Prisma stores (sha256 of migration.sql). */
export function readLocalMigrations(dir = MIGRATIONS_DIR) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
    .map((name) => {
      const file = path.join(dir, name, "migration.sql");
      if (!fs.existsSync(file)) throw new Error(`Migration ${name} has no migration.sql`);
      return { name, checksum: createHash("sha256").update(fs.readFileSync(file)).digest("hex") };
    });
}

/**
 * Compare local migrations with `_prisma_migrations` rows.
 * A row is applied when it finished and was not rolled back, failed when it neither finished
 * nor was rolled back (Prisma leaves it like that after an error), and ignored once rolled back.
 */
export function evaluateHistory(local, rows) {
  const state = (r) => (r.rolled_back_at ? "rolledBack" : r.finished_at ? "applied" : "failed");
  const byName = new Map();
  for (const r of rows) {
    if (!byName.has(r.migration_name)) byName.set(r.migration_name, []);
    byName.get(r.migration_name).push(r);
  }
  const localNames = new Set(local.map((m) => m.name));
  const result = { applied: [], pending: [], failed: [], checksumMismatch: [], unknownInDb: [], outOfOrder: false };

  for (const [name, list] of byName) {
    if (list.some((r) => state(r) === "failed")) result.failed.push(name);
    if (!localNames.has(name) && list.some((r) => state(r) === "applied")) result.unknownInDb.push(name);
  }
  let seenPending = false;
  for (const m of local) {
    const applied = (byName.get(m.name) ?? []).filter((r) => state(r) === "applied");
    if (applied.length === 0) {
      result.pending.push(m.name);
      seenPending = true;
      continue;
    }
    result.applied.push(m.name);
    if (seenPending) result.outOfOrder = true;
    if (applied.some((r) => r.checksum !== m.checksum)) result.checksumMismatch.push(m.name);
  }
  result.failed.sort();
  result.unknownInDb.sort();
  return result;
}

/**
 * Release gate: may this commit's application code be built for this database?
 * Blocks on anything the code depends on that is not there (pending), on a half-applied
 * migration, and on an edited migration file. A migration the database has but this commit
 * lacks is only a warning: with expand/contract sequencing, older code keeps working against a
 * newer schema, and blocking would stop rollbacks and every branch that is behind.
 */
export function gateVerdict(history) {
  const problems = [];
  if (history.failed.length) problems.push(`failed or interrupted migration(s) in the database: ${history.failed.join(", ")}`);
  if (history.pending.length) problems.push(`migration(s) not applied to this database: ${history.pending.join(", ")}`);
  if (history.checksumMismatch.length) problems.push(`migration file(s) changed after being applied: ${history.checksumMismatch.join(", ")}`);
  const warnings = history.unknownInDb.length
    ? [`the database has migration(s) this commit does not contain (commit is behind): ${history.unknownInDb.join(", ")}`]
    : [];
  return { ok: problems.length === 0, problems, warnings };
}

/** Operator run: is it safe to call `prisma migrate deploy`? Stricter than the gate. */
export function deployPrecheck(history) {
  const problems = [];
  if (history.failed.length) problems.push(`failed or interrupted migration(s): ${history.failed.join(", ")} — resolve by hand first (runbook: "A migration failed")`);
  if (history.checksumMismatch.length) problems.push(`applied migration file(s) were edited: ${history.checksumMismatch.join(", ")}`);
  if (history.unknownInDb.length) problems.push(`the database has migration(s) missing from this commit: ${history.unknownInDb.join(", ")} — wrong or outdated commit`);
  if (history.outOfOrder) problems.push("a pending migration sorts before an already-applied one — history was rewritten");
  return { ok: problems.length === 0, problems };
}

/**
 * Commands that change a database's schema or contents. Nothing that runs automatically
 * (install hooks, build scripts, CI, scheduled workflows) may contain one.
 */
export const SCHEMA_WRITING_PATTERNS = [
  /prisma\s+db\s+push/,
  /prisma\s+db\s+execute/,
  /prisma\s+db\s+seed/,
  /prisma\s+migrate\s+(deploy|dev|reset|resolve)/,
  /--accept-data-loss/,
  /db-migrate\.mjs/,
  /db:migrate/,
  /\bseed(-[a-z-]+)?\.ts\b/,
  /npm\s+run\s+seed/,
  /backfill/,
];

export function findSchemaWritingCommands(text) {
  return SCHEMA_WRITING_PATTERNS.filter((re) => re.test(text)).map(String);
}

export function isLoopbackUrl(url) {
  try {
    return ["127.0.0.1", "localhost", "[::1]", "::1"].includes(new URL(url).hostname);
  } catch {
    return false;
  }
}
