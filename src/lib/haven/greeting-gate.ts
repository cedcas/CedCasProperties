/**
 * Pathname rules for the arrival greeting pop-up (haven-chat-usage-2026-11-09.md, fix #2 /
 * hil-pm-handoff). The chat widget itself already hides on /admin; this is the narrower,
 * additional set of guest-facing pages where the greeting specifically must never appear —
 * checkout/payment and booking-confirmation surfaces, where a bouncing launcher + popup
 * would be a distraction at the worst possible moment.
 */

const SUPPRESSED_PREFIXES = ["/admin", "/pay"];

/** `/properties/<slug>/book` and any deeper path under it (the 2-step booking/payment flow). */
function isBookingCheckoutPath(pathname: string): boolean {
  return /^\/properties\/[^/]+\/book(\/|$)/.test(pathname);
}

export function isGreetingSuppressedPath(pathname: string): boolean {
  if (SUPPRESSED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }
  if (isBookingCheckoutPath(pathname)) return true;
  // No dedicated /booking-confirmation route exists today (confirmation is a step inside
  // the booking form, not its own URL) — matched defensively in case one is ever added.
  if (pathname.includes("confirmation")) return true;
  return false;
}
