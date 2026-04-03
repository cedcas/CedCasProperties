import nodemailer from "nodemailer";

export function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.hostinger.com",
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: true,
    auth: {
      user: process.env.SMTP_USER ?? "",
      pass: process.env.SMTP_PASS ?? "",
    },
  });
}

export async function sendEmail(options: {
  to: string | string[];
  replyTo?: string;
  subject: string;
  html: string;
}) {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"Haven in Lipa" <${process.env.SMTP_USER ?? "customerservice@haveninlipa.com"}>`,
    to: options.to,
    replyTo: options.replyTo,
    subject: options.subject,
    html: options.html,
  });
}
