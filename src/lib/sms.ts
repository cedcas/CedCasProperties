import twilio from "twilio";

// Twilio SMS driver (replaced Semaphore 2026-05-04 — Semaphore confirmed outbound-only).
// Outbound + inbound run through a single Twilio number, so guests reply to the same
// number they received the SMS from.

export type SendSmsResult = {
  ok: true;
  providerMessageId: string;
  fromNumber: string;
} | {
  ok: false;
  error: string;
};

function isDev(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.SMS_FORCE_SEND !== "1";
}

let cachedClient: ReturnType<typeof twilio> | null = null;
function getClient() {
  if (cachedClient) return cachedClient;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  cachedClient = twilio(sid, token);
  return cachedClient;
}

export async function sendSms(opts: { to: string; body: string }): Promise<SendSmsResult> {
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (isDev()) {
    console.log(`[sms:dev] -> ${opts.to}: ${opts.body}`);
    return { ok: true, providerMessageId: `dev-${Date.now()}`, fromNumber: fromNumber || "DEV" };
  }

  if (!fromNumber) return { ok: false, error: "TWILIO_FROM_NUMBER not set" };

  const client = getClient();
  if (!client) return { ok: false, error: "TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN not set" };

  try {
    const msg = await client.messages.create({
      to: opts.to,
      from: fromNumber,
      body: opts.body,
    });
    return { ok: true, providerMessageId: msg.sid, fromNumber };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// SMS segment counter is exported from sms-length.ts (pure JS, client-safe). Re-export
// here for backwards compatibility with any server-side imports.
export { smsLength } from "@/lib/sms-length";
