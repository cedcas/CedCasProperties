import { NextResponse } from "next/server";
import { processAbandonedCheckouts } from "@/lib/checkout-abandonment";

// Primary trigger: Vercel Cron every 5 min (vercel.json; production deployment only —
// Vercel sends "Authorization: Bearer $CRON_SECRET"). .github/workflows/
// checkout-abandonment.yml is a backstop only. Safe to run concurrently: each alert is
// claimed in the DB before it is sent. See src/lib/checkout-abandonment.ts.

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
