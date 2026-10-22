/**
 * chat-service.test.ts — Prisma, email and the provider/tools modules are mocked; no DB,
 * no network. `config.ts` reads several env vars at module-load time, so any test that
 * varies HAVEN_AI_ENABLED/HAVEN_AI_KILL/HAVEN_AI_PROVIDER must reset the module registry
 * and re-import chat-service fresh (freshChatService()) — a plain re-assignment of
 * process.env would not change already-evaluated top-level consts.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MAX_TOOL_ROUNDS } from "../config";

const { db, sendMail, providerChat, runHavenToolMock, listingsApi } = vi.hoisted(() => ({
  db: {
    havenChatUsage: { count: vi.fn(), aggregate: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    havenChatTranscript: { createMany: vi.fn() },
  },
  sendMail: vi.fn(),
  providerChat: vi.fn(),
  runHavenToolMock: vi.fn(),
  listingsApi: { getPublicListings: vi.fn() },
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
// `buildShortNames`/`shortPropertyLabels` stay real — the property pre-resolution path
// (property-resolver.ts) goes through them, same as production, so a test exercising it
// is meaningful. Only `getPublicListings` is stubbed (no DB in this test file).
vi.mock("@/lib/listings", async () => {
  const actual = await vi.importActual<typeof import("@/lib/listings")>("@/lib/listings");
  return { ...actual, getPublicListings: listingsApi.getPublicListings };
});

/** The two houses' five live listings, as `property-resolver.ts` expects them, plus the
 * bedrooms/pricePerNight fields the listings context note (chat-service.ts) also reads. */
