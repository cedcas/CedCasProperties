// Property.pricingNotes is a free-form JSON blob stored as text (see prisma/schema.prisma).
// The admin Payment Methods field edits exactly one key of it — this module is the
// single place that merge happens, so a partial edit can never clobber sibling keys
// (rate, weeklyDiscount, monthlyDiscount, deposit, cancellation) the way accepting a
// client-supplied full JSON object could.
export type PricingNotesRecord = Record<string, unknown>;

export function safeParsePricingNotes(raw: string | null | undefined): PricingNotesRecord {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function mergePricingNotesPaymentMethods(
  currentRaw: string | null | undefined,
  paymentMethods: string
): string {
  const notes = safeParsePricingNotes(currentRaw);
  return JSON.stringify({ ...notes, paymentMethods });
}
