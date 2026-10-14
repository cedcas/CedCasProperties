import { NextResponse } from "next/server";
import { processBookingRequests } from "@/lib/booking-requests";

// Vercel Cron every 5 min (vercel.json; production deployment only — Vercel sends
// "Authorization: Bearer $CRON_SECRET"). Expires booking requests nobody decided and
// payment links nobody paid, and sends the one-time alert for a GCash/BPI payment still
// unverified. Safe to run concurrently: each row is claimed in the DB before any email
// is sent. See src/lib/booking-requests.ts.

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processBookingRequests();
  console.log("[cron] booking-requests:", result);
  return NextResponse.json(result);
}
