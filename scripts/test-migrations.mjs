#!/usr/bin/env node
// End-to-end tests for the migration history, the release gate and the operator command,
// against a DISPOSABLE MariaDB server that this script fills with throwaway databases.
//
//   TEST_DATABASE_SERVER_URL="mysql://root@127.0.0.1:3306" npm run test:migrations
//
// The server must be loopback: the script creates and drops databases named hil_mt_*. It can
// never reach a hosted database. CI runs it against a MariaDB service container (the
// "Migrations" job); it is not part of `npm test`.
import pkg from "@prisma/client";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BASELINE_MIGRATION, isLoopbackUrl } from "./lib/migration-history.mjs";
import { runGate } from "./migration-gate.mjs";

const { PrismaClient } = pkg;
const REPO = fileURLToPath(new URL("..", import.meta.url));
const PRISMA_CLI = path.join(REPO, "node_modules/prisma/build/index.js");
const DB_MIGRATE = path.join(REPO, "scripts/db-migrate.mjs");
const SERVER = process.env.TEST_DATABASE_SERVER_URL;
if (!SERVER || !isLoopbackUrl(SERVER)) {
  console.error("TEST_DATABASE_SERVER_URL must be set to a loopback MariaDB server, e.g. mysql://root@127.0.0.1:3306");
  process.exit(1);
}
const serverUrl = new URL(SERVER);
serverUrl.pathname = "";
const serverBase = serverUrl.toString().replace(/\/$/, "");
const urlFor = (db) => `${serverBase}/${db}`;
const admin = new PrismaClient({ datasourceUrl: urlFor("mysql") });
const created = [];
let failures = 0;

function check(name, condition, detail = "") {
  if (condition) console.log(`  ok   ${name}`);
  else {
    failures++;
    console.log(`  FAIL ${name}${detail ? `\n       ${String(detail).split("\n").join("\n       ")}` : ""}`);
  }
}

async function freshDb(label) {
  const db = `hil_mt_${label}_${process.pid}`;
  await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS \`${db}\``);
  await admin.$executeRawUnsafe(`CREATE DATABASE \`${db}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  created.push(db);
  return { db, url: urlFor(db) };
}

function prisma(args, url, cwd = REPO) {
  const r = spawnSync(process.execPath, [PRISMA_CLI, ...args], { cwd, encoding: "utf8", env: { ...process.env, DATABASE_URL: url, PRISMA_HIDE_UPDATE_MESSAGE: "1" } });
  return { status: r.status, output: `${r.stdout}${r.stderr}` };
}

function dbMigrate(args, url, cwd = REPO) {
  const env = { ...process.env, MIGRATE_DATABASE_URL: url };
  delete env.DATABASE_URL;
  const r = spawnSync(process.execPath, [DB_MIGRATE, ...args, "--reference-url", serverBase], { cwd, encoding: "utf8", env });
  return { status: r.status, output: `${r.stdout}${r.stderr}` };
}

/** A database as `prisma db push` left the hosted ones: full schema, real rows, no history table. */
async function legacyDb(label) {
  const t = await freshDb(label);
  const r = prisma(["db", "execute", "--file", path.join(REPO, "prisma/migrations", BASELINE_MIGRATION, "migration.sql"), "--url", t.url], t.url);
  if (r.status !== 0) throw new Error(`could not build legacy database: ${r.output}`);
  const c = new PrismaClient({ datasourceUrl: t.url });
  try {
    await c.$executeRawUnsafe("INSERT INTO `Property` (slug, name, description, type, location, images, amenities, updatedAt) VALUES ('cozy-test', 'Cozy Test', 'A description — with ünïcode ₱', '1BR', 'Lipa', '[]', '[]', NOW(3)), ('mickey-test', 'Mickey Test', 'Another', '3BR', 'Lipa', '[\"a.jpg\"]', '[\"wifi\"]', NOW(3))");
    await c.$executeRawUnsafe("INSERT INTO `Booking` (propertyId, guestName, guestEmail, guestPhone, checkIn, checkOut, totalPrice, updatedAt) VALUES (1, 'Test Guest', 'guest@example.test', '+639170000000', '2026-11-01', '2026-11-03', 3000.00, NOW(3)), (2, 'Second Guest', 'two@example.test', '+639170000001', '2026-12-24', '2026-12-26', 12345.67, NOW(3))");
    // QuickReply.propertyId is a legacy column the app no longer writes; it must survive.
    await c.$executeRawUnsafe("INSERT INTO `QuickReply` (name, subject, bodyTemplate, propertyId, updatedAt) VALUES ('Welcome', 'Hello', 'Hi {{guestName}}', 1, NOW(3))");
    await c.$executeRawUnsafe("INSERT INTO `CheckoutAttempt` (token, propertyId, guestName, guestEmail, guestPhone, checkIn, checkOut, guests, paymentMethod, total, updatedAt) VALUES ('tok_test', 1, 'Test Guest', 'guest@example.test', '+639170000000', '2026-11-01', '2026-11-03', 2, 'gcash', 3000.00, NOW(3))");
    await c.$executeRawUnsafe("INSERT INTO `GuestMessage` (bookingId, `trigger`, subject, body, messageId) VALUES (1, 'manual', 'Subject', 'Body', 'abc@mail.example.test')");
  } finally {
    await c.$disconnect();
  }
  return t;
}

async function dataChecksums(url) {
  const c = new PrismaClient({ datasourceUrl: url });
  try {
    const tables = await c.$queryRawUnsafe("SELECT table_name AS t FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name <> '_prisma_migrations' ORDER BY table_name");
    const out = [];
    for (const { t } of tables) {
      const [row] = await c.$queryRawUnsafe(`CHECKSUM TABLE \`${t}\``);
      const [{ n }] = await c.$queryRawUnsafe(`SELECT COUNT(*) AS n FROM \`${t}\``);
      out.push(`${t}:${n}:${row.Checksum}`);
    }
    return out.join("|");
  } finally {
    await c.$disconnect();
  }
}

