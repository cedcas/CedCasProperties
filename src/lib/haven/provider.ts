import "server-only";
import { HAVEN_AI_MODEL, HAVEN_AI_PROVIDER, REQUEST_TIMEOUT_MS, type HavenAiProvider } from "./config";

/**
 * Provider-agnostic chat adapter. `anthropic/provider.ts` is kept thin on purpose: the
 * tool loop (how many rounds, which tool actually runs) lives in chat-service.ts, not here.
 * Raw `fetch` rather than either official SDK — one file to cover both wire formats, no
 * new SDK dependency for what is, at H0/H1 volume, a handful of request shapes.
 */

export interface ToolDefinition {
  name: string;
  description: string;
  /** JSON Schema (draft-07-ish) object — the shape both Anthropic and OpenAI accept. */
  inputSchema: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  input: unknown;
}

export type ProviderMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; toolCalls?: ToolCall[] }
  | { role: "tool"; toolCallId: string; name: string; content: string };

export interface ChatUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface ChatResult {
  text: string;
  toolCalls: ToolCall[];
  usage: ChatUsage;
  /** "tool_use" means the caller must execute toolCalls and call chat() again. */
  stopReason: "end_turn" | "tool_use" | "max_tokens" | "other";
}

export interface ChatRequest {
  system: string;
  messages: ProviderMessage[];
  tools: ToolDefinition[];
  maxTokens: number;
}

export interface ChatProvider {
  readonly name: HavenAiProvider;
  chat(req: ChatRequest): Promise<ChatResult>;
}

class ProviderError extends Error {}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ── Anthropic ────────────────────────────────────────────────────────────────

interface AnthropicContentBlock {
  type: "text" | "tool_use";
  text?: string;
  id?: string;
  name?: string;
  input?: unknown;
}

function toAnthropicMessages(messages: ProviderMessage[]): unknown[] {
  const out: Array<{ role: "user" | "assistant"; content: unknown }> = [];
  for (const m of messages) {
    if (m.role === "user") {
      out.push({ role: "user", content: m.content });
    } else if (m.role === "assistant") {
      const blocks: AnthropicContentBlock[] = [];
      if (m.content) blocks.push({ type: "text", text: m.content });
      for (const tc of m.toolCalls ?? []) {
        blocks.push({ type: "tool_use", id: tc.id, name: tc.name, input: tc.input });
      }
      out.push({ role: "assistant", content: blocks });
    } else {
      // Anthropic groups tool_result blocks into a single user message, but a series of
      // consecutive tool messages collapses fine as separate user messages too — the API
      // only requires tool_result to be the first content of a user turn, which a lone
      // tool_result block always satisfies.
      out.push({
        role: "user",
        content: [{ type: "tool_result", tool_use_id: m.toolCallId, content: m.content }],
      });
    }
  }
  return out;
}

class AnthropicProvider implements ChatProvider {
  readonly name = "anthropic" as const;

  async chat(req: ChatRequest): Promise<ChatResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new ProviderError("ANTHROPIC_API_KEY is not configured");

    const res = await fetchWithTimeout(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: HAVEN_AI_MODEL,
          max_tokens: req.maxTokens,
          system: req.system,
          messages: toAnthropicMessages(req.messages),
          tools: req.tools.map((t) => ({
            name: t.name,
            description: t.description,
            input_schema: t.inputSchema,
          })),
        }),
      },
      REQUEST_TIMEOUT_MS
    );

    if (!res.ok) {
      throw new ProviderError(`Anthropic API error ${res.status}: ${await res.text().catch(() => "")}`);
    }

    const data = (await res.json()) as {
      content: AnthropicContentBlock[];
      stop_reason: string;
      usage: { input_tokens: number; output_tokens: number };
    };

    const text = data.content
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("");
    const toolCalls: ToolCall[] = data.content
      .filter((b) => b.type === "tool_use")
      .map((b) => ({ id: b.id!, name: b.name!, input: b.input }));

    return {
      text,
      toolCalls,
      usage: { inputTokens: data.usage.input_tokens, outputTokens: data.usage.output_tokens },
      stopReason:
        data.stop_reason === "tool_use"
          ? "tool_use"
          : data.stop_reason === "max_tokens"
            ? "max_tokens"
            : data.stop_reason === "end_turn"
              ? "end_turn"
              : "other",
    };
  }
}

// ── OpenAI ───────────────────────────────────────────────────────────────────

interface OpenAiToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

function toOpenAiMessages(
  system: string,
  messages: ProviderMessage[]
): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [{ role: "system", content: system }];
  for (const m of messages) {
    if (m.role === "user") {
      out.push({ role: "user", content: m.content });
    } else if (m.role === "assistant") {
      const toolCalls: OpenAiToolCall[] | undefined = m.toolCalls?.length
        ? m.toolCalls.map((tc) => ({
            id: tc.id,
            type: "function",
            function: { name: tc.name, arguments: JSON.stringify(tc.input ?? {}) },
          }))
        : undefined;
      out.push({ role: "assistant", content: m.content || null, tool_calls: toolCalls });
    } else {
      out.push({ role: "tool", tool_call_id: m.toolCallId, content: m.content });
    }
  }
  return out;
}

class OpenAiProvider implements ChatProvider {
  readonly name = "openai" as const;

  async chat(req: ChatRequest): Promise<ChatResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new ProviderError("OPENAI_API_KEY is not configured");

    const res = await fetchWithTimeout(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: HAVEN_AI_MODEL,
          max_tokens: req.maxTokens,
          messages: toOpenAiMessages(req.system, req.messages),
          tools: req.tools.map((t) => ({
            type: "function",
            function: { name: t.name, description: t.description, parameters: t.inputSchema },
          })),
          tool_choice: "auto",
        }),
      },
      REQUEST_TIMEOUT_MS
    );

    if (!res.ok) {
      throw new ProviderError(`OpenAI API error ${res.status}: ${await res.text().catch(() => "")}`);
    }

    const data = (await res.json()) as {
      choices: Array<{
        message: { content: string | null; tool_calls?: OpenAiToolCall[] };
        finish_reason: string;
      }>;
      usage: { prompt_tokens: number; completion_tokens: number };
    };

    const choice = data.choices[0];
    const toolCalls: ToolCall[] = (choice.message.tool_calls ?? []).map((tc) => {
      let input: unknown = {};
      try {
        input = JSON.parse(tc.function.arguments);
      } catch {
        input = {};
      }
      return { id: tc.id, name: tc.function.name, input };
    });

    return {
      text: choice.message.content ?? "",
      toolCalls,
      usage: { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens },
      stopReason:
        choice.finish_reason === "tool_calls"
          ? "tool_use"
          : choice.finish_reason === "length"
            ? "max_tokens"
            : choice.finish_reason === "stop"
              ? "end_turn"
              : "other",
    };
  }
}

const PROVIDERS: Record<HavenAiProvider, ChatProvider> = {
  anthropic: new AnthropicProvider(),
  openai: new OpenAiProvider(),
};

export function getChatProvider(provider: HavenAiProvider = HAVEN_AI_PROVIDER): ChatProvider {
  return PROVIDERS[provider];
}
