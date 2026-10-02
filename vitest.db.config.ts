import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Database-backed integration tests (`npm run test:db`) — real Prisma, real InnoDB locks.
 *
 * These are NOT part of `npm test` or CI: they need a disposable MySQL/MariaDB that the
 * suite is free to wipe. Point TEST_DATABASE_URL at one on this machine, e.g.
 *
 *   TEST_DATABASE_URL="mysql://root@127.0.0.1:33917/hil_amend_test" npm run test:db
 *
 * (create the schema first: `DATABASE_URL=$TEST_DATABASE_URL npx prisma db push --skip-generate`).
 *
 * SAFETY. Prisma Client falls back to the project `.env` when DATABASE_URL is unset, and
 * that file points at PRODUCTION. So this config sets DATABASE_URL explicitly and refuses
 * to start unless the target is a loopback host — the Hostinger databases (production and
 * dev alike) can never be reached from here.
 */
function localTestDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL is not set — see vitest.db.config.ts");
  const host = new URL(url).hostname;
  if (host !== "127.0.0.1" && host !== "localhost") {
    throw new Error(`TEST_DATABASE_URL must be a local database; refusing host "${host}"`);
  }
  return url;
}

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  test: {
    include: ["src/**/*.dbtest.ts"],
    env: { DATABASE_URL: localTestDatabaseUrl(), TZ: "America/Chicago" },
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
