/**
 * Mask guest PII in a chat message BEFORE it is ever written to HavenChatTranscript.
 * Pure string transform — order matters: card-like digit runs first (longest/most
 * specific), then PH phone numbers, then generic long digit runs, then emails.
 */

// 13–19 digits, optionally grouped by spaces/dashes every 4 — covers major card formats.
// Anchored to start AND end on a digit so a trailing separator (e.g. the space before the
// next word) is never swallowed into the match.
const CARD_LIKE = /\b\d(?:[ -]?\d){12,18}\b/g;

// +63 9xx xxx xxxx, 09xx xxx xxxx, with optional separators (including after the country code).
const PH_PHONE = /(?:\+?63[ -]?|0)9\d{2}[ -]?\d{3}[ -]?\d{4}\b/g;

// Any other run of 7+ consecutive digits (catches landlines, partial numbers, etc.).
const LONG_DIGIT_RUN = /\d{7,}/g;

const EMAIL = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

export function maskPii(text: string): string {
  return text
    .replace(CARD_LIKE, "[card]")
    .replace(PH_PHONE, "[phone]")
    .replace(LONG_DIGIT_RUN, "[number]")
    .replace(EMAIL, "[email]");
}
