import "server-only";

/**
 * Guardrails applied to the model's text AFTER it's generated, on every turn — the model's
 * own instructions (system-prompt.ts) are not trusted alone. Two independent checks:
 *   1. Link allowlist — only relative site paths, haveninlipa.com, or m.me/haveninlipa survive.
 *   2. Price post-check — any ₱/PHP amount not traceable to a tool result this turn is
 *      replaced, so a hallucinated number can never reach a guest.
 */

export interface LinkButton {
  label: string;
  href: string;
}

const MARKDOWN_LINK = /\[([^\]]+)\]\(([^)]+)\)/g;

export function isAllowedHref(href: string): boolean {
  const trimmed = href.trim();
  if (trimmed.startsWith("/")) return true;
  if (trimmed === "m.me/haveninlipa" || trimmed === "https://m.me/haveninlipa") return true;
  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    return url.hostname === "haveninlipa.com" || url.hostname === "www.haveninlipa.com";
  } catch {
    return false;
  }
}

/** Strips disallowed links down to their label text; allowed ones are returned as buttons. */
export function extractAllowedLinks(text: string): { reply: string; links: LinkButton[] } {
  const links: LinkButton[] = [];
  const reply = text.replace(MARKDOWN_LINK, (_match, label: string, href: string) => {
    if (isAllowedHref(href)) links.push({ label, href: href.trim() });
    return label;
  });
  return { reply, links };
}

/** Every numeric value in this turn's tool results, as plain numbers (peso amounts live among them). */
export function collectToolAmounts(toolResults: unknown[]): Set<number> {
  const amounts = new Set<number>();
  const round2 = (n: number) => Math.round(n * 100) / 100;
  function walk(value: unknown): void {
    if (typeof value === "number" && Number.isFinite(value)) amounts.add(round2(value));
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object") Object.values(value as Record<string, unknown>).forEach(walk);
  }
  toolResults.forEach(walk);
  return amounts;
}

const PESO_AMOUNT = /(?:₱|PHP\s?)\s?\d[\d,]*(?:\.\d{1,2})?/gi;
export const FALLBACK_TOTAL_TEXT = "You'll see the exact total at checkout.";

export function enforcePriceClaims(text: string, allowedAmounts: Set<number>): string {
  return text.replace(PESO_AMOUNT, (match) => {
    const numeric = Number(match.replace(/[^\d.]/g, ""));
    if (!Number.isFinite(numeric)) return FALLBACK_TOTAL_TEXT;
    return allowedAmounts.has(Math.round(numeric * 100) / 100) ? match : FALLBACK_TOTAL_TEXT;
  });
}
