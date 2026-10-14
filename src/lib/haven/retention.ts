import "server-only";
import { prisma } from "@/lib/prisma";

/** Guest-message retention — transcripts are masked (masking.ts) but still deleted on a clock. */
export const TRANSCRIPT_RETENTION_DAYS = 90;
/** Usage rows carry no PII — kept longer, for the monthly-cap history and cost reporting. */
export const USAGE_RETENTION_MONTHS = 13;

export interface RetentionResult {
  transcriptsDeleted: number;
  usageRowsDeleted: number;
}

/** Driven by /api/cron/haven-retention (daily). Pure deletes — no email, no alert. */
export async function purgeExpiredHavenData(now = new Date()): Promise<RetentionResult> {
  const transcriptCutoff = new Date(now.getTime() - TRANSCRIPT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const usageCutoff = new Date(now.getTime());
  usageCutoff.setUTCMonth(usageCutoff.getUTCMonth() - USAGE_RETENTION_MONTHS);

  const [transcripts, usage] = await Promise.all([
    prisma.havenChatTranscript.deleteMany({ where: { createdAt: { lt: transcriptCutoff } } }),
    prisma.havenChatUsage.deleteMany({ where: { createdAt: { lt: usageCutoff } } }),
  ]);

  return { transcriptsDeleted: transcripts.count, usageRowsDeleted: usage.count };
}