async function tableExists(url, table) {
  const c = new PrismaClient({ datasourceUrl: url });
  try {
    const [{ n }] = await c.$queryRawUnsafe(`SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = '${table}'`);
    return Number(n) === 1;
  } finally {
    await c.$disconnect();
  }
}

/** A throwaway git checkout holding prisma/ plus one extra migration, to act as "a later commit". */
function projectWithExtraMigration(name, sql) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hil-mt-"));
  fs.cpSync(path.join(REPO, "prisma/schema.prisma"), path.join(dir, "prisma/schema.prisma"), { recursive: true });
  fs.cpSync(path.join(REPO, "prisma/migrations"), path.join(dir, "prisma/migrations"), { recursive: true });
  fs.mkdirSync(path.join(dir, "prisma/migrations", name));
  fs.writeFileSync(path.join(dir, "prisma/migrations", name, "migration.sql"), sql);
  const git = (...a) => execFileSync("git", a, { cwd: dir, encoding: "utf8" }).trim();
  git("init", "-q");
  git("add", "-A");
  git("-c", "user.name=test", "-c", "user.email=test@example.test", "commit", "-qm", "test");
  return { dir, commit: git("rev-parse", "HEAD") };
}

const repoCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: REPO, encoding: "utf8" }).trim();
const repoDirty = execFileSync("git", ["status", "--porcelain", "--", "prisma", "scripts", "package.json", "package-lock.json"], { cwd: REPO, encoding: "utf8" }).trim();
const silent = () => {};

