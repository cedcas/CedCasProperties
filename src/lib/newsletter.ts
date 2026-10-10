/**
 * Pure validation/normalization for the newsletter signup (`/newsletter`,
 * the footer strip, the homepage strip). No fetch, no Prisma — safe to unit
 * test directly and to share between the client component and the API route.
 */
import { normalizePhone } from "@/lib/phone";

export const NEWSLETTER_SOURCES = [
  "site:newsletter-page",
  "site:footer",
  "site:homepage",
] as const;
export type NewsletterSource = (typeof NEWSLETTER_SOURCES)[number];
export const DEFAULT_NEWSLETTER_SOURCE: NewsletterSource = "site:newsletter-page";

/** Unrecognized input defaults rather than rejects — `source` is sent by our own components, not a guest-authored field. */
export function normalizeNewsletterSource(input: unknown): NewsletterSource {
  return (NEWSLETTER_SOURCES as readonly string[]).includes(input as string)
    ? (input as NewsletterSource)
    : DEFAULT_NEWSLETTER_SOURCE;
}

/** Hidden form field name used for the honeypot bot trap. */
export const HONEYPOT_FIELD = "company";

const EMAIL_MAX = 254;
// Deliberately simple (not a full RFC 5322 grammar) — matches the pattern used
// elsewhere in this codebase for guest-facing email fields.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type FieldResult<T> = { value: T } | { error: string };

export function normalizeNewsletterEmail(input: unknown): FieldResult<string> {
  if (typeof input !== "string") return { error: "Enter a valid email address." };
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return { error: "Email is required." };
  if (trimmed.length > EMAIL_MAX) return { error: "Enter a valid email address." };
  if (!EMAIL_RE.test(trimmed)) return { error: "Enter a valid email address." };
  return { value: trimmed };
}

const FIRST_NAME_MAX = 50;

export function normalizeNewsletterFirstName(input: unknown): FieldResult<string | null> {
  if (input === undefined || input === null || input === "") return { value: null };
  if (typeof input !== "string") return { error: "Enter a valid name." };
  const trimmed = input.replace(/\s+/g, " ").trim();
  if (!trimmed) return { value: null };
  if (trimmed.length > FIRST_NAME_MAX) return { error: `Name must be ${FIRST_NAME_MAX} characters or fewer.` };
  return { value: trimmed };
}

const PH_MOBILE_E164_RE = /^\+639\d{9}$/;

/**
 * Optional PH mobile field. Accepts `09XXXXXXXXX`, `9XXXXXXXXX`, `+639…`,
 * `639…`, with spaces/dashes — anything `normalizePhone`'s PH parser resolves
 * to a `+639XXXXXXXXX` mobile number. Anything else is a friendly field error,
 * never a silent drop.
 */
export function normalizeNewsletterPhone(input: unknown): FieldResult<string | null> {
  if (input === undefined || input === null || input === "") return { value: null };
  if (typeof input !== "string") return { error: "Enter a valid PH mobile number." };
  const trimmed = input.trim();
  if (!trimmed) return { value: null };
  const parsed = normalizePhone(trimmed, "PH");
  if (!parsed || !parsed.isPH || !PH_MOBILE_E164_RE.test(parsed.e164)) {
    return { error: "Enter a valid PH mobile number (e.g. 0917 123 4567)." };
  }
  return { value: parsed.e164 };
}

export const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
export type UtmKey = (typeof UTM_KEYS)[number];
export type UtmParams = Partial<Record<UtmKey, string>>;

const UTM_VALUE_MAX = 100;

/** Whitelists known UTM keys only and length-caps each value — never trusts client-supplied keys/lengths into `note` verbatim. */
export function sanitizeUtm(input: unknown): UtmParams {
  const out: UtmParams = {};
  if (!input || typeof input !== "object") return out;
  const record = input as Record<string, unknown>;
  for (const key of UTM_KEYS) {
    const raw = record[key];
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim().slice(0, UTM_VALUE_MAX);
    if (trimmed) out[key] = trimmed;
  }
  return out;
}

const PAGE_MAX = 200;
const NOTE_MAX = 500;

/** Builds the free-text `note` sent to Hostinger Reach: source + UTM + landing page, semicolon-separated. */
export function buildNewsletterNote({
  source,
  utm,
  page,
}: {
  source: NewsletterSource;
  utm: UtmParams;
  page?: string | null;
}): string {
  const parts = [`source=${source}`];
  for (const key of UTM_KEYS) {
    const value = utm[key];
    if (value) parts.push(`${key}=${value}`);
  }
  if (typeof page === "string" && page.trim()) {
    parts.push(`page=${page.trim().slice(0, PAGE_MAX)}`);
  }
  return parts.join("; ").slice(0, NOTE_MAX);
}
