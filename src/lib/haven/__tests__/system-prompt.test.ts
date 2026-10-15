import { describe, expect, it } from "vitest";
import { buildHavenSystemPrompt } from "../system-prompt";

describe("buildHavenSystemPrompt", () => {
  it("always offers the https Messenger handoff link, never the scheme-less form alone", () => {
    const prompt = buildHavenSystemPrompt("en");
    expect(prompt).toContain("https://m.me/haveninlipa");
  });

  describe("terms of address", () => {
    const prompt = buildHavenSystemPrompt("en");

    it("bans partner/pare/bro/sis/dude unless the guest used the word first", () => {
      expect(prompt).toMatch(/"partner".*"pare".*"bro".*"sis".*"dude"/);
      expect(prompt).toMatch(/guest used that exact word first/i);
    });

    it("gates parekoy/marekoy on a clear gender cue, with a gendered-name and a neutral-name example", () => {
      expect(prompt).toMatch(/parekoy.*male/i);
      expect(prompt).toMatch(/marekoy.*female/i);
      expect(prompt).toMatch(/clear gender cue/i);
      expect(prompt).toContain("Ako si Maria");
      expect(prompt).toContain("marekoy");
      expect(prompt).toContain("Ako si Juan");
      expect(prompt).toContain("Ako si Toni");
      expect(prompt).toMatch(/unisex or ambiguous name/i);
    });

    it("documents the neutral default terms", () => {
      expect(prompt).toContain("kabayan");
      expect(prompt).toContain("kaibigan");
      expect(prompt).toContain("ka-Haven");
    });
  });

  describe("pricing arithmetic ban", () => {
    const prompt = buildHavenSystemPrompt("en");

    it("forbids multiplying or summing a nightly rate itself", () => {
      expect(prompt).toMatch(/never multiply, sum, or otherwise do arithmetic/i);
      expect(prompt).toMatch(/nights? ×.*nightly rate|nights.*rate/i);
    });

    it("says pricePerNight may only be stated as a 'from' figure, never multiplied", () => {
      expect(prompt).toMatch(/from ₱X\/night/);
    });

    it("says the only total allowed is the one get_quote/find_stay returned this turn", () => {
      expect(prompt).toMatch(/get_quote or find_stay returned THIS turn/);
    });
  });

  describe("early check-in/late checkout fee", () => {
    const prompt = buildHavenSystemPrompt("en");

    it("forbids computing a total for a specific number of hours, stating only the flat rate", () => {
      expect(prompt).toMatch(/never compute a total peso amount for a specific number of hours/i);
      expect(prompt).toMatch(/always state the flat ₱200\/hour rate/i);
    });
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

    it("documents 'ire' alongside ari/are, and 'baga' alongside ga", () => {
      expect(prompt).toMatch(/\bire\b/);
      expect(prompt).toMatch(/\bbaga\b/);
    });

    it("warns that 'ga'/'baga' are question-only, with the 'Oo ga' misuse example", () => {
      expect(prompt).toMatch(/question particle ONLY/i);
      expect(prompt).toContain("Oo ga, may bakante");
      expect(prompt).toContain("Aba'y oo, may bakante!");
    });

    it("documents the vetted Batangueño and Filipino courtesy expression list", () => {
      expect(prompt).toContain("kapeng barako");
      expect(prompt).toContain("Tuloy po kayo");
      expect(prompt).toContain("Mabuhay");
      expect(prompt).toMatch(/at most 1–2 per reply/);
      expect(prompt).toMatch(/never profanity/i);
    });

    it("includes a placeholder-only few-shot block with no digit prices or exact calendar dates", () => {
      expect(prompt).toMatch(/placeholder/i);
      // Scoped to the few-shot block itself — the owner-approved facts that follow it in
      // the prompt legitimately state a real price (₱200/hour early check-in/late checkout).
      const fewshot = prompt.slice(prompt.indexOf("Example exchanges"), prompt.indexOf("Owner-approved facts"));
      expect(fewshot.length).toBeGreaterThan(0);
      expect(fewshot).not.toMatch(/₱\d/);
    });
  });
});