try {
  console.log("1. Migration history recreates an empty database that matches schema.prisma");
  {
    const t = await freshDb("empty");
    const dep = prisma(["migrate", "deploy"], t.url);
    check("migrate deploy succeeds on an empty database", dep.status === 0, dep.output);
    const diff = prisma(["migrate", "diff", "--from-url", t.url, "--to-schema-datamodel", "prisma/schema.prisma", "--exit-code"], t.url);
    check("resulting schema equals schema.prisma (no schema edit without a migration)", diff.status === 0, diff.output);
    const again = prisma(["migrate", "deploy"], t.url);
    check("a second migrate deploy is a no-op", again.status === 0 && /No pending migrations/.test(again.output), again.output);
    check("release gate passes", (await runGate({ url: t.url, log: silent })).ok);

    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "hil-mt-schema-"));
    const edited = fs.readFileSync(path.join(REPO, "prisma/schema.prisma"), "utf8").replace(/model AdminUser \{/, "model AdminUser {\n  zzUnmigratedField String?");
    fs.writeFileSync(path.join(tmp, "schema.prisma"), edited);
    const bad = prisma(["migrate", "diff", "--from-url", t.url, "--to-schema-datamodel", path.join(tmp, "schema.prisma"), "--exit-code"], t.url);
    check("a schema.prisma edit with no migration is detected (exit 2)", bad.status === 2, `exit ${bad.status}`);
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  console.log("2. Baselining a populated database is metadata-only");
  if (repoDirty) {
    check("working tree is committed (the operator command refuses uncommitted migration files)", false, repoDirty);
  } else {
    const t = await legacyDb("legacy");
    const before = await dataChecksums(t.url);
    check("release gate blocks a database with no history", !(await runGate({ url: t.url, log: silent })).ok);
    const wrong = dbMigrate(["baseline", "--target", "local", "--expect-database", "some_other_db", "--commit", repoCommit], t.url);
    check("refuses when the server is not the expected database", wrong.status === 1 && !(await tableExists(t.url, "_prisma_migrations")), wrong.output);
    const st = dbMigrate(["status", "--target", "local", "--expect-database", t.db], t.url);
    check("status reports not baselined (exit 3) and no drift", st.status === 3 && /NO DRIFT/.test(st.output), st.output);
    const base = dbMigrate(["baseline", "--target", "local", "--expect-database", t.db, "--commit", repoCommit], t.url);
    check("baseline succeeds", base.status === 0, base.output);
    check("data is unchanged by the baseline", (await dataChecksums(t.url)) === before);
    const dep = prisma(["migrate", "deploy"], t.url);
    check("migrate deploy afterwards is a no-op", dep.status === 0 && /No pending migrations/.test(dep.output), dep.output);
    const op = dbMigrate(["deploy", "--target", "local", "--expect-database", t.db, "--commit", repoCommit], t.url);
    check("operator deploy reports nothing to apply", op.status === 0 && /Nothing to apply/.test(op.output), op.output);
    check("data is unchanged after deploy", (await dataChecksums(t.url)) === before);
    check("release gate passes once baselined", (await runGate({ url: t.url, log: silent })).ok);
    const twice = dbMigrate(["baseline", "--target", "local", "--expect-database", t.db, "--commit", repoCommit], t.url);
    check("baselining a second time is refused", twice.status === 1, twice.output);
    check("no credentials or connection strings in output", !/mysql:\/\/(?!\*\*\*)/.test(base.output + op.output + st.output));

    console.log("3. A drifted database is not baselined");
    const d = await legacyDb("drift");
    const c = new PrismaClient({ datasourceUrl: d.url });
    await c.$executeRawUnsafe("ALTER TABLE `Property` ADD COLUMN `zzHandAdded` INT NULL");
    await c.$disconnect();
    const drifted = dbMigrate(["baseline", "--target", "local", "--expect-database", d.db, "--commit", repoCommit], d.url);
    check("baseline stops on drift", drifted.status === 1 && /DRIFT FOUND/.test(drifted.output), drifted.output);
    check("nothing was recorded", !(await tableExists(d.url, "_prisma_migrations")));

    console.log("4. A pending migration blocks the release until it is applied on purpose");
    {
      const p = await legacyDb("pending");
      dbMigrate(["baseline", "--target", "local", "--expect-database", p.db, "--commit", repoCommit], p.url);
      const name = "20991231000000_test_add_column";
      const proj = projectWithExtraMigration(name, "ALTER TABLE `Property` ADD COLUMN `zzTestColumn` INT NULL;\n");
      const dir = path.join(proj.dir, "prisma/migrations");
      const rowsBefore = await dataChecksums(p.url);
      const gate = await runGate({ url: p.url, migrationsDir: dir, log: silent });
      check("gate blocks the dependent build", !gate.ok && /not applied/.test(gate.problems.join()), JSON.stringify(gate));
      const noApply = dbMigrate(["deploy", "--target", "local", "--expect-database", p.db, "--commit", proj.commit], p.url, proj.dir);
      check("deploy without --apply lists the pending migration and stops", noApply.status === 1 && noApply.output.includes(name), noApply.output);
      check("nothing was applied", (await dataChecksums(p.url)) === rowsBefore);
      const apply = dbMigrate(["deploy", "--target", "local", "--expect-database", p.db, "--commit", proj.commit, "--apply", name], p.url, proj.dir);
      check("deploy --apply applies it and verifies the schema", apply.status === 0 && /Schema verified/.test(apply.output), apply.output);
      check("gate passes afterwards", (await runGate({ url: p.url, migrationsDir: dir, log: silent })).ok);
      const older = await runGate({ url: p.url, log: silent });
      check("an older commit (without the migration) still builds, with a warning", older.ok && older.warnings.length === 1, JSON.stringify(older));
      const run = fs.readdirSync(path.join(proj.dir, ".migration-runs")).length;
      check("each run left a record", run === 2, `records: ${run}`);

      const c2 = new PrismaClient({ datasourceUrl: p.url });
      await c2.$executeRawUnsafe("ALTER TABLE `Property` DROP COLUMN `zzTestColumn`");
      await c2.$disconnect();
      const afterDrift = dbMigrate(["deploy", "--target", "local", "--expect-database", p.db, "--commit", proj.commit], p.url, proj.dir);
      check("deploy stops when the schema has drifted, though history looks complete", afterDrift.status === 1 && /DRIFT FOUND/.test(afterDrift.output), afterDrift.output);
      fs.rmSync(proj.dir, { recursive: true, force: true });
    }

    console.log("5. A failing migration fails closed");
    {
      const f = await legacyDb("failing");
      dbMigrate(["baseline", "--target", "local", "--expect-database", f.db, "--commit", repoCommit], f.url);
      const name = "20991231000001_test_failing";
      const proj = projectWithExtraMigration(name, "CREATE TABLE `zz_partial` (`id` INT NOT NULL PRIMARY KEY);\nALTER TABLE `zz_no_such_table` ADD COLUMN `x` INT NULL;\n");
      const dir = path.join(proj.dir, "prisma/migrations");
      const run = dbMigrate(["deploy", "--target", "local", "--expect-database", f.db, "--commit", proj.commit, "--apply", name], f.url, proj.dir);
      check("deploy exits non-zero", run.status === 1 && /MIGRATION FAILED/.test(run.output), run.output);
      check("the first statement stayed committed (MariaDB DDL is not transactional)", await tableExists(f.url, "zz_partial"));
      const gate = await runGate({ url: f.url, migrationsDir: dir, log: silent });
      check("gate blocks the dependent build", !gate.ok && /failed or interrupted/.test(gate.problems.join()), JSON.stringify(gate));
      const rerun = dbMigrate(["deploy", "--target", "local", "--expect-database", f.db, "--commit", proj.commit, "--apply", name], f.url, proj.dir);
      check("a re-run refuses instead of re-executing the SQL", rerun.status === 1 && /Refusing to deploy/.test(rerun.output), rerun.output);
      const baselineGate = await runGate({ url: f.url, log: silent });
      check("gate also blocks other commits while a failed migration is unresolved", !baselineGate.ok);
      fs.rmSync(proj.dir, { recursive: true, force: true });
    }
  }
} finally {
  for (const db of created) await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS \`${db}\``).catch(() => {});
  await admin.$disconnect();
}

console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll migration checks passed");
process.exit(failures ? 1 : 0);
