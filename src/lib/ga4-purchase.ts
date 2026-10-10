/**
 * Pure helpers for GA4's `purchase` event — kept separate from analytics.ts so
 * the param-building and per-transaction dedup logic are unit-testable without
 * stubbing gtag.
 *
 * `purchase` is fired ALONGSIDE `booking_confirmed` (never instead of it) from
 * src/components/booking/BookingForm.tsx. `booking_confirmed` carries the
 * registered custom dimensions (`Listing`, `Booking Ref`) and is the event the
 * existing funnel/reports depend on; `purchase` is the one GA4 recognizes as
 * ecommerce, so it is required to populate the built-in `transactionId` /
 * `purchaseRevenue` fields and Monetization → Ecommerce purchases reports.
 * See docs/HIL Website Technical Specification.md → GA4 Analytics Events.
 */

export interface PurchaseInput {
  bookingId: number;
  propertySlug: string;
  propertyName: string;
  /** Server-authoritative total — same figure booking_confirmed reports. */
  total: number;
  /** Number of nights the stay covers; 0/unknown falls back to a single line item. */
  nights: number;
}

export interface PurchaseItem {
  item_id: string;
  item_name: string;
  item_category: "stay";
  price: number;
  quantity: number;
}

// Intersected with Record<string, unknown> so this is directly assignable to
// track()'s GtagParams without a cast.
export type PurchaseParams = Record<string, unknown> & {
  transaction_id: string;
  value: number;
  currency: "PHP";
  items: PurchaseItem[];
};

/** Same `HIL-<bookingId>` format booking_confirmed uses, so the two can be matched in GA4. */
export function purchaseTransactionId(bookingId: number): string {
  return `HIL-${bookingId}`;
}

export function buildPurchaseParams(input: PurchaseInput): PurchaseParams {
  const hasNights = input.nights > 0;
  const quantity = hasNights ? input.nights : 1;
  const price = hasNights
    ? Math.round((input.total / input.nights) * 100) / 100
    : Math.round(input.total * 100) / 100;
  return {
    transaction_id: purchaseTransactionId(input.bookingId),
    value: Math.round(input.total),
    currency: "PHP",
    items: [
      {
        item_id: input.propertySlug,
        item_name: input.propertyName,
        item_category: "stay",
        price,
        quantity,
      },
    ],
  };
}

const SENT_KEY_PREFIX = "hil_ga4_purchase_";

function sentKey(transactionId: string): string {
  return `${SENT_KEY_PREFIX}${transactionId}`;
}

// Same contract as analytics.ts's storage helpers: sessionStorage can throw
// (Safari private mode, blocked storage) and must never break the booking flow.
function storageGet(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
function storageSet(key: string, value: string): void {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

/** False only when this transaction_id's purchase was already marked sent this tab session. */
export function shouldSendPurchase(transactionId: string): boolean {
  return storageGet(sentKey(transactionId)) !== "1";
}

export function markPurchaseSent(transactionId: string): void {
  storageSet(sentKey(transactionId), "1");
}

/**
 * Builds the params, checks the dedup guard, and — if this transaction hasn't
 * already sent — calls `track("purchase", …)` and marks it sent. `track` is
 * injected so this is testable without mocking window.gtag; the caller passes
 * its own `track` from src/lib/analytics.ts.
 */
export function trackPurchaseOnce(
  track: (event: string, params?: Record<string, unknown>) => void,
  input: PurchaseInput
): void {
  const params = buildPurchaseParams(input);
  if (!shouldSendPurchase(params.transaction_id)) return;
  track("purchase", params);
  markPurchaseSent(params.transaction_id);
}
