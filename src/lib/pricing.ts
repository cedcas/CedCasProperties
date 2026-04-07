import { prisma } from "@/lib/prisma";

export const STRIPE_FEE_RATE = 0.06; // 6%

export interface DailyRateEntry {
  date: string; // YYYY-MM-DD
  rate: number;
  note?: string | null;
}

/**
 * Compute the nightly rate for each date in a stay.
 * Falls back to the property's default pricePerNight if no override/weekday/weekend rate is configured.
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
    const dow = cursor.getDay(); // 0=Sun..6=Sat

    // Priority: specific date override > weekday/weekend rule > default
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
      const rule = rates.find((r) =>
        isWeekend ? r.rateType === "weekend" : r.rateType === "weekday"
      );
      entries.push({ date: dateStr, rate: rule ? Number(rule.rate) : defaultRate, note: rule?.note });
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return entries;
}

export function sumDailyRates(entries: DailyRateEntry[]): number {
  return entries.reduce((sum, e) => sum + e.rate, 0);
}

export function calcStripeFee(nightlyTotal: number): number {
  return Math.round(nightlyTotal * STRIPE_FEE_RATE * 100) / 100;
}
