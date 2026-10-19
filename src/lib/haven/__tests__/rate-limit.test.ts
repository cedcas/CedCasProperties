import { describe, it, expect, vi, beforeEach } from "vitest";

const { db, sendMail } = vi.hoisted(() => ({
  db: {
    havenChatUsage: { count: vi.fn(), aggregate: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
  },
  sendMail: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/email", () => ({ sendEmail: sendMail }));

import { checkRateLimit, checkMonthlyCapAndAlert, manilaMonthStartUtc, hashIp } from "../rate-limit";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("hashIp", () => {
  it("never returns the raw IP", () => {
    expect(hashIp("203.0.113.5")).not.toContain("203.0.113.5");
  });

  it("is deterministic for the same input", () => {
    expect(hashIp("203.0.113.5")).toBe(hashIp("203.0.113.5"));
  });
});

describe("manilaMonthStartUtc", () => {
  it("returns the UTC instant of the 1st of the Manila month (UTC+8)", () => {
    const now = new Date("2026-10-14T12:00:00Z");
    expect(manilaMonthStartUtc(now).toISOString()).toBe("2026-09-30T16:00:00.000Z");
  });

  it("rolls forward correctly when 'now' is already past the UTC 16:00 Manila-midnight edge", () => {
    const now = new Date("2026-10-31T17:00:00Z"); // Manila: Nov 1, 01:00
    expect(manilaMonthStartUtc(now).toISOString()).toBe("2026-10-31T16:00:00.000Z");
  });
});

describe("checkRateLimit", () => {
  it("allows a fresh ipHash under every threshold", async () => {
    db.havenChatUsage.count.mockResolvedValue(0);
    const result = await checkRateLimit("hash-a");
    expect(result.allowed).toBe(true);
  });

  it("blocks once the 10-minute per-IP threshold is reached", async () => {
    db.havenChatUsage.count
      .mockResolvedValueOnce(20) // 10-min window
      .mockResolvedValueOnce(20)
      .mockResolvedValueOnce(5);
    const result = await checkRateLimit("hash-a");
    expect(result).toEqual({ allowed: false, reason: "rate_limit" });
  });

  it("blocks once the global per-hour threshold is reached even for a fresh ipHash", async () => {
    db.havenChatUsage.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(600);
    const result = await checkRateLimit("hash-fresh");
    expect(result).toEqual({ allowed: false, reason: "rate_limit" });
  });
});

describe("checkMonthlyCapAndAlert", () => {
  it("returns false and sends no alert when under the cap", async () => {
    db.havenChatUsage.aggregate.mockResolvedValue({ _sum: { costUsd: 5 } });
    const over = await checkMonthlyCapAndAlert();
    expect(over).toBe(false);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("sends exactly one alert the first time the cap is exceeded this month", async () => {
    db.havenChatUsage.aggregate.mockResolvedValue({ _sum: { costUsd: 25 } });
    db.havenChatUsage.findFirst.mockResolvedValue(null); // no prior alert marker this month
    const over = await checkMonthlyCapAndAlert();
    expect(over).toBe(true);
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: "customerservice@haveninlipa.com" }));
    expect(db.havenChatUsage.create).toHaveBeenCalledTimes(1);
  });

  it("does not re-send the alert once this month's marker row already exists", async () => {
    db.havenChatUsage.aggregate.mockResolvedValue({ _sum: { costUsd: 25 } });
    db.havenChatUsage.findFirst.mockResolvedValue({ id: 1 }); // already alerted this month
    const over = await checkMonthlyCapAndAlert();
    expect(over).toBe(true);
    expect(sendMail).not.toHaveBeenCalled();
    expect(db.havenChatUsage.create).not.toHaveBeenCalled();
  });
});