const PUBLIC_LISTINGS = [
  { slug: "cozy-1-bedroom", name: "Cozy 1BR Haven | Solar Power•Netflix•Wi-Fi•5 Pax", maxGuests: 5, bedrooms: 1, pricePerNight: 3500 },
  { slug: "spacious-2-bedroom", name: "Spacious 2BR Haven | Solar Power•Netflix•Wi-Fi•9 Pax", maxGuests: 9, bedrooms: 2, pricePerNight: 5500 },
  { slug: "mickey-in-lipa--family-staycation--sleeps-7", name: "Mickey in Lipa | Family Staycation•Sleeps 7", maxGuests: 7, bedrooms: 2, pricePerNight: 6000 },
  { slug: "mickey-in-lipa--family-house--sleeps-11", name: "Mickey in Lipa | Family House•Sleeps 11", maxGuests: 11, bedrooms: 3, pricePerNight: 7500 },
  { slug: "mickey-in-lipa--full-family-house--sleeps-15", name: "Mickey in Lipa | Full Family House•Sleeps 15", maxGuests: 15, bedrooms: 4, pricePerNight: 9500 },
];

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
  listingsApi.getPublicListings.mockResolvedValue(PUBLIC_LISTINGS);
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

  it("trims history over 12 messages to the most recent, instead of rejecting", async () => {
    providerChat.mockResolvedValue({
      text: "Sure, happy to help!",
      toolCalls: [],
      usage: { inputTokens: 5, outputTokens: 5 },
      stopReason: "end_turn",
    });
    const { handleHavenChat } = await freshChatService();
    // 15 alternating turns, each distinct so the trimmed set is identifiable.
    const messages = Array.from({ length: 15 }, (_, i) => ({
      role: i % 2 === 0 ? ("user" as const) : ("assistant" as const),
      content: `turn ${i}`,
    }));

    const result = await handleHavenChat(validBody({ messages }), "1.2.3.4");

    expect(result.mode).toBe("ai");
    const sentMessages = providerChat.mock.calls[0][0].messages as { role: string; content: string }[];
    expect(sentMessages).toHaveLength(12);
    expect(sentMessages[0].content).toBe("turn 3"); // the oldest 3 turns were dropped
    expect(sentMessages[sentMessages.length - 1].content).toBe("turn 14");
  });

  it("accepts a long assistant history turn (Haven's own multi-option reply) and truncates it instead of rejecting", async () => {
    providerChat.mockResolvedValue({
      text: "Here's what I can tell you about that.",
      toolCalls: [],
      usage: { inputTokens: 5, outputTokens: 5 },
      stopReason: "end_turn",
    });
    const { handleHavenChat } = await freshChatService();
    const longAssistantReply = "y".repeat(2000);
    const messages = [
      { role: "user" as const, content: "What properties do you have?" },
      { role: "assistant" as const, content: longAssistantReply },
      { role: "user" as const, content: "Mickey in lipa" },
    ];

    const result = await handleHavenChat(validBody({ messages }), "1.2.3.4");

    expect(result.mode).toBe("ai");
    const sentMessages = providerChat.mock.calls[0][0].messages as { role: string; content: string }[];
    const assistantTurn = sentMessages.find((m) => m.role === "assistant")!;
    expect(assistantTurn.content.length).toBe(1500);
    expect(assistantTurn.content).toBe(longAssistantReply.slice(-1500));
  });

  it("reproduces the live bug sequence (long Haven reply, then free text) and stays in AI mode", async () => {
    providerChat.mockResolvedValue({
      text: "Which of the three Mickey listings do you mean?",
      toolCalls: [],
      usage: { inputTokens: 5, outputTokens: 5 },
      stopReason: "end_turn",
    });
    const { handleHavenChat } = await freshChatService();
    const messages = [
      { role: "user" as const, content: "Do you have anything for a big group?" },
      { role: "assistant" as const, content: "o".repeat(870) }, // Haven's own 4-option reply
      { role: "user" as const, content: "Mickey in lipa" },
    ];

    const result = await handleHavenChat(validBody({ messages }), "1.2.3.4");

    expect(result.mode).toBe("ai");
    expect(result.reason).toBeUndefined();
  });

  it("returns a friendly AI-mode reply (not static fallback) when the latest user message exceeds 600 characters", async () => {
    const { handleHavenChat } = await freshChatService();
    const messages = [{ role: "user" as const, content: "x".repeat(601) }];

    const result = await handleHavenChat(validBody({ messages }), "1.2.3.4");

    expect(result.mode).toBe("ai");
    expect(result.reply).toMatch(/shorten|paikliin/i);
    expect(result.links).toEqual([{ label: "Message us on Messenger", href: "https://m.me/haveninlipa" }]);
    expect(providerChat).not.toHaveBeenCalled();
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

    expect(result.links).toEqual([{ label: "Message us on Messenger", href: "https://m.me/haveninlipa" }]);
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

  it("injects a resolved-dates context note into the system prompt when the latest message contains a date phrase", async () => {
    providerChat.mockResolvedValue({
      text: "Let me check that for you.",
      toolCalls: [],
      usage: { inputTokens: 5, outputTokens: 5 },
      stopReason: "end_turn",
    });

    const { handleHavenChat } = await freshChatService();
    const now = new Date("2026-10-14T12:00:00Z");
    await handleHavenChat(
      validBody({ messages: [{ role: "user", content: "May bakante ba kayo sa ikalawang Sabado ng Nobyembre para sa 12 tao?" }] }),
      "1.2.3.4",
      now
    );

    const system = providerChat.mock.calls[0][0].system as string;
    expect(system).toContain("checkIn=2026-11-14");
    expect(system).toContain("checkOut=2026-11-15");
    expect(system).toMatch(/never ask the guest what year/i);
  });

  it("adds no date context note when the latest message has no detectable date phrase", async () => {
    providerChat.mockResolvedValue({
      text: "Sure, happy to help!",
      toolCalls: [],
      usage: { inputTokens: 5, outputTokens: 5 },
      stopReason: "end_turn",
    });

    const { handleHavenChat } = await freshChatService();
    await handleHavenChat(validBody({ messages: [{ role: "user", content: "Do you have a swimming pool?" }] }), "1.2.3.4");

    const system = providerChat.mock.calls[0][0].system as string;
    expect(system).not.toContain("checkIn=");
  });

  it("always injects today's exact Manila date into the system prompt, even with no date phrase in the latest message", async () => {
    providerChat.mockResolvedValue({
      text: "Sure, happy to help!",
      toolCalls: [],
      usage: { inputTokens: 5, outputTokens: 5 },
      stopReason: "end_turn",
    });

    const { handleHavenChat } = await freshChatService();
    const now = new Date("2026-10-19T04:00:00Z"); // Monday, Manila noon
    await handleHavenChat(validBody({ messages: [{ role: "user", content: "Do you have a swimming pool?" }] }), "1.2.3.4", now);

    const system = providerChat.mock.calls[0][0].system as string;
    expect(system).toContain("Today is Monday, Oct 19, 2026 (Asia/Manila)");
    expect(system).toMatch(/current year is 2026/i);
  });

  // Owner rule, 2026-10-19 — live bug: a numeric date ("10/24") paired with an explicit
  // weekday phrase ("this coming Saturday") that fall on the SAME calendar day.
  describe("numeric month-first dates / relative weekday (Owner rule, 2026-10-19)", () => {
    it('btg: "Pwede ga mag-book sa 10/24, this coming Saturday, para sa 4 sa Spacious 2BR?" resolves to 2026-10-24/25 with no year/night question', async () => {
      providerChat.mockResolvedValue({
        text: "Sige po, tatawag ako ng quote para sa inyo.",
        toolCalls: [],
        usage: { inputTokens: 5, outputTokens: 5 },
        stopReason: "end_turn",
      });

      const { handleHavenChat } = await freshChatService();
      const now = new Date("2026-10-19T04:00:00Z"); // Monday, Manila noon
      const result = await handleHavenChat(
        validBody({
          lang: "btg",
          messages: [{ role: "user", content: "Pwede ga mag-book sa 10/24, this coming Saturday, para sa 4 sa Spacious 2BR?" }],
        }),
        "1.2.3.4",
        now
      );

      const system = providerChat.mock.calls[0][0].system as string;
      expect(system).toContain("Today is Monday, Oct 19, 2026 (Asia/Manila)");
      expect(system).toContain("checkIn=2026-10-24");
      expect(system).toContain("checkOut=2026-10-25");
      expect(system).toMatch(/never ask the guest what year/i);

      expect(result.reply).not.toMatch(/what year|which year|anong\s+taon/i);
      expect(result.reply).not.toMatch(/\b(?:2024|2025)\b/);
      expect(result.reply).not.toMatch(/1 night ba|tama ba/i);
    });

    it("fixes the exact live bad reply end to end (Batangueño year + 1-night re-confirmation)", async () => {
      providerChat.mockResolvedValue({
        text:
          "Ala eh, Ay, teka lang — kailangan ko ng mas specific. 10/24 ba yan ng taong ito, o next year? " +
          "Parang may confusion lang ng date format. 😅 Pwede ba i-confirm: Oktubre 24, 2024 ba, o 2025 na? " +
          "At kung 1 night lang, check-in sabado at check-out linggo, tama ba?",
        toolCalls: [],
        usage: { inputTokens: 5, outputTokens: 5 },
        stopReason: "end_turn",
      });

      const { handleHavenChat } = await freshChatService();
      const now = new Date("2026-10-19T04:00:00Z"); // Monday, Manila noon
      const result = await handleHavenChat(
        validBody({ lang: "btg", messages: [{ role: "user", content: "10/24, this coming Saturday" }] }),
        "1.2.3.4",
        now
      );

      expect(result.reply).not.toMatch(/taong\s+ito/i);
      expect(result.reply).not.toMatch(/next\s+year/i);
      expect(result.reply).not.toMatch(/\b2024\b/);
      expect(result.reply).not.toMatch(/\b2025\b/);
      expect(result.reply).not.toMatch(/tama\s+ba/i);
      expect(result.reply).not.toMatch(/kung\s+1\s+night\s+lang/i);
    });
  });

  // DEC-029, 2026-10-15 live-retest fix: the resolver in tools.ts only ever ran AFTER a
  // model tool call already missed, so it never helped on a turn where Haiku answered
  // free-text with no tool call at all — the two exact live failures below.
  describe("property-name pre-resolution (live-retest fix)", () => {
    it('live failure #1 — Batangueño, history then "Mickey in lipa": injects an ambiguous context note naming all three Mickey listings, and the post-process backstop drops a wrongful "I don\'t know that property" claim', async () => {
      providerChat.mockResolvedValue({
        text: "Hindi ko alam ang property na 'yan.",
        toolCalls: [],
        usage: { inputTokens: 5, outputTokens: 5 },
        stopReason: "end_turn",
      });

      const { handleHavenChat } = await freshChatService();
      const result = await handleHavenChat(
        validBody({
          lang: "btg",
          messages: [
            { role: "user", content: "Pwede ba kami mag-book para sa barkada namin?" },
            { role: "assistant", content: "Ay ga, pwede namán! Ilan po kayo at anong petsa?" },
            { role: "user", content: "Mickey in lipa" },
          ],
        }),
        "1.2.3.4"
      );

      const system = providerChat.mock.calls[0][0].system as string;
      expect(system).toContain("Mickey in Lipa — Family Staycation");
      expect(system).toContain("Mickey in Lipa — Family House");
      expect(system).toContain("Mickey in Lipa — Full Family House");
      expect(system).toMatch(/never say the property is unknown/i);

      expect(result.reply).not.toMatch(/hindi ko alam/i);
      expect(result.reply).toContain("Mickey in Lipa — Family Staycation");
      expect(result.reply).toContain("Mickey in Lipa — Family House");
      expect(result.reply).toContain("Mickey in Lipa — Full Family House");
    });

    it('live failure #2 — "Magkano ga ang yung malaking bahay ng Mickey sa Nobyembre 14 para sa 10?": resolves uniquely to the full family house instead of asking for the exact name', async () => {
      providerChat.mockResolvedValue({
        text: "Sige po, tatawag ako ng quote para sa inyo.",
        toolCalls: [],
        usage: { inputTokens: 5, outputTokens: 5 },
        stopReason: "end_turn",
      });

      const { handleHavenChat } = await freshChatService();
      const now = new Date("2026-10-14T12:00:00Z");
      await handleHavenChat(
        validBody({
          lang: "btg",
          messages: [{ role: "user", content: "Magkano ga ang yung malaking bahay ng Mickey sa Nobyembre 14 para sa 10?" }],
        }),
        "1.2.3.4",
        now
      );

      const system = providerChat.mock.calls[0][0].system as string;
      expect(system).toContain('refers to "Mickey in Lipa — Full Family House"');
      expect(system).toContain("slug mickey-in-lipa--full-family-house--sleeps-15");
      expect(system).toMatch(/do not ask the guest to name or confirm/i);
    });

    it("tells the model to call get_quote immediately when a unique property, resolved dates, AND a guest count are all already known", async () => {
      providerChat.mockResolvedValue({
        text: "Let me get that quote for you.",
        toolCalls: [],
        usage: { inputTokens: 5, outputTokens: 5 },
        stopReason: "end_turn",
      });

      const { handleHavenChat } = await freshChatService();
      const now = new Date("2026-10-14T12:00:00Z");
      await handleHavenChat(
        validBody({
          messages: [{ role: "user", content: "How much is the Mickey full family house on Nov 14 for 10 guests?" }],
        }),
        "1.2.3.4",
        now
      );

      const system = providerChat.mock.calls[0][0].system as string;
      expect(system).toMatch(/call get_quote now/i);
      expect(system).toContain("slug=mickey-in-lipa--full-family-house--sleeps-15");
      expect(system).toContain("checkIn=2026-11-14");
      expect(system).toContain("checkOut=2026-11-15");
      expect(system).toContain("guests=10");
    });

    it("never says a property is unknown when the resolver found no match either (leaves an unrelated reply untouched)", async () => {
      providerChat.mockResolvedValue({
        text: "Sure, happy to help with that!",
        toolCalls: [],
        usage: { inputTokens: 5, outputTokens: 5 },
        stopReason: "end_turn",
      });

      const { handleHavenChat } = await freshChatService();
      const result = await handleHavenChat(validBody({ messages: [{ role: "user", content: "What time is checkout?" }] }), "1.2.3.4");

      expect(result.reply).toBe("Sure, happy to help with that!");
    });
  });

  // Owner rule 3, 2026-10-16: a follow-up message carrying only dates/guest count must
  // still resolve against the property named in an earlier turn.
  describe("follow-up turn resolution across property + dates/guests (Owner rule 3, 2026-10-16)", () => {
    it('btg: "Magkano ga ang Spacious 2BR?" then "Nobyembre 19 hanggang 21, 4 kami" calls get_quote with the earlier property and this turn\'s dates/guests', async () => {
      providerChat.mockResolvedValue({
        text: "Sige po, tatawag ako ng quote para sa inyo.",
        toolCalls: [],
        usage: { inputTokens: 5, outputTokens: 5 },
        stopReason: "end_turn",
      });

      const { handleHavenChat } = await freshChatService();
      const now = new Date("2026-10-14T12:00:00Z");
      await handleHavenChat(
        validBody({
          lang: "btg",
          messages: [
            { role: "user", content: "Magkano ga ang Spacious 2BR?" },
            { role: "assistant", content: "Ay ga, pwede namán! Anong petsa at ilan po kayo?" },
            { role: "user", content: "Nobyembre 19 hanggang 21, 4 kami" },
          ],
        }),
        "1.2.3.4",
        now
      );

      const system = providerChat.mock.calls[0][0].system as string;
      expect(system).toMatch(/call get_quote now/i);
      expect(system).toContain("slug=spacious-2-bedroom");
      expect(system).toContain("checkIn=2026-11-19");
      expect(system).toContain("checkOut=2026-11-21");
      expect(system).toContain("guests=4");
    });

    it('English equivalent: "How much is the Cozy 1BR?" then "Nov 19 to 21, 4 guests" calls get_quote with the earlier property and this turn\'s dates/guests', async () => {
      providerChat.mockResolvedValue({
        text: "Let me get that quote for you.",
        toolCalls: [],
        usage: { inputTokens: 5, outputTokens: 5 },
        stopReason: "end_turn",
      });

      const { handleHavenChat } = await freshChatService();
      const now = new Date("2026-10-14T12:00:00Z");
      await handleHavenChat(
        validBody({
          messages: [
            { role: "user", content: "How much is the Cozy 1BR?" },
            { role: "assistant", content: "Sure — what dates and how many guests?" },
            { role: "user", content: "Nov 19 to 21, 4 guests" },
          ],
        }),
        "1.2.3.4",
        now
      );

      const system = providerChat.mock.calls[0][0].system as string;
      expect(system).toMatch(/call get_quote now/i);
      expect(system).toContain("slug=cozy-1-bedroom");
      expect(system).toContain("checkIn=2026-11-19");
      expect(system).toContain("checkOut=2026-11-21");
      expect(system).toContain("guests=4");
    });
  });

  it("prepends a natural Batangueño opener when a btg reply carries no marker", async () => {
    providerChat.mockResolvedValue({
      text: "Meron pa kaming bakante sa petsang iyan para sa inyo.",
      toolCalls: [],
      usage: { inputTokens: 5, outputTokens: 5 },
      stopReason: "end_turn",
    });

    const { handleHavenChat } = await freshChatService();
    const result = await handleHavenChat(validBody({ lang: "btg" }), "1.2.3.4");

    expect(result.reply).toBe("Ala eh, Meron pa kaming bakante sa petsang iyan para sa inyo.");
  });

  it("leaves a btg reply that already carries a marker untouched", async () => {
    providerChat.mockResolvedValue({
      text: "Ay ga, meron pa kaming bakante!",
      toolCalls: [],
      usage: { inputTokens: 5, outputTokens: 5 },
      stopReason: "end_turn",
    });

    const { handleHavenChat } = await freshChatService();
    const result = await handleHavenChat(validBody({ lang: "btg" }), "1.2.3.4");

    expect(result.reply).toBe("Ay ga, meron pa kaming bakante!");
  });

  it("replaces a banned term of address the guest never used", async () => {
    providerChat.mockResolvedValue({
      text: "Sure thing, bro — I'll get that sorted for you.",
      toolCalls: [],
      usage: { inputTokens: 5, outputTokens: 5 },
      stopReason: "end_turn",
    });

    const { handleHavenChat } = await freshChatService();
    const result = await handleHavenChat(validBody(), "1.2.3.4");

    expect(result.reply).not.toMatch(/\bbro\b/i);
    expect(result.reply).toContain("friend");
  });

  it("keeps a banned term of address the guest used first", async () => {
    providerChat.mockResolvedValue({
      text: "Sure thing, bro!",
      toolCalls: [],
      usage: { inputTokens: 5, outputTokens: 5 },
      stopReason: "end_turn",
    });

    const { handleHavenChat } = await freshChatService();
    const result = await handleHavenChat(
      validBody({ messages: [{ role: "user", content: "hey bro, got a 2BR free?" }] }),
      "1.2.3.4"
    );

    expect(result.reply).toContain("bro");
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

describe("handleHavenChat — owner guardrails and facts (DEC-029 addendum, 2026-10-14)", () => {
  it("drops a sentence asking the guest's budget", async () => {
    providerChat.mockResolvedValue({
      text: "Happy to help! What's your budget for this trip?",
      toolCalls: [],
      usage: { inputTokens: 5, outputTokens: 5 },
      stopReason: "end_turn",
    });

    const { handleHavenChat } = await freshChatService();
    const result = await handleHavenChat(validBody(), "1.2.3.4");

    expect(result.reply).not.toMatch(/budget/i);
  });

  it("forces the Messenger button for the exact field-reported 24-guest sentence, with no find_stay/get_quote call at all", async () => {
    providerChat.mockResolvedValue({
      text: "Ilang gabi po kayong magstay?", // the reported bug: model asks nights instead of handing off
      toolCalls: [],
      usage: { inputTokens: 5, outputTokens: 5 },
      stopReason: "end_turn",
    });

    const { handleHavenChat } = await freshChatService();
    const result = await handleHavenChat(
      validBody({
        lang: "tl",
        messages: [{ role: "user", content: "Kami ay 24 na tao sa ikalawang Sabado ng Nobyembre. Saan kami pwede?" }],
      }),
      "1.2.3.4"
    );

    expect(result.links).toEqual(expect.arrayContaining([{ label: "Message us on Messenger", href: "https://m.me/haveninlipa" }]));
  });

  it("skips the model entirely for a parsed 24+ guest count, going straight to the deterministic handoff", async () => {
    // Supersedes the old "inject a context note and let the model handle it" behavior —
    // live testing showed the model's own wording drifted even with the note; see
    // "handleHavenChat — 24+ guests: deterministic handoff, no model call" below.
    const { handleHavenChat } = await freshChatService();
    const result = await handleHavenChat(
      validBody({
        lang: "tl",
        messages: [{ role: "user", content: "Kami ay 24 na tao sa ikalawang Sabado ng Nobyembre. Saan kami pwede?" }],
      }),
      "1.2.3.4"
    );

    expect(providerChat).not.toHaveBeenCalled();
    expect(result.links).toEqual(expect.arrayContaining([{ label: "Message us on Messenger", href: "https://m.me/haveninlipa" }]));
  });

  it("forces the Messenger button when find_amenity finds nothing anywhere", async () => {
    providerChat
      .mockResolvedValueOnce({
        text: "Let me check that for you.",
        toolCalls: [{ id: "1", name: "find_amenity", input: { term: "jacuzzi" } }],
        usage: { inputTokens: 10, outputTokens: 5 },
        stopReason: "tool_use",
      })
      .mockResolvedValueOnce({
        text: "That's not listed in our amenities.",
        toolCalls: [],
        usage: { inputTokens: 10, outputTokens: 10 },
        stopReason: "end_turn",
      });
    runHavenToolMock.mockResolvedValue({ found: false, properties: [] });

    const { handleHavenChat } = await freshChatService();
    const result = await handleHavenChat(
      validBody({ messages: [{ role: "user", content: "Do you have a jacuzzi?" }] }),
      "1.2.3.4"
    );

    expect(result.links).toEqual([{ label: "Message us on Messenger", href: "https://m.me/haveninlipa" }]);
  });

  it("does not force the Messenger button when find_amenity finds a match", async () => {
    providerChat
      .mockResolvedValueOnce({
        text: "Let me check that for you.",
        toolCalls: [{ id: "1", name: "find_amenity", input: { term: "karaoke" } }],
        usage: { inputTokens: 10, outputTokens: 5 },
        stopReason: "tool_use",
      })
      .mockResolvedValueOnce({
        text: "Yes, Mickey has a karaoke machine!",
        toolCalls: [],
        usage: { inputTokens: 10, outputTokens: 10 },
        stopReason: "end_turn",
      });
    runHavenToolMock.mockResolvedValue({ found: true, properties: [{ slug: "mickey-full", name: "Mickey" }] });

    const { handleHavenChat } = await freshChatService();
    const result = await handleHavenChat(
      validBody({ messages: [{ role: "user", content: "Do you have karaoke?" }] }),
      "1.2.3.4"
    );

    expect(result.links ?? []).toEqual([]);
  });

  it("converts a leaked 'ga' question particle to 'ba' in plain Tagalog mode", async () => {
    providerChat.mockResolvedValue({
      text: "Ilan ga kayo talaga?",
      toolCalls: [],
      usage: { inputTokens: 5, outputTokens: 5 },
      stopReason: "end_turn",
    });

    const { handleHavenChat } = await freshChatService();
    const result = await handleHavenChat(validBody({ lang: "tl" }), "1.2.3.4");

    expect(result.reply).toBe("Ilan ba kayo talaga?");
  });

  it("forces the Messenger button when find_stay is called for 24+ guests", async () => {
    providerChat
      .mockResolvedValueOnce({
        text: "Let me check what fits a group that size.",
        toolCalls: [{ id: "1", name: "find_stay", input: { checkIn: "2026-12-24", checkOut: "2026-12-26", guests: 24 } }],
        usage: { inputTokens: 10, outputTokens: 5 },
        stopReason: "tool_use",
      })
      .mockResolvedValueOnce({
        text: "Here's what we found for your group.",
        toolCalls: [],
        usage: { inputTokens: 10, outputTokens: 10 },
        stopReason: "end_turn",
      });
    runHavenToolMock.mockResolvedValue({ options: [] });

    const { handleHavenChat } = await freshChatService();
    const result = await handleHavenChat(
      validBody({ messages: [{ role: "user", content: "Can you fit our group of 24?" }] }),
      "1.2.3.4"
    );

    expect(result.links).toEqual(expect.arrayContaining([{ label: "Message us on Messenger", href: "https://m.me/haveninlipa" }]));
  });

  it("forces the Messenger button when the guest asks whether kids count toward capacity", async () => {
    providerChat.mockResolvedValue({
      text: "Let's check the group size and dates first.",
      toolCalls: [],
      usage: { inputTokens: 5, outputTokens: 5 },
      stopReason: "end_turn",
    });

    const { handleHavenChat } = await freshChatService();
    const result = await handleHavenChat(
      validBody({ messages: [{ role: "user", content: "Do kids count toward the guest capacity?" }] }),
      "1.2.3.4"
    );

    expect(result.links).toEqual([{ label: "Message us on Messenger", href: "https://m.me/haveninlipa" }]);
  });

  it("replaces a claim that babies stay free of charge with the Messenger confirmation sentence", async () => {
    providerChat.mockResolvedValue({
      text: "No worries — babies stay free of charge with us.",
      toolCalls: [],
      usage: { inputTokens: 5, outputTokens: 5 },
      stopReason: "end_turn",
    });

    const { handleHavenChat } = await freshChatService();
    const result = await handleHavenChat(validBody(), "1.2.3.4");

    expect(result.reply).not.toMatch(/free of charge/i);
    expect(result.reply).toContain("m.me/haveninlipa");
  });

  it("allows the ₱200/hour early check-in fee through the price guard without a tool call", async () => {
    providerChat.mockResolvedValue({
      text: "Early check-in is ₱200 per hour, subject to availability.",
      toolCalls: [],
      usage: { inputTokens: 5, outputTokens: 5 },
      stopReason: "end_turn",
    });

    const { handleHavenChat } = await freshChatService();
    const result = await handleHavenChat(
      validBody({ messages: [{ role: "user", content: "Can I check in early at 9am?" }] }),
      "1.2.3.4"
    );

    expect(result.reply).toContain("₱200 per hour");
  });

  it("fixes 'ilang guests ang dadalaw' phrasing in a Tagalog reply", async () => {
    providerChat.mockResolvedValue({
      text: "Sige lang, ilang guests ang dadalaw sa inyo?",
      toolCalls: [],
      usage: { inputTokens: 5, outputTokens: 5 },
      stopReason: "end_turn",
    });

    const { handleHavenChat } = await freshChatService();
    const result = await handleHavenChat(validBody({ lang: "tl" }), "1.2.3.4");

    expect(result.reply).not.toMatch(/dadalaw/i);
    expect(result.reply).toContain("Ilang guests kayo?");
  });

  it("shortens a raw DB property name in the reply text, not just link labels", async () => {
    providerChat
      .mockResolvedValueOnce({
        text: "Let me check what we have.",
        toolCalls: [{ id: "1", name: "list_properties", input: {} }],
        usage: { inputTokens: 5, outputTokens: 5 },
        stopReason: "tool_use",
      })
      .mockResolvedValueOnce({
        text: "[DEVDB] Cozy 1BR Haven | Solar Power•Netflix•Wi-Fi•5 Pax is free that weekend.",
        toolCalls: [],
        usage: { inputTokens: 5, outputTokens: 5 },
        stopReason: "end_turn",
      });
    runHavenToolMock.mockResolvedValue([
      { slug: "cozy-1-bedroom", name: "[DEVDB] Cozy 1BR Haven | Solar Power•Netflix•Wi-Fi•5 Pax" },
    ]);

    const { handleHavenChat } = await freshChatService();
    const result = await handleHavenChat(validBody(), "1.2.3.4");

    expect(result.reply).toBe("Cozy 1BR Haven is free that weekend.");
  });

  it("strips a stray Tagalog word from an English reply", async () => {
    providerChat.mockResolvedValue({
      text: "Sure thing po, your grupo of 10 is welcome.",
      toolCalls: [],
      usage: { inputTokens: 5, outputTokens: 5 },
      stopReason: "end_turn",
    });

    const { handleHavenChat } = await freshChatService();
    const result = await handleHavenChat(validBody(), "1.2.3.4"); // lang: "en" from validBody

    expect(result.reply).not.toMatch(/\bpo\b/);
    expect(result.reply).toContain("group of 10");
  });

  it("prefixes a bare listing base rate with 'from ₱X/night' (Cedric, 2026-10-15)", async () => {
    providerChat
      .mockResolvedValueOnce({
        text: "Let me check what we have.",
        toolCalls: [{ id: "1", name: "list_properties", input: {} }],
        usage: { inputTokens: 5, outputTokens: 5 },
        stopReason: "tool_use",
      })
      .mockResolvedValueOnce({
        text: "Mickey in Lipa — ₱6,500/night",
        toolCalls: [],
        usage: { inputTokens: 5, outputTokens: 5 },
        stopReason: "end_turn",
      });
    runHavenToolMock.mockResolvedValue([
      { slug: "mickey-full", name: "Mickey in Lipa", pricePerNight: 6500, maxGuests: 15 },
    ]);

    const { handleHavenChat } = await freshChatService();
    const result = await handleHavenChat(validBody(), "1.2.3.4");

    expect(result.reply).toBe("Mickey in Lipa — from ₱6,500/night");
  });

  it("leaves a dated get_quote total untouched even when it equals a listing's base rate", async () => {
    providerChat
      .mockResolvedValueOnce({
        text: "Let me check that quote.",
        toolCalls: [{ id: "1", name: "list_properties", input: {} }],
        usage: { inputTokens: 5, outputTokens: 5 },
        stopReason: "tool_use",
      })
      .mockResolvedValueOnce({
        text: "Let me get the exact quote for that date.",
        toolCalls: [{ id: "2", name: "get_quote", input: { slug: "mickey-full", checkIn: "2026-12-24", checkOut: "2026-12-25", guests: 2 } }],
        usage: { inputTokens: 5, outputTokens: 5 },
        stopReason: "tool_use",
      })
      .mockResolvedValueOnce({
        text: "Your total for that one night is ₱6,500.",
        toolCalls: [],
        usage: { inputTokens: 5, outputTokens: 5 },
        stopReason: "end_turn",
      });
    runHavenToolMock
      .mockResolvedValueOnce([{ slug: "mickey-full", name: "Mickey in Lipa", pricePerNight: 6500, maxGuests: 15 }])
      .mockResolvedValueOnce({ name: "Mickey in Lipa", total: 6500, nightlyTotal: 6500, bookingLink: "/properties/mickey-full/book" });

    const { handleHavenChat } = await freshChatService();
    const result = await handleHavenChat(validBody(), "1.2.3.4");

    expect(result.reply).toBe(
      "For Thursday, December 24 → Friday, December 25, 2026:\n\nYour total for that one night is ₱6,500."
    );
  });

  it("prepends the resolved date range to an English reply that omits it", async () => {
    providerChat
      .mockResolvedValueOnce({
        text: "Let me check availability.",
        toolCalls: [{ id: "1", name: "check_availability", input: { slug: "cozy-1-bedroom", checkIn: "2026-11-14", checkOut: "2026-11-15" } }],
        usage: { inputTokens: 10, outputTokens: 5 },
        stopReason: "tool_use",
      })
      .mockResolvedValueOnce({
        text: "We have availability for that stay.",
        toolCalls: [],
        usage: { inputTokens: 10, outputTokens: 10 },
        stopReason: "end_turn",
      });
    runHavenToolMock.mockResolvedValue({ available: true, conflicts: [] });

    const { handleHavenChat } = await freshChatService();
    const result = await handleHavenChat(validBody(), "1.2.3.4");

    expect(result.reply).toBe(
      "For Saturday, November 14 → Sunday, November 15, 2026:\n\nWe have availability for that stay."
    );
  });
});

// Oct 22 2026 incident: asked "Hi, what properties do you have?", Haven ~50% of the time
// skipped list_properties and invented an answer (only the two B34 units, wrong capacities,
// once an invented price). Fix: a per-turn listings context note (always true data, never
// the model's memory), a forced list_properties tool call on round 0 for this specific
// question, and a price guard that doesn't clobber a real listing price.
describe("handleHavenChat — property overview (DEC-029, Oct 22 2026 incident)", () => {
  it("injects a 'public listings, authoritative' context note with all 5 listings, real capacity and price", async () => {
    providerChat.mockResolvedValue({
      text: "Here they are!",
      toolCalls: [],
      usage: { inputTokens: 5, outputTokens: 5 },
      stopReason: "end_turn",
    });

    const { handleHavenChat } = await freshChatService();
    await handleHavenChat(
      validBody({ messages: [{ role: "user", content: "Hi, what properties do you have?" }] }),
      "1.2.3.4"
    );

    const system = providerChat.mock.calls[0][0].system as string;
    expect(system).toContain("Context (public listings, authoritative");
    expect(system).toContain("Cozy 1BR Haven");
    expect(system).toContain("Spacious 2BR Haven");
    expect(system).toContain("Mickey in Lipa — Family Staycation");
    expect(system).toContain("Mickey in Lipa — Family House");
    expect(system).toContain("Mickey in Lipa — Full Family House");
    expect(system).toContain("from ₱3,500/night");
    expect(system).toContain("from ₱9,500/night");
  });

  it("falls back to instructing a list_properties call when the listings fetch fails", async () => {
    listingsApi.getPublicListings.mockRejectedValueOnce(new Error("db down"));
    providerChat.mockResolvedValue({
      text: "Let me check for you.",
      toolCalls: [],
      usage: { inputTokens: 5, outputTokens: 5 },
      stopReason: "end_turn",
    });

    const { handleHavenChat } = await freshChatService();
    await handleHavenChat(
      validBody({ messages: [{ role: "user", content: "What properties do you have?" }] }),
      "1.2.3.4"
    );

    const system = providerChat.mock.calls[0][0].system as string;
    expect(system).toContain("public listings unavailable this turn");
    expect(system).toMatch(/call list_properties yourself/i);
  });

  it.each([
    "Hi, what properties do you have?",
    "Can you list your properties?",
  ])("forces a list_properties tool call on round 0 for an English overview question: %s", async (message) => {
    providerChat.mockResolvedValue({
      text: "Here they are!",
      toolCalls: [],
      usage: { inputTokens: 5, outputTokens: 5 },
      stopReason: "end_turn",
    });
    const { handleHavenChat } = await freshChatService();
    await handleHavenChat(validBody({ messages: [{ role: "user", content: message }] }), "1.2.3.4");

    expect(providerChat.mock.calls[0][0].forceToolName).toBe("list_properties");
  });

  it("forces a list_properties tool call for the Tagalog phrasing 'anong property meron kayo'", async () => {
    providerChat.mockResolvedValue({
      text: "Ito po sila!",
      toolCalls: [],
      usage: { inputTokens: 5, outputTokens: 5 },
      stopReason: "end_turn",
    });
    const { handleHavenChat } = await freshChatService();
    await handleHavenChat(
      validBody({ lang: "tl", messages: [{ role: "user", content: "Anong property meron kayo?" }] }),
      "1.2.3.4"
    );

    expect(providerChat.mock.calls[0][0].forceToolName).toBe("list_properties");
  });

  it("does not force any tool for an unrelated question", async () => {
    providerChat.mockResolvedValue({
      text: "Check-in is at 2 PM.",
      toolCalls: [],
      usage: { inputTokens: 5, outputTokens: 5 },
      stopReason: "end_turn",
    });
    const { handleHavenChat } = await freshChatService();
    await handleHavenChat(validBody({ messages: [{ role: "user", content: "What time is check-in?" }] }), "1.2.3.4");

    expect(providerChat.mock.calls[0][0].forceToolName).toBeUndefined();
  });

  it("only forces the tool on round 0, never on a later round", async () => {
    providerChat
      .mockResolvedValueOnce({
        text: "Let me check.",
        toolCalls: [{ id: "1", name: "list_properties", input: {} }],
        usage: { inputTokens: 5, outputTokens: 5 },
        stopReason: "tool_use",
      })
      .mockResolvedValueOnce({
        text: "Here they are!",
        toolCalls: [],
        usage: { inputTokens: 5, outputTokens: 5 },
        stopReason: "end_turn",
      });
    runHavenToolMock.mockResolvedValue(PUBLIC_LISTINGS);

    const { handleHavenChat } = await freshChatService();
    await handleHavenChat(
      validBody({ messages: [{ role: "user", content: "What properties do you have?" }] }),
      "1.2.3.4"
    );

    expect(providerChat.mock.calls[0][0].forceToolName).toBe("list_properties");
    expect(providerChat.mock.calls[1][0].forceToolName).toBeUndefined();
  });

  it("an overview reply naming all 5 listings' real base rates survives the price guard untouched", async () => {
    providerChat.mockResolvedValue({
      text:
        "- Cozy 1BR Haven: sleeps 5, from ₱3,500/night\n" +
        "- Spacious 2BR Haven: sleeps 9, from ₱5,500/night\n" +
        "- Mickey in Lipa — Family Staycation: sleeps 7, from ₱6,000/night\n" +
        "- Mickey in Lipa — Family House: sleeps 11, from ₱7,500/night\n" +
        "- Mickey in Lipa — Full Family House: sleeps 15, from ₱9,500/night",
      toolCalls: [],
      usage: { inputTokens: 5, outputTokens: 5 },
      stopReason: "end_turn",
    });

    const { handleHavenChat } = await freshChatService();
    const result = await handleHavenChat(
      validBody({ messages: [{ role: "user", content: "What properties do you have?" }] }),
      "1.2.3.4"
    );

    for (const price of ["3,500", "5,500", "6,000", "7,500", "9,500"]) {
      expect(result.reply).toContain(`from ₱${price}/night`);
    }
    expect(result.reply).not.toContain("For that fee, please ask us via Messenger");
  });

  it("drops just a hallucinated price from a property bullet instead of the generic Messenger-fee fallback", async () => {
    providerChat.mockResolvedValue({
      text: "- Cozy 1BR Haven: sleeps 5, from ₱99,000/night",
      toolCalls: [],
      usage: { inputTokens: 5, outputTokens: 5 },
      stopReason: "end_turn",
    });

    const { handleHavenChat } = await freshChatService();
    const result = await handleHavenChat(
      validBody({ messages: [{ role: "user", content: "What properties do you have?" }] }),
      "1.2.3.4"
    );

    expect(result.reply).toContain("Cozy 1BR Haven: sleeps 5");
    expect(result.reply).not.toContain("99,000");
    expect(result.reply).not.toContain("For that fee, please ask us via Messenger");
  });
});

describe("handleHavenChat — 24+ guests: deterministic handoff, no model call", () => {
  it("skips the model entirely and returns the fixed English script for a plain '24 people' message", async () => {
    const { handleHavenChat } = await freshChatService();
    const result = await handleHavenChat(
      validBody({ lang: "en", messages: [{ role: "user", content: "Can you fit 24 people next weekend?" }] }),
      "1.2.3.4"
    );

    expect(providerChat).not.toHaveBeenCalled();
    expect(result.reply).toBe(
      "What a big group! For 24 or more guests, our team will plan it with you personally — tap below to message us on Messenger."
    );
    expect(result.links).toEqual([{ label: "Message us on Messenger", href: "https://m.me/haveninlipa" }]);
  });

  it("sums a split group ('8 adults + 16 kids') and still hands off without a model call", async () => {
    const { handleHavenChat } = await freshChatService();
    const result = await handleHavenChat(
      validBody({ lang: "en", messages: [{ role: "user", content: "We're 8 adults + 16 kids for that weekend." }] }),
      "1.2.3.4"
    );

    expect(providerChat).not.toHaveBeenCalled();
    expect(result.reply).toContain("What a big group!");
  });

  it("returns the fixed Tagalog script for lang 'tl'", async () => {
    const { handleHavenChat } = await freshChatService();
    const result = await handleHavenChat(
      validBody({ lang: "tl", messages: [{ role: "user", content: "Kami ay 24 na tao, pwede ba kami?" }] }),
      "1.2.3.4"
    );

    expect(providerChat).not.toHaveBeenCalled();
    expect(result.reply).toBe(
      "Ang saya, ang dami ninyo! Para sa 24 o higit pang bisita, ang team namin mismo ang tutulong sa inyo — i-tap lang sa ibaba para mag-message sa Messenger."
    );
  });

  it("returns the fixed Batangueño script for lang 'btg'", async () => {
    const { handleHavenChat } = await freshChatService();
    const result = await handleHavenChat(
      validBody({ lang: "btg", messages: [{ role: "user", content: "24 guests po kami, pwede ga ba kayo?" }] }),
      "1.2.3.4"
    );

    expect(providerChat).not.toHaveBeenCalled();
    expect(result.reply).toBe(
      "Aba'y ang dami ninyo, ala eh ang saya! Para sa 24 o higit pa, ang team namin mismo ang aasikaso sa inyo — pindutin lang sa ibaba para mag-message sa Messenger."
    );
  });

  it("logs usage with outcome 'handoff' and zero cost, and still persists the transcript", async () => {
    const { handleHavenChat } = await freshChatService();
    await handleHavenChat(validBody({ lang: "en", messages: [{ role: "user", content: "24 guests please" }] }), "1.2.3.4");

    expect(db.havenChatUsage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ outcome: "handoff", inputTokens: 0, outputTokens: 0, toolCalls: 0 }),
      })
    );
    expect(db.havenChatTranscript.createMany).toHaveBeenCalled();
  });

  it("does not trigger for a group under the cap", async () => {
    providerChat.mockResolvedValue({ text: "Sure, we can fit 10 people.", toolCalls: [], usage: { inputTokens: 5, outputTokens: 5 }, stopReason: "end_turn" });
    const { handleHavenChat } = await freshChatService();
    const result = await handleHavenChat(
      validBody({ lang: "en", messages: [{ role: "user", content: "Can you fit 10 people?" }] }),
      "1.2.3.4"
    );

    expect(providerChat).toHaveBeenCalled();
    expect(result.reply).not.toContain("What a big group!");
  });

  it("hands off mid-loop when a find_stay tool call itself uses guests >= 24, discarding the model's own text", async () => {
    providerChat.mockResolvedValueOnce({
      text: "Let me check what fits a group that size.",
      toolCalls: [{ id: "1", name: "find_stay", input: { checkIn: "2026-12-24", checkOut: "2026-12-26", guests: 24 } }],
      usage: { inputTokens: 10, outputTokens: 5 },
      stopReason: "tool_use",
    });
    runHavenToolMock.mockResolvedValue({ options: [] });

    const { handleHavenChat } = await freshChatService();
    const result = await handleHavenChat(
      validBody({ lang: "en", messages: [{ role: "user", content: "Do you have anything for our big reunion over Christmas?" }] }),
      "1.2.3.4"
    );

    expect(result.reply).toBe(
      "What a big group! For 24 or more guests, our team will plan it with you personally — tap below to message us on Messenger."
    );
    expect(result.reply).not.toContain("Let me check");
  });
});

