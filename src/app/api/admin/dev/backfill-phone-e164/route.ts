// TEMP DEV ROUTE — delete after backfill is confirmed.
//
// Hostinger blocks direct MySQL from external IPs, so this route runs the
// phone E.164 normalization from inside Vercel's allowlisted egress.
//
// Usage (one-time, while logged in as admin):
//   POST /api/admin/dev/backfill-phone-e164          → preview (no writes)
//   POST /api/admin/dev/backfill-phone-e164?apply=1  → write changes
//
// Returns a JSON summary:
//   { totalBookings, normalized, alreadyE164, invalid, sample: [...first 20 changes] }
//
// After confirming on prod, delete this route in a follow-up commit.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parsePhoneNumberFromString } from "libphonenumber-js";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apply = req.nextUrl.searchParams.get("apply") === "1";

  const bookings = await prisma.booking.findMany({
    select: { id: true, guestName: true, guestPhone: true },
    orderBy: { id: "asc" },
  });

  let normalized = 0;
  let alreadyE164 = 0;
  let invalid = 0;
  const sample: Array<{ id: number; guestName: string; before: string; after: string | null; status: string }> = [];

  for (const b of bookings) {
    const raw = (b.guestPhone ?? "").trim();
    if (!raw) {
      invalid++;
      if (sample.length < 20) sample.push({ id: b.id, guestName: b.guestName, before: raw, after: null, status: "empty" });
      continue;
    }

    const parsed = parsePhoneNumberFromString(raw, "PH");
    if (!parsed || !parsed.isValid()) {
      invalid++;
      if (sample.length < 20) sample.push({ id: b.id, guestName: b.guestName, before: raw, after: null, status: "unparseable" });
      continue;
    }

    if (parsed.number === raw) {
      alreadyE164++;
      continue;
    }

    if (apply) {
      await prisma.booking.update({ where: { id: b.id }, data: { guestPhone: parsed.number } });
    }
    normalized++;
    if (sample.length < 20) {
      sample.push({
        id: b.id,
        guestName: b.guestName,
        before: raw,
        after: parsed.number,
        status: apply ? "updated" : "would-update",
      });
    }
  }

  return NextResponse.json({
    mode: apply ? "applied" : "preview",
    totalBookings: bookings.length,
    normalized,
    alreadyE164,
    invalid,
    sample,
  });
}
