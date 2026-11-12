/**
 * `?ask=1` auto-open handling (haven-chat-usage-2026-11-09.md, fix #4). Pure helpers so the
 * URL logic is unit-testable without mounting the widget — ChatWidget.tsx just calls these.
 */

/** True when the current query string asks for an auto-open this page load. */
export function shouldAutoOpenFromAsk(search: string): boolean {
  return new URLSearchParams(search).get("ask") === "1";
}

/**
 * Removes `ask` from a URL (pathname + search + hash), preserving every other param
 * (utm_*, etc.) and their original order. Returns the full href-relative string
 * (`pathname?search#hash`) for `history.replaceState`.
 */
export function stripAskParam(href: string): string {
  const url = new URL(href, "https://example.invalid");
  url.searchParams.delete("ask");
  const search = url.searchParams.toString();
  return `${url.pathname}${search ? `?${search}` : ""}${url.hash}`;
}
