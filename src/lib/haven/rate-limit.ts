import "server-only";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import {
  HAVEN_AI_ADMIN_ALERT_TO,
  HAVEN_AI_MONTHLY_CAP_USD,
  HAVEN_IP_SALT,
  RATE_LIMIT_GLOBAL_PER_HOUR,
  RATE_LIMIT_PER_IP_PER_10MIN,
  RATE_LIMIT_PER_IP_PER_DAY,
} from "./config";

/** sha256(ip + salt) — the raw IP never reaches HavenChatUsage. */
export function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(`${ip}${HAVEN_IP_SALT}`).digest("hex");
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export interface RateLimitResult {
  allowed: boolean;
  reason?: "rate_limit";
}

/** One row = one guest message (see HavenChatUsage), so a plain row count IS the message count. */
export async function checkRateLimit(ipHash: string, now = new Date()): Promise<RateLimitResult> {
  const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const [perIp10min, perIpDay, global1Hour] = await Promise.all([
    prisma.havenChatUsage.count({ where: { ipHash, createdAt: { gte: tenMinAgo } } }),
    prisma.havenChatUsage.count({ where: { ipHash, createdAt: { gte: dayAgo } } }),
    prisma.havenChatUsage.count({ where: { createdAt: { gte: hourAgo } } }),
  ]);

  if (perIp10min >= RATE_LIMIT_PER_IP_PER_10MIN) return { allowed: false, reason: "rate_limit" };
  if (perIpDay >= RATE_LIMIT_PER_IP_PER_DAY) return { allowed: false, reason: "rate_limit" };
  if (global1Hour >= RATE_LIMIT_GLOBAL_PER_HOUR) return { allowed: false, reason: "rate_limit" };
  return { allowed: true };
}

/** First instant of the current Manila-calendar month, as a UTC instant. Manila is UTC+8, no DST. */
export function manilaMonthStartUtc(now: Date): Date {
  const manilaNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return new Date(Date.UTC(manilaNow.getUTCFullYear(), manilaNow.getUTCMonth(), 1, -8, 0, 0));
}

export async function monthlySpendUsd(now = new Date()): Promise<number> {
  const monthStart = manilaMonthStartUtc(now);
  const result = await prisma.havenChatUsage.aggregate({
    _sum: { costUsd: true },
    where: { createdAt: { gte: monthStart } },
  });
  return Number(result._sum.costUsd ?? 0);
}

/**
 * Over cap → true, and (at most once per Manila month) sends the admin alert and writes a
 * zero-cost marker row so later requests this month see the alert already sent without
 * re-querying email state. Never throws — a failed alert must not break the static fallback.
 */
export async function checkMonthlyCapAndAlert(now = new Date()): Promise<boolean> {
  const spent = await monthlySpendUsd(now);
  if (spent < HAVEN_AI_MONTHLY_CAP_USD) return false;

  try {
    const monthStart = manilaMonthStartUtc(now);
    const alreadyAlerted = await prisma.havenChatUsage.findFirst({
      where: { createdAt: { gte: monthStart }, reason: "cap" },
      select: { id: true },
    });
    if (!alreadyAlerted) {
      await sendEmail({
        to: HAVEN_AI_ADMIN_ALERT_TO,
        subject: "Haven AI — monthly spend cap reached",
        html: `<p>Haven AI has reached its monthly spend cap of $${HAVEN_AI_MONTHLY_CAP_USD.toFixed(
          2
        )} (spent so far: $${spent.toFixed(2)}). The chat widget has fallen back to static mode for the rest of this Manila calendar month.</p>`,
      });
      await prisma.havenChatUsage.create({
        data: {
          sessionId: "system",
          ipHash: "system",
          provider: "none",
          model: "none",
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 0,
          toolCalls: 0,
          outcome: "static",
          reason: "cap",
        },
      });
    }
  } catch (err) {
    console.error("[haven] failed to send monthly cap alert:", err);
  }

  return true;
}
