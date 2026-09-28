import { NextResponse } from "next/server";
import { processAbandonedCheckouts } from "@/lib/checkout-abandonment";

// Primary trigger: cron-job.org every 5 min (configured outside this repo, like the
// external-calendar pre-warmer). .github/workflows/checkout-abandonment.yml is a backstop
// only — GitHub throttles short-interval schedules. Safe to run concurrently: each alert
// is claimed in the DB before it is sent. See src/lib/checkout-abandonment.ts.

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processAbandonedCheckouts();
  console.log("[cron] checkout-abandonment:", result);
  return NextResponse.json(result);
}
