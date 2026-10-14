import "server-only";

/**
 * Haven AI feature flags and config. Everything here is read once per request —
 * no caching needed at this volume. All env vars are server-only; nothing here is
 * NEXT_PUBLIC. See DEC-029 and docs/HIL_PROJECT_STATUS.md.
 */

/** Anything other than exactly "true" is OFF — unset, "false", "1", typo, all OFF. */
export const HAVEN_AI_ENABLED = process.env.HAVEN_AI_ENABLED === "true";

/** Kill switch: forces static mode even when HAVEN_AI_ENABLED is "true". */
export const HAVEN_AI_KILLED = process.env.HAVEN_AI_KILL === "true";

/** The one check every caller should make before doing any AI-mode work. */
export function havenAiActive(): boolean {
  return HAVEN_AI_ENABLED && !HAVEN_AI_KILLED;
}

export type HavenAiProvider = "anthropic" | "openai";

export const HAVEN_AI_PROVIDER: HavenAiProvider =
  process.env.HAVEN_AI_PROVIDER === "openai" ? "openai" : "anthropic";

/**
 * Model ids. Default is a current Claude Haiku model — see DEC-029 for why Haiku:
 * cheap enough that a 20/day free-chat feature doesn't need per-message throttling
 * beyond the rate limits below. `claude-haiku-4-5-20251001` is Haiku 4.5's exact
 * model id as resolved for this build; override via HAVEN_AI_MODEL if Anthropic
 * retires it.
 */
const DEFAULT_MODEL: Record<HavenAiProvider, string> = {
  anthropic: "claude-haiku-4-5-20251001",
  openai: "gpt-4o-mini",
};

export const HAVEN_AI_MODEL = process.env.HAVEN_AI_MODEL || DEFAULT_MODEL[HAVEN_AI_PROVIDER];

/**
 * USD per million tokens, input/output. Anthropic Haiku 4.5 pricing confirmed via the
 * claude-api skill (cached 2026-06-24): $1.00 / $5.00 per MTok. OpenAI gpt-4o-mini figures
 * are its long-published list price ($0.15 / $0.60 per MTok) — re-confirm against
 * platform.openai.com/pricing before relying on this for a different OpenAI model.
 * Unknown model falls back to the Haiku rate (fails cost-safe: that's the only model
 * this feature ships enabled for by default).
 */
const PRICE_PER_MILLION_USD: Record<string, { input: number; output: number }> = {
  "claude-haiku-4-5-20251001": { input: 1.0, output: 5.0 },
  "claude-haiku-4-5": { input: 1.0, output: 5.0 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
};

export function costUsd(model: string, inputTokens: number, outputTokens: number): number {
  const price = PRICE_PER_MILLION_USD[model] ?? PRICE_PER_MILLION_USD["claude-haiku-4-5-20251001"];
  return (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
}

export const HAVEN_AI_MONTHLY_CAP_USD = Number(process.env.HAVEN_AI_MONTHLY_CAP_USD) || 20;

/** Salt for hashing guest IPs before they ever reach the database. */
export const HAVEN_IP_SALT = process.env.HAVEN_IP_SALT || "";

export const HAVEN_AI_ADMIN_ALERT_TO = "customerservice@haveninlipa.com";

// ── Request-shape limits (HIL_DECISIONS.md / this PR's own hard rules) ─────
export const MAX_MESSAGES = 12;
export const MAX_MESSAGE_CHARS = 600;
export const MAX_TOOL_ROUNDS = 5;
export const MAX_OUTPUT_TOKENS = 500;
export const REQUEST_TIMEOUT_MS = 20_000;

// ── Durable rate limits (per ipHash, and globally) ──────────────────────────
export const RATE_LIMIT_PER_IP_PER_10MIN = 20;
export const RATE_LIMIT_PER_IP_PER_DAY = 100;
export const RATE_LIMIT_GLOBAL_PER_HOUR = 600;
