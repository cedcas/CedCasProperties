# Haven in Lipa — Database Migration Runbook

> **Last updated:** 2026-10-06. Decision record: [DEC-026](HIL_DECISIONS.md). How the pieces work: [Website spec → Build & Deployment](HIL%20Website%20Technical%20Specification.md#build--deployment).

**The rule.** A deployment never changes a database's schema. Schema changes are SQL files in `prisma/migrations/`, reviewed in a pull request, and applied by a person running one command against one named database. The Vercel build only *checks* (read-only) that the migrations in the commit are already applied, and refuses to build if they are not.

| Piece | Where | What it does |
|---|---|---|
| Migration history | `prisma/migrations/` | `20261005000000_baseline` is the schema as it stood on production on 2026-10-05. Every later change is a new folder. Never edit an applied migration. |
| Operator command | `scripts/db-migrate.mjs` (`npm run db:migrate -- …`) | `status` (read-only), `baseline` (one-time, metadata only), `deploy` (applies reviewed migrations), `new` (authoring, local database only). |
| Release gate | `scripts/migration-gate.mjs`, run by `vercel-build` | Read-only. Fails the Vercel build when a migration in the commit is pending, failed, or edited. |
| Tests | `npm test` (static guardrails), `npm run test:migrations` (throwaway database; CI job **Migrations**) | Keep schema-writing commands out of automatic paths; prove the history rebuilds the schema. |

## Where it runs

The command is run by an operator on a machine that can reach Hostinger's MariaDB on port 3306 and has a local MariaDB to build comparison databases. On 2026-10-05/06 the Owner's Mac met both conditions (read access to both hosted databases verified). GitHub-hosted runners are **not** used: their access to Hostinger was not verified and no hosted database credential is stored in GitHub (see [DEC-012](HIL_DECISIONS.md)). There is no migration workflow and no admin migration endpoint, by design.

Before any hosted run, check the connection first — it has been unreliable historically:

```
nc -z -G 8 <db host> 3306 && echo reachable
```

## The database URL — read this once

- The command takes its URL from `MIGRATE_DATABASE_URL`, or from one named key of an env file (`--url-env-file .env --url-env-key DEV_DATABASE_URL`). It never reads `DATABASE_URL`.
- **The local `.env` file's `DATABASE_URL` has pointed at production.** A bare `npx prisma migrate dev`, `prisma db push` or `prisma migrate reset` in this folder would therefore act on production. Do not run bare Prisma schema commands here. Use the commands below, which always set the target explicitly.
- The target is confirmed by the server, not by a name: the command asks the server which database it is and stops unless that equals `--expect-database`.
- Every command needs `--reference-url`: a **local** MariaDB server (loopback only) where it builds a scratch database from the migrations to compare against. On the Owner's Mac: `mysql://root@127.0.0.1:3306` (Homebrew MariaDB), or any throwaway instance.

## 1. New local database

```
mariadb -uroot -e "CREATE DATABASE hil_local CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
DATABASE_URL="mysql://root@127.0.0.1:3306/hil_local" npx prisma migrate deploy
DATABASE_URL="mysql://root@127.0.0.1:3306/hil_local" npm run seed
```

For local development put that loopback URL in `.env.local`. `prisma db push` is no longer part of any setup step.

## 2. Writing a migration

1. Edit `prisma/schema.prisma`.
2. Generate the SQL against a local database (refuses any non-loopback URL):
   ```
   npm run db:migrate -- new --name add_booking_reference --local-url mysql://root@127.0.0.1:3306/hil_local
   ```
3. Read the generated `migration.sql`. Edit it if needed (for example to split a change — see section 3), then apply it locally: `DATABASE_URL="mysql://root@127.0.0.1:3306/hil_local" npx prisma migrate deploy`.
4. Run `TEST_DATABASE_SERVER_URL="mysql://root@127.0.0.1:3306" npm run test:migrations`. It fails if `schema.prisma` and the migrations disagree.
5. Commit `schema.prisma` and the migration folder together.

**Review checklist for the pull request**

- The SQL does only what the PR says. No `DROP`, `RENAME`, type narrowing or `NOT NULL` without default on a populated table unless it is the planned *contract* step.
- The currently deployed code still works after this SQL runs (section 3).
- An index on a long text column declares its prefix length in `schema.prisma` (InnoDB caps index keys at 3072 bytes; an undeclared prefix shows up as permanent drift — this is what `GuestMessage.messageId` did).
- The CI job **Migrations** is green.

## 3. Release order — migrate first, then merge

Vercel deploys `main` automatically and independently of any migration run, so the order is enforced by the release gate, not by timing:

1. PR reviewed and CI green. Note its head commit.
2. **Dev:** `deploy` against the dev database from that commit. Merge to `dev`, verify on `dev.haveninlipa.com`.
3. **Production, after Owner approval of that exact commit:** `deploy` against production.
4. Merge to `main`. The Vercel build's gate now passes and the new code goes live. Verify the Production deployment's commit ([DEC-006](HIL_DECISIONS.md)).

If step 4 happens before step 3, the Production build fails at the gate and the previous deployment keeps serving. Nothing is written. Run step 3, then redeploy.

Between steps 3 and 4 the **old** code runs against the **new** schema, so every migration must be backward compatible with the code already live. Use expand / contract:

- **Expand** (one release): add tables, add nullable columns or columns with defaults, add indexes. Old code ignores them.
- **Use** (same or next release): code reads and writes the new shape.
- **Contract** (a later release, once no deployed code uses the old shape): drop or tighten. This is the only destructive step and needs its own approval and a fresh backup.

A code-only change needs none of this: merge and it deploys. The gate takes about a second and changes nothing.

All Preview deployments (every branch) share the dev database. A branch that is *behind* the dev database still builds — the gate only warns when the database has migrations the commit lacks. A branch that is *ahead* fails its preview build until its migration is applied to dev.

## 4. Applying to dev

```
git checkout <reviewed commit>
npm ci && npx prisma generate
npm run db:migrate -- status --target dev --expect-database <dev database name> \
  --url-env-file .env --url-env-key DEV_DATABASE_URL --reference-url mysql://root@127.0.0.1:3306
npm run db:migrate -- deploy --target dev --expect-database <dev database name> --commit <sha> \
  --apply <migration_name[,migration_name]> \
  --url-env-file .env --url-env-key DEV_DATABASE_URL --reference-url mysql://root@127.0.0.1:3306
```

`deploy` first prints the pending migrations and stops; re-run with `--apply` naming exactly those. It refuses on: wrong database, a commit that is not checked out, uncommitted migration files, a failed earlier migration, an edited applied migration, a database that is ahead of the commit, or schema drift. After applying, it compares the real schema with one built from the migrations and reports `Schema verified`.

## 5. Applying to production

Only after the Owner approves the exact commit and migration names.

1. Take a backup and confirm it restores (section 7).
2. Run `status` with `--target production` (read-only) and read the output: database name, applied, pending, `NO DRIFT`.
3. Run `deploy` with `--target production --confirm-production --commit <sha> --apply <names>`.
4. Copy the run record (`.migration-runs/…json`: target, commit, migration names, result) into [HIL_COMPLETION_LOG.md](HIL_COMPLETION_LOG.md).
5. Merge to `main`, then verify the Production deployment SHA.

`status` exit codes: `0` up to date and no drift, `3` pending or not baselined, `1` a problem.

### One-time baseline (2026-10)

An existing database is told that the baseline is already applied. This creates the `_prisma_migrations` table and inserts one row. It runs none of the baseline's SQL and touches no application table.

```
npm run db:migrate -- baseline --target <dev|production> [--confirm-production] \
  --expect-database <name> --commit <sha> \
  --url-env-file .env --url-env-key <DEV_DATABASE_URL|DATABASE_URL> --reference-url mysql://root@127.0.0.1:3306
```

It refuses unless the database's schema equals the baseline exactly (Prisma's diff, plus tables, columns and their order, types, defaults, collations, indexes, foreign keys, views, triggers, routines and events). Undo: `DROP TABLE _prisma_migrations;` — the application does not use that table.

