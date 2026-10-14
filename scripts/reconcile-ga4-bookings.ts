/**
 * READ-ONLY reconciliation: confirmed direct bookings vs GA4 `booking_confirmed`.
 *
 * 2026-10-10 HIL Marketing measured 10 `booking_confirmed` events on
 * haveninlipa.com in GA4 for the 90-day window Aug 22 → Sep 28, 2026 (see
 * docs/HIL_COMPLETION_LOG.md). This script lists confirmed bookings created in
 * a given window so a human can compare counts/dates against a GA4 export by
 * `transaction_id` (`HIL-<bookingId>`, the same format BookingForm.tsx sends
 * client-side — src/components/booking/BookingForm.tsx).
 *
 * There is no `Booking.isTest` flag (DEC-021 proposed and the Owner declined
 * it — test bookings are made on dev.haveninlipa.com's separate database, so
 * production has no reliable way to mark one as a test after the fact). This
 * script therefore does NOT silently exclude anything; it prints a separate
 * "possible test/admin" section for bookings whose guest email matches an
 * obvious pattern (the Owner's own address, or containing "test"), so a human
 * makes the exclusion call rather than the script guessing silently.
 *
 * WRITES NOTHING. Run against production only with PRODUCTION_DATABASE_URL set
 * (DEC-012/DEC-026: this needs to run from an operator machine that can reach
 * Hostinger — it has not been run from this environment):
 *
 *   PRODUCTION_DATABASE_URL=... DATABASE_URL="$PRODUCTION_DATABASE_URL" \
 *     npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/reconcile-ga4-bookings.ts \
 *     2026-08-22 2026-10-09
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Obvious-only — a human decides, this never excludes anything from the totals. */
const POSSIBLE_TEST_PATTERNS = [/test/i, /^cedcas12@gmail\.com$/i, /@haveninlipa\.com$/i];

function looksLikeTestOrAdmin(email: string): boolean {
  return POSSIBLE_TEST_PATTERNS.some((p) => p.test(email));
}

async function main() {
  const [startArg, endArg] = process.argv.slice(2);
  if (!startArg || !endArg) {
    console.error("Usage: reconcile-ga4-bookings.ts <YYYY-MM-DD start> <YYYY-MM-DD end>");
    process.exitCode = 1;
    return;
  }
  const start = new Date(`${startArg}T00:00:00.000Z`);
  const end = new Date(`${endArg}T23:59:59.999Z`);

  const bookings = await prisma.booking.findMany({
    where: { status: "confirmed", createdAt: { gte: start, lte: end } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      createdAt: true,
      guestEmail: true,
      totalPrice: true,
      paymentMethod: true,
      property: { select: { slug: true } },
    },
  });

  console.log(`\n${"=".repeat(78)}`);
  console.log(`CONFIRMED BOOKINGS ${startArg} → ${endArg} — ${bookings.length} total`);
  console.log(`${"=".repeat(78)}`);

  const byDate = new Map<string, number>();
  const flagged: typeof bookings = [];

  for (const b of bookings) {
    const dateKey = b.createdAt.toISOString().slice(0, 10);
    byDate.set(dateKey, (byDate.get(dateKey) ?? 0) + 1);
    if (looksLikeTestOrAdmin(b.guestEmail)) flagged.push(b);

    console.log(
      `  ${dateKey}  transaction_id=HIL-${b.id}  ${b.property.slug}  ₱${Number(b.totalPrice).toLocaleString()}  ${b.paymentMethod ?? "?"}  ${b.guestEmail}` +
        (looksLikeTestOrAdmin(b.guestEmail) ? "  [possible test/admin — review]" : "")
    );
  }

  console.log(`\nBy date:`);
  for (const [date, count] of byDate) console.log(`  ${date}: ${count}`);

  console.log(`\nGA4 comparison: 10 booking_confirmed events reported for haveninlipa.com, Aug 22 → Sep 28 2026.`);
  console.log(`Compare the ${bookings.length} rows above (narrow to that sub-range) against the GA4 export's`);
  console.log(`transaction_id values. Any booking present here with no matching GA4 transaction_id is an`);
  console.log(`undercount candidate for the proposed Measurement Protocol fix (src/lib/ga4-measurement-protocol.ts).`);

  if (flagged.length > 0) {
    console.log(`\n${flagged.length} booking(s) flagged as possible test/admin — NOT excluded above, review manually:`);
    for (const b of flagged) console.log(`  HIL-${b.id}  ${b.guestEmail}  ${b.createdAt.toISOString()}`);
  }
  console.log(`${"=".repeat(78)}\n`);
}

main()
  .catch((e) => {
    console.error("Reconciliation failed:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
