import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { stripAngleBrackets } from "@/lib/email";

export type ParsedInboundEmail = {
  uid: number;
  messageId: string | null;
  inReplyTo: string | null;
  references: string[];
  fromEmail: string | null;
  fromName: string | null;
  to: string;
  subject: string;
  text: string;
  html: string | null;
  isAutoReply: boolean;
  isBounce: boolean;
  receivedAt: Date;
};

function getImapClient() {
  const host = process.env.IMAP_HOST || "imap.hostinger.com";
  const port = Number(process.env.IMAP_PORT) || 993;
  const auth = {
    user: process.env.IMAP_USER || process.env.SMTP_USER || "",
    pass: process.env.IMAP_PASS || process.env.SMTP_PASS || "",
  };
  if (!auth.user || !auth.pass) {
    throw new Error("IMAP credentials not set (need IMAP_USER/IMAP_PASS or SMTP_USER/SMTP_PASS)");
  }
  return new ImapFlow({
    host,
    port,
    secure: true,
    auth,
    logger: false,
  });
}

// Picks up only messages with UID strictly greater than `lastSeenUid` in the given mailbox.
// On a fresh install (lastSeenUid === 0), the caller should first invoke `getCurrentMaxUid()`
// to seed the watermark — this function will otherwise pull the entire mailbox history.
export async function pollNewEmails(opts: {
  mailbox: string;
  lastSeenUid: number;
  maxBatch?: number;
}): Promise<{ messages: ParsedInboundEmail[]; maxUid: number }> {
  const client = getImapClient();
  await client.connect();

  const messages: ParsedInboundEmail[] = [];
  let maxUid = opts.lastSeenUid;

  try {
    const lock = await client.getMailboxLock(opts.mailbox);
    try {
      const status = await client.status(opts.mailbox, { uidNext: true });
      const uidNext = status.uidNext ?? 1;
      // Search range: anything strictly greater than lastSeenUid up to (uidNext - 1).
      const fromUid = opts.lastSeenUid + 1;
      const toUid = uidNext - 1;
      if (toUid < fromUid) return { messages: [], maxUid };

      const range = `${fromUid}:${toUid}`;
      const limit = opts.maxBatch ?? 100;

      let count = 0;
      for await (const msg of client.fetch(range, { uid: true, source: true, internalDate: true }, { uid: true })) {
        if (count >= limit) break;
        if (typeof msg.uid !== "number" || !msg.source) continue;

        const parsed = await simpleParser(msg.source);
        const fromAddr = parsed.from?.value?.[0];
        const inReplyTo = stripAngleBrackets(parsed.inReplyTo ?? null);
        const referencesRaw = parsed.references;
        const references = Array.isArray(referencesRaw)
          ? referencesRaw.map((r) => stripAngleBrackets(r)).filter((r): r is string => !!r)
          : referencesRaw
            ? [stripAngleBrackets(referencesRaw)].filter((r): r is string => !!r)
            : [];

        const headerLines = parsed.headerLines ?? [];
        const autoSubmitted = headerLines.find((h) => h.key === "auto-submitted")?.line.split(":")[1]?.trim().toLowerCase() ?? "";
        const contentType = (parsed.headers.get("content-type") as { value?: string } | string | undefined);
        const ctValue = typeof contentType === "string" ? contentType : contentType?.value ?? "";
        const isAutoReply = autoSubmitted.startsWith("auto-") && autoSubmitted !== "auto-generated".toLowerCase()
          ? true
          : autoSubmitted === "auto-replied" || autoSubmitted === "auto-notified";
        const isBounce = ctValue.includes("multipart/report") || ctValue.includes("message/delivery-status");

        messages.push({
          uid: msg.uid,
          messageId: stripAngleBrackets(parsed.messageId ?? null),
          inReplyTo,
          references,
          fromEmail: fromAddr?.address?.toLowerCase().trim() ?? null,
          fromName: fromAddr?.name?.trim() || null,
          to: typeof parsed.to === "object" && parsed.to && "text" in parsed.to ? parsed.to.text : "",
          subject: parsed.subject ?? "",
          text: (parsed.text ?? "").trim(),
          html: parsed.html ? String(parsed.html) : null,
          isAutoReply,
          isBounce,
          receivedAt:
            msg.internalDate instanceof Date
              ? msg.internalDate
              : msg.internalDate
                ? new Date(msg.internalDate)
                : (parsed.date ?? new Date()),
        });

        if (msg.uid > maxUid) maxUid = msg.uid;
        count++;
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }

  return { messages, maxUid };
}

// Returns the current UIDNEXT - 1 (highest existing UID) for seeding the watermark on
// first deploy, so we don't process any historical inbox messages.
export async function getCurrentMaxUid(mailbox: string): Promise<number> {
  const client = getImapClient();
  await client.connect();
  try {
    const status = await client.status(mailbox, { uidNext: true });
    return Math.max(0, (status.uidNext ?? 1) - 1);
  } finally {
    await client.logout().catch(() => {});
  }
}

// Heuristic: strip the most common quoted-history block from a reply body.
// Looks for the "On <date> <name> wrote:" pattern and truncates above it.
export function stripQuotedReply(body: string): string {
  if (!body) return body;
  const patterns = [
    /\n\s*On\s+.{1,80}\s+wrote:\s*\n[\s\S]*$/i,             // "On Mon, ... wrote:"
    /\n\s*-{2,}\s*Original Message\s*-{2,}[\s\S]*$/i,        // Outlook
    /\n\s*From:\s+.{1,200}\n\s*Sent:\s+[\s\S]*$/i,           // Outlook header style
    /\n\s*>\s.*(?:\n>\s.*)+$/m,                              // ">"-quoted lines block
  ];
  let stripped = body;
  for (const re of patterns) {
    stripped = stripped.replace(re, "");
  }
  return stripped.trim();
}
