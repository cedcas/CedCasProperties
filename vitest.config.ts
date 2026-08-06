import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Unit tests for the availability / shared-inventory decision logic.
 *
 * No database and no network: Hostinger blocks DB access from laptops AND from CI, so the
 * reconciliation logic is deliberately written as pure functions over plain data
 * (`planDerivedBlocks`, `planExternalEventSync`, `conflictsFor`, `buildVCalendar`) which
 * these tests exercise directly. Route handlers, Prisma queries and the admin UI are NOT
 * covered here — those are verified by typecheck, build and the manual test plan in
 * `About HIL/HavenInLipa_InventoryGroups_Test_Plan_v1.0.md`.
 *
 * Two projects run the same suite under different timezones. Stay dates are UTC-anchored
 * calendar dates, and the classic failure mode is code that looks correct on a UTC server
 * and shifts by a day for a US admin. Pinning TZ per project makes that regression fail
 * loudly instead of depending on where the test happens to run.
 */
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    projects: [
      {
        resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
        test: {
          name: "tz-chicago",
          include: ["src/**/*.test.ts"],
          env: { TZ: "America/Chicago" }, // UTC-5/6 — behind UTC, where dates shift backwards
        },
      },
      {
        resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
        test: {
          name: "tz-manila",
          include: ["src/**/*.test.ts"],
          env: { TZ: "Asia/Manila" }, // UTC+8 — ahead of UTC, where dates shift forwards
        },
      },
    ],
  },
});
