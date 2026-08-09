/**
 * Public-facing occupancy + extra-guest-fee copy.
 *
 * Reads the same three `Property` fields the booking calculator uses
 * (`maxGuests`, `includedGuests`, `extraGuestFeePerNight`) so the displayed
 * note can never drift from what `calcExtraGuestFee` charges at booking.
 * Prisma-free on purpose — safe to import into any server component that
 * already has the property record, and into client components too.
 */

import { STRIPE_FEE_RATE, calcExtraGuestFee } from "./pricing-core";

export interface OccupancyFee {
  maxGuests: number;
  includedGuests: number;
  extraGuestFeePerNight: number; // caller passes Number(property.extraGuestFeePerNight)
}

const peso = (n: number) => `₱${Math.round(n).toLocaleString("en-PH")}`;
const guestWord = (n: number) => (n === 1 ? "guest" : "guests");

/**
 * The fee can ever apply only when it's set AND the included threshold is
 * below max occupancy. Mirrors the admin's "leave the fee at 0 to disable"
 * rule and `calcExtraGuestFee`'s `feePerNight <= 0` short-circuit.
 */
export function extraGuestFeeApplies(f: OccupancyFee): boolean {
  return f.extraGuestFeePerNight > 0 && f.includedGuests < f.maxGuests;
}

/** Full occupancy + fee sentence for the property detail page. */
export function buildOccupancyNote(f: OccupancyFee): string {
  if (!extraGuestFeeApplies(f)) {
    return `Sleeps up to ${f.maxGuests}. All guests included in the nightly rate.`;
  }
  return `Sleeps up to ${f.maxGuests}. The nightly rate covers ${f.includedGuests} ${guestWord(
    f.includedGuests
  )} — additional guests are ${peso(f.extraGuestFeePerNight)}/guest per night. Full breakdown shown at booking; no hidden fees.`;
}

/* ────────────────────────────────────────────────────────────────────────────
   Itemized fee breakdown
   ──────────────────────────────────────────────────────────────────────────── */

export interface FeeLine {
  /** Stable key for React and for tests. */
  key: string;
  label: string;
  /** Right-hand value, already formatted for display. */
  value: string;
  /** Optional clarifying sub-line under the label. */
  note?: string;
  /** Renders de-emphasised — used for the explicit "None" reassurance rows. */
  muted?: boolean;
  /** Renders as the bold summing row. */
  emphasis?: boolean;
}

export interface FeeBreakdownInput extends OccupancyFee {
  pricePerNight: number;
  /** Live mode: number of nights selected. Omit/0 for the static "what's included" view. */
  nights?: number;
  /** Live mode: guest count selected. Defaults to `includedGuests` when omitted. */
  guests?: number;
  /**
   * Live mode: the true nightly subtotal from `/api/rates` (weekday/weekend/override
   * aware). Falls back to `nights × pricePerNight` when not yet loaded.
   */
  nightlyTotal?: number | null;
}

/**
 * Itemized, DB-driven fee lines for the booking widget.
 *
 * Two modes, decided by whether `nights` is set:
 *  - static  — "what the rate covers" before any dates are chosen
 *  - live    — actual amounts for the selected stay, using `calcExtraGuestFee`
 *              so the total can never disagree with `/api/bookings`.
 *
 * There is no cleaning fee or service fee in the data model; those lines are
 * emitted as an explicit "None" so the absence is stated rather than implied.
 */
export function buildFeeBreakdown(input: FeeBreakdownInput): FeeLine[] {
  const {
    pricePerNight,
    includedGuests,
    maxGuests,
    extraGuestFeePerNight,
    nights = 0,
    nightlyTotal,
  } = input;

  const guests = input.guests ?? includedGuests;
  const feeApplies = extraGuestFeeApplies(input);
  const live = nights > 0;
  const lines: FeeLine[] = [];

  // ── Nightly rate ─────────────────────────────────────────────────────────
  const subtotal = live ? (nightlyTotal ?? nights * pricePerNight) : 0;
  const avgRate = live && nights > 0 ? subtotal / nights : pricePerNight;
  const variedRates = live && Math.round(avgRate) !== Math.round(pricePerNight);

  lines.push({
    key: "nightly",
    label: live
      ? `${nights} night${nights !== 1 ? "s" : ""} × ${peso(avgRate)}`
      : "Nightly rate",
    value: live ? peso(subtotal) : `from ${peso(pricePerNight)}`,
    note: live
      ? variedRates
        ? "Weekend and holiday nights are priced individually."
        : undefined
      : "per night",
  });

  // ── What the base rate covers ────────────────────────────────────────────
  lines.push({
    key: "covers",
    label: "Covers",
    value: `${includedGuests} ${guestWord(includedGuests)}`,
    note: feeApplies ? "included in the nightly rate" : `sleeps up to ${maxGuests}`,
  });

  // ── Extra guests ─────────────────────────────────────────────────────────
  if (feeApplies) {
    const extraFee = live
      ? calcExtraGuestFee(guests, includedGuests, extraGuestFeePerNight, nights)
      : 0;
    const extraGuests = Math.max(0, guests - includedGuests);

    lines.push({
      key: "extra-guest",
      label: live && extraGuests > 0
        ? `Extra ${guestWord(extraGuests)} (${extraGuests} × ${nights} night${nights !== 1 ? "s" : ""})`
        : "Extra guest",
      value: live
        ? extraGuests > 0
          ? peso(extraFee)
          : "₱0"
        : `${peso(extraGuestFeePerNight)} / night`,
      note:
        live && extraGuests === 0
          ? `no extra-guest fee for ${guests} ${guestWord(guests)}`
          : includedGuests + 1 === maxGuests
            ? `for guest ${maxGuests}`
            : `for guests ${includedGuests + 1}–${maxGuests}`,
    });
  }

  // ── Explicit "we don't charge this" rows ─────────────────────────────────
  lines.push({ key: "cleaning", label: "Cleaning fee", value: "None", muted: true });
  lines.push({ key: "service", label: "Service fee", value: "None", muted: true });

  // ── Live total ───────────────────────────────────────────────────────────
  if (live) {
    const extraFee = feeApplies
      ? calcExtraGuestFee(guests, includedGuests, extraGuestFeePerNight, nights)
      : 0;
    lines.push({
      key: "total",
      label: "Total",
      value: peso(subtotal + extraFee),
      note: "before payment method",
      emphasis: true,
    });
  }

  return lines;
}

