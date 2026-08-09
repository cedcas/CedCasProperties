import { prisma } from "@/lib/prisma";
import type { DailyRateEntry } from "./pricing-core";

// Pure math lives in `pricing-core` (Prisma-free, safe in client bundles).
// Re-exported here so existing server-side importers keep working unchanged.
export {
  STRIPE_FEE_RATE,
  sumDailyRates,
  calcStripeFee,
  calcExtraGuestFee,
} from "./pricing-core";
export type { DailyRateEntry } from "./pricing-core";

/**
 * Compute the nightly rate for each date in a stay.
 * Priority: specific date override > weekend rate (Fri/Sat) > base rate (`defaultRate`,
 * i.e. the property's weekday/base `pricePerNight`). A weekend night with no weekend
 * rate configured falls back to the base rate (defensive — never charges 0).
 */
export async function getDailyRates(
  propertyId: number,
  checkIn: Date,
  checkOut: Date,
  defaultRate: number
): Promise<DailyRateEntry[]> {
  const rates = await prisma.propertyRate.findMany({
    where: { propertyId },
  });

  const entries: DailyRateEntry[] = [];
  const cursor = new Date(checkIn);

  while (cursor < checkOut) {
    const dateStr = cursor.toISOString().split("T")[0];
    const dow = cursor.getUTCDay(); // 0=Sun..6=Sat — UTC, to match dateStr regardless of runtime tz

    // Priority: specific date override > weekend rule > base rate
    const override = rates.find(
      (r) =>
        r.rateType === "override" &&
        r.specificDate &&
        r.specificDate.toISOString().split("T")[0] === dateStr
    );

    if (override) {
      entries.push({ date: dateStr, rate: Number(override.rate), note: override.note });
    } else {
      const isWeekend = dow === 5 || dow === 6; // Fri or Sat
      const rule = isWeekend ? rates.find((r) => r.rateType === "weekend") : undefined;
      entries.push({ date: dateStr, rate: rule ? Number(rule.rate) : defaultRate, note: rule?.note });
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return entries;
}

/**
 * A property is fully priced only when it has a base/weekday rate (pricePerNight > 0)
 * AND a weekend rate. Used to gate public visibility/booking and to flag incomplete
 * setups in the admin Rates page.
 */
export function isPricingComplete(
  pricePerNight: number,
  rates: { rateType: string }[]
): boolean {
  return pricePerNight > 0 && rates.some((r) => r.rateType === "weekend");
}
