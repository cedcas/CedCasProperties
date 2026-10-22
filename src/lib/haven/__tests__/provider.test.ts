import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getChatProvider } from "../provider";

describe("getChatProvider", () => {
  it("returns a distinctly-named provider for each supported name", () => {
    expect(getChatProvider("anthropic").name).toBe("anthropic");
    expect(getChatProvider("openai").name).toBe("openai");
  });
});

describe("AnthropicProvider.chat", () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.ANTHROPIC_API_KEY = originalKey;
  });

  it("sends the api key as a header, never as a query param or body field a client could see", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: "text", text: "hello" }],
        stop_reason: "end_turn",
        usage: { input_tokens: 10, output_tokens: 5 },
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const provider = getChatProvider("anthropic");
    const result = await provider.chat({ system: "sys", messages: [{ role: "user", content: "hi" }], tools: [], maxTokens: 100 });

    expect(result).toEqual({
      text: "hello",
      toolCalls: [],
      usage: { inputTokens: 10, outputTokens: 5 },
      stopReason: "end_turn",
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    const headers = init.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("test-key");
    expect(JSON.stringify(init.body)).not.toContain("test-key");
  });

  it("parses a tool_use response into toolCalls with stopReason tool_use", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [
          { type: "text", text: "Let me check." },
          { type: "tool_use", id: "call_1", name: "check_availability", input: { slug: "cozy-1-bedroom" } },
        ],
        stop_reason: "tool_use",
        usage: { input_tokens: 20, output_tokens: 8 },
      }),
    }) as unknown as typeof fetch;

    const provider = getChatProvider("anthropic");
    const result = await provider.chat({ system: "sys", messages: [], tools: [], maxTokens: 100 });

    expect(result.stopReason).toBe("tool_use");
    expect(result.toolCalls).toEqual([{ id: "call_1", name: "check_availability", input: { slug: "cozy-1-bedroom" } }]);
  });

  // DEC-029 overview-question fix (Oct 22 2026): forces a specific tool on round 0 for a
  // property-overview question so the model can never skip list_properties.
  it("sends an explicit tool_choice naming the forced tool when forceToolName is set", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: "tool_use", id: "call_1", name: "list_properties", input: {} }],
        stop_reason: "tool_use",
        usage: { input_tokens: 10, output_tokens: 5 },
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const provider = getChatProvider("anthropic");
    await provider.chat({
      system: "sys",
      messages: [{ role: "user", content: "what properties do you have?" }],
      tools: [],
      maxTokens: 100,
      forceToolName: "list_properties",
    });

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body.tool_choice).toEqual({ type: "tool", name: "list_properties" });
  });

  it("omits tool_choice entirely when forceToolName is not set", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: "text", text: "hi" }],
        stop_reason: "end_turn",
        usage: { input_tokens: 10, output_tokens: 5 },
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const provider = getChatProvider("anthropic");
    await provider.chat({ system: "sys", messages: [], tools: [], maxTokens: 100 });

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body.tool_choice).toBeUndefined();
  });

  it("throws when ANTHROPIC_API_KEY is not configured", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const provider = getChatProvider("anthropic");
    await expect(provider.chat({ system: "s", messages: [], tools: [], maxTokens: 10 })).rejects.toThrow(
      /ANTHROPIC_API_KEY/
    );
  });

  it("throws on a non-OK HTTP response", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => "boom" }) as unknown as typeof fetch;
    const provider = getChatProvider("anthropic");
    await expect(provider.chat({ system: "s", messages: [], tools: [], maxTokens: 10 })).rejects.toThrow();
  });
});

describe("OpenAiProvider.chat", () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = "test-openai-key";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.OPENAI_API_KEY = originalKey;
  });

  it("parses tool_calls into the generic ToolCall shape", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                { id: "call_1", type: "function", function: { name: "get_quote", arguments: '{"slug":"cozy-1-bedroom"}' } },
              ],
            },
            finish_reason: "tool_calls",
          },
        ],
        usage: { prompt_tokens: 15, completion_tokens: 6 },
      }),
    }) as unknown as typeof fetch;

    const provider = getChatProvider("openai");
    const result = await provider.chat({ system: "sys", messages: [], tools: [], maxTokens: 100 });

    expect(result.stopReason).toBe("tool_use");
    expect(result.toolCalls).toEqual([{ id: "call_1", name: "get_quote", input: { slug: "cozy-1-bedroom" } }]);
    expect(result.usage).toEqual({ inputTokens: 15, outputTokens: 6 });
  });

  it("sends an explicit function tool_choice when forceToolName is set, and 'auto' otherwise", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "hi" }, finish_reason: "stop" }],
        usage: { prompt_tokens: 5, completion_tokens: 2 },
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const provider = getChatProvider("openai");
    await provider.chat({ system: "sys", messages: [], tools: [], maxTokens: 100, forceToolName: "list_properties" });
    let body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.tool_choice).toEqual({ type: "function", function: { name: "list_properties" } });

    await provider.chat({ system: "sys", messages: [], tools: [], maxTokens: 100 });
    body = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(body.tool_choice).toBe("auto");
  });

  it("maps finish_reason 'stop' to end_turn", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "hi there" }, finish_reason: "stop" }],
        usage: { prompt_tokens: 5, completion_tokens: 2 },
      }),
    }) as unknown as typeof fetch;

    const provider = getChatProvider("openai");
    const result = await provider.chat({ system: "sys", messages: [], tools: [], maxTokens: 100 });
    expect(result.stopReason).toBe("end_turn");
    expect(result.text).toBe("hi there");
  });
});
