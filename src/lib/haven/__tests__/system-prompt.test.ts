import { describe, expect, it } from "vitest";
import { buildHavenSystemPrompt } from "../system-prompt";

describe("buildHavenSystemPrompt", () => {
  it("always offers the https Messenger handoff link, never the scheme-less form alone", () => {
    const prompt = buildHavenSystemPrompt("en");
    expect(prompt).toContain("https://m.me/haveninlipa");
  });

  describe("btg mode", () => {
    const prompt = buildHavenSystemPrompt("btg");

    it("documents each Batangueño marker with its correct usage note", () => {
      expect(prompt).toMatch(/ala eh.*(?:filler|exclamation)/i);
      expect(prompt).toMatch(/aba'y.*(?:why|well then)/i);
      expect(prompt).toMatch(/\bga\b.*question particle/i);
      expect(prompt).toMatch(/\bnga\b.*(?:emphasis|request)/i);
      expect(prompt).toMatch(/(?:ari|are).*this\/here/i);
    });

    it("includes a placeholder-only few-shot block with no digit prices or exact calendar dates", () => {
      expect(prompt).toMatch(/placeholder/i);
      expect(prompt).not.toMatch(/₱\d/);
    });
  });
});
