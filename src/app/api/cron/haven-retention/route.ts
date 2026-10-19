import { NextResponse } from "next/server";
import { purgeExpiredHavenData } from "@/lib/haven/retention";

// Vercel Cron, daily (vercel.json; production deployment only — Vercel sends
// "Authorization: Bearer $CRON_SECRET"). Deletes HavenChatTranscript rows older than 90
// days and HavenChatUsage rows older than 13 months. See src/lib/haven/retention.ts.

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await purgeExpiredHavenData();
  console.log("[cron] haven-retention:", result);
  return NextResponse.json(result);
}
