import nodemailer from "nodemailer";

export function createMailer() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   Number(process.env.SMTP_PORT) || 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export const FROM_ADDRESS = `"Haven in Lipa" <${process.env.SMTP_USER || "noreply@haveninlipa.com"}>`;
