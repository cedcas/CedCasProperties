import "server-only";

/**
 * Detects a property-overview question ("what properties do you have", "anong property
 * meron kayo") in English and Tagalog/Batangueño — the live bug (Oct 22 2026): Haven
 * sometimes answered this kind of question from memory instead of calling `list_properties`,
 * inventing only the two B34 units with wrong capacities. `chat-service.ts` uses this to
 * force a `list_properties` tool call on the first round (see `provider.ts`'s `forceToolName`)
 * whenever this fires, so the model can never skip the real data for this specific question.
 * Deliberately narrow (an overview/"what do you have" question only) — it must not fire for
 * a question about one specific property, which should resolve through the normal
 * property-resolver path instead.
 */
const OVERVIEW_RE = new RegExp(
  [
    // English: "what properties/listings/rentals/houses/units do you have", "list your properties",
    // "how many properties".
    String.raw`\bwhat\s+propert(?:y|ies)\b`,
    String.raw`\blist\s+(?:your|the)\s+propert(?:y|ies)\b`,
    String.raw`\bwhat\s+(?:listings?|rentals?|accommodations?|houses?|units?)\s+do\s+you\s+have\b`,
    String.raw`\bhow\s+many\s+propert(?:y|ies)\b`,
    // Tagalog/Batangueño: "anong property/properties (meron kayo)", "ano (mga) bahay ninyo",
    // "ilang bahay/property meron kayo".
    String.raw`\bano(?:ng)?\s+(?:ang\s+)?(?:mga\s+)?propert(?:y|ies)\b`,
    String.raw`\bano(?:ng)?\s+(?:ang\s+)?(?:mga\s+)?bahay\b`,
    String.raw`\bilang\s+(?:bahay|propert(?:y|ies))\b`,
  ].join("|"),
  "i"
);

export function isPropertyOverviewMessage(message: string): boolean {
  return OVERVIEW_RE.test(message);
}
