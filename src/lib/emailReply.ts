import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { stripQuotedReply, type ParsedInboundEmail } from "@/lib/imap";

export type EmailReplyOutcome =
  | { kind: "matched"; bookingId: number; guestMessageId: number }
  | { kind: "unmatched"; contactMessageId: number }
  | { kind: "skipped"; reason: string };

// Routes a parsed inbound email to either a Booking thread (GuestMessage) or the
// Contact Us inbox (ContactMessage). Skips bounces, auto-replies, and our own
// outbound (admin replying via Hostinger webmail directly).
export async function processInboundEmail(parsed: ParsedInboundEmail): Promise<EmailReplyOutcome> {
  if (parsed.isBounce) return { kind: "skipped", reason: "bounce/DSN" };
  if (parsed.isAutoReply) return { kind: "skipped", reason: "auto-reply" };
  if (!parsed.fromEmail) return { kind: "skipped", reason: "no From address" };

  const ourEmail = (process.env.SMTP_USER || "customerservice@haveninlipa.com").toLowerCase();
  if (parsed.fromEmail === ourEmail) {
    return { kind: "skipped", reason: "self-send (admin reply via webmail)" };
  }

  // Dedup by Message-ID
  if (parsed.messageId) {
    const existing = await prisma.guestMessage.findFirst({
      where: { messageId: parsed.messageId },
      select: { id: true, bookingId: true },
    });
    if (existing) {
      return { kind: "matched", bookingId: existing.bookingId, guestMessageId: existing.id };
    }
    const existingContact = await prisma.contactMessage.findFirst({
      where: { messageId: parsed.messageId },
      select: { id: true },
    });
    if (existingContact) {
      return { kind: "unmatched", contactMessageId: existingContact.id };
    }
  }

  const cleanBody = stripQuotedReply(parsed.text || "");
  const subjectLabel = parsed.subject || "Reply from guest";

  // Strategy 1: In-Reply-To / References → match outbound GuestMessage.messageId
  const candidateIds: string[] = [];
  if (parsed.inReplyTo) candidateIds.push(parsed.inReplyTo);
  for (const ref of parsed.references) candidateIds.push(ref);

  if (candidateIds.length > 0) {
    const matched = await prisma.guestMessage.findFirst({
      where: {
        messageId: { in: candidateIds },
        direction: "outbound",
      },
      orderBy: { sentAt: "desc" },
      select: { bookingId: true },
    });
    if (matched) {
      const created = await writeInboundGuestMessage({
        bookingId: matched.bookingId,
        parsed,
        body: cleanBody,
        subject: subjectLabel,
      });
      notifyAdminInbound({ bookingId: matched.bookingId, parsed, body: cleanBody }).catch(() => {});
      return { kind: "matched", bookingId: matched.bookingId, guestMessageId: created.id };
    }
  }

  // Strategy 2: From email → most-recent non-cancelled booking
  const booking = await prisma.booking.findFirst({
    where: {
      guestEmail: { equals: parsed.fromEmail },
      status: { not: "cancelled" },
    },
    orderBy: [{ checkIn: "desc" }, { id: "desc" }],
    select: { id: true, guestName: true },
  });
  if (booking) {
    const created = await writeInboundGuestMessage({
      bookingId: booking.id,
      parsed,
      body: cleanBody,
      subject: subjectLabel,
      notes: "Threaded by sender email (no In-Reply-To match)",
    });
    notifyAdminInbound({ bookingId: booking.id, parsed, body: cleanBody }).catch(() => {});
    return { kind: "matched", bookingId: booking.id, guestMessageId: created.id };
  }

  // Strategy 3: No booking — write to Contact Us inbox
  const cm = await prisma.contactMessage.create({
    data: {
      name: parsed.fromName || parsed.fromEmail.split("@")[0],
      email: parsed.fromEmail,
      phone: "",
      subject: subjectLabel,
      message: cleanBody,
      isRead: false,
      source: "email",
      messageId: parsed.messageId,
    },
  });
  notifyAdminUnmatchedEmail({ parsed, body: cleanBody }).catch(() => {});
  return { kind: "unmatched", contactMessageId: cm.id };
}

