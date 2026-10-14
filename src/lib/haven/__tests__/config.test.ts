import { describe, it, expect, afterEach, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.resetModules();
});

async function freshConfig() {
  vi.resetModules();
  return import("../config");
}

describe("flag resolution", () => {
  it("HAVEN_AI_ENABLED is false for anything other than exactly 'true'", async () => {
    for (const value of [undefined, "false", "1", "TRUE", "yes"]) {
      if (value === undefined) delete process.env.HAVEN_AI_ENABLED;
      else process.env.HAVEN_AI_ENABLED = value;
      const config = await freshConfig();
      expect(config.HAVEN_AI_ENABLED).toBe(false);
      expect(config.havenAiActive()).toBe(false);
    }
  });

  it("is active only when enabled and not killed", async () => {
    process.env.HAVEN_AI_ENABLED = "true";
    delete process.env.HAVEN_AI_KILL;
    expect((await freshConfig()).havenAiActive()).toBe(true);
  });

  it("the kill switch overrides an enabled flag", async () => {
    process.env.HAVEN_AI_ENABLED = "true";
    process.env.HAVEN_AI_KILL = "true";
    expect((await freshConfig()).havenAiActive()).toBe(false);
  });
});

describe("provider swap", () => {
  it("defaults to anthropic and its Haiku model", async () => {
    delete process.env.HAVEN_AI_PROVIDER;
    delete process.env.HAVEN_AI_MODEL;
    const config = await freshConfig();
    expect(config.HAVEN_AI_PROVIDER).toBe("anthropic");
    expect(config.HAVEN_AI_MODEL).toBe("claude-haiku-4-5-20251001");
  });

  it("switches to openai and its default model via HAVEN_AI_PROVIDER", async () => {
    process.env.HAVEN_AI_PROVIDER = "openai";
    delete process.env.HAVEN_AI_MODEL;
    const config = await freshConfig();
    expect(config.HAVEN_AI_PROVIDER).toBe("openai");
    expect(config.HAVEN_AI_MODEL).toBe("gpt-4o-mini");
  });

  it("an explicit HAVEN_AI_MODEL overrides the provider's default", async () => {
    process.env.HAVEN_AI_PROVIDER = "anthropic";
    process.env.HAVEN_AI_MODEL = "claude-haiku-4-5";
    const config = await freshConfig();
    expect(config.HAVEN_AI_MODEL).toBe("claude-haiku-4-5");
  });

  it("any value other than 'openai' stays on anthropic", async () => {
    process.env.HAVEN_AI_PROVIDER = "some-typo";
    const config = await freshConfig();
    expect(config.HAVEN_AI_PROVIDER).toBe("anthropic");
  });
});

describe("costUsd", () => {
  it("prices Haiku 4.5 at $1/$5 per MTok", async () => {
    const config = await freshConfig();
    expect(config.costUsd("claude-haiku-4-5-20251001", 1_000_000, 1_000_000)).toBeCloseTo(6.0, 5);
  });

  it("falls back to the Haiku rate for an unrecognized model (fails cost-safe)", async () => {
    const config = await freshConfig();
    expect(config.costUsd("some-unknown-model", 1_000_000, 0)).toBeCloseTo(1.0, 5);
  });
});

describe("HAVEN_AI_MONTHLY_CAP_USD", () => {
  it("defaults to 20", async () => {
    delete process.env.HAVEN_AI_MONTHLY_CAP_USD;
    const config = await freshConfig();
    expect(config.HAVEN_AI_MONTHLY_CAP_USD).toBe(20);
  });

  it("reads an override from the environment", async () => {
    process.env.HAVEN_AI_MONTHLY_CAP_USD = "50";
    const config = await freshConfig();
    expect(config.HAVEN_AI_MONTHLY_CAP_USD).toBe(50);
  });
});
