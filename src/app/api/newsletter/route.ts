import { NextRequest, NextResponse } from "next/server";
import {
  HONEYPOT_FIELD,
  buildNewsletterNote,
  normalizeNewsletterEmail,
  normalizeNewsletterFirstName,
  normalizeNewsletterPhone,
  normalizeNewsletterSource,
  sanitizeUtm,
} from "@/lib/newsletter";
import { subscribeToReach } from "@/lib/hostinger-reach";

export const runtime = "nodejs";

// Simple in-memory rate limiter: max 5 signups per IP per 10 minutes.
// Per-instance best-effort — resets on deploy/cold start and doesn't share
// state across Vercel instances. Same pattern as api/security-alert/route.ts.
const hits = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_HITS = 5;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > MAX_HITS;
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  // Honeypot: bots fill hidden fields. Return the normal success shape
  // without ever calling Reach, so a bot can't distinguish this from a real
  // signup.
  if (typeof body[HONEYPOT_FIELD] === "string" && body[HONEYPOT_FIELD].trim()) {
    return NextResponse.json({ ok: true, alreadySubscribed: false });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ ok: false, error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const email = normalizeNewsletterEmail(body.email);
  if ("error" in email) {
    return NextResponse.json({ ok: false, field: "email", error: email.error }, { status: 400 });
  }
  const firstName = normalizeNewsletterFirstName(body.firstName);
  if ("error" in firstName) {
    return NextResponse.json({ ok: false, field: "firstName", error: firstName.error }, { status: 400 });
  }
  const phone = normalizeNewsletterPhone(body.phone);
  if ("error" in phone) {
    return NextResponse.json({ ok: false, field: "phone", error: phone.error }, { status: 400 });
  }

  const source = normalizeNewsletterSource(body.source);
  const utm = sanitizeUtm(body.utm);
  const note = buildNewsletterNote({ source, utm, page: typeof body.page === "string" ? body.page : null });

  const result = await subscribeToReach({
    email: email.value,
    firstName: firstName.value,
    phone: phone.value,
    note,
    source,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.message }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    alreadySubscribed: result.alreadySubscribed,
    message: result.alreadySubscribed
      ? "You're already on the list — thanks!"
      : "Thanks for subscribing!",
  });
}
