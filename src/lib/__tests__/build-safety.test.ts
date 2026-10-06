import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  BASELINE_MIGRATION,
  deployPrecheck,
  evaluateHistory,
  findSchemaWritingCommands,
  gateVerdict,
  isLoopbackUrl,
  readLocalMigrations,
} from "../../../scripts/lib/migration-history.mjs";

/**
 * DEC-026: an ordinary deployment must never change a database's schema.
 *
 * These tests read the repo's own configuration. They fail if a schema-writing command
 * (`prisma db push`, `prisma migrate deploy`, a seed, a backfill…) is put back anywhere that
 * runs automatically: an npm lifecycle hook, a build script, vercel.json, or a workflow that
 * fires on push, pull request or schedule. No database is involved.
 */
const root = path.resolve(__dirname, "../../..");
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");
const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };

// Scripts npm, Vercel or CI run without anyone asking for a migration.
const AUTOMATIC_SCRIPTS = [
  "preinstall", "install", "postinstall", "prepare", "prepublish", "prepack",
  "prebuild", "build", "postbuild", "build:app", "vercel-build",
  "predev", "dev", "prestart", "start", "pretest", "test", "posttest", "lint", "typecheck",
];

describe("automatic build/install paths never write a schema", () => {
  it.each(AUTOMATIC_SCRIPTS.filter((s) => pkg.scripts[s] !== undefined))("package.json script %s", (name) => {
    expect(findSchemaWritingCommands(pkg.scripts[name])).toEqual([]);
  });

  it("build delegates to the compile-only application build", () => {
    expect(pkg.scripts.build).toBe("npm run build:app");
    expect(pkg.scripts["build:app"]).toBe("prisma generate && next build");
  });

  it("the Vercel build adds only the read-only release gate", () => {
    expect(pkg.scripts["vercel-build"]).toBe("prisma generate && node scripts/migration-gate.mjs && npm run build:app");
    const gate = read("scripts/migration-gate.mjs");
    expect(gate).not.toMatch(/\$executeRaw|child_process|spawn|exec\(/);
    for (const sql of gate.match(/"(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)[^"]*"/gi) ?? []) {
      expect(sql).toMatch(/^"SELECT /);
    }
  });

  it("vercel.json overrides no build or install command", () => {
    const vercel = JSON.parse(read("vercel.json")) as Record<string, unknown>;
    for (const key of ["buildCommand", "installCommand", "devCommand", "ignoreCommand"]) {
      expect(vercel[key]).toBeUndefined();
    }
  });

  it("no workflow runs a schema-writing command or receives a hosted database credential", () => {
    const dir = path.join(root, ".github/workflows");
    const files = fs.readdirSync(dir).filter((f) => /\.ya?ml$/.test(f));
    expect(files).toContain("ci.yml");
    for (const f of files) {
      // Comments may name the commands (to say they are not run); only executable lines count.
      const code = fs.readFileSync(path.join(dir, f), "utf8").split("\n").filter((l) => !l.trim().startsWith("#")).join("\n");
      // The Migrations job migrates a throwaway service container on localhost — the one allowed use.
      const allowed = f === "ci.yml" ? code.replace(/npm run test:migrations/g, "") : code;
      expect({ file: f, found: findSchemaWritingCommands(allowed) }).toEqual({ file: f, found: [] });
      expect(code).not.toMatch(/secrets\.[A-Z_]*DATABASE/);
      for (const m of code.matchAll(/DATABASE[A-Z_]*URL:\s*(\S+)/g)) expect(isLoopbackUrl(m[1])).toBe(true);
    }
  });

  it("the schema-writing detector recognises the commands it guards against", () => {
    for (const cmd of [
      "prisma db push --skip-generate && next build",
      "npx prisma migrate deploy",
      "prisma migrate resolve --applied x",
      "prisma db push --accept-data-loss",
      "npm run seed",
      "node scripts/db-migrate.mjs deploy",
      "npm run db:migrate -- deploy",
      "ts-node prisma/seed-testimonials.ts",
    ]) {
      expect(findSchemaWritingCommands(cmd).length).toBeGreaterThan(0);
    }
    expect(findSchemaWritingCommands("prisma generate && next build")).toEqual([]);
  });
});

describe("migration history on disk", () => {
  const local = readLocalMigrations(path.join(root, "prisma/migrations"));

  it("starts with the baseline and is locked to MySQL", () => {
    expect(local[0]?.name).toBe(BASELINE_MIGRATION);
    expect(read("prisma/migrations/migration_lock.toml")).toMatch(/provider = "mysql"/);
  });

  it("the baseline is frozen (its checksum is recorded in every baselined database)", () => {
    // Changing this file would make the release gate block every deploy. If this fails, restore
    // the file — do not update the hash.
    expect(local[0].checksum).toBe("0246c5adaa5ae8a6c8694375ad3d757f5582be916fb81b6719910f83472609ef");
  });

  it("migration names sort in creation order and contain no destructive shortcuts", () => {
    for (const m of local) {
      expect(m.name).toMatch(/^\d{14}_[a-z0-9_]+$/);
      const sql = read(`prisma/migrations/${m.name}/migration.sql`);
      if (m.name !== BASELINE_MIGRATION) expect(sql).not.toMatch(/DROP DATABASE|TRUNCATE/i);
    }
  });
});

describe("history evaluation", () => {
  const local = [
    { name: "1_a", checksum: "aa" },
    { name: "2_b", checksum: "bb" },
  ];
  const row = (migration_name: string, checksum: string, state: "applied" | "failed" | "rolledBack") => ({
    migration_name,
    checksum,
    finished_at: state === "applied" ? new Date() : null,
    rolled_back_at: state === "rolledBack" ? new Date() : null,
  });

  it("all applied: gate and deploy precheck pass", () => {
    const h = evaluateHistory(local, [row("1_a", "aa", "applied"), row("2_b", "bb", "applied")]);
    expect(h.pending).toEqual([]);
    expect(gateVerdict(h).ok).toBe(true);
    expect(deployPrecheck(h).ok).toBe(true);
  });

  it("pending: gate blocks, deploy may proceed", () => {
    const h = evaluateHistory(local, [row("1_a", "aa", "applied")]);
    expect(h.pending).toEqual(["2_b"]);
    expect(gateVerdict(h).ok).toBe(false);
    expect(deployPrecheck(h).ok).toBe(true);
  });

  it("empty history: everything is pending", () => {
    expect(gateVerdict(evaluateHistory(local, [])).ok).toBe(false);
  });

  it("failed row: both block, and it is never counted as applied", () => {
    const h = evaluateHistory(local, [row("1_a", "aa", "applied"), row("2_b", "bb", "failed")]);
    expect(h.failed).toEqual(["2_b"]);
    expect(h.applied).toEqual(["1_a"]);
    expect(gateVerdict(h).ok).toBe(false);
    expect(deployPrecheck(h).ok).toBe(false);
  });

  it("a rolled-back attempt followed by a successful one counts as applied", () => {
    const h = evaluateHistory(local, [row("1_a", "aa", "applied"), row("2_b", "bb", "rolledBack"), row("2_b", "bb", "applied")]);
    expect(h.failed).toEqual([]);
    expect(gateVerdict(h).ok).toBe(true);
  });

  it("edited migration file: both block", () => {
    const h = evaluateHistory(local, [row("1_a", "EDITED", "applied"), row("2_b", "bb", "applied")]);
    expect(h.checksumMismatch).toEqual(["1_a"]);
    expect(gateVerdict(h).ok).toBe(false);
    expect(deployPrecheck(h).ok).toBe(false);
  });

  it("database ahead of the commit: gate warns only, deploy refuses", () => {
    const h = evaluateHistory(local, [row("1_a", "aa", "applied"), row("2_b", "bb", "applied"), row("3_c", "cc", "applied")]);
    const gate = gateVerdict(h);
    expect(gate.ok).toBe(true);
    expect(gate.warnings).toHaveLength(1);
    expect(deployPrecheck(h).ok).toBe(false);
  });

  it("a pending migration that sorts before an applied one is refused", () => {
    const h = evaluateHistory(local, [row("2_b", "bb", "applied")]);
    expect(h.outOfOrder).toBe(true);
    expect(deployPrecheck(h).ok).toBe(false);
  });

  it("loopback detection", () => {
    expect(isLoopbackUrl("mysql://root@127.0.0.1:3306/x")).toBe(true);
    expect(isLoopbackUrl("mysql://user:password@localhost:3306/haveninlipa")).toBe(true);
    expect(isLoopbackUrl("mysql://u:p@db.example.com:3306/x")).toBe(false);
    expect(isLoopbackUrl("not a url")).toBe(false);
  });
});
