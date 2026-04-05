import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

export async function POST(req: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { name, email, phone, subject, message } = await req.json();

  if (!name || !email || !phone || !subject) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Save to DB
  try {
    await prisma.contactMessage.create({
      data: { name, email, phone, subject, message: message || "" },
    });
  } catch {
    // DB might not be connected yet — continue to send email anyway
  }

  // Send email
  try {
    await resend.emails.send({
      from:    "HavenInLipa <noreply@haveninlipa.com>",
      to:      "customerservice@haveninlipa.com",
      replyTo: email,
      subject: `[Contact Form] ${subject} — ${name}`,
      html: `
        <h2 style="color:#2C2C2C;font-family:Georgia,serif">New Contact Message</h2>
        <table style="font-family:Arial,sans-serif;font-size:14px;border-collapse:collapse">
          <tr><td style="padding:6px 16px 6px 0;color:#666;font-weight:bold">Name</td><td>${name}</td></tr>
          <tr><td style="padding:6px 16px 6px 0;color:#666;font-weight:bold">Email</td><td><a href="mailto:${email}">${email}</a></td></tr>
          <tr><td style="padding:6px 16px 6px 0;color:#666;font-weight:bold">Phone</td><td>${phone}</td></tr>
          <tr><td style="padding:6px 16px 6px 0;color:#666;font-weight:bold">Subject</td><td>${subject}</td></tr>
          <tr><td style="padding:6px 16px 6px 0;color:#666;font-weight:bold;vertical-align:top">Message</td><td style="white-space:pre-wrap">${message}</td></tr>
        </table>
      `,
    });
  } catch (err) {
    console.error("Email send failed:", err);
    // Don't fail the request if email fails — message is saved in DB
  }

  return NextResponse.json({ success: true });
}