## 6. When something is wrong

**Drift (`DRIFT FOUND`).** The database differs from what its applied migrations describe. Nothing was written. The output lists each difference. Do not "fix" it with `db push` or by editing a migration. Decide which side is right; if the database must change, write a new migration; if the database is right, write a migration that brings the history to it and record it with `prisma migrate resolve --applied` after review. Either needs Owner approval for production.

**A migration failed (`MIGRATION FAILED`).** MariaDB commits each DDL statement as it runs and cannot roll DDL back, so the migration may be partly applied. Prisma leaves a failed row in `_prisma_migrations`; the gate blocks every build for that database and `deploy` refuses to run again.

1. Do not merge or release the dependent code. Production keeps running the previous deployment.
2. Read the error and inspect which statements took effect (`SHOW CREATE TABLE …`).
3. Choose one, with the Owner's approval for production:
   - **Roll forward:** finish the remaining statements by hand so the schema equals the migration's intent, then `prisma migrate resolve --applied <name>`.
   - **Roll back:** undo the statements that ran, then `prisma migrate resolve --rolled-back <name>`; fix the migration in a new commit and deploy again.
4. Run `status` and confirm `NO DRIFT`.

Run `prisma migrate resolve` with the target set explicitly, e.g. `DATABASE_URL="$(…)" npx prisma migrate resolve …`. The command never does this for you.

**The gate blocked a Production build.** Read the build log line starting `[migration-gate] BLOCKED`. Pending → run section 5, then redeploy. Missing history → the database was never baselined. Cannot read history → the database was unreachable during the build; redeploy.

**The app is broken after a release.** Roll the *application* back in Vercel (Instant Rollback, or revert the merge). That does not undo a migration — and does not need to, because migrations are backward compatible (section 3). Only undo schema with a new, reviewed migration.

## 7. Backup and restore

```
mariadb-dump --defaults-extra-file=<client.cnf> --single-transaction --skip-lock-tables \
  --routines --triggers --no-tablespaces <database> | gzip > hil-<target>-<UTC timestamp>.sql.gz
```

- Keep the file outside the repository and outside Dropbox. It contains guest names, emails and phone numbers; delete it once the change is verified.
- Prove it restores before relying on it: load it into a scratch database on the local MariaDB and compare table row counts with the source.
- Hostinger's own daily backups (hPanel → Databases → Backups) are the second copy; confirm the latest one exists before a production run.
- Restoring a dump over production is a last resort that loses every booking made since the dump. Never rehearse it on production.

## 8. Things that must stay true

- `npm run build` is `npm run build:app` — compile only. `vercel-build` adds only the read-only gate.
- **Reverting the PR that introduced this would put `prisma db push` back into every deploy.** If the release gate itself must be disabled in an emergency, change `vercel-build` to `npm run build:app` in a new commit; do not revert to the old `build` script. `src/lib/__tests__/build-safety.test.ts` fails if a schema-writing command reappears in an automatic path.
- Vercel → Project → Settings → Build & Development: Build Command and Install Command overrides must stay **off**. An override bypasses `vercel-build` and the gate.
- No workflow receives a hosted database credential; CI's **Migrations** job uses a throwaway container.
- `--accept-data-loss` is never used ([DEC-013](HIL_DECISIONS.md)).
