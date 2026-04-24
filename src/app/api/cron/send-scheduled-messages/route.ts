import { NextResponse } from "next/server";
import { flushDueScheduledMessages } from "@/lib/scheduler";

// Runs hourly (vercel.json: "0 * * * *"). Sends all ScheduledMessage rows
// whose sendAt <= now and status="pending". See src/lib/scheduler.ts.

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await flushDueScheduledMessages();
  console.log("[cron] send-scheduled-messages:", result);
  return NextResponse.json(result);
}
