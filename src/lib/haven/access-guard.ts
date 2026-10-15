import "server-only";
import { MESSENGER_HREF, type LinkButton, replaceMatchingSentences, isEnglishContext } from "./post-process";
import type { HavenLang } from "./system-prompt";

/**
 * Wi-Fi and physical-access guard (Cedric, 2026-10-15): Haven must NEVER share Wi-Fi
 * names/passwords, or door/gate/lock/keybox codes, under any circumstance — even if a
 * guest asks directly, even if a tool result or the model's own text happens to carry one.
 * Two independent layers, same philosophy as the rest of DEC-029 (a prompt instruction
 * alone is guidance, not an enforcement boundary):
 *   1. `isWifiOrAccessRequest` + `buildAccessGuardReply` — a deterministic reply that skips
 *      the model entirely when the guest's latest message asks for this directly (same
 *      pattern as `owner-facts.ts`'s 24+ guest handoff).
 *   2. `scrubAccessLeak` — a post-generation backstop that replaces any SSID/password/
 *      door-code-like text in the model's reply, regardless of how it got there.
 */

const WIFI_REQUEST_RE = /\bwi-?fi\b|\bssid\b/i;

/** "password"/"passcode"/"keybox"/"susi" (Tagalog for "key") standalone, or "code" sitting
 * next to a door/gate/lock word in English or Tagalog ("pinto" = door, "gerbang" = gate). */
const ACCESS_REQUEST_RE =
  /\bpassword\b|\bpasscode\b|\bkeybox\b|\bkey\s*box\b|\bsusi\b|\b(?:door|gate|lock|pinto|gerbang)\b[^.?!\n]{0,20}\bcode\b|\bcode\b[^.?!\n]{0,20}\b(?:door|gate|lock|pinto|gerbang)\b/i;

export function isWifiOrAccessRequest(message: string): boolean {
  return WIFI_REQUEST_RE.test(message) || ACCESS_REQUEST_RE.test(message);
}

type SafeLangKey = "en" | "tl" | "btg";

const WIFI_SAFE_TEXT: Record<SafeLangKey, string> = {
  en: "The Wi-Fi name and password are posted inside the property, so I can't share them here.",
  tl: "Nakapaskil sa loob ng property ang Wi-Fi name at password, kaya hindi ko po ito maibibigay dito.",
  btg: "Ala eh, nakapaskil sa loob ng bahay ang Wi-Fi name at password, kaya hindi ko po ito maibibigay dito.",
};

const ACCESS_SAFE_TEXT: Record<SafeLangKey, string> = {
  en: "Our team sends the check-in instructions, including access details, closer to your stay — message us on Messenger for that.",
  tl: "Ipapadala ng team namin ang check-in instructions, kasama ang access details, malapit na sa petsa ng stay n'yo — i-message n'yo kami sa Messenger.",
  btg: "Ala eh, ipapadala ng team namin ang check-in instructions, kasama ang access details, malapit na sa petsa ng stay n'yo — i-message n'yo kami sa Messenger.",
};

/** Mirrors `buildLargeGroupHandoffReply`'s language selection (owner-facts.ts) — `btg` is
 * always explicit; everything else follows `isEnglishContext` for `"auto"`. */
function pickLangKey(lang: HavenLang, guestMessages: string): SafeLangKey {
  if (lang === "btg") return "btg";
  return isEnglishContext(lang, guestMessages) ? "en" : "tl";
}

/**
 * The deterministic reply for a direct Wi-Fi/access question — skips the model entirely,
 * same pattern as `buildLargeGroupHandoffReply`. A message can plausibly ask for both at
 * once ("wifi password and gate code?"), so both sentences can appear together.
 */
export function buildAccessGuardReply(lang: HavenLang, guestMessages: string, latestMessage: string): string {
  const key = pickLangKey(lang, guestMessages);
  const parts: string[] = [];
  if (WIFI_REQUEST_RE.test(latestMessage)) parts.push(WIFI_SAFE_TEXT[key]);
  if (ACCESS_REQUEST_RE.test(latestMessage)) parts.push(ACCESS_SAFE_TEXT[key]);
  return parts.length > 0 ? parts.join(" ") : ACCESS_SAFE_TEXT[key];
}

export const ACCESS_GUARD_MESSENGER_BUTTON: LinkButton = { label: "Message us on Messenger", href: MESSENGER_HREF };

// ── Post-generation leak scrub (independent backstop) ───────────────────────

/** A labeled credential ("password:", "pw:", "SSID", "wifi name") or a stated "code is 1234". */
const LEAK_LABEL_RE = /\bpassword\s*:|\bpw\s*:|\bssid\b|\bwifi\s*name\b|\bcode\s+is\s*:?\s*\d{4,8}\b/i;

/** A 4–8 digit run sitting next to a door/gate/lock/keybox word, either order. */
const LEAK_DIGIT_NEAR_ACCESS_WORD_RE =
  /\b(?:door|gate|lock|keybox|key\s*box|pinto|gerbang|susi)\b[^.?!\n]{0,20}\b\d{4,8}\b|\b\d{4,8}\b[^.?!\n]{0,20}\b(?:door|gate|lock|keybox|key\s*box|pinto|gerbang|susi)\b/i;

const ACCESS_LEAK_RE = new RegExp(`${LEAK_LABEL_RE.source}|${LEAK_DIGIT_NEAR_ACCESS_WORD_RE.source}`, "i");

/** True when `text` reads like a leaked SSID/password/door-code, regardless of context —
 * used both to decide whether to scrub and whether to force the Messenger button on. */
export function containsAccessLeak(text: string): boolean {
  return ACCESS_LEAK_RE.test(text);
}

/**
 * Independent backstop: whatever the model wrote, if a sentence/bullet line reads like an
 * SSID/password/door-code leak, replace that WHOLE line with the safe access sentence —
 * never just the matched substring, so no broken fragment is left behind.
 */
export function scrubAccessLeak(text: string, lang: HavenLang, guestMessages: string): string {
  if (!containsAccessLeak(text)) return text;
  const key = pickLangKey(lang, guestMessages);
  return replaceMatchingSentences(text, ACCESS_LEAK_RE, ACCESS_SAFE_TEXT[key]);
}

/** Forces the Messenger button on whenever the guard fired, without duplicating it —
 * mirrors `owner-facts.ts`'s `ensureCapacityHandoffLink()`. */
export function ensureAccessHandoffLink(links: LinkButton[], triggered: boolean): LinkButton[] {
  if (!triggered) return links;
  if (links.some((l) => l.href === MESSENGER_HREF)) return links;
  return [...links, ACCESS_GUARD_MESSENGER_BUTTON];
}
