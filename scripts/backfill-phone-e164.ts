// One-time backfill: normalize all Booking.guestPhone values to E.164.
// Usage: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/backfill-phone-e164.ts
// Optional flag: --dry to preview without writing.

import { PrismaClient } from "@prisma/client";
import { parsePhoneNumberFromString } from "libphonenumber-js";

const prisma = new PrismaClient();

async function main() {
  const dry = process.argv.includes("--dry");
  const bookings = await prisma.booking.findMany({
    select: { id: true, guestName: true, guestPhone: true },
    orderBy: { id: "asc" },
  });

  let normalized = 0;
  let alreadyE164 = 0;
  let invalid = 0;

  for (const b of bookings) {
    const raw = b.guestPhone?.trim() ?? "";
    if (!raw) { invalid++; continue; }

    const parsed = parsePhoneNumberFromString(raw, "PH");
    if (!parsed || !parsed.isValid()) {
      console.warn(`[skip] booking #${b.id} (${b.guestName}) — unparseable phone: ${raw}`);
      invalid++;
      continue;
    }

    if (parsed.number === raw) {
      alreadyE164++;
      continue;
    }

    if (dry) {
      console.log(`[dry] booking #${b.id} (${b.guestName}): ${raw} → ${parsed.number}`);
    } else {
      await prisma.booking.update({ where: { id: b.id }, data: { guestPhone: parsed.number } });
      console.log(`[ok]  booking #${b.id} (${b.guestName}): ${raw} → ${parsed.number}`);
    }
    normalized++;
  }

  console.log(`\nDone. ${normalized} normalized, ${alreadyE164} already E.164, ${invalid} invalid/skipped.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
