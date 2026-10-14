/**
 * chat-service.test.ts — Prisma, email and the provider/tools modules are mocked; no DB,
 * no network. `config.ts` reads several env vars at module-load time, so any test that
 * varies HAVEN_AI_ENABLED/HAVEN_AI_KILL/HAVEN_AI_PROVIDER must reset the module registry
 * and re-import chat-service fresh (freshChatService()) — a plain re-assignment of
 * process.env would not change already-evaluated top-level consts.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MAX_TOOL_ROUNDS } from "../config";

const { db, sendMail, providerChat, runHavenToolMock } = vi.hoisted(() => ({
  db: {
    havenChatUsage: { count: vi.fn(), aggregate: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    havenChatTranscript: { createMany: vi.fn() },
  },
  sendMail: vi.fn(),
  providerChat: vi.fn(),
  runHavenToolMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/email", () => ({ sendEmail: sendMail }));
vi.mock("../provider", () => ({
  getChatProvider: () => ({ name: "anthropic", chat: providerChat }),
}));
vi.mock("../tools", () => ({
  getToolDefinitions: () => [],
  runHavenTool: runHavenToolMock,
}));

const ORIGINAL_ENV = { ...process.env };

async function freshChatService() {
  vi.resetModules();
  return import("../chat-service");
}

const validBody = (overrides: Record<string, unknown> = {}) => ({
  sessionId: "11111111-1111-1111-1111-111111111111",
  lang: "en",
  messages: [{ role: "user", content: "Hi" }],
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  process.env = { ...ORIGINAL_ENV, HAVEN_AI_ENABLED: "true" };
  delete process.env.HAVEN_AI_KILL;
  db.havenChatUsage.count.mockResolvedValue(0);
  db.havenChatUsage.aggregate.mockResolvedValue({ _sum: { costUsd: 0 } });
  db.havenChatUsage.findFirst.mockResolvedValue(null);
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("handleHavenChat — flag gating", () => {
  it("returns bare static when HAVEN_AI_ENABLED is not exactly 'true'", async () => {
    process.env.HAVEN_AI_ENABLED = "1";
    const { handleHavenChat } = await freshChatService();
    expect(await handleHavenChat(validBody(), "1.2.3.4")).toEqual({ mode: "static" });
    expect(providerChat).not.toHaveBeenCalled();
  });

  it("the kill switch forces static even when the feature is enabled", async () => {
    process.env.HAVEN_AI_ENABLED = "true";
    process.env.HAVEN_AI_KILL = "true";
    const { handleHavenChat } = await freshChatService();
    expect(await handleHavenChat(validBody(), "1.2.3.4")).toEqual({ mode: "static" });
    expect(providerChat).not.toHaveBeenCalled();
  });
});

describe("handleHavenChat — request validation", () => {
  it("rejects a malformed body", async () => {
    const { handleHavenChat } = await freshChatService();
    expect(await handleHavenChat({ nonsense: true }, "1.2.3.4")).toEqual({ mode: "static", reason: "error" });
  });

  it("rejects more than 12 messages", async () => {
    const { handleHavenChat } = await freshChatService();
    const messages = Array.from({ length: 13 }, () => ({ role: "user" as const, content: "hi" }));
    expect(await handleHavenChat(validBody({ messages }), "1.2.3.4")).toEqual({ mode: "static", reason: "error" });
  });

  it("rejects a message longer than 600 characters", async () => {
    const { handleHavenChat } = await freshChatService();
    const messages = [{ role: "user" as const, content: "x".repeat(601) }];
    expect(await handleHavenChat(validBody({ messages }), "1.2.3.4")).toEqual({ mode: "static", reason: "error" });
  });

  it("rejects an invalid lang value", async () => {
    const { handleHavenChat } = await freshChatService();
    expect(await handleHavenChat(validBody({ lang: "fr" }), "1.2.3.4")).toEqual({ mode: "static", reason: "error" });
  });

  it("rejects a role other than user/assistant", async () => {
    const { handleHavenChat } = await freshChatService();
    const messages = [{ role: "system", content: "hi" }];
    expect(await handleHavenChat(validBody({ messages }), "1.2.3.4")).toEqual({ mode: "static", reason: "error" });
  });
});

describe("handleHavenChat — rate limiting and the monthly cap", () => {
  it("falls back to static when the per-IP rate limit is exceeded", async () => {
    db.havenChatUsage.count.mockResolvedValueOnce(20); // 10-min window already at the cap
    const { handleHavenChat } = await freshChatService();
    expect(await handleHavenChat(validBody(), "1.2.3.4")).toEqual({ mode: "static", reason: "rate_limit" });
    expect(providerChat).not.toHaveBeenCalled();
  });

  it("falls back to static and alerts exactly once when over the monthly cap", async () => {
    db.havenChatUsage.aggregate.mockResolvedValue({ _sum: { costUsd: 25 } });
    const { handleHavenChat } = await freshChatService();
    expect(await handleHavenChat(validBody(), "1.2.3.4")).toEqual({ mode: "static", reason: "cap" });
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(providerChat).not.toHaveBeenCalled();
  });

  it("does not re-alert once this month's cap marker already exists", async () => {
    db.havenChatUsage.aggregate.mockResolvedValue({ _sum: { costUsd: 25 } });
    db.havenChatUsage.findFirst.mockResolvedValue({ id: 1 });
    const { handleHavenChat } = await freshChatService();
    expect(await handleHavenChat(validBody(), "1.2.3.4")).toEqual({ mode: "static", reason: "cap" });
    expect(sendMail).not.toHaveBeenCalled();
  });
});

describe("handleHavenChat — provider errors", () => {
  it("falls back to static when the provider throws", async () => {
    providerChat.mockRejectedValue(new Error("network down"));
    const { handleHavenChat } = await freshChatService();
    expect(await handleHavenChat(validBody(), "1.2.3.4")).toEqual({ mode: "static", reason: "error" });
    expect(db.havenChatUsage.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ outcome: "error" }) })
    );
  });

  it("stops after MAX_TOOL_ROUNDS and still returns a reply rather than hanging", async () => {
    providerChat.mockResolvedValue({
      text: "",
      toolCalls: [{ id: "1", name: "get_faq", input: {} }],
      usage: { inputTokens: 1, outputTokens: 1 },
      stopReason: "tool_use",
    });
    runHavenToolMock.mockResolvedValue({ results: [] });

    const { handleHavenChat } = await freshChatService();
    const result = await handleHavenChat(validBody(), "1.2.3.4");

    expect(providerChat).toHaveBeenCalledTimes(MAX_TOOL_ROUNDS);
    expect(result.mode).toBe("ai");
    expect(result.reply).toMatch(/real person|m\.me\/haveninlipa/i);
  });
});

describe("handleHavenChat — successful AI turn, post-processing", () => {
  it("returns the model's reply, keeps an allowed link, and strips a disallowed one", async () => {
    providerChat.mockResolvedValue({
      text: "Sure! Book here: [Book Now](/properties/cozy-1-bedroom/book). Also see [this](https://airbnb.com/x).",
      toolCalls: [],
      usage: { inputTokens: 10, outputTokens: 10 },
      stopReason: "end_turn",
    });

    const { handleHavenChat } = await freshChatService();
    const result = await handleHavenChat(validBody(), "1.2.3.4");

    expect(result.mode).toBe("ai");
    expect(result.reply).toContain("Book Now");
    expect(result.reply).not.toContain("airbnb.com");
    expect(result.links).toEqual([{ label: "Book Now", href: "/properties/cozy-1-bedroom/book" }]);
  });

  it("replaces a price with no tool-result backing, and keeps one that matches a tool result", async () => {
    providerChat
      .mockResolvedValueOnce({
        text: "Let me check that quote.",
        toolCalls: [{ id: "1", name: "get_quote", input: { slug: "cozy-1-bedroom", checkIn: "2026-12-24", checkOut: "2026-12-26", guests: 2 } }],
        usage: { inputTokens: 10, outputTokens: 5 },
        stopReason: "tool_use",
      })
      .mockResolvedValueOnce({
        text: "Your total is ₱4,500. Taxes bring it to ₱9,999 though.",
        toolCalls: [],
        usage: { inputTokens: 10, outputTokens: 10 },
        stopReason: "end_turn",
      });
    runHavenToolMock.mockResolvedValue({ total: 4500, nights: 2 });

    const { handleHavenChat } = await freshChatService();
    const result = await handleHavenChat(validBody(), "1.2.3.4");

    expect(result.reply).toContain("₱4,500");
    expect(result.reply).not.toContain("₱9,999");
    expect(result.reply).toContain("You'll see the exact total at checkout.");
  });

  it("logs usage with the configured provider and model, and a non-negative cost", async () => {
    providerChat.mockResolvedValue({
      text: "hi",
      toolCalls: [],
      usage: { inputTokens: 100, outputTokens: 50 },
      stopReason: "end_turn",
    });

    const { handleHavenChat } = await freshChatService();
    await handleHavenChat(validBody(), "1.2.3.4");

    expect(db.havenChatUsage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ provider: "anthropic", outcome: "ai" }),
      })
    );
    const call = db.havenChatUsage.create.mock.calls[0][0];
    expect(call.data.costUsd).toBeGreaterThanOrEqual(0);
  });

  it("returns a booking-link button from a tool result even when the model didn't write a markdown link", async () => {
    providerChat
      .mockResolvedValueOnce({
        text: "Let me check that for you.",
        toolCalls: [{ id: "1", name: "get_quote", input: { slug: "cozy-1-bedroom", checkIn: "2026-12-24", checkOut: "2026-12-26", guests: 2 } }],
        usage: { inputTokens: 10, outputTokens: 5 },
        stopReason: "tool_use",
      })
      .mockResolvedValueOnce({
        text: "Your total is ₱4,500 for that stay.",
        toolCalls: [],
        usage: { inputTokens: 10, outputTokens: 10 },
        stopReason: "end_turn",
      });
    runHavenToolMock.mockResolvedValue({
      name: "Cozy 1BR Haven",
      total: 4500,
      bookingLink: "/properties/cozy-1-bedroom/book?checkIn=2026-12-24&checkOut=2026-12-26&guests=2",
    });

    const { handleHavenChat } = await freshChatService();
    const result = await handleHavenChat(validBody(), "1.2.3.4");

    expect(result.links).toEqual([
      expect.objectContaining({ href: "/properties/cozy-1-bedroom/book?checkIn=2026-12-24&checkOut=2026-12-26&guests=2" }),
    ]);
    expect(result.links?.[0].label).toContain("Cozy 1BR Haven");
  });

  it("adds a Messenger button for an off-topic reply even when the model wrote it as plain text", async () => {
    providerChat.mockResolvedValue({
      text: "That's outside what I can help with here — message us at m.me/haveninlipa for that.",
      toolCalls: [],
      usage: { inputTokens: 10, outputTokens: 10 },
      stopReason: "end_turn",
    });

    const { handleHavenChat } = await freshChatService();
    const result = await handleHavenChat(validBody({ messages: [{ role: "user", content: "What's the weather on Mars?" }] }), "1.2.3.4");

    expect(result.links).toEqual([{ label: "Message us on Messenger", href: "m.me/haveninlipa" }]);
  });

  it("keeps only the first 'provisional' when the model repeats it", async () => {
    providerChat.mockResolvedValue({
      text: "That total is provisional. Everything here is provisional until checkout.",
      toolCalls: [],
      usage: { inputTokens: 10, outputTokens: 10 },
      stopReason: "end_turn",
    });

    const { handleHavenChat } = await freshChatService();
    const result = await handleHavenChat(validBody(), "1.2.3.4");

    expect(result.reply?.match(/provisional/gi)).toHaveLength(1);
  });

  it("masks PII before writing the transcript", async () => {
    providerChat.mockResolvedValue({
      text: "Noted, I'll follow up.",
      toolCalls: [],
      usage: { inputTokens: 5, outputTokens: 5 },
      stopReason: "end_turn",
    });

    const { handleHavenChat } = await freshChatService();
    await handleHavenChat(
      validBody({ messages: [{ role: "user", content: "Email me at guest@example.com please" }] }),
      "1.2.3.4"
    );

    const call = db.havenChatTranscript.createMany.mock.calls[0][0];
    const userRow = call.data.find((r: { role: string }) => r.role === "user");
    expect(userRow.content).toContain("[email]");
    expect(userRow.content).not.toContain("guest@example.com");
  });
});
