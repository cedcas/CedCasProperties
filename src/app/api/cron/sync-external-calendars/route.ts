import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { syncAllActiveProperties, syncPropertyFeed, summarize } from "@/lib/external-calendar-sync";

// Fetches every active property's configured external .ics feed, persists the events,
// reconciles shared-inventory sibling blocks, and records per-property sync health.
//
// Scheduler-neutral on purpose: cron-job.org, Upstash QStash, Vercel Cron and GitHub
// Actions can all call this unchanged. Measured GitHub Actions delivery in this repo is
// only ~12% of a */15 schedule, so this endpoint is a PRE-WARMER — availability
// correctness comes from sync-on-demand in src/lib/availability.ts, which re-syncs a
// stale feed before answering and again immediately before a booking commits.
//
// Auth accepts either the cron secret OR a logged-in admin session, so the "Sync now"
// button in /admin/calendar reuses this exact route instead of duplicating it.
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const hasCronSecret = cronSecret ? authHeader === `Bearer ${cronSecret}` : false;

  if (!hasCronSecret) {
    const session = await auth();
    // Matches the existing cron convention: when CRON_SECRET is unset the secret check is
    // skipped entirely. See .env.example — it is set in Vercel for the existing crons.
    if (!session && cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const propertyIdParam = req.nextUrl.searchParams.get("propertyId");

  try {
    if (propertyIdParam) {
      const propertyId = Number(propertyIdParam);
      if (!Number.isInteger(propertyId)) {
        return NextResponse.json({ error: "Invalid propertyId" }, { status: 400 });
      }
      const result = await syncPropertyFeed(propertyId, { force: true });
      const summary = summarize([result]);
      console.log("[cron] sync-external-calendars:", summary);
      return NextResponse.json(summary);
    }

    const summary = await syncAllActiveProperties({ force: true });
    console.log("[cron] sync-external-calendars:", summary);
    return NextResponse.json(summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron] sync-external-calendars failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
