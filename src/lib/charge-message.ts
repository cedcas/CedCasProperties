// Shared text builders for the "additional charges" pay-by-link feature.
// Reused by the admin create/update routes (guest email + copy-paste SMS) and
// the admin client (Copy SMS / Copy link buttons).

function peso(n: number): string {
  return `₱${Number(n).toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;
}

function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] || full;
}

/** Absolute public payment URL for a charge token. */
export function chargeUrl(token: string): string {
  const base = (process.env.NEXTAUTH_URL ?? "https://haveninlipa.com").replace(/\/$/, "");
  return `${base}/pay/${token}`;
}

/** One-line SMS the admin pastes into their own phone (no Twilio send). */
export function buildChargeSms(opts: {
  guestName: string;
  amount: number;
  description: string;
  url: string;
}): string {
  return `Hi ${firstName(opts.guestName)}, you have a ${peso(opts.amount)} charge for ${opts.description} at Haven in Lipa. Pay securely (GCash, BPI, or card) here: ${opts.url}`;
}

/**
 * Guest-facing charge email — plain text so it renders cleanly both in the
 * email (sendGuestMessage wraps it in the branded template) and in the admin
 * Guest Messages thread. The bare URL auto-links in mobile mail clients.
 */
export function buildChargeEmail(opts: {
  guestName: string;
  amount: number;
  description: string;
  url: string;
}): { subject: string; body: string } {
  const subject = "A new charge for your Haven in Lipa stay";
  const body = `Hi ${firstName(opts.guestName)},

We've added a charge to your stay:

${opts.description} — ${peso(opts.amount)}

You can pay securely (GCash, BPI, or card) at the link below:
${opts.url}

If you have any questions, just reply to this message. Thank you!`;
  return { subject, body };
}
