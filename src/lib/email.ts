import nodemailer from "nodemailer";

export function createMailer() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST ?? "smtp.hostinger.com",
    port:   Number(process.env.SMTP_PORT) || 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// Alias kept for backward compatibility (cron routes on main use createTransporter)
export const createTransporter = createMailer;

export const FROM_ADDRESS = `"Haven in Lipa" <${process.env.SMTP_USER || "customerservice@haveninlipa.com"}>`;

// Convenience wrapper used by contact & cron routes.
// Returns the Nodemailer Message-ID (sans surrounding angle brackets) so callers
// can persist it for inbound-reply threading via In-Reply-To/References headers.
export async function sendEmail(options: {
  to: string | string[];
  replyTo?: string;
  subject: string;
  html: string;
}): Promise<{ messageId: string | null }> {
  const mailer = createMailer();
  const info = await mailer.sendMail({
    from: FROM_ADDRESS,
    to: options.to,
    replyTo: options.replyTo,
    subject: options.subject,
    html: options.html,
  });
  return { messageId: stripAngleBrackets(info.messageId ?? null) };
}

export function stripAngleBrackets(id: string | null): string | null {
  if (!id) return null;
  return id.replace(/^<|>$/g, "").trim() || null;
}