async function writeInboundGuestMessage(opts: {
  bookingId: number;
  parsed: ParsedInboundEmail;
  body: string;
  subject: string;
  notes?: string;
}) {
  return prisma.guestMessage.create({
    data: {
      bookingId: opts.bookingId,
      quickReplyId: null,
      sourceQuickReplyId: null,
      channel: "email",
      direction: "inbound",
      trigger: "manual",
      subject: opts.subject,
      body: opts.body,
      status: "sent",
      notes: opts.notes ?? null,
      messageId: opts.parsed.messageId,
      sentAt: opts.parsed.receivedAt,
    },
  });
}

// Migrates pre-booking Contact Us inquiries from the same email into the new booking's
// thread. Called from POST /api/bookings after Booking.create. Idempotent: rows already
// promoted (`promotedToBookingId IS NOT NULL`) are skipped.
export async function promoteContactMessagesForEmail(opts: {
  bookingId: number;
  email: string;
  bookingCreatedAt: Date;
}): Promise<{ promoted: number }> {
  const normalizedEmail = opts.email.toLowerCase().trim();
  const candidates = await prisma.contactMessage.findMany({
    where: {
      email: { equals: normalizedEmail },
      promotedToBookingId: null,
      createdAt: { lte: opts.bookingCreatedAt },
    },
    orderBy: { createdAt: "asc" },
  });

  if (candidates.length === 0) return { promoted: 0 };

  const now = new Date();
  for (const cm of candidates) {
    await prisma.$transaction([
      prisma.guestMessage.create({
        data: {
          bookingId: opts.bookingId,
          quickReplyId: null,
          sourceQuickReplyId: null,
          channel: cm.source === "email" ? "email" : "email", // contact-form inquiries are also email-equivalent in display
          direction: "inbound",
          trigger: "manual",
          subject: cm.subject || "Contact Us inquiry",
          body: cm.message,
          status: "sent",
          notes: `Promoted from Contact Us (${cm.source}) on ${now.toISOString().slice(0, 10)}`,
          messageId: cm.messageId,
          sentAt: cm.createdAt,
        },
      }),
      prisma.contactMessage.update({
        where: { id: cm.id },
        data: { promotedToBookingId: opts.bookingId, promotedAt: now },
      }),
    ]);
  }

  return { promoted: candidates.length };
}

async function notifyAdminInbound(opts: {
  bookingId: number;
  parsed: ParsedInboundEmail;
  body: string;
}) {
  const adminEmail = process.env.SMTP_USER || "customerservice@haveninlipa.com";
  const subject = `Guest replied: booking #${opts.bookingId}`;
  const html = `
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto">
      <h2 style="color:#335238">${subject}</h2>
      <p><strong>From:</strong> ${opts.parsed.fromName ? `${opts.parsed.fromName} &lt;${opts.parsed.fromEmail}&gt;` : opts.parsed.fromEmail}</p>
      <p><strong>Subject:</strong> ${opts.parsed.subject}</p>
      <blockquote style="border-left:3px solid #C4A862;padding:8px 16px;margin:16px 0;color:#444">${opts.body.replace(/\n/g, "<br/>")}</blockquote>
      <p style="font-size:12px;color:#999">Reply via the admin Messages thread.</p>
    </div>
  `;
  await sendEmail({ to: adminEmail, subject, html });
}

async function notifyAdminUnmatchedEmail(opts: { parsed: ParsedInboundEmail; body: string }) {
  const adminEmail = process.env.SMTP_USER || "customerservice@haveninlipa.com";
  const html = `
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto">
      <h2 style="color:#335238">New Contact Us inquiry (via email)</h2>
      <p>An email from a non-booker arrived. It's in the Contact Us inbox.</p>
      <p><strong>From:</strong> ${opts.parsed.fromName ? `${opts.parsed.fromName} &lt;${opts.parsed.fromEmail}&gt;` : opts.parsed.fromEmail}</p>
      <p><strong>Subject:</strong> ${opts.parsed.subject}</p>
      <blockquote style="border-left:3px solid #C4A862;padding:8px 16px;margin:16px 0;color:#444">${opts.body.replace(/\n/g, "<br/>")}</blockquote>
    </div>
  `;
  await sendEmail({ to: adminEmail, subject: `New email inquiry from ${opts.parsed.fromEmail}`, html });
}
