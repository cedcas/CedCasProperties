import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createMailer, FROM_ADDRESS } from "@/lib/email";

export async function POST(req: Request) {
  const body = await req.json();
  const {
    name,
    phone,
    email,
    facebookUrl,
    otherSocials,
    audienceSize,
    city,
    occupation,
    motivation,
    promotionPlan,
    gcashNumber,
    agreedToTerms,
  } = body;

  // Validate required fields + terms consent
  if (
    !name || !phone || !email || !facebookUrl || !city ||
    !occupation || !motivation || !promotionPlan || !gcashNumber ||
    agreedToTerms !== true
  ) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Save to DB — block duplicate applications by email
  try {
    await prisma.ambassador.create({
      data: {
        name,
        phone,
        email,
        facebookUrl,
        otherSocials: otherSocials || null,
        audienceSize: audienceSize || null,
        city,
        occupation,
        motivation,
        promotionPlan,
        gcashNumber,
        agreedToTermsAt: new Date(),
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: "An application with this email already exists." },
        { status: 409 }
      );
    }
    console.error("Ambassador create failed:", err);
    return NextResponse.json({ error: "Could not save application" }, { status: 500 });
  }

  // Send emails — DB is the source of truth, so never fail the request on email error
  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 16px 6px 0;color:#666;font-weight:bold;vertical-align:top">${label}</td><td style="white-space:pre-wrap">${value || "—"}</td></tr>`;

  try {
    const mailer = createMailer();

    // 1. Admin notification
    await mailer.sendMail({
      from:    FROM_ADDRESS,
      to:      "customerservice@haveninlipa.com",
      replyTo: email,
      subject: `[Ambassador] New Application — ${name}`,
      html: `
        <h2 style="color:#2C2C2C;font-family:Georgia,serif">New Ambassador Application</h2>
        <table style="font-family:Arial,sans-serif;font-size:14px;border-collapse:collapse">
          ${row("Name", name)}
          ${row("Mobile", phone)}
          ${row("Email", `<a href="mailto:${email}">${email}</a>`)}
          ${row("Facebook", facebookUrl)}
          ${row("Other Socials", otherSocials)}
          ${row("Audience Size", audienceSize)}
          ${row("City", city)}
          ${row("Occupation", occupation)}
          ${row("Why partner?", motivation)}
          ${row("Promotion plan", promotionPlan)}
          ${row("GCash", gcashNumber)}
        </table>
        <p style="font-family:Arial,sans-serif;font-size:13px;color:#888;margin-top:16px">Review &amp; approve in the admin panel → Ambassadors.</p>
      `,
    });

    // 2. Applicant acknowledgment
    await mailer.sendMail({
      from:    FROM_ADDRESS,
      to:      email,
      subject: "We received your Haven in Lipa Ambassador application",
      html: `
        <div style="font-family:Arial,sans-serif;font-size:15px;color:#2C2C2C;line-height:1.7">
          <h2 style="font-family:Georgia,serif;color:#3B5323">Thanks for applying, ${name}!</h2>
          <p>We've received your application to become a <strong>Haven in Lipa Ambassador</strong>. 🎉</p>
          <p>Our team will review it and get back to you within <strong>3–5 days</strong>. Once approved, you'll receive your unique Ambassador Promo Code, a personalized booking link, and a toolkit of marketing materials to start sharing and earning.</p>
          <p>In the meantime, feel free to explore our properties at <a href="https://haveninlipa.com" style="color:#3B5323">haveninlipa.com</a>.</p>
          <p style="margin-top:24px">Warmly,<br/>The Haven in Lipa Team</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Ambassador email send failed:", err);
    // Don't fail the request — application is saved in DB
  }

  return NextResponse.json({ success: true });
}
