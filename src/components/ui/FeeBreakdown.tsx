import { buildFeeBreakdown, buildFeeFootnote, type FeeBreakdownInput } from "@/lib/occupancy";

/**
 * Itemized, DB-driven fee summary shown at the decision point (inside the booking
 * widget). Every number comes from the property record via `buildFeeBreakdown`,
 * which shares `calcExtraGuestFee` with `/api/bookings` — so what a guest reads
 * here cannot disagree with what they are charged.
 *
 * Deliberately a plain component (no `"use client"`, no server-only imports) so it
 * renders both inside the client BookingCard and directly in a server tree.
 */
export default function FeeBreakdown(props: FeeBreakdownInput & { className?: string }) {
  const { className = "", ...input } = props;

  // Nothing meaningful to itemize until the property is priced.
  if (input.pricePerNight <= 0) return null;

  const lines = buildFeeBreakdown(input);

  return (
    <div
      className={`rounded-[12px] border border-black/[.07] bg-cream/25 px-4 py-3.5 ${className}`}
    >
      <h3 className="text-[10px] font-bold uppercase tracking-wider text-charcoal/40 mb-2.5">
        What&apos;s included
      </h3>

      <dl className="space-y-2">
        {lines.map((l) => (
          <div
            key={l.key}
            className={
              l.emphasis
                ? "flex items-baseline justify-between gap-3 border-t border-black/[.08] pt-2.5 mt-2.5"
                : "flex items-baseline justify-between gap-3"
            }
          >
            <dt className="min-w-0">
              <span
                className={`text-[12.5px] leading-snug ${
                  l.emphasis
                    ? "font-semibold text-charcoal"
                    : l.muted
                      ? "text-charcoal/45"
                      : "text-charcoal/70"
                }`}
              >
                {l.label}
              </span>
              {l.note && (
                <span className="block text-[11px] leading-snug text-charcoal/40">{l.note}</span>
              )}
            </dt>
            <dd
              className={`shrink-0 text-right text-[12.5px] tabular-nums ${
                l.emphasis
                  ? "font-bold text-charcoal text-[14px]"
                  : l.muted
                    ? "text-charcoal/45"
                    : "font-semibold text-charcoal"
              }`}
            >
              {l.value}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-3 pt-3 border-t border-black/[.06] text-[11px] leading-[1.6] text-charcoal/50">
        <i className="fa-solid fa-shield-halved mr-1.5 text-forest" aria-hidden="true" />
        {buildFeeFootnote()}
      </p>
    </div>
  );
}