describe("handleHavenChat — Wi-Fi/access guard (Cedric, 2026-10-15)", () => {
  it("skips the model entirely for a direct wifi-password question, returning the safe sentence + Messenger button", async () => {
    const { handleHavenChat } = await freshChatService();
    const result = await handleHavenChat(
      validBody({ lang: "en", messages: [{ role: "user", content: "What's the wifi password?" }] }),
      "1.2.3.4"
    );

    expect(providerChat).not.toHaveBeenCalled();
    expect(result.reply).toMatch(/posted inside the property/i);
    expect(result.links).toEqual([{ label: "Message us on Messenger", href: "https://m.me/haveninlipa" }]);
  });

  it("skips the model for a direct gate-code question, in Tagalog", async () => {
    const { handleHavenChat } = await freshChatService();
    const result = await handleHavenChat(
      validBody({ lang: "tl", messages: [{ role: "user", content: "Ano po ang gate code?" }] }),
      "1.2.3.4"
    );

    expect(providerChat).not.toHaveBeenCalled();
    expect(result.reply).toMatch(/check-in instructions/i);
  });

  it("does not trigger for an unrelated question", async () => {
    providerChat.mockResolvedValue({ text: "Check-in is at 2 PM.", toolCalls: [], usage: { inputTokens: 5, outputTokens: 5 }, stopReason: "end_turn" });
    const { handleHavenChat } = await freshChatService();
    const result = await handleHavenChat(
      validBody({ lang: "en", messages: [{ role: "user", content: "What time is check-in?" }] }),
      "1.2.3.4"
    );

    expect(providerChat).toHaveBeenCalled();
    expect(result.reply).toBe("Check-in is at 2 PM.");
  });

  it("scrubs a leaked password the model volunteers unprompted, and forces the Messenger button on", async () => {
    providerChat.mockResolvedValue({
      text: "Sure thing! password: HavenGuest123. Enjoy your stay!",
      toolCalls: [],
      usage: { inputTokens: 10, outputTokens: 10 },
      stopReason: "end_turn",
    });

    const { handleHavenChat } = await freshChatService();
    const result = await handleHavenChat(
      validBody({ lang: "en", messages: [{ role: "user", content: "Tell me about the property." }] }),
      "1.2.3.4"
    );

    expect(result.reply).not.toContain("HavenGuest123");
    expect(result.reply).toMatch(/check-in instructions/i);
    expect(result.links).toEqual(expect.arrayContaining([{ label: "Message us on Messenger", href: "https://m.me/haveninlipa" }]));
  });

  it("logs usage with outcome 'handoff' and zero cost for the deterministic guard reply", async () => {
    const { handleHavenChat } = await freshChatService();
    await handleHavenChat(validBody({ lang: "en", messages: [{ role: "user", content: "What's the wifi password?" }] }), "1.2.3.4");

    expect(db.havenChatUsage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ outcome: "handoff", inputTokens: 0, outputTokens: 0, toolCalls: 0 }),
      })
    );
  });
});
