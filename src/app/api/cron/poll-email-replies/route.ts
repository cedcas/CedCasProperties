import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pollNewEmails, getCurrentMaxUid } from "@/lib/imap";
import { processInboundEmail } from "@/lib/emailReply";

// Runs every 15 min via GitHub Actions (.github/workflows/poll-email-replies.yml).
// Connects to Hostinger IMAP, fetches messages with UID > lastSeenUid in INBOX,
// routes each to a Booking thread or the Contact Us inbox via processInboundEmail.

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mailbox = process.env.IMAP_MAILBOX || "INBOX";

  try {
    let state = await prisma.emailPollState.findUnique({ where: { mailbox } });
    if (!state) {
      state = await prisma.emailPollState.create({
        data: { mailbox, lastSeenUid: 0 },
      });
    }

    // First-run seed: skip historical mailbox by setting watermark to current max UID.
    if (state.lastSeenUid === 0) {
      const maxUid = await getCurrentMaxUid(mailbox);
      const updated = await prisma.emailPollState.update({
        where: { mailbox },
        data: { lastSeenUid: maxUid, lastPolledAt: new Date() },
      });
      const summary = {
        firstRun: true,
        seededLastSeenUid: updated.lastSeenUid,
        fetched: 0,
        matched: 0,
        unmatched: 0,
        skipped: 0,
      };
      console.log("[cron] poll-email-replies seeded:", summary);
      return NextResponse.json(summary);
    }

    const { messages, maxUid } = await pollNewEmails({
      mailbox,
      lastSeenUid: state.lastSeenUid,
      maxBatch: 100,
    });

    let matched = 0, unmatched = 0, skipped = 0;
    for (const msg of messages) {
      try {
        const outcome = await processInboundEmail(msg);
        if (outcome.kind === "matched") matched++;
        else if (outcome.kind === "unmatched") unmatched++;
        else skipped++;
      } catch (err) {
        console.error("[cron] poll-email-replies error processing message", msg.uid, err);
        skipped++;
      }
    }

    if (maxUid > state.lastSeenUid) {
      await prisma.emailPollState.update({
        where: { mailbox },
        data: { lastSeenUid: maxUid, lastPolledAt: new Date() },
      });
    } else {
      await prisma.emailPollState.update({
        where: { mailbox },
        data: { lastPolledAt: new Date() },
      });
    }

    const summary = {
      firstRun: false,
      fetched: messages.length,
      matched,
      unmatched,
      skipped,
      advancedTo: maxUid,
    };
    console.log("[cron] poll-email-replies:", summary);
    return NextResponse.json(summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron] poll-email-replies failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
