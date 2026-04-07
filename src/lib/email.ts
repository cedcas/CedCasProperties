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

// Convenience wrapper used by contact & cron routes
export async function sendEmail(options: {
  to: string | string[];
  replyTo?: string;
  subject: string;
  html: string;
}) {
  const mailer = createMailer();
  await mailer.sendMail({
    from: FROM_ADDRESS,
    to: options.to,
    replyTo: options.replyTo,
    subject: options.subject,
    html: options.html,
  });
}
