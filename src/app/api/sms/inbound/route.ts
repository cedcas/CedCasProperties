import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";
import { sendEmail } from "@/lib/email";

// Twilio inbound webhook handler.
// Configure in Twilio console (Phone Numbers → Active Numbers → your number → Messaging
// Configuration → "A message comes in"):
//   POST https://haveninlipa.com/api/sms/inbound?secret=<SMS_INBOUND_SECRET>
//
// Auth (defense in depth):
//   1. `?secret=` query param OR `x-inbound-secret` header must match SMS_INBOUND_SECRET.
//   2. If TWILIO_AUTH_TOKEN is set, the `X-Twilio-Signature` header is verified against
//      the request URL + sorted form params (HMAC-SHA1 with auth token). This is Twilio's
//      standard signature scheme and protects against spoofed callbacks.
//
// Matching: normalize `From` to E.164, find the most-recent non-cancelled booking with
// the same phone. If none found, the message lands in UnmatchedInboundMessage.
//
// Payload shape (Twilio): form-encoded with fields including From, To, Body, MessageSid.
// We also accept JSON for testing/curl.

const STOP_KEYWORDS = new Set(["STOP", "UNSUBSCRIBE", "OPTOUT", "CANCEL", "QUIT"]);

type ParsedPayload = {
  from: string;
  to: string;
  body: string;
  providerMessageId: string | null;
  raw: string;
  formParams: Record<string, string> | null; // populated only when content-type was form-encoded
};

async function parsePayload(req: NextRequest): Promise<ParsedPayload | null> {
  const contentType = req.headers.get("content-type") ?? "";
  let from = "", to = "", body = "", providerMessageId: string | null = null;
  let raw = "";
  let formParams: Record<string, string> | null = null;

  if (contentType.includes("application/json")) {
    const text = await req.text();
    raw = text;
    try {
      const json = JSON.parse(text) as Record<string, unknown>;
      from = String(json.from ?? json.From ?? json.sender ?? "");
      to = String(json.to ?? json.To ?? json.recipient ?? "");
      body = String(json.message ?? json.Body ?? json.body ?? json.text ?? "");
      const id = json.MessageSid ?? json.message_id ?? json.MessageId ?? json.id;
      if (id != null) providerMessageId = String(id);
    } catch {
      return null;
    }
  } else {
    // Form-encoded (Twilio default) or multipart.
    const form = await req.formData();
    formParams = {};
    for (const [k, v] of form.entries()) {
      if (typeof v === "string") formParams[k] = v;
    }
    raw = JSON.stringify(formParams);
    from = String(formParams.From ?? formParams.from ?? formParams.sender ?? "");
    to = String(formParams.To ?? formParams.to ?? formParams.recipient ?? "");
    body = String(formParams.Body ?? formParams.message ?? formParams.body ?? "");
    const id = formParams.MessageSid ?? formParams.message_id ?? formParams.MessageId ?? formParams.id;
    if (id != null) providerMessageId = String(id);
  }

  if (!from || !body) return null;
  return { from, to, body, providerMessageId, raw, formParams };
}

function verifyTwilioSignature(req: NextRequest, formParams: Record<string, string> | null): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return true; // signature check disabled (e.g. dev / not yet on Twilio)

  const signature = req.headers.get("x-twilio-signature");
  if (!signature || !formParams) return false;

  // Reconstruct the URL Twilio called. NextRequest.url already includes query string.
  // If a reverse proxy rewrites the host, set TWILIO_WEBHOOK_URL to override.
  const url = process.env.TWILIO_WEBHOOK_URL || req.url;

  return twilio.validateRequest(authToken, signature, url, formParams);
}