/** Footnote under the breakdown. Card fee % comes from the single STRIPE_FEE_RATE source. */
export function buildFeeFootnote(): string {
  const pct = Math.round(STRIPE_FEE_RATE * 100);
  return `GCash and BPI InstaPay have no added fee. Card payments add a ${pct}% processing fee, shown before you pay. No hidden fees — your full total is always shown at booking.`;
}

/* ────────────────────────────────────────────────────────────────────────────
   Vague-charge copy sanitizer
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * Admin-authored free text (`propertyRules`, `pricingNotes`, `heroSummary`) lives
 * only in the DB and has historically carried vague wording like "additional
 * charges may apply". That is exactly the surprise-fee anxiety the itemized
 * breakdown exists to remove, so it is rewritten at render time with the concrete
 * DB-sourced numbers — or dropped when no extra fee can apply at all.
 *
 * Deliberately conservative in two ways:
 *  1. Only these exact stock phrasings match.
 *  2. `SENTENCE_END` requires the phrase to BE the whole sentence. A clause that
 *     names its own trigger is not vague pricing — it's a penalty term — and must
 *     survive intact. Real examples from the live DB that must NOT be rewritten:
 *       "Additional charges may apply for not following this rule."
 *       "ADDITIONAL FEES may be incurred for any damage."
 *     Rewriting those would both mangle the grammar and delete a real house rule.
 */
const SENTENCE_END = String.raw`(?=\s*(?:[.!?]+|$|\n))`;

const VAGUE_CHARGE_PATTERNS: RegExp[] = [
  new RegExp(
    String.raw`\b(?:any\s+)?(?:additional|extra|other|further|miscellaneous)\s+(?:charges?|fees?|costs?)\s+(?:may|might|could|can)\s+(?:apply|be\s+(?:applied|charged|incurred))\b\.?` + SENTENCE_END,
    "gi"
  ),
  new RegExp(
    String.raw`\bsubject\s+to\s+(?:any\s+)?(?:additional|extra|other)\s+(?:charges?|fees?|costs?)\b\.?` + SENTENCE_END,
    "gi"
  ),
  new RegExp(
    String.raw`\b(?:may|might|could)\s+(?:be\s+)?(?:incur|be\s+subject\s+to)\s+(?:additional|extra|other)\s+(?:charges?|fees?|costs?)\b\.?` + SENTENCE_END,
    "gi"
  ),
  new RegExp(
    String.raw`\b(?:additional|extra|other)\s+(?:charges?|fees?|costs?)\s+(?:will|shall)\s+be\s+(?:determined|advised|quoted)\b\.?` + SENTENCE_END,
    "gi"
  ),
];

/**
 * Replace vague charge language with the property's real, itemized terms.
 * Returns the text unchanged when nothing matches.
 */
export function sanitizeChargeProse(
  text: string | null | undefined,
  f?: OccupancyFee
): string {
  if (!text) return "";

  const replacement = f && extraGuestFeeApplies(f)
    ? `The nightly rate covers ${f.includedGuests} ${guestWord(f.includedGuests)}; additional guests are ${peso(
        f.extraGuestFeePerNight
      )}/guest per night. No other charges.`
    : "No additional charges — the nightly rate is the full price.";

  let out = text;
  let replaced = false;

  for (const pattern of VAGUE_CHARGE_PATTERNS) {
    // Reset lastIndex: these are module-level /g regexes reused across calls.
    pattern.lastIndex = 0;
    if (!pattern.test(out)) continue;
    pattern.lastIndex = 0;
    // Only the first vague phrase becomes the concrete sentence; any further
    // ones are dropped, so the replacement isn't repeated verbatim.
    out = out.replace(pattern, () => {
      if (replaced) return "";
      replaced = true;
      return replacement;
    });
  }

  if (!replaced) return text;

  // Tidy up whitespace left behind by dropped phrases.
  return out
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+([.,;])/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

/**
 * Normalize base-rate / included-guest numbers in authored prose to the live DB
 * values so hand-written copy (heroSummary, pricingNotes.rate, …) can't drift
 * from `pricePerNight` / `includedGuests`. Rewrites only the base-rate amount
 * ("₱N per night" / "₱N/night") and the "covers N guests" count in place —
 * every other number and all surrounding text is left untouched. The extra-guest
 * fee is already number-free in prose, so it is not affected. Empty input → "".
 *
 * Also strips vague charge language when `fee` is supplied.
 */
export function normalizePricingProse(
  text: string | null | undefined,
  base: { pricePerNight: number; includedGuests: number },
  fee?: OccupancyFee
): string {
  if (!text) return "";
  let out = text;
  if (base.pricePerNight > 0) {
    out = out.replace(/₱[\d,]+(?=\s*(?:per night|\/night))/gi, peso(base.pricePerNight));
  }
  out = out.replace(/covers \d+(?= guests?)/gi, `covers ${base.includedGuests}`);
  return sanitizeChargeProse(out, fee) || out;
}
