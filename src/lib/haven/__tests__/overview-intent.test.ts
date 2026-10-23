import { describe, it, expect } from "vitest";
import { isPropertyOverviewMessage } from "../overview-intent";

/**
 * Oct 22 2026 incident: a plain "what properties do you have?" sometimes skipped
 * list_properties. `chat-service.ts` uses this detector to force the tool on round 0 —
 * see chat-service.test.ts for the end-to-end wiring.
 */
describe("isPropertyOverviewMessage", () => {
  it.each([
    "Hi, what properties do you have?",
    "What properties do you have?",
    "Can you list your properties?",
    "list the properties you have",
    "What houses do you have?",
    "What listings do you have available?",
    "How many properties do you have?",
  ])("matches English overview phrasing: %s", (message) => {
    expect(isPropertyOverviewMessage(message)).toBe(true);
  });

  it.each([
    "Anong property meron kayo?",
    "Anong properties meron kayo?",
    "Ano mga bahay ninyo?",
    "Ano ang mga bahay ninyo?",
    "Ilang bahay meron kayo?",
    "Ilang property meron kayo?",
  ])("matches Tagalog/Batangueño overview phrasing: %s", (message) => {
    expect(isPropertyOverviewMessage(message)).toBe(true);
  });

  it.each([
    "What time is check-in?",
    "Magkano ga ang Spacious 2BR?",
    "Do you have a swimming pool?",
    "Can I check in early at 9am?",
    "Mickey in lipa",
    "Kami ay 24 na tao sa ikalawang Sabado ng Nobyembre.",
  ])("does not match an unrelated question: %s", (message) => {
    expect(isPropertyOverviewMessage(message)).toBe(false);
  });
});
