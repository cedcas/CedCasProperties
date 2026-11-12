/**
 * Arrival greeting pop-up copy (haven-chat-usage-2026-11-09.md fix #2). English by default;
 * Tagalog only when the guest's own previously-chosen Haven language (persisted in the
 * `haven-chat` sessionStorage blob ChatWidget.tsx already writes) is "tl" or "btg" — there
 * is no site-wide language toggle outside the chat widget itself, so that stored chat
 * preference is the only "chosen language" signal that exists.
 *
 * Plain, simple wording per hil-pm-handoff-2026-10-27.md's locked voice rules: no deep/
 * literary Tagalog, "ninyo" (polite plural), no Wi-Fi/door-code/system mentions, no Airbnb.
 */
export const HAVEN_GREETING_TEXT = {
  en: "Hi, I'm Haven! Ask me about dates, pricing, or our listings in Lipa.",
  tl: "Kumusta! Ako si Haven — tanungin ninyo ako tungkol sa petsa, bayad, o sa mga listing namin dito sa Lipa.",
} as const;

export type HavenGreetingLang = keyof typeof HAVEN_GREETING_TEXT;

/** `"tl"`/`"btg"` → the Tagalog greeting; anything else (`"en"`, `"auto"`, unset) → English. */
export function resolveGreetingLang(storedChatLang: string | null | undefined): HavenGreetingLang {
  return storedChatLang === "tl" || storedChatLang === "btg" ? "tl" : "en";
}

export function havenGreetingText(storedChatLang: string | null | undefined): string {
  return HAVEN_GREETING_TEXT[resolveGreetingLang(storedChatLang)];
}
