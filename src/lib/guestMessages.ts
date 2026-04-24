import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { buildVars, render, type TemplateContext } from "@/lib/templates";

function wrapEmailHtml(subject: string, body: string): string {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => `<p style="font-size:14px;color:#444;line-height:1.7;margin:0 0 16px">${p.replace(/\n/g, "<br/>")}</p>`)
    .join("");
  return `
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#335238">
      <div style="background:#335238;padding:20px 32px;border-radius:8px 8px 0 0">
        <h1 style="color:#fff;margin:0;font-size:18px">${subject}</h1>
      </div>
      <div style="background:#fff;border:1px solid #e5e5e5;border-top:none;padding:24px 32px;border-radius:0 0 8px 8px">
        ${paragraphs}
        <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e5e5;font-size:12px;color:#999;text-align:center">
          HavenInLipa — Stay in Style, Live in Comfort.<br/>
          Lipa City, Batangas, Philippines
        </div>
      </div>
    </div>
  `;
}

export type SendOptions = {
  bookingId: number;
  quickReplyId: number | null;   // null = free-text manual send
  trigger: "auto" | "manual";
  subject: string;               // raw template or literal
  body: string;                  // raw template or literal
};

export async function sendGuestMessage(opts: SendOptions) {
  const booking = await prisma.booking.findUnique({
    where: { id: opts.bookingId },
    include: { property: true },
  });
  if (!booking) throw new Error(`Booking ${opts.bookingId} not found`);

  const ctx: TemplateContext = { booking, property: booking.property };
  const vars = buildVars(ctx);
  const subject = render(opts.subject, vars);
  const body = render(opts.body, vars);

  let status: "sent" | "failed" = "sent";
  let error: string | null = null;
  try {
    await sendEmail({
      to: booking.guestEmail,
      subject,
      html: wrapEmailHtml(subject, body),
    });
  } catch (err) {
    status = "failed";
    error = err instanceof Error ? err.message : String(err);
  }

  const msg = await prisma.guestMessage.create({
    data: {
      bookingId: booking.id,
      quickReplyId: opts.quickReplyId,
      channel: "email",
      direction: "outbound",
      trigger: opts.trigger,
      subject,
      body,
      status,
      error,
    },
  });

  if (status === "failed") {
    const err = new Error(error ?? "email send failed");
    (err as Error & { guestMessageId?: number }).guestMessageId = msg.id;
    throw err;
  }

  return msg;
}