export async function POST(req: NextRequest) {
  const secret = process.env.SMS_INBOUND_SECRET;
  if (secret) {
    const fromQuery = req.nextUrl.searchParams.get("secret");
    const fromHeader = req.headers.get("x-inbound-secret");
    if (fromQuery !== secret && fromHeader !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const payload = await parsePayload(req);
  if (!payload) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (!verifyTwilioSignature(req, payload.formParams)) {
    return NextResponse.json({ error: "Invalid Twilio signature" }, { status: 401 });
  }

  // Dedup by providerMessageId — Twilio retries on non-2xx responses.
  if (payload.providerMessageId) {
    const dupGuest = await prisma.guestMessage.findFirst({
      where: { fromNumber: payload.from, body: payload.body, direction: "inbound" },
      select: { id: true },
    });
    if (dupGuest) return NextResponse.json({ ok: true, duplicate: true });
    const dupUnmatched = await prisma.unmatchedInboundMessage.findFirst({
      where: { providerMessageId: payload.providerMessageId },
      select: { id: true },
    });
    if (dupUnmatched) return NextResponse.json({ ok: true, duplicate: true });
  }

  const parsedFrom = normalizePhone(payload.from);
  const fromE164 = parsedFrom?.e164 ?? payload.from;

  // STOP keyword: opt out *all* bookings on this phone (we don't know which).
  const trimmed = payload.body.trim();
  const isStop = STOP_KEYWORDS.has(trimmed.toUpperCase());

  // Find candidate bookings by phone (most-recent first, non-cancelled preferred).
  const candidates = await prisma.booking.findMany({
    where: { guestPhone: fromE164, status: { not: "cancelled" } },
    orderBy: [{ checkIn: "desc" }, { id: "desc" }],
    take: 5,
  });

  if (isStop) {
    // Mark all matches as opted out (idempotent).
    const ids = candidates.map((b) => b.id);
    if (ids.length > 0) {
      await prisma.booking.updateMany({
        where: { id: { in: ids }, optedOutAt: null },
        data: { optedOutAt: new Date() },
      });
    }
  }

  if (candidates.length === 0) {
    await prisma.unmatchedInboundMessage.create({
      data: {
        channel: "sms",
        fromNumber: fromE164,
        body: payload.body,
        providerMessageId: payload.providerMessageId,
        rawPayload: payload.raw,
      },
    });
    notifyAdminUnmatched(fromE164, payload.body).catch(() => {});
    return NextResponse.json({ ok: true, matched: false });
  }

  // Auto-thread to the most recent active booking.
  const target = candidates[0];
  const subjectLabel = isStop ? "Opt-out received (STOP)" : "Reply from guest";
  const msg = await prisma.guestMessage.create({
    data: {
      bookingId: target.id,
      quickReplyId: null,
      sourceQuickReplyId: null,
      channel: "sms",
      direction: "inbound",
      trigger: "manual",
      subject: subjectLabel,
      body: payload.body,
      status: "sent",
      fromNumber: fromE164,
      toNumber: payload.to || null,
      notes: candidates.length > 1
        ? `Matched to most-recent active booking #${target.id} (${candidates.length} candidates on this phone)`
        : null,
    },
  });

  notifyAdminInbound({
    bookingId: target.id,
    guestName: target.guestName,
    fromE164,
    body: payload.body,
    isStop,
  }).catch(() => {});

  return NextResponse.json({ ok: true, matched: true, guestMessageId: msg.id });
}

async function notifyAdminInbound(opts: {
  bookingId: number;
  guestName: string;
  fromE164: string;
  body: string;
  isStop: boolean;
}) {
  const adminEmail = process.env.SMTP_USER || "customerservice@haveninlipa.com";
  const subject = opts.isStop
    ? `Guest opt-out: ${opts.guestName} (booking #${opts.bookingId})`
    : `Guest replied: ${opts.guestName} (booking #${opts.bookingId})`;
  const html = `
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto">
      <h2 style="color:#335238">${subject}</h2>
      <p><strong>From:</strong> ${opts.fromE164}</p>
      <p><strong>Booking:</strong> #${opts.bookingId} (${opts.guestName})</p>
      <blockquote style="border-left:3px solid #C4A862;padding:8px 16px;margin:16px 0;color:#444">${opts.body.replace(/\n/g, "<br/>")}</blockquote>
      <p style="font-size:12px;color:#999">Reply in the admin Messages thread.</p>
    </div>
  `;
  await sendEmail({ to: adminEmail, subject, html });
}

async function notifyAdminUnmatched(fromE164: string, body: string) {
  const adminEmail = process.env.SMTP_USER || "customerservice@haveninlipa.com";
  const html = `
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto">
      <h2 style="color:#335238">Unmatched SMS reply</h2>
      <p>An SMS arrived from a number that doesn't match any booking. It's in the Unmatched Inbox.</p>
      <p><strong>From:</strong> ${fromE164}</p>
      <blockquote style="border-left:3px solid #C4A862;padding:8px 16px;margin:16px 0;color:#444">${body.replace(/\n/g, "<br/>")}</blockquote>
    </div>
  `;
  await sendEmail({ to: adminEmail, subject: `Unmatched SMS from ${fromE164}`, html });
}
