#!/usr/bin/env node
// RELEASE GATE — runs inside the Vercel build (`vercel-build`), before `next build`.
//
// READ-ONLY. It issues SELECTs against `_prisma_migrations` and nothing else; it never
// creates, alters, or records anything. Its only effect is to fail the build.
//
// Why it exists: Vercel deploys `main` automatically, independently of any migration run.
// Without a gate, code that needs a new column could go live before the column exists.
// With it, a commit whose migrations are not all applied to the target database cannot
// build, so the previous deployment keeps serving until the migration has been run
// deliberately (scripts/db-migrate.mjs). See DEC-026 and the migration runbook.
import pkg from "@prisma/client";
import { pathToFileURL } from "node:url";
import { evaluateHistory, gateVerdict, readLocalMigrations } from "./lib/migration-history.mjs";

const { PrismaClient } = pkg;

export async function runGate({ url = process.env.DATABASE_URL, migrationsDir, log = console.log } = {}) {
  if (!url) return { ok: false, problems: ["DATABASE_URL is not set for this build"], warnings: [] };
  const prisma = new PrismaClient({ datasourceUrl: url });
  try {
    const [{ db }] = await prisma.$queryRawUnsafe("SELECT DATABASE() AS db");
    log(`[migration-gate] database: ${db}`);
    const [{ n }] = await prisma.$queryRawUnsafe(
      "SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = '_prisma_migrations'",
    );
    if (Number(n) === 0) {
      return { ok: false, problems: ["this database has no migration history (`_prisma_migrations` is missing) — it has not been baselined"], warnings: [] };
    }
    const rows = await prisma.$queryRawUnsafe(
      "SELECT migration_name, checksum, finished_at, rolled_back_at FROM `_prisma_migrations`",
    );
    const local = readLocalMigrations(migrationsDir);
    if (local.length === 0) return { ok: false, problems: ["no migrations found in prisma/migrations"], warnings: [] };
    const verdict = gateVerdict(evaluateHistory(local, rows));
    log(`[migration-gate] ${local.length} migration(s) in this commit, ${rows.length} row(s) in the database`);
    return verdict;
  } catch (e) {
    // Fail closed: if the history cannot be read, the release is not known to be safe.
    return { ok: false, problems: [`could not read migration history: ${String(e?.message ?? e).split("\n").pop()}`], warnings: [] };
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(`[migration-gate] environment: ${process.env.VERCEL_ENV ?? "(not Vercel)"}, commit: ${process.env.VERCEL_GIT_COMMIT_SHA ?? "(unknown)"}`);
  const verdict = await runGate();
  for (const w of verdict.warnings) console.warn(`[migration-gate] WARNING: ${w}`);
  if (!verdict.ok) {
    for (const p of verdict.problems) console.error(`[migration-gate] BLOCKED: ${p}`);
    console.error("[migration-gate] This build was stopped before `next build`. Nothing was written to the database.");
    console.error("[migration-gate] Apply the reviewed migration with scripts/db-migrate.mjs, then redeploy. See docs/HIL_MIGRATION_RUNBOOK.md.");
    process.exit(1);
  }
  console.log("[migration-gate] OK — every migration in this commit is applied. No schema change was attempted.");
}
