/**
 * Hostinger Reach contact-creation client for the newsletter signup.
 * Server-only — never imported from a client component. The API token is
 * read from `process.env` at call time and never logged or echoed back.
 */
import type { NewsletterSource } from "@/lib/newsletter";

export const REACH_PROFILE_UUID = "b630eee7-f69b-11f0-9166-42010a7501e7";
export const REACH_BASE_TAG_UUID = "9456caea-42d7-4e5b-b200-c1319826137a";
export const REACH_ENDPOINT = `https://developers.hostinger.com/api/reach/v1/profiles/${REACH_PROFILE_UUID}/contacts`;

const REACH_TIMEOUT_MS = 8000;

const SOURCE_TAG_ENV: Record<NewsletterSource, string> = {
  "site:newsletter-page": "HOSTINGER_REACH_TAG_NEWSLETTER_PAGE",
  "site:footer": "HOSTINGER_REACH_TAG_FOOTER",
  "site:homepage": "HOSTINGER_REACH_TAG_HOMEPAGE",
};

/** Base tag always applies; an optional per-source tag is appended only when its env var is set. Never creates tags via the API. */
export function resolveTagUuids(source: NewsletterSource): string[] {
  const tags = [REACH_BASE_TAG_UUID];
  const sourceTag = process.env[SOURCE_TAG_ENV[source]];
  if (sourceTag) tags.push(sourceTag);
  return tags;
}

const UNAVAILABLE_MESSAGE = "Signups are temporarily unavailable. Please try again later.";
const UPSTREAM_ERROR_MESSAGE = "We couldn't complete your signup right now. Please try again later.";

export type ReachSubscribeResult =
  | { ok: true; alreadySubscribed: boolean }
  | { ok: false; status: 503 | 502; message: string };

function isDuplicateResponse(status: number, body: unknown): boolean {
  if (status === 409) return true;
  if (status !== 422) return false;
  const message = extractMessage(body).toLowerCase();
  return /already|exists|taken/.test(message);
}

function extractMessage(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const record = body as Record<string, unknown>;
  const candidate = record.message ?? record.error ?? "";
  return typeof candidate === "string" ? candidate : "";
}

export async function subscribeToReach({
  email,
  firstName,
  phone,
  note,
  source,
}: {
  email: string;
  firstName: string | null;
  phone: string | null;
  note: string;
  source: NewsletterSource;
}): Promise<ReachSubscribeResult> {
  const token = process.env.HOSTINGER_REACH_API_TOKEN;
  if (!token) {
    console.warn("[newsletter] HOSTINGER_REACH_API_TOKEN is not configured — signup not sent to Reach.");
    return { ok: false, status: 503, message: UNAVAILABLE_MESSAGE };
  }

  const body: Record<string, unknown> = {
    email,
    tag_uuids: resolveTagUuids(source),
    note,
  };
  if (firstName) body.name = firstName;
  if (phone) body.phone = phone;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REACH_TIMEOUT_MS);

  try {
    const res = await fetch(REACH_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (res.ok) return { ok: true, alreadySubscribed: false };

    const parsed = await res.json().catch(() => null);
    if (isDuplicateResponse(res.status, parsed)) return { ok: true, alreadySubscribed: true };

    console.error(`[newsletter] Hostinger Reach responded ${res.status}`);
    return { ok: false, status: 502, message: UPSTREAM_ERROR_MESSAGE };
  } catch (err) {
    console.error("[newsletter] Hostinger Reach request failed:", err instanceof Error ? err.message : err);
    return { ok: false, status: 502, message: UPSTREAM_ERROR_MESSAGE };
  } finally {
    clearTimeout(timeout);
  }
}
