import { describe, it, expect, vi, beforeEach } from "vitest";

const { db } = vi.hoisted(() => ({
  db: {
    havenChatTranscript: { deleteMany: vi.fn() },
    havenChatUsage: { deleteMany: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: db }));

import { purgeExpiredHavenData, TRANSCRIPT_RETENTION_DAYS, USAGE_RETENTION_MONTHS } from "../retention";

beforeEach(() => {
  vi.clearAllMocks();
  db.havenChatTranscript.deleteMany.mockResolvedValue({ count: 3 });
  db.havenChatUsage.deleteMany.mockResolvedValue({ count: 1 });
});

describe("purgeExpiredHavenData", () => {
  it("deletes transcripts older than the retention window and reports counts", async () => {
    const now = new Date("2026-10-14T00:00:00Z");
    const result = await purgeExpiredHavenData(now);
    expect(result).toEqual({ transcriptsDeleted: 3, usageRowsDeleted: 1 });

    const transcriptArg = db.havenChatTranscript.deleteMany.mock.calls[0][0];
    const cutoff: Date = transcriptArg.where.createdAt.lt;
    const expectedCutoff = new Date(now.getTime() - TRANSCRIPT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    expect(cutoff.toISOString()).toBe(expectedCutoff.toISOString());
  });

  it("deletes usage rows older than the usage retention window", async () => {
    const now = new Date("2026-10-14T00:00:00Z");
    await purgeExpiredHavenData(now);

    const usageArg = db.havenChatUsage.deleteMany.mock.calls[0][0];
    const cutoff: Date = usageArg.where.createdAt.lt;
    const expected = new Date(now);
    expected.setUTCMonth(expected.getUTCMonth() - USAGE_RETENTION_MONTHS);
    expect(cutoff.toISOString()).toBe(expected.toISOString());
  });
});
