import { prisma } from "@/lib/prisma";
import { createMailer, FROM_ADDRESS } from "@/lib/email";
import { formatStayDate } from "@/lib/dates";

/**
 * Checkout-abandonment alerts.
 *
 * GCash/BPI bookings are only written when the guest taps "I Paid" on the QR screen. A
 * guest who pays and then gets distracted leaves the Owner holding money with no booking
 * and no held dates (booking #140, 2026-09-27: paid 11:15 AM PHT, tapped "I Paid" 53 min
 * later). The payment screen therefore records a CheckoutAttempt; /api/bookings links it
 * to the booking it produced. Anything still unlinked after ABANDON_AFTER_MINUTES of
 * inactivity gets exactly one admin email.
 *
 * Driven by /api/cron/checkout-abandonment. Alert latency = ABANDON_AFTER_MINUTES plus the
 * trigger interval (cron-job.org, every 5 min; GitHub Actions is only a backstop).
 */

export const ABANDON_AFTER_MINUTES = 10;
/** Don't alert on attempts older than this (e.g. after a long cron outage). */
export const LOOKBACK_HOURS = 24;
/** Guest PII retention for attempts, completed or not. */
export const RETENTION_DAYS = 30;
/** Matching booking may be created slightly before the attempt row is updated. */
const BOOKING_MATCH_SLACK_MS = 5 * 60 * 1000;

export const ADMIN_ALERT_TO = "customerservice@haveninlipa.com";

export interface AttemptCandidate {
  id: number;
  propertyId: number;
  guestEmail: string;
  checkIn: Date;
  updatedAt: Date;
}

/** One guest trying to book one stay — repeated attempts (reloads, new tabs) share it. */
export function attemptKey(a: Pick<AttemptCandidate, "propertyId" | "guestEmail" | "checkIn">): string {
  return `${a.propertyId}|${a.guestEmail.trim().toLowerCase()}|${a.checkIn.toISOString().slice(0, 10)}`;
}

/**
 * Pure: which stale attempts get an email. At most one per key — the most recently active
 * one — and none for a key already alerted recently. Every other candidate is still
 * returned in `suppress` so it gets marked and is never reconsidered.
 */
export function selectAlerts<T extends AttemptCandidate>(
  candidates: T[],
  alreadyAlertedKeys: Set<string>
): { alert: T[]; suppress: T[] } {
  const byRecency = [...candidates].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  const seen = new Set(alreadyAlertedKeys);
  const alert: T[] = [];
  const suppress: T[] = [];
  for (const c of byRecency) {
    const key = attemptKey(c);
    if (seen.has(key)) suppress.push(c);
    else {
      seen.add(key);
      alert.push(c);
    }
  }
  return { alert, suppress };
}

const METHOD_LABEL: Record<string, string> = { gcash: "GCash", bpi: "BPI", stripe: "Card (Stripe)" };

