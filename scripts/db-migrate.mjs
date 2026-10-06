#!/usr/bin/env node
// The ONLY supported way to change a hosted database's schema. Run by an operator, on
// purpose, from a machine that can reach the database — never by a build, an install hook
// or CI. See docs/HIL_MIGRATION_RUNBOOK.md and DEC-026.
//
//   node scripts/db-migrate.mjs status   --target dev --expect-database <name> --url-env-file .env --url-env-key DEV_DATABASE_URL
//   node scripts/db-migrate.mjs baseline --target dev --expect-database <name> --commit <sha> --reference-url mysql://root@127.0.0.1:3306 ...
//   node scripts/db-migrate.mjs deploy   --target dev --expect-database <name> --commit <sha> --apply <name,name> --reference-url ... ...
//   node scripts/db-migrate.mjs new      --name add_x --local-url mysql://root@127.0.0.1:3306/hil_local
//
// The database URL comes from MIGRATE_DATABASE_URL, or from one named key of an env file.
// It is never read from DATABASE_URL: this repo's .env has pointed that at production, and a
// variable's name proves nothing about where it leads. The target is confirmed by asking the
// server which database it is and comparing with --expect-database.
import pkg from "@prisma/client";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BASELINE_MIGRATION,
  MIGRATIONS_DIR,
  deployPrecheck,
  evaluateHistory,
  isLoopbackUrl,
  readLocalMigrations,
} from "./lib/migration-history.mjs";

const { PrismaClient } = pkg;
const HISTORY_TABLE = "_prisma_migrations";
// The locked Prisma CLI from this checkout's node_modules — never `npx`, which could fetch another version.
const PRISMA_CLI = fileURLToPath(new URL("../node_modules/prisma/build/index.js", import.meta.url));

class Stop extends Error {}
const stop = (msg) => {
  throw new Stop(msg);
};

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const opts = {};
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (!a.startsWith("--")) stop(`Unexpected argument: ${a}`);
    const key = a.slice(2);
    const next = rest[i + 1];
    if (next === undefined || next.startsWith("--")) opts[key] = true;
    else {
      opts[key] = next;
      i++;
    }
  }
  return { command, opts };
}