function fmtTime(d: Date, timeZone: string): string {
  return d.toLocaleString("en-US", {
    timeZone,
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    timeZoneName: "short",
  });
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function buildAlertEmail(a: {
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  propertyName: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  paymentMethod: string;
  discountCode: string | null;
  total: number;
  lastActiveAt: Date;
}): { subject: string; html: string } {
  const method = METHOD_LABEL[a.paymentMethod] ?? a.paymentMethod;
  const stay = (d: Date) => formatStayDate(d, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  const row = (k: string, v: string) =>
    `<tr><td style="padding:6px 0;color:#666;width:140px;vertical-align:top">${k}</td><td>${v}</td></tr>`;

  return {
    subject: `⏳ Checkout not completed – ${a.guestName} – ${a.propertyName}`,
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#335238">
        <div style="background:#8a6d1f;padding:20px 28px;border-radius:8px 8px 0 0">
          <h1 style="color:#fff;margin:0;font-size:19px">Checkout not completed</h1>
          <p style="color:rgba(255,255,255,.8);margin:6px 0 0;font-size:13px">
            Reached the ${esc(method)} payment screen, no booking submitted after ${ABANDON_AFTER_MINUTES} minutes
          </p>
        </div>
        <div style="background:#fff;border:1px solid #e5e5e5;border-top:none;padding:24px 28px;border-radius:0 0 8px 8px;font-size:14px">
          <table style="width:100%;border-collapse:collapse">
            ${row("Guest", `<strong>${esc(a.guestName)}</strong>`)}
            ${row("Email", `<a href="mailto:${esc(a.guestEmail)}">${esc(a.guestEmail)}</a>`)}
            ${row("Phone", esc(a.guestPhone))}
            ${row("Property", esc(a.propertyName))}
            ${row("Stay", `${stay(a.checkIn)} → ${stay(a.checkOut)}`)}
            ${row("Guests", String(a.guests))}
            ${row("Payment method", `<strong>${esc(method)}</strong>`)}
            ${a.discountCode ? row("Promo code", esc(a.discountCode)) : ""}
            ${row("Amount shown", `<strong>₱${a.total.toLocaleString()}</strong>`)}
            ${row("Last on payment screen", `${fmtTime(a.lastActiveAt, "Asia/Manila")}<br/><span style="color:#999">${fmtTime(a.lastActiveAt, "America/Chicago")}</span>`)}
          </table>
          <div style="margin-top:18px;padding:12px 14px;background:#FFF8E6;border-left:3px solid #C4A862;border-radius:4px;font-size:13px;color:#555;line-height:1.6">
            If a payment of this amount arrives, it is most likely from this guest — they may have paid
            without tapping "I Paid". No booking exists and <strong>the dates are not held</strong>.
            Reach out to the guest, or check /admin/bookings in case they complete it later.
          </div>
        </div>
      </div>
    `,
  };
}

export interface AbandonmentRunResult {
  candidates: number;
  linked: number;
  alerted: number;
  suppressed: number;
  failed: number;
  purged: number;
}

/** One cron pass: link late bookings, alert on the rest, purge old rows. */
export async function processAbandonedCheckouts(now: Date = new Date()): Promise<AbandonmentRunResult> {
  const result: AbandonmentRunResult = { candidates: 0, linked: 0, alerted: 0, suppressed: 0, failed: 0, purged: 0 };

  const staleBefore = new Date(now.getTime() - ABANDON_AFTER_MINUTES * 60 * 1000);
  const lookbackFrom = new Date(now.getTime() - LOOKBACK_HOURS * 60 * 60 * 1000);

  const candidates = await prisma.checkoutAttempt.findMany({
    where: { bookingId: null, alertedAt: null, updatedAt: { gte: lookbackFrom, lte: staleBefore } },
    orderBy: { updatedAt: "desc" },
  });
  result.candidates = candidates.length;

  // Backstop for a missing link (another tab, a lost token): a booking for the same
  // guest/property/check-in created around or after the attempt means it completed.
  const pending: typeof candidates = [];
  for (const c of candidates) {
    const booking = await prisma.booking.findFirst({
      where: {
        propertyId: c.propertyId,
        guestEmail: c.guestEmail,
        checkIn: c.checkIn,
        createdAt: { gte: new Date(c.createdAt.getTime() - BOOKING_MATCH_SLACK_MS) },
      },
      select: { id: true },
    });
    if (booking) {
      await prisma.checkoutAttempt.update({ where: { id: c.id }, data: { bookingId: booking.id } });
      result.linked++;
    } else {
      pending.push(c);
    }
  }

  if (pending.length > 0) {
    const recentlyAlerted = await prisma.checkoutAttempt.findMany({
      where: {
        alertedAt: { gte: lookbackFrom },
        guestEmail: { in: [...new Set(pending.map((p) => p.guestEmail))] },
      },
      select: { propertyId: true, guestEmail: true, checkIn: true },
    });
    const { alert, suppress } = selectAlerts(pending, new Set(recentlyAlerted.map(attemptKey)));

    if (suppress.length > 0) {
      await prisma.checkoutAttempt.updateMany({
        where: { id: { in: suppress.map((s) => s.id) }, alertedAt: null },
        data: { alertedAt: now },
      });
      result.suppressed = suppress.length;
    }

    const properties = await prisma.property.findMany({
      where: { id: { in: [...new Set(alert.map((a) => a.propertyId))] } },
      select: { id: true, name: true },
    });
    const propertyName = new Map(properties.map((p) => [p.id, p.name]));

    for (const a of alert) {
      // Claim first so two overlapping cron runs can't both send.
      const claimed = await prisma.checkoutAttempt.updateMany({
        where: { id: a.id, alertedAt: null, bookingId: null },
        data: { alertedAt: now },
      });
      if (claimed.count !== 1) continue;

      try {
        const { subject, html } = buildAlertEmail({
          guestName: a.guestName,
          guestEmail: a.guestEmail,
          guestPhone: a.guestPhone,
          propertyName: propertyName.get(a.propertyId) ?? `Property #${a.propertyId}`,
          checkIn: a.checkIn,
          checkOut: a.checkOut,
          guests: a.guests,
          paymentMethod: a.paymentMethod,
          discountCode: a.discountCode,
          total: Number(a.total),
          lastActiveAt: a.updatedAt,
        });
        await createMailer().sendMail({ from: FROM_ADDRESS, to: ADMIN_ALERT_TO, subject, html });
        result.alerted++;
      } catch (err) {
        // Release the claim so the next run retries.
        await prisma.checkoutAttempt.update({ where: { id: a.id }, data: { alertedAt: null } });
        console.error("[checkout-abandonment] alert email failed for attempt", a.id, err);
        result.failed++;
      }
    }
  }

  const purged = await prisma.checkoutAttempt.deleteMany({
    where: { createdAt: { lt: new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000) } },
  });
  result.purged = purged.count;

  return result;
}