function resolveTargetUrl(opts) {
  if (opts["url-env-file"]) {
    const key = opts["url-env-key"];
    if (typeof key !== "string") stop("--url-env-file needs --url-env-key <VARIABLE>");
    const line = fs
      .readFileSync(opts["url-env-file"], "utf8")
      .split("\n")
      .map((l) => l.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/))
      .find((m) => m && m[1] === key);
    if (!line) stop(`${key} not found in ${opts["url-env-file"]}`);
    return line[2].trim().replace(/^(['"])(.*)\1$/, "$2");
  }
  if (process.env.MIGRATE_DATABASE_URL) return process.env.MIGRATE_DATABASE_URL;
  return stop("No database URL. Set MIGRATE_DATABASE_URL, or pass --url-env-file <file> --url-env-key <VARIABLE>. DATABASE_URL is deliberately not used.");
}

/** Removes connection strings and the password from anything about to be printed or stored. */
function makeRedactor(urls) {
  const secrets = new Set();
  for (const u of urls.filter(Boolean)) {
    secrets.add(u);
    try {
      const p = new URL(u).password;
      if (p) {
        secrets.add(p);
        secrets.add(decodeURIComponent(p));
      }
    } catch {
      /* not a URL */
    }
  }
  return (text) => {
    let out = String(text);
    for (const s of secrets) out = out.split(s).join("***");
    return out.replace(/mysql:\/\/[^\s"']+/g, "mysql://***");
  };
}

function prismaCli(args, { url, redact, schema }) {
  const r = spawnSync(process.execPath, [PRISMA_CLI, ...args, ...(schema ? ["--schema", schema] : [])], {
    encoding: "utf8",
    // DATABASE_URL is set explicitly so Prisma can never fall back to the project .env.
    env: { ...process.env, DATABASE_URL: url, PRISMA_HIDE_UPDATE_MESSAGE: "1" },
  });
  return { status: r.status, output: redact(`${r.stdout ?? ""}${r.stderr ?? ""}`).trim() };
}

async function identify(prisma) {
  const [row] = await prisma.$queryRawUnsafe("SELECT DATABASE() AS db, VERSION() AS version, @@hostname AS host");
  return { database: row.db, version: row.version, host: row.host };
}

async function readHistoryRows(prisma) {
  const [{ n }] = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = '${HISTORY_TABLE}'`,
  );
  if (Number(n) === 0) return null;
  return prisma.$queryRawUnsafe(
    `SELECT migration_name, checksum, finished_at, rolled_back_at, applied_steps_count, logs FROM \`${HISTORY_TABLE}\` ORDER BY started_at`,
  );
}

/**
 * Everything about the schema that information_schema exposes, as sorted text lines — including
 * what Prisma's own diff does not look at (column order, collations, engines, views, triggers,
 * routines, events). `_prisma_migrations` is excluded: it is metadata, not application schema.
 */
async function schemaFingerprint(prisma) {
  const q = (sql) => prisma.$queryRawUnsafe(sql);
  const not = `<> '${HISTORY_TABLE}'`;
  const sets = {
    table: await q(`SELECT table_name a, table_type b, engine c, table_collation d FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name ${not}`),
    column: await q(`SELECT table_name a, ordinal_position b, column_name c, column_type d, is_nullable e, column_default f, extra g, character_set_name h, collation_name i FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name ${not}`),
    index: await q(`SELECT table_name a, index_name b, seq_in_index c, column_name d, sub_part e, non_unique f, index_type g FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name ${not}`),
    fk: await q(`SELECT k.table_name a, k.constraint_name b, k.ordinal_position c, k.column_name d, k.referenced_table_name e, k.referenced_column_name f, r.update_rule g, r.delete_rule h FROM information_schema.key_column_usage k JOIN information_schema.referential_constraints r ON r.constraint_schema = k.constraint_schema AND r.constraint_name = k.constraint_name AND r.table_name = k.table_name WHERE k.table_schema = DATABASE() AND k.referenced_table_name IS NOT NULL`),
    check: await q(`SELECT table_name a, constraint_name b, check_clause c FROM information_schema.check_constraints WHERE constraint_schema = DATABASE()`),
    trigger: await q(`SELECT trigger_name a, event_object_table b, action_timing c, event_manipulation d FROM information_schema.triggers WHERE trigger_schema = DATABASE()`),
    routine: await q(`SELECT routine_name a, routine_type b FROM information_schema.routines WHERE routine_schema = DATABASE()`),
    event: await q(`SELECT event_name a FROM information_schema.events WHERE event_schema = DATABASE()`),
  };
  const lines = [];
  for (const [kind, rows] of Object.entries(sets)) {
    for (const row of rows) lines.push(`${kind} | ${Object.values(row).map((v) => (v === null ? "NULL" : String(v))).join(" | ")}`);
  }
  return lines.sort();
}

function diffLines(a, b) {
  const A = new Set(a);
  const B = new Set(b);
  return { onlyInTarget: a.filter((l) => !B.has(l)), onlyInReference: b.filter((l) => !A.has(l)) };
}

/**
 * Builds a throwaway database on a LOOPBACK server from the given migrations and compares the
 * target with it, two ways: Prisma's diff, and the information_schema fingerprint.
 * `migrate status` and `migrate deploy` only compare history rows; this compares the schema.
 */
async function driftCheck({ targetUrl, targetPrisma, referenceServerUrl, migrationNames, redact, say }) {
  if (!isLoopbackUrl(referenceServerUrl)) stop("--reference-url must be a loopback server (127.0.0.1 / localhost): it is created and dropped by this command.");
  const dbName = `hil_migrate_ref_${process.pid}_${Date.now()}`;
  const server = new URL(referenceServerUrl);
  server.pathname = "/";
  const refUrl = new URL(server);
  refUrl.pathname = `/${dbName}`;
  const admin = new PrismaClient({ datasourceUrl: `${server.toString()}mysql` });
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "hil-migrate-"));
  try {
    await admin.$executeRawUnsafe(`CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    fs.copyFileSync("prisma/schema.prisma", path.join(work, "schema.prisma"));
    fs.mkdirSync(path.join(work, "migrations"));
    fs.copyFileSync(path.join(MIGRATIONS_DIR, "migration_lock.toml"), path.join(work, "migrations", "migration_lock.toml"));
    for (const name of migrationNames) fs.cpSync(path.join(MIGRATIONS_DIR, name), path.join(work, "migrations", name), { recursive: true });

    const applied = prismaCli(["migrate", "deploy"], { url: refUrl.toString(), redact, schema: path.join(work, "schema.prisma") });
    if (applied.status !== 0) stop(`Could not build the reference database from the migrations:\n${applied.output}`);

    const prismaDiff = prismaCli(
      ["migrate", "diff", "--from-schema-datasource", "prisma/schema.prisma", "--to-url", refUrl.toString(), "--script", "--exit-code"],
      { url: targetUrl, redact },
    );
    const ref = new PrismaClient({ datasourceUrl: refUrl.toString() });
    let fp;
    try {
      fp = diffLines(await schemaFingerprint(targetPrisma), await schemaFingerprint(ref));
    } finally {
      await ref.$disconnect();
    }
    const equal = prismaDiff.status === 0 && fp.onlyInTarget.length === 0 && fp.onlyInReference.length === 0;
    say(`Drift check against ${migrationNames.length} migration(s) [${migrationNames.join(", ")}]: ${equal ? "NO DRIFT" : "DRIFT FOUND"}`);
    if (!equal) {
      if (prismaDiff.status !== 0) say(`  Prisma diff (target -> expected), exit ${prismaDiff.status}:\n${prismaDiff.output}`);
      for (const l of fp.onlyInTarget) say(`  only in target:   ${l}`);
      for (const l of fp.onlyInReference) say(`  only in expected: ${l}`);
    }
    return { equal, prismaDiffExit: prismaDiff.status, onlyInTarget: fp.onlyInTarget, onlyInReference: fp.onlyInReference };
  } finally {
    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS \`${dbName}\``).catch(() => {});
    await admin.$disconnect();
    fs.rmSync(work, { recursive: true, force: true });
  }
}

function gitState() {
  const git = (...a) => execFileSync("git", a, { encoding: "utf8" }).trim();
  return {
    head: git("rev-parse", "HEAD"),
    dirty: git("status", "--porcelain", "--", "prisma", "scripts", "package.json", "package-lock.json"),
  };
}

function requireReviewedCommit(opts) {
  const { head, dirty } = gitState();
  if (typeof opts.commit !== "string" || opts.commit.length < 7) stop("--commit <sha> is required: the reviewed commit this run was approved for.");
  if (!head.startsWith(opts.commit)) stop(`Checked-out commit is ${head.slice(0, 12)}, but --commit says ${opts.commit}. Check out the reviewed commit.`);
  if (dirty) stop(`Uncommitted changes in files that define the migration:\n${dirty}\nA run must be reproducible from the reviewed commit.`);
  return head;
}

function writeRecord(record) {
  const dir = ".migration-runs";
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${record.startedAt.replace(/[:.]/g, "-")}-${record.target}-${record.command}.json`);
  fs.writeFileSync(file, JSON.stringify(record, null, 2));
  return file;
}

async function main() {
  const { command, opts } = parseArgs(process.argv.slice(2));
  if (!["status", "baseline", "deploy", "new"].includes(command)) {
    stop("Usage: node scripts/db-migrate.mjs <status|baseline|deploy|new> [options] — see docs/HIL_MIGRATION_RUNBOOK.md");
  }

  if (command === "new") {
    // Authoring only ever touches a local database. `prisma migrate dev` can ask to reset the
    // database it is pointed at, so a hosted URL is refused outright.
    if (typeof opts.name !== "string") stop("--name <migration_name> is required");
    if (typeof opts["local-url"] !== "string" || !isLoopbackUrl(opts["local-url"])) stop("--local-url must be a loopback database URL (127.0.0.1 / localhost).");
    const r = spawnSync(process.execPath, [PRISMA_CLI, "migrate", "dev", "--create-only", "--name", opts.name], {
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: opts["local-url"], PRISMA_HIDE_UPDATE_MESSAGE: "1" },
    });
    process.exit(r.status ?? 1);
  }

  const target = opts.target;
  if (!["dev", "production", "local"].includes(target)) stop("--target must be dev, production or local");
  const targetUrl = resolveTargetUrl(opts);
  const redact = makeRedactor([targetUrl, opts["reference-url"]]);
  const say = (m) => console.log(redact(m));
  if (target === "local" && !isLoopbackUrl(targetUrl)) stop("--target local requires a loopback database URL.");
  if (target !== "local" && isLoopbackUrl(targetUrl)) stop(`--target ${target} was given a loopback URL.`);
  if (typeof opts["expect-database"] !== "string") stop("--expect-database <name> is required: the database you intend to act on.");
  if (target === "production" && command !== "status" && !opts["confirm-production"]) stop("Writing to production requires --confirm-production (and the Owner's approval for this exact commit).");

  const record = { command, target, startedAt: new Date().toISOString(), result: "incomplete" };
  const prisma = new PrismaClient({ datasourceUrl: targetUrl });
  try {
    const id = await identify(prisma);
    record.database = id.database;
    record.server = `${id.host} / ${id.version}`;
    say(`Target: ${target} — server reports database "${id.database}" on ${id.host} (${id.version})`);
    if (id.database !== opts["expect-database"]) stop(`The server says this is "${id.database}", not "${opts["expect-database"]}". Nothing was changed.`);

    const local = readLocalMigrations();
    if (local.length === 0 || local[0].name !== BASELINE_MIGRATION) stop(`Expected ${BASELINE_MIGRATION} to be the first migration in ${MIGRATIONS_DIR}.`);
    const rows = await readHistoryRows(prisma);
    const history = evaluateHistory(local, rows ?? []);
    record.before = { historyTable: rows !== null, applied: history.applied, pending: history.pending, failed: history.failed };
    say(`History table: ${rows === null ? "absent (database not baselined)" : `${rows.length} row(s)`}`);
    say(`Applied: ${history.applied.join(", ") || "(none)"}`);
    say(`Pending: ${history.pending.join(", ") || "(none)"}`);
    const reference = typeof opts["reference-url"] === "string" ? opts["reference-url"] : null;
    const drift = (migrationNames) => driftCheck({ targetUrl, targetPrisma: prisma, referenceServerUrl: reference, migrationNames, redact, say });

    if (command === "status") {
      const pre = deployPrecheck(history);
      for (const p of pre.problems) say(`PROBLEM: ${p}`);
      let driftOk = null;
      if (reference && rows !== null && history.applied.length) driftOk = (await drift(history.applied)).equal;
      else if (reference && rows === null) driftOk = (await drift([BASELINE_MIGRATION])).equal;
      else say("Drift check skipped: pass --reference-url <loopback server> to compare the schema itself.");
      record.result = "status";
      record.drift = driftOk;
      process.exitCode = !pre.ok || driftOk === false ? 1 : history.pending.length || rows === null ? 3 : 0;
      return;
    }

    record.commit = requireReviewedCommit(opts);
    say(`Commit: ${record.commit}`);
    if (!reference) stop("--reference-url <loopback MariaDB server> is required: the schema is compared with a database built from the migrations before anything is written.");

    if (command === "baseline") {
      // METADATA WRITE ONLY: creates `_prisma_migrations` and inserts one row. None of the
      // baseline's CREATE statements run.
      if (rows !== null && rows.length > 0) stop("This database already has migration history. Baselining is a one-time step; nothing was changed.");
      const check = await drift([BASELINE_MIGRATION]);
      record.drift = check;
      if (!check.equal) stop("The database does not match the baseline. It was NOT marked as applied. Review the differences above; any fix needs its own approval.");
      const fpBefore = await schemaFingerprint(prisma);
      const r = prismaCli(["migrate", "resolve", "--applied", BASELINE_MIGRATION], { url: targetUrl, redact });
      say(r.output);
      if (r.status !== 0) stop("`prisma migrate resolve` failed. Check `status` before doing anything else.");
      const after = evaluateHistory(local, (await readHistoryRows(prisma)) ?? []);
      const fpAfter = await schemaFingerprint(prisma);
      const unchanged = diffLines(fpBefore, fpAfter);
      record.after = { applied: after.applied, pending: after.pending };
      if (!after.applied.includes(BASELINE_MIGRATION) || after.checksumMismatch.length || after.failed.length) stop("The baseline row is not in the expected state after resolve.");
      if (unchanged.onlyInTarget.length || unchanged.onlyInReference.length) stop("Application schema changed during the baseline — this should be impossible; investigate.");
      record.result = "baselined";
      say(`Baselined: ${BASELINE_MIGRATION} recorded as applied. Application schema unchanged.`);
      return;
    }

    // deploy
    if (rows === null) stop("This database has not been baselined. Run `baseline` first.");
    const pre = deployPrecheck(history);
    if (!pre.ok) stop(`Refusing to deploy:\n- ${pre.problems.join("\n- ")}`);
    const before = await drift(history.applied);
    if (!before.equal) stop("The database has drifted from its recorded migrations. Nothing was applied. Review the differences above.");
    if (history.pending.length === 0) {
      record.result = "nothing-to-apply";
      record.after = { applied: history.applied, pending: [] };
      say("Nothing to apply: every migration in this commit is already applied, and the schema matches.");
      return;
    }
    const requested = typeof opts.apply === "string" ? opts.apply.split(",").map((s) => s.trim()).filter(Boolean) : [];
    if (requested.join(",") !== history.pending.join(",")) {
      stop(`Pending migration(s): ${history.pending.join(", ")}\nRe-run with --apply ${history.pending.join(",")} once each has been reviewed. Nothing was applied.`);
    }
    say(`Applying: ${history.pending.join(", ")}`);
    const r = prismaCli(["migrate", "deploy"], { url: targetUrl, redact });
    say(r.output);
    const afterRows = (await readHistoryRows(prisma)) ?? [];
    const after = evaluateHistory(local, afterRows);
    record.after = { applied: after.applied, pending: after.pending, failed: after.failed };
    if (r.status !== 0 || after.failed.length || after.pending.length) {
      record.result = "FAILED";
      stop(
        "MIGRATION FAILED. Do not re-run, and do not mark it applied. MariaDB commits each DDL statement as it runs, so the " +
          "migration may be partly applied. Do not release the code that depends on it. Follow \"A migration failed\" in docs/HIL_MIGRATION_RUNBOOK.md.",
      );
    }
    const post = await drift(local.map((m) => m.name));
    record.drift = post;
    if (!post.equal) {
      record.result = "APPLIED-WITH-DRIFT";
      stop("Migrations applied, but the schema does not match what they describe. Do not release dependent code; investigate.");
    }
    record.result = "applied";
    say(`Applied ${history.pending.length} migration(s). Schema verified.`);
  } catch (e) {
    if (record.result === "incomplete") record.result = e instanceof Stop ? "stopped" : "error";
    record.error = redact(e?.message ?? e);
    throw e;
  } finally {
    record.finishedAt = new Date().toISOString();
    await prisma.$disconnect().catch(() => {});
    if (command !== "status") console.log(`Run record: ${writeRecord(record)}`);
  }
}

main().catch((e) => {
  console.error(`\n${e instanceof Stop ? "STOPPED" : "ERROR"}: ${String(e?.message ?? e).replace(/mysql:\/\/[^\s"']+/g, "mysql://***")}`);
  process.exit(1);
});
